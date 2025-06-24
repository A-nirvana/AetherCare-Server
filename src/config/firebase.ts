import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

try {
    const serviceAccount = {
        type: process.env.FIREBASE_TYPE,
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI,
        token_uri: process.env.FIREBASE_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
        universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
    } as admin.ServiceAccount;

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });

    console.log('Firebase Admin SDK initialized successfully!');

} catch (error: any) {
    console.error('Failed to initialize Firebase Admin SDK:', error.message);
    process.exit(1); 
}

export const db = admin.firestore(); 
export const rtdb = admin.database()

