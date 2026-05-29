import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY_HERE",
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "anjani-restaurant.firebaseapp.com",
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "anjani-restaurant",
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "anjani-restaurant.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "560562817811",
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:560562817811:web:a445988d46f47542ed28e6",
};

// Check if valid config exists. If the apiKey is the placeholder, we disable Firebase and use local fallback mode.
const isFirebaseConfigured = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" && 
  firebaseConfig.apiKey.trim() !== "";

let app;
let auth: any = null;
let db: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    try {
      if (Platform.OS === 'web') {
        auth = getAuth(app); // Web handles persistence automatically
      } else {
        try {
          const { getReactNativePersistence } = require('firebase/auth');
          auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
          });
        } catch (e) {
          auth = getAuth(app);
        }
      }
    } catch (authInitError: any) {
      auth = getAuth(app);
    }
    db = getFirestore(app);
    setLogLevel('silent');
    console.log("🔥 Firebase Auth and Cloud Firestore initialized successfully!");
  } catch (error) {
    console.error("❌ Failed to initialize Firebase SDK:", error);
  }
} else {
  console.warn("⚠️ Firebase credentials missing or set to placeholders in src/config/firebase.ts. Running in local mock/cache mode.");
}

export { auth, db, isFirebaseConfigured };
