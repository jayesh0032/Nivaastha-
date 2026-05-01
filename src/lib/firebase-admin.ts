import * as admin from 'firebase-admin';
import firebaseConfig from '../../firebase-applet-config.json';

let adminApp: admin.app.App | null = null;

export function getFirebaseAdmin() {
  if (!adminApp) {
    try {
      if (admin.apps.length > 0) {
        adminApp = admin.apps[0]!;
      } else {
        adminApp = admin.initializeApp({
          projectId: firebaseConfig.projectId,
        });
      }
    } catch (error) {
      console.error('Firebase Admin initialization error:', error);
      throw error;
    }
  }
  return adminApp;
}

export function getFirestore() {
  return getFirebaseAdmin().firestore();
}

export function getAuth() {
  return getFirebaseAdmin().auth();
}
