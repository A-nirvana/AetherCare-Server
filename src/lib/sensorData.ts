import * as admin from 'firebase-admin';
import { io } from './socket';

/**
 * @module AppState
 * @description Manages a shared, mutable state variable for the application.
 * Note: This state is in-memory and will reset on server restart.
 * It is not synchronized across multiple server instances.
 */

let mySharedCounter: number = 0;
let lastUpdatedTimestamp: Date | null = null;
let someConfiguration: { theme: string, logLevel: string } = { theme: 'dark', logLevel: 'info' };

interface SensorDataItem {
    key: string;
    data: any;
    deviceTimestamp?: number;
    deviceUTCTime?: string;
    serverReceivedTimestamp: string;
}
let sensorDataArray: SensorDataItem[] = [];

const BATCH_SIZE = 120;
const BUFFER_SIZE = 60; // Keep last 60 items in memory always so that we can use them for ML prediction    

export const getCounter = (): number => {
    return mySharedCounter;
};

/**
 * @function incrementCounter
 * @description Increments the shared counter and updates the timestamp.
 * @returns {number} The new value of the shared counter.
 */
export const incrementCounter = (): number => {
    mySharedCounter++;
    lastUpdatedTimestamp = new Date();
    console.log(`Counter incremented to: ${mySharedCounter}`);
    return mySharedCounter;
};

/**
 * @function getLastUpdatedTimestamp
 * @returns {Date | null} The timestamp of the last counter update.
 */
export const getLastUpdatedTimestamp = (): Date | null => {
    return lastUpdatedTimestamp;
};

/**
 * @function getConfiguration
 * @returns {{ theme: string, logLevel: string }} The current application configuration.
 */
export const getConfiguration = (): { theme: string, logLevel: string } => {
    return someConfiguration;
};

/**
 * @function setConfiguration
 * @description Updates a part of the shared application configuration.
 * @param {Partial<{ theme: string, logLevel: string }>} newConfig - The new configuration values to merge.
 */
export const setConfiguration = (newConfig: Partial<{ theme: string, logLevel: string }>): void => {
    someConfiguration = { ...someConfiguration, ...newConfig };
    console.log('Application configuration updated:', someConfiguration);
};


// --- New functions for Sensor Data ---

/**
 * @function getRoundedTimestamp
 * @description Rounds a given Date object to the nearest 10-minute interval.
 * @param {Date} date - The date to round.
 * @returns {Date} The rounded date.
 */
const getRoundedTimestamp = (date: Date): Date => {
    const minutes = date.getMinutes();
    const ms = date.getMilliseconds();
    const seconds = date.getSeconds();
    const newMinutes = Math.round(minutes / 10) * 10;
    
    date.setMinutes(newMinutes, 0, 0); // Set seconds and milliseconds to 0 for exact interval
    return date;
};

/**
 * @function addSensorData
 * @description Adds a new sensor data item to the in-memory array.
 * Includes a server-generated timestamp. Processes data in batches of 120.
 * Saves averages to Firestore and deletes processed data from Realtime Database.
 * @param {string} key - The unique key of the sensor data from Firebase.
 * @param {any} data - The actual sensor data object from Firebase.
 * @param {admin.firestore.Firestore} db - The Firestore database instance.
 * @param {admin.database.Database} rtdb - The Realtime Database instance.
 */

let isProcessingBatch = false;
export const addSensorData = async (key: string, data: any, db: admin.firestore.Firestore, rtdb: admin.database.Database): Promise<void> => {
    const newItem: SensorDataItem = {
        key,
        data,
        deviceTimestamp: data.Timestamp,
        deviceUTCTime: data.UTC_Time,
        serverReceivedTimestamp: new Date().toISOString()
    };
    io.emit('sensorData', newItem);
    sensorDataArray.push(newItem);

    if (sensorDataArray.length >= BATCH_SIZE + BUFFER_SIZE && !isProcessingBatch) {
        await processSensorDataBatch(db, rtdb);
    }
};

const processSensorDataBatch = async (db: admin.firestore.Firestore, rtdb: admin.database.Database): Promise<void> => {
    if (isProcessingBatch || sensorDataArray.length < BATCH_SIZE + BUFFER_SIZE) {
        return;
    }

    isProcessingBatch = true;

    try {
        const batchToProcess = sensorDataArray.slice(0, BATCH_SIZE);
        const keysToDelete = batchToProcess.map(item => item.key);

        const averages: { [key: string]: number } = {};
        const fieldCounts: { [key: string]: number } = {};

        batchToProcess.forEach(item => {
            for (const field in item.data) {
                if (typeof item.data[field] === 'number' && field !== 'Timestamp' && field !== 'serverReceivedTimestamp') {
                    if (!averages[field]) {
                        averages[field] = 0;
                        fieldCounts[field] = 0;
                    }
                    averages[field] += item.data[field];
                    fieldCounts[field]++;
                }
            }
        });

        const finalAverages: { [key: string]: number } = {};
        for (const field in averages) {
            if (fieldCounts[field] > 0) {
                finalAverages[field] = parseFloat((averages[field] / fieldCounts[field]).toFixed(3)); // Round to 3 decimal places
            }
        }
        const averageTimestamp = getRoundedTimestamp(new Date());

        const sensorAverageData = {
            batchSize: BATCH_SIZE,
            processedAt: averageTimestamp.toISOString(),
            averages: finalAverages,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection('sensorAverages').add(sensorAverageData);

        const updates: { [key: string]: null } = {};
        keysToDelete.forEach(key => {
            updates[`/sensorData/${key}`] = null;
        });
        await rtdb.ref().update(updates);

        sensorDataArray = sensorDataArray.slice(BATCH_SIZE); // Keep the remaining items for the next batch

    } catch (firestoreError: any) {
        console.error('Error saving averages to Firestore or deleting from RTDB:', firestoreError);
    } finally {
        isProcessingBatch = false;
        if (sensorDataArray.length >= BATCH_SIZE + BUFFER_SIZE) {
            await processSensorDataBatch(db, rtdb);
        }
    }
};

/**
 * @function getSensorData
 * @description Retrieves all currently stored sensor data.
 * @returns {SensorDataItem[]} An array of sensor data items.
 */
export const getSensorData = (): SensorDataItem[] => {
    return sensorDataArray;
};

/**
 * @function clearSensorData
 * @description Clears all stored sensor data from the in-memory array.
 */
export const clearSensorData = (): void => {
    sensorDataArray = [];
    console.log('[AppState] Sensor data array cleared.');
};

