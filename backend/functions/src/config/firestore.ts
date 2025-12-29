/**
 * Firestore Configuration
 *
 * This file initializes and configures Firestore settings for the Litplan backend.
 * It exports the Firestore instance and admin SDK for use throughout the application.
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'litplan-dev-demo',
  });
}

// Export Firestore instance
export const db = admin.firestore();

// Use emulator if FIRESTORE_EMULATOR_HOST is set
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log('🔧 Using Firestore Emulator at:', process.env.FIRESTORE_EMULATOR_HOST);
}

// Export admin for other Firebase services (Auth, Storage, etc.)
export { admin };

// Configure Firestore settings
db.settings({
  ignoreUndefinedProperties: true, // Ignore undefined values in documents
});

// Export FieldValue for timestamp operations
export const FieldValue = admin.firestore.FieldValue;

// Export Timestamp for date operations
export const Timestamp = admin.firestore.Timestamp;

// Helper function to get current timestamp
export const getCurrentTimestamp = () => FieldValue.serverTimestamp();

// Helper function to convert Date to Firestore Timestamp
export const dateToTimestamp = (date: Date): admin.firestore.Timestamp => {
  return Timestamp.fromDate(date);
};

// Helper function to convert Firestore Timestamp to Date
export const timestampToDate = (timestamp: admin.firestore.Timestamp): Date => {
  return timestamp.toDate();
};
