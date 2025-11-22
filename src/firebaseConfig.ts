import { FirebaseApp, initializeApp } from 'firebase/app';

import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

// Type for Firebase configuration
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Function to get Firebase config from environment variables
const getFirebaseConfig = (): FirebaseConfig => {
  const env = import.meta.env;

  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID
  };

  // Validate that all required environment variables are present
  const missingVars = Object.entries(config)
    .filter(([_, value]) => !value)
    .map(([key]) => key.replace('VITE_', ''));

  if (missingVars.length > 0) {
    throw new Error(`Missing Firebase environment variables: ${missingVars.join(', ')}`);
  }

  return config as FirebaseConfig;
};

// Initialize Firebase
let app: FirebaseApp;

let db: Firestore;
let storage: FirebaseStorage;

try {
  const firebaseConfig = getFirebaseConfig();
  app = initializeApp(firebaseConfig);

  // Initialize Firebase services

  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
  throw error; // Re-throw to prevent the app from starting with invalid Firebase config
}

// Export the Firebase services
export { app, db, storage };
