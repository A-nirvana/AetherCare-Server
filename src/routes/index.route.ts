// src/routes/index.ts

import { Router } from 'express'; // Assuming you have this from previous steps
import databaseRoutes from './db.route';
import predictionRoutes from './ml.route'
import userRoutes from './user.route';
import twilioRoutes from './twilio.route';

const router = Router();

router.use(databaseRoutes);
router.use(predictionRoutes);
router.use(userRoutes);
router.use(twilioRoutes)

// You can add other top-level routes or route modules as needed
// router.use(otherRoutes);

export default router;

