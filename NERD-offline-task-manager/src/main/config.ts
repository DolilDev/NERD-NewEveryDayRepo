import { config as loadEnv } from 'dotenv';

// Loads variables from a local .env file (no-op when the file is absent),
// so missing cloud configuration never breaks startup.
loadEnv();

export interface FirebaseConfig {
  apiKey: string;
  projectId: string;
  appId: string;
  authDomain?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

/**
 * Reads Firebase credentials from the environment. Returns null when the
 * required keys are missing — the signal that cloud sync is unavailable and
 * the app should run in pure offline mode.
 */
export function getFirebaseConfig(): FirebaseConfig | null {
  const apiKey = process.env.FIREBASE_API_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const appId = process.env.FIREBASE_APP_ID;

  if (!apiKey || !projectId || !appId) {
    return null;
  }

  return {
    apiKey,
    projectId,
    appId,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  };
}

/** Firestore collection that stores the tasks. */
export function getTasksCollection(): string {
  return process.env.FIREBASE_TASKS_COLLECTION ?? 'tasks';
}
