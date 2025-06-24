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

const allowedOrigins = [
  'http://localhost:3000', 
//   'https://www.your-production-frontend-domain.com',
//   'https://your-production-frontend-domain.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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