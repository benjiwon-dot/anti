import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

import { initializeAuth, getAuth, Auth } from "firebase/auth";
// @ts-ignore
import { getReactNativePersistence } from "firebase/auth";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// --- Singleton Logic ---
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const auth = Platform.OS === 'web'
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
    });

if (__DEV__) {
    console.log("[Firebase] Configured with bucket:", firebaseConfig.storageBucket);
}

/**
 * GOOGLE OAUTH DEV UNBLOCK CHECKLIST:
 * 1. [ ] Create OAuth 2.0 Client IDs in Google Cloud Console:
 *    - iOS: com.benjiwon.memotileappanti
 *    - Web: (for dev)
 * 2. [ ] Update app.json:
 *    - ios.bundleIdentifier: "com.benjiwon.memotileappanti"
 *    - extra.googleIosClientId: (the new ID)
 *    - extra.googleWebClientId: (the new ID)
 * 3. [ ] Firebase Console -> Build -> Authentication -> Settings -> Google
 *    - Add your iOS Bundle ID.
 *    - Add Web Client ID to the "Web SDK configuration" if not present.
 * 4. [ ] Ensure your email is added to the OAuth Consent Screen "Test Users".
 */
