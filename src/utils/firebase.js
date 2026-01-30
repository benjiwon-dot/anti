// Firebase configuration
// NOTE: Firebase Web SDK config values are safe to expose in client apps.
// In Expo, environment variables must be prefixed with EXPO_PUBLIC_ to be available at runtime.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Read config from Expo public env vars.
// DO NOT hardcode real keys here (keep them in .env / EAS secrets).
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    // measurementId is for Firebase Analytics (mostly web). Not needed for Expo RN auth.
    // measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Helpful runtime warnings (does not crash the app, but tells you what is missing).
// If apiKey is missing/empty, Firebase Auth will fail with auth/api-key-not-valid or similar.
if (!firebaseConfig.apiKey) {
    console.warn(
        '[Firebase] Missing EXPO_PUBLIC_FIREBASE_API_KEY. ' +
        'Create a .env file at project root and add EXPO_PUBLIC_FIREBASE_API_KEY=... then restart Expo with `npx expo start -c`.'
    );
}
if (!firebaseConfig.projectId) {
    console.warn(
        '[Firebase] Missing EXPO_PUBLIC_FIREBASE_PROJECT_ID. ' +
        'Add EXPO_PUBLIC_FIREBASE_PROJECT_ID=... in your .env and restart Expo.'
    );
}
if (!firebaseConfig.authDomain) {
    console.warn(
        '[Firebase] Missing EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN. ' +
        'Add EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=... in your .env and restart Expo.'
    );
}

// Initialize Firebase (guard against double init)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firestore & Auth instances
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
console.log('[Firebase] apiKey:', process.env.EXPO_PUBLIC_FIREBASE_API_KEY);
console.log('[Firebase] projectId:', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID);
console.log('[Firebase] authDomain:', process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN);
