import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase';

export type AdminStatus = 'loading' | 'allowed' | 'denied';
export type DeniedReason = 'NO_USER' | 'NOT_ALLOWED_EMAIL' | 'NOT_ADMIN' | 'ERROR';

export type AdminGate =
    | { status: 'loading' }
    | { status: 'denied', reason: DeniedReason, email?: string | null, claims?: any, message?: string }
    | { status: 'allowed', email: string, claims: any };

const ALLOWED_EMAILS = new Set(["ben.jiwon@kangkook.com"]);

/**
 * Client-side hook to enforce admin access.
 * Returns a structured AdminGate object.
 * 
 * NOTE: This hook does NOT perform any side-effect redirects.
 * The UI components are responsible for rendering login forms or messages.
 */
export function useRequireAdmin(): AdminGate {
    const [gate, setGate] = useState<AdminGate>({ status: 'loading' });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log("ADMIN_GATE auth state changed", { hasUser: !!firebaseUser });

            if (!firebaseUser) {
                console.log("ADMIN_GATE: No user found");
                setGate({ status: 'denied', reason: 'NO_USER' });
                return;
            }

            const email = firebaseUser.email?.toLowerCase();

            // 1. Check allowed email
            if (!email || !ALLOWED_EMAILS.has(email)) {
                console.warn(`[useRequireAdmin] Email ${email} not in allowlist.`);
                setGate({
                    status: 'denied',
                    reason: 'NOT_ALLOWED_EMAIL',
                    email: firebaseUser.email
                });
                return;
            }

            try {
                // 2. Check custom claim isAdmin
                // Force refresh to get latest claims
                const tokenResult = await firebaseUser.getIdTokenResult(true);
                console.log("ADMIN_GATE: Claims received", tokenResult.claims);

                const isAdmin = tokenResult.claims.isAdmin === true;

                if (isAdmin) {
                    console.log("ADMIN_GATE: Access granted (isAdmin: true)");
                    setGate({
                        status: 'allowed',
                        email: firebaseUser.email!,
                        claims: tokenResult.claims
                    });
                } else {
                    console.warn(`[useRequireAdmin] User ${firebaseUser.uid} does not have isAdmin claim.`);
                    setGate({
                        status: 'denied',
                        reason: 'NOT_ADMIN',
                        email: firebaseUser.email,
                        claims: tokenResult.claims
                    });
                }
            } catch (error: any) {
                console.error("ADMIN_GATE: Error checking admin claims", error);
                setGate({
                    status: 'denied',
                    reason: 'ERROR',
                    email: firebaseUser.email,
                    message: error.message
                });
            }
        });

        return () => unsubscribe();
    }, []);

    return gate;
}
