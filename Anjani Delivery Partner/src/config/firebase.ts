import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyPlaceholder",
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "anjani-restaurant.firebaseapp.com",
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "anjani-restaurant",
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "anjani-restaurant.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "560562817811",
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:560562817811:web:a445988d46f47542ed28e6",
  databaseURL:       process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || "https://anjani-restaurant-default-rtdb.firebaseio.com",
};

// Check if valid config exists. If the apiKey is the placeholder, we disable Firebase and use local fallback mode.
const isFirebaseConfigured = 
  firebaseConfig.apiKey && firebaseConfig.apiKey !== "AIzaSyPlaceholder";

let app;
let auth: any = null;
let db: any = null;
let rtdb: any = null;

if (isFirebaseConfigured) {
  try {
    const { getAuth } = require('firebase/auth');
    const { getFirestore } = require('firebase/firestore');
    const { getDatabase } = require('firebase/database');
    const { setLogLevel } = require('firebase/app');
    
    // expo-router's SSR/static generation doesn't support localStorage which Firebase Auth uses.
    // On the server, we initialize Firebase but avoid initializing Auth which requires browser APIs.
    if (typeof window === 'undefined') {
      const { initializeServerApp } = require('firebase/app');
      app = initializeServerApp(firebaseConfig, {});
    } else {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
    }
    db = getFirestore(app);
    rtdb = getDatabase(app);
    setLogLevel('silent');
    console.log("🔥 Firebase Auth, Firestore, and RTDB initialized successfully!");
  } catch (error) {
    console.error("❌ Failed to initialize Firebase SDK:", error);
  }
} else {
  console.warn("⚠️ Firebase credentials missing or set to placeholders in src/config/firebase.ts. Running in local mock/cache mode.");
}

export { auth, db, rtdb, isFirebaseConfigured };
