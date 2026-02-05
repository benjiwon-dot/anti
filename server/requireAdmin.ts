// Server-only. Do not import in Expo client.
import { adminAuth, adminDb } from "./firebaseAdmin";

export interface AdminAuthResult {
    ok: boolean;
    status: number;
    message: string;
    uid?: string;
    decoded?: any;
}

/**
 * Authenticates the request using Firebase ID Token.
 * Enforces 'isAdmin' custom claim.
 * Includes a bypass for development via ADMIN_DEV_BEARER.
 */
export async function verifyAdmin(authHeader?: string): Promise<AdminAuthResult> {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return { ok: false, status: 401, message: "Unauthorized: Missing Bearer token" };
    }

    const token = authHeader.split(" ")[1];

    // 1. Development Bypass
    const devBearer = process.env.ADMIN_DEV_BEARER || process.env.NEXT_PUBLIC_ADMIN_BEARER;
    if (__DEV__ && devBearer && token === devBearer) {
        console.log("[AuthGuard] Admin access granted via dev bearer bypass");
        return { ok: true, status: 200, message: "Authorized (Dev Bypass)", uid: "dev-admin" };
    }

    // 2. Production Token Verification
    try {
        const decodedToken = await adminAuth.verifyIdToken(token);

        // Check for custom claim 'isAdmin'
        if (decodedToken.isAdmin !== true) {
            console.warn(`[AuthGuard] Access denied for user ${decodedToken.uid}: missing isAdmin claim`);
            return { ok: false, status: 403, message: "Forbidden: Admin access required" };
        }

        return { ok: true, status: 200, message: "Authorized", uid: decodedToken.uid, decoded: decodedToken };
    } catch (error: any) {
        console.error("[AuthGuard] Token verification failed", error.message);
        return { ok: false, status: 401, message: "Unauthorized: Invalid token" };
    }
}
