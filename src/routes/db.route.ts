import { Router } from 'express';
import {
  getAllRealtimeDatabaseContent,
  confirmSensorDataListenerStatus,
  getStoredSensorData,
  clearStoredSensorData,
  getAverageSensorData,
} from '@/controllers/db.controller';
import { rtdb } from '@/config/firebase';

const router = Router();

router.get('/rtdb/all', getAllRealtimeDatabaseContent);

router.get('/rtdb/listener-status', confirmSensorDataListenerStatus);

router.get('/sensor-data', getStoredSensorData);

router.post('/sensor-data/clear', clearStoredSensorData);

router.get('/sensor-averages', getAverageSensorData);

router.post('/new', (req, res) => {
  const sensorDataRef = rtdb.ref('sensorData');
  try {
    const newSensorData = req.body;
    sensorDataRef.push(newSensorData);
    res.status(201).json({ message: 'New sensor data added successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add new sensor data.', error });
  }
});

export default router;
