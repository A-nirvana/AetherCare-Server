// src/config/twilioConfig.ts
import 'dotenv/config'; // Ensure environment variables are loaded
import { Twilio } from 'twilio';

// Retrieve Twilio credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const medicAccountSid = process.env.TWILIO_ACCOUNT_SID_MEDIC;
const medicAuthToken = process.env.TWILIO_AUTH_TOKEN_MEDIC;
const medicPhoneNumber = process.env.TWILIO_PHONE_NUMBER_MEDIC;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Basic validation for critical environment variables
if (!accountSid || !authToken || !twilioPhoneNumber) {
    console.error('ERROR: Missing one or more Twilio environment variables.');
    console.error('Please ensure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are set in your .env file.');
    process.exit(1); // Exit if critical config is missing
}

// Initialize the Twilio client
const twilioClient = new Twilio(accountSid, authToken);
const medicTwilioClient = new Twilio(medicAccountSid, medicAuthToken);

// Export the client and phone number for use in controllers
export { twilioClient, twilioPhoneNumber, medicTwilioClient, medicPhoneNumber };