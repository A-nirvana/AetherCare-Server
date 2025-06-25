import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import cookierParser from 'cookie-parser';
import { app, server as httpServer } from '@/lib/socket'; 
import { setupSensorDataListener } from '@/controllers/db.controller';
import routes from '@/routes/index.route';
import { db, rtdb } from '@/config/firebase'; 
import { startPredictionCronJob } from './controllers/ml.controller';

dotenv.config();

const PORT = process.env.PORT ?? 8000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookierParser())

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization','user-type', 'x-access-token'],
}));

app.use(`/api`, routes);

app.get('/', (req, res) => {
    res.status(200).send('API and Socket Server are running!');
});

httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Firestore and Realtime Database instances are ready.`);

    setupSensorDataListener(); 
    startPredictionCronJob();

    console.log('Express and Socket.IO servers started successfully.');
});