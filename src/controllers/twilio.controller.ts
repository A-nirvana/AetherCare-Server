// src/controllers/twilio.controller.ts
import { Request, Response } from 'express';
import VoiceResponse from 'twilio/lib/twiml/VoiceResponse';
import { twilioClient, twilioPhoneNumber, medicPhoneNumber, medicTwilioClient } from '../config/twilioConfig';

const BASE_URL = process.env.PUBLIC_WEBHOOK_BASE_URL || 'http://localhost:3000';
let scoreInfo = 0;
let alertInfo = '';
let descpInfo = '';

interface HealthAlertPayload {
  userPhoneNumber: string;
  score: number;
  message?: string;
  alertId?: string;
  descp?: string;
  Alert?: string;
}

/**
 * @function sendHealthAlert
 * Handles the POST request to initiate a call with a prompt for user input.
*/

// Define the payload for the staff notification
export interface StaffNotificationPayload {
    patientName: string;
    patientPhoneNumber: string;
    alertDetails: {
        score: number;
        descp: string;
        Alert: string;
        message: string;
    };
    staffPhoneNumber: string;
    callSid?: string; // Optional: The SID of the call made to the patient
}

/**
 * Notifies medical staff about a patient's health alert via SMS.
 * @param payload - The data required for the staff notification.
*/
export const notifyMedicalStaff = async (payload: StaffNotificationPayload) => {
  const { patientName, patientPhoneNumber, alertDetails, staffPhoneNumber, callSid } = payload;

  // Basic validation for the staff phone number
  if (!staffPhoneNumber) {
    console.error('Error: "staffPhoneNumber" is required to notify medical staff.');
    return;
  }

  // Construct the SMS message for the medical staff
  const staffMessage = `
    New Health Alert:
    Patient: ${patientName}
    Contact: ${patientPhoneNumber}
    Risk Score: ${alertDetails.score}
    Alert Type: ${alertDetails.Alert}
    Description: ${alertDetails.descp}
    Details: ${alertDetails.message}
  `;

  try {
    const message = await medicTwilioClient.messages.create({
      body: staffMessage.trim(),
      to: staffPhoneNumber,
      from: medicPhoneNumber || '',
    });

    console.log(`Successfully sent SMS notification to staff at ${staffPhoneNumber}. SID: ${message.sid}`);
  } catch (error: any) {
    console.error(`Error sending SMS to staff at ${staffPhoneNumber}:`, error.message);
  }
};

export const initiateAlert = async (payload: HealthAlertPayload, res?: Response) => {
    const { score, message, alertId, descp, Alert } = payload;
    if (!score) {
        if (res)
            res.status(400).json({
        success: false,
        message: 'Bad Request: "userPhoneNumber" and "score" are required.',
    });
    return;
}
const userPhoneNumber = process.env.USER_PHONE_NUMBER || payload.userPhoneNumber;

const triggerCall = score <= 30;

if (!triggerCall) {
    console.log(`Info: Risk level "${score}" for ${userPhoneNumber} does not trigger a voice alert.`);
    if (res)
        res.status(200).json({
    success: true,
    message: `Notification not required for risk level "${score}".`,
});
return;
}

alertInfo = Alert ?? 'Critical health alert';
descpInfo = descp ?? 'Serious health risk detected';
scoreInfo = score;
const voiceMessage = `Urgent health alert! Mr. Ravi Sharma's device has detected ${Alert}, risk of ${descp}. ${message}.`;

// Initialize VoiceResponse correctly
const twimlResponse = new VoiceResponse();
const gather = twimlResponse.gather({
    numDigits: 1,
    timeout: 10,
    action: `${BASE_URL}/api/handle-response?alertId=${alertId || ''}&user=${encodeURIComponent(userPhoneNumber)}`,
    method: 'POST',
});
gather.say({ voice: 'Polly.Amy' }, voiceMessage + '  We are reaching out emergency services. If you want to cancel press 1.');

twimlResponse.say({ voice: 'Polly.Amy' }, 'Alerting emergency services in  area.');

try {
    const call = await twilioClient.calls.create({
        twiml: twimlResponse.toString(),
        to: userPhoneNumber,
        from: twilioPhoneNumber || '',
    });
    
    console.log(`Successfully initiated call SID: ${call.sid} to ${userPhoneNumber}`);
    if (res)
      res.status(200).json({
        success: true,
        message: 'Health alert voice call initiated with user interaction prompt.',
        callSid: call.sid,
      });
  } catch (error: any) {
    console.error(`Error initiating Twilio call to ${userPhoneNumber}:`, error.message);
    if (res)
      res.status(500).json({
        success: false,
        message: 'Failed to initiate health alert voice call.',
        error: error.message,
      });
  }
};

export const sendHealthAlert = async (req: Request, res: Response) => {
  initiateAlert(req.body, res);
};

/**
 * @function handleUserResponse
 * This is the webhook endpoint that Twilio calls after it gathers digits.
 * It processes the user's input and responds with new TwiML.
 */
export const handleUserResponse = async (req: Request, res: Response) => {
  const twimlResponse = new VoiceResponse();
  const { Digits } = req.body;
  const alertId = req.query.alertId as string;
  const userPhoneNumber = req.query.user as string;

  console.log(`Received user input for alert ID ${alertId}: Digits=${Digits}`);

  let userAcknowledged = false;
  let responseMessage = 'Thank you. ';

  if (Digits === '1') {
    userAcknowledged = true;
    responseMessage += 'Cancelling emergency services.';
    console.log(`User ${userPhoneNumber} acknowledged alert ${alertId}.`);
  } else if (Digits) {
    responseMessage += `You pressed ${Digits}. That is not a valid option.`;
    console.log(`User ${userPhoneNumber} pressed invalid digit: ${Digits}.`);
    const staffNotificationPayload: StaffNotificationPayload = {
      patientName: 'Mr. Ravi Sharma',
      patientPhoneNumber: userPhoneNumber,
      alertDetails: {
        score: scoreInfo,
        descp: descpInfo,
        Alert: alertInfo,
        message: 'please respond quickly to this alert. Look for the address in your message and dashboard.',
      },
      staffPhoneNumber: process.env.MEDIC_PHONE_NUMBER || '',
    };

    try {
      notifyMedicalStaff(staffNotificationPayload);
    } catch (error) {
      console.error('Failed to notify medical staff:', error);
    }
  } else {
    responseMessage += 'No input was detected.';
    console.log(`No input detected from ${userPhoneNumber} for alert ${alertId}.`);
  }

  twimlResponse.say({ voice: 'Polly.Amy' }, responseMessage + ' Thank You.');
  twimlResponse.hangup();

  res.set('Content-Type', 'text/xml');
  res.send(twimlResponse.toString());

  if (!userAcknowledged) {  
    console.log(`Alert ${alertId} for ${userPhoneNumber} was not acknowledged by the user.`);
  }
};
