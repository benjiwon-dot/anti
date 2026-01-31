import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import {
    GoogleAuthProvider,
    signInWithCredential,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    UserCredential,
    Auth
} from "firebase/auth";
import { makeRedirectUri } from "expo-auth-session";
import { auth } from "../lib/firebase"; // Import single auth instance

WebBrowser.maybeCompleteAuthSession();

// Email Auth Helpers
export const signUpWithEmail = async (email: string, pass: string): Promise<UserCredential> => {
    if (!email.includes("@")) throw new Error("Invalid email format.");
    if (pass.length < 6) throw new Error("Password must be at least 6 characters.");
    return createUserWithEmailAndPassword(auth, email, pass);
};

export const signInWithEmail = async (email: string, pass: string): Promise<UserCredential> => {
    if (!email.includes("@")) throw new Error("Invalid email format.");
    if (!pass) throw new Error("Password is required.");
    return signInWithEmailAndPassword(auth, email, pass);
};

// Google → Firebase 로그인 변환
export const signInWithGoogleCredential = async (
    // auth param is kept for backward compat if needed, but we should use the imported one or passed one
    authInstance: Auth,
    idToken: string
): Promise<UserCredential> => {
    const credential = GoogleAuthProvider.credential(idToken);
    return signInWithCredential(authInstance, credential);
};

export const useGoogleAuthRequest = () => {
    const extra = Constants.expoConfig?.extra as any;

    const redirectUri = makeRedirectUri({
        scheme: "memotile", // app.json scheme
        path: "auth"
    });

    const [request, response, promptAsync] =
        Google.useIdTokenAuthRequest({
            webClientId: extra.googleWebClientId,
            iosClientId: extra.googleIosClientId,
            androidClientId: extra.googleAndroidClientId,
            redirectUri
        });

    return { request, response, promptAsync };
};
