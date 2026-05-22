import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyDgZbCT3tliCLwY5KwfgkuDuFeW9qSdoeQ",
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
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
    db = getFirestore(app);
    // Silence verbose internal Firebase SDK warning/error logging in development
    // (e.g. to suppress uncaught snapshot listener permission-denied warnings).
    setLogLevel('silent');
    console.log("🔥 Firebase Auth and Cloud Firestore initialized successfully!");
  } catch (error) {
    console.error("❌ Failed to initialize Firebase SDK:", error);
  }
} else {
  console.warn("⚠️ Firebase credentials missing or set to placeholders in src/config/firebase.ts. Running in local mock/cache mode.");
}

export { auth, db, isFirebaseConfigured };
