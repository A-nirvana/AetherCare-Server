// src/routes/twilio.routes.ts
import { Router } from 'express';
import { sendHealthAlert, handleUserResponse /*, handleCallStatus */ } from '@/controllers/twilio.controller';

const router = Router();

/**
 * POST /api/twilio/send-alert
 * Triggers a voice notification with a prompt for user input.
 * Request Body: { userPhoneNumber: string, riskLevel: string, message?: string, alertId?: string }
 */
router.post('/send-alert', sendHealthAlert);

/**
 * POST /api/twilio/handle-response
 * Webhook endpoint called by Twilio after it gathers user input (DTMF).
 * This endpoint must be publicly accessible.
 */
router.post('/handle-response', handleUserResponse);

// Uncomment and configure in twilio.controller.ts if you need call status callbacks
// router.post('/call-status', handleCallStatus);

export default router;