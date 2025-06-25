import { Request, Response } from 'express';
import { spawn } from 'child_process';
import path, { join } from 'path';
import nodeCron from 'node-cron';
import { getSensorData } from '@/lib/sensorData';
import { io } from '@/lib/socket';
import { parseHealthStatus } from '@/lib/mlParser';
import { initiateAlert } from './twilio.controller';

type VitalsInput = [number, number, number, number][];

/**
 * Executes the ML prediction script with the given vitals input.
 * This function is now standalone and does not rely on Express Request/Response objects,
 * making it suitable for cron jobs.
 * @param vitalsInput The vital signs data (array of arrays) to pass to the Python script.
 * @returns A Promise that resolves with the parsed prediction result or rejects with an error.
 */
const executePrediction = (vitalsInput: VitalsInput): Promise<any> => {
  return new Promise((resolve, reject) => {
    const riskPath = join(process.cwd(), '');
    const isWindows = process.platform === 'win32';
    const pythonPath = isWindows ? join(riskPath, 'venv', 'Scripts', 'python.exe') : join(riskPath, 'venv', 'bin', 'python');

    const env = { ...process.env };
    if (!isWindows) {
      env.PATH = `${join(riskPath, 'venv', 'bin')}:${env.PATH}`;
      env.VIRTUAL_ENV = join(riskPath, 'venv');
      env.PYTHONPATH = join(riskPath, 'venv', 'lib', 'python3.11', 'site-packages');
    } else {
      env.PATH = `${join(riskPath, 'venv', 'Scripts')};${env.PATH}`;
      env.VIRTUAL_ENV = join(riskPath, 'venv');
    }

    const py = spawn(pythonPath, [path.join(__dirname, '../python/predict.py')], {
      cwd: riskPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: env,
    });

    let result = '';
    let pythonError = '';

    py.stdin.write(JSON.stringify(vitalsInput));
    py.stdin.end();

    py.stdout.on('data', (data) => {
      result += data.toString();
    });

    py.stderr.on('data', (data) => {
      pythonError += data.toString();
      console.error('Python error stream:', data.toString());
    });

    py.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python script exited with code ${code}. Error: ${pythonError}`);
        return reject(new Error(`Prediction failed with code ${code}: ${pythonError}`));
      }
      const lines = result.trim().split('\n');
      const lastLine = lines[lines.length - 1];

      try {
        const parsed = JSON.parse(lastLine);
        resolve(parsed);
      } catch (err) {
        console.error('Failed to parse JSON from Python script:', err);
        console.error('Raw Python output:', result);
        reject(new Error(`Invalid JSON from Python script: ${err}`));
      }
    });

    py.on('error', (err) => {
      console.error('Failed to start Python child process:', err);
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
};

let cronCounter = 0;
const PREDICTION_INTERVAL_RUNS = 5;
const DATA_POINTS_FOR_PREDICTION = 60;

/**
 * Original predictCondition controller (for API endpoint if needed),
 * now re-using the `executePrediction` logic.
 */
export const predictCondition = async (req: Request, res: Response) => {
  try {
    const sensorDataArray = getSensorData();
    if (!sensorDataArray || sensorDataArray.length === 0) {
      console.warn('No sensor data available to perform prediction.');
      res.status(400).json({ error: 'No sensor data available for prediction.' });
      return;
    }

    // Ensure we have enough data points
    if (sensorDataArray.length < DATA_POINTS_FOR_PREDICTION) {
      console.warn(`Not enough sensor data (${sensorDataArray.length}) for prediction. Need ${DATA_POINTS_FOR_PREDICTION}.`);
      res.status(400).json({ error: `Not enough sensor data for prediction. Need at least ${DATA_POINTS_FOR_PREDICTION} data points.` });
      return;
    }
    const last60SensorData = sensorDataArray.slice(-DATA_POINTS_FOR_PREDICTION);
    const vitalsInput: VitalsInput = last60SensorData.map((item) => [
      item.data.BPM,
      item.data.Respiratory_Rate,
      item.data.SpO2,
      item.data.Temperature,
    ]);

    console.log('Using vitalsInput for prediction:', JSON.stringify(vitalsInput, null, 2));

    const predictionResult = await executePrediction(vitalsInput);
    const Health = parseHealthStatus(predictionResult.result);
    console.log('ML Prediction Result:', JSON.stringify(Health, null, 2));
    res.status(200).json(Health);
  } catch (error) {
    console.error('Error during scheduled ML prediction:', error);
    res.status(500).json({ error: 'Failed to perform prediction', details: error });
  }
};

/**
 * The scheduled task function that retrieves sensor data and triggers prediction.
 */
const scheduledPredictionTask = async () => {
  cronCounter++;
  // console.log(`Cron job tick. Counter: ${cronCounter}. Current time: ${new Date().toLocaleTimeString()}`);

  if (cronCounter % PREDICTION_INTERVAL_RUNS === 0) {
    try {
      const sensorDataArray = getSensorData();
      if (!sensorDataArray || sensorDataArray.length === 0) {
        console.warn('No sensor data available to perform prediction.');
        return;
      }

      // Ensure we have enough data points
      if (sensorDataArray.length < DATA_POINTS_FOR_PREDICTION) {
        console.warn(`Not enough sensor data (${sensorDataArray.length}) for prediction. Need ${DATA_POINTS_FOR_PREDICTION}.`);
        return;
      }
      const last60SensorData = sensorDataArray.slice(-DATA_POINTS_FOR_PREDICTION);
      const vitalsInput: VitalsInput = last60SensorData.map((item) => [
        item.data.BPM,
        item.data.Respiratory_Rate,
        item.data.SpO2,
        item.data.Temperature,
      ]);

      const predictionResult = await executePrediction(vitalsInput);
      const Health = parseHealthStatus(predictionResult.result);
      // console.log('ML Prediction Result:', JSON.stringify(Health, null, 2));
      io.emit('mlResult', Health);

      if (Health.Score < 30)
        initiateAlert({
          userPhoneNumber: process.env.USER_PHONE_NUMBER || '',
          score: Health.Score,
          message: Health.Message,
          alertId: Health.ID.toString(),
          descp: Health.Descp,
          Alert: Health.Alert,
        });
    } catch (error) {
      console.error('Error during scheduled ML prediction:', error);
    } finally {
      cronCounter = 0;
    }
  }
};

/**
 * Initializes and starts the cron job.
 * This function should be called once when backend server starts.
 */
export const startPredictionCronJob = () => {
  nodeCron.schedule('*/30 * * * * *', scheduledPredictionTask, {
    timezone: 'Asia/Kolkata',
  });
  console.log('Scheduled ML prediction cron job to run every 2.5 minutes (checked every 30 seconds).');
};
