// Server-only. Do not import in Expo client.
import * as admin from "firebase-admin";

const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
        });
        console.log("[FirebaseAdmin] Initialized successfully");
    } catch (error) {
        console.error("[FirebaseAdmin] Initialization error", error);
    }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const adminBucket = admin.storage().bucket();
export { admin };
