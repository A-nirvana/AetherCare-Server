import { Request, Response } from 'express';
import { db, rtdb } from '@/config/firebase'; 
import * as admin from 'firebase-admin'; 
import { addSensorData, getSensorData, clearSensorData } from '@/lib/sensorData';


/**
 * @function getAllRealtimeDatabaseContent
 * @description Controller function to retrieve all content from the Firebase Realtime Database.
 * This fetches data from the root ('/') of RTDB.
 * Caution: For very large databases, this can be resource-intensive and slow.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @returns {Promise<void>} - A promise that resolves when the response is sent.
 */
export const getAllRealtimeDatabaseContent = async (req: Request, res: Response) => {
    try {
        const rootRef = rtdb.ref('/');
        const snapshot = await rootRef.once('value');

        if (!snapshot.exists()) {
            console.log('No data found at the root of Realtime Database.');
            res.status(404).json({ message: 'No data found in Realtime Database.' });
            return;
        }

        const allData = snapshot.val();
        res.status(200).json({
            message: 'Successfully retrieved all data from Realtime Database.',
            data: allData
        });

    } catch (error: any) {
        console.error('Error fetching all Realtime Database content:', error);
        res.status(500).json({ error: 'Failed to retrieve Realtime Database content.', details: error.message });
    }
};

let sensorDataListenerAttached = false;

/**
 * @function setupSensorDataListener
 * @description Sets up a real-time listener for new child data added under the 'sensorData' path
 * in the Firebase Realtime Database.
 * This function should ideally be called once when  server starts up.
 * New data will be logged to the server console and stored in the in-memory array.
 */
export const setupSensorDataListener = () => {
    if (sensorDataListenerAttached) {
        console.warn('Sensor data listener already attached. Skipping re-attachment.');
        return;
    }

    const sensorDataRef = rtdb.ref('sensorData');
    let count = 0;

    sensorDataRef.on('child_added', (snapshot, prevChildKey) => {
        const newData = snapshot.val();
        const newDataKey = snapshot.key;
        count++; 
                
        if(newDataKey)addSensorData(newDataKey, newData, db, rtdb).catch(err => {
            console.error("Error processing sensor data batch:", err);
        });

    }, (errorObject: any) => {
        console.error('The sensor data listener failed:', errorObject.code, errorObject.message);
    });

    sensorDataListenerAttached = true; // Set the flag to true
    console.log('Realtime Database listener for "sensorData" path has been set up.');
};

/**
 * @function confirmSensorDataListenerStatus
 * @description An Express controller to confirm that the sensor data listener is active.
 * This is primarily for debugging/confirmation; the listener itself operates asynchronously.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @returns {void}
 */
export const confirmSensorDataListenerStatus = (req: Request, res: Response) => {
    if (sensorDataListenerAttached) {
        res.status(200).json({ message: 'Realtime Database listener for "sensorData" is active.', status: 'active' });
    } else {
        res.status(200).json({ message: 'Realtime Database listener for "sensorData" is not active (or not yet initialized).', status: 'inactive' });
    }
};

/**
 * @function getStoredSensorData
 * @description Retrieves all sensor data currently stored in the in-memory array.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @returns {Promise<void>}
 */
export const getStoredSensorData = (req: Request, res: Response) => {
    const data = getSensorData();
    res.status(200).json({
        message: 'Successfully retrieved stored sensor data.',
        count: data.length,
        data: data
    });
};

/**
 * @function clearStoredSensorData
 * @description Clears all sensor data from the in-memory array.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @returns {Promise<void>}
 */
export const clearStoredSensorData = (req: Request, res: Response) => {
    clearSensorData();
    res.status(200).json({
        message: 'Stored sensor data cleared successfully.',
        count: 0,
        data: []
    });
};

/**
 * @function getAverageSensorData
 * @description Retrieves all average sensor data documents from the 'sensorAverages' collection in Firestore.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @returns {Promise<void>} - A promise that resolves when the response is sent.
 */
export const getAverageSensorData = async (req: Request, res: Response) => {
    try {
        const sensorAveragesRef = db.collection('sensorAverages');
        const snapshot = await sensorAveragesRef.get();

        if (snapshot.empty) {
            console.log('No average sensor data found in Firestore.');
            res.status(404).json({ message: 'No average sensor data found.' });
            return;
        }

        const averages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.status(200).json({
            message: 'Successfully retrieved average sensor data from Firestore.',
            count: averages.length,
            data: averages
        });

    } catch (error: any) {
        console.error('Error fetching average sensor data from Firestore:', error);
        res.status(500).json({ error: 'Failed to retrieve average sensor data.', details: error.message });
    }
};

