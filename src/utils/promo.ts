import { db } from './firebase';
import {
    doc,
    runTransaction,
    Transaction,
    DocumentReference,
    DocumentSnapshot
} from 'firebase/firestore';

export type PromoType = 'percent' | 'amount' | 'free';

export interface PromoCode {
    code: string;
    type: PromoType;
    value: number;
    active: boolean;
    maxUses: number;
    usedCount: number;
    expiresAt?: any; // Firestore Timestamp
    currency?: string;
}

export interface PromoResult {
    success: boolean;
    data?: {
        type: PromoType;
        value: number;
        currency?: string;
    };
    error?: string;
}

/**
 * Verifies and redempts a promo code in a single atomic transaction.
 * Ensures the code is active, not expired, and usage count < maxUses.
 * Increments usedCount if successful.
 */
export const verifyAndRedeemPromo = async (code: string, userId: string): Promise<PromoResult> => {
    if (!code) {
        return { success: false, error: 'Empty code' };
    }

    const promoRef = doc(db, 'promoCodes', code) as DocumentReference;

    try {
        const result = await runTransaction(db, async (transaction: Transaction) => {
            const promoDoc = await transaction.get(promoRef);

            if (!promoDoc.exists()) {
                throw new Error('Invalid code');
            }

            const promoData = promoDoc.data() as PromoCode;

            // 1. Check Active
            if (!promoData.active) {
                throw new Error('Code is inactive');
            }

            // 2. Check Expiry
            if (promoData.expiresAt) {
                const now = new Date();
                const expiry = promoData.expiresAt.toDate ? promoData.expiresAt.toDate() : new Date(promoData.expiresAt);
                if (now > expiry) {
                    throw new Error('Code expired');
                }
            }

            // 3. Check Usage Limits
            if (promoData.usedCount >= promoData.maxUses) {
                throw new Error('Usage limit reached');
            }

            // TODO: Check if user already used this code (if we had a redemption history collection)
            // For now, simple counter decrement

            // 4. Increment usedCount
            transaction.update(promoRef, {
                usedCount: promoData.usedCount + 1
            });

            // Optional: Record redemption
            // const redemptionRef = doc(collection(db, 'redemptions'));
            // transaction.set(redemptionRef, { code, userId, timestamp: serverTimestamp() });

            return {
                type: promoData.type,
                value: promoData.value,
                currency: promoData.currency
            };
        });

        return { success: true, data: result };

    } catch (e: any) {
        console.warn("Promo Transaction Failed:", e);
        // Map common errors or return generic
        let msg = 'Invalid or expired code';
        if (e.message === 'Invalid code' || e.message === 'Code is inactive' || e.message === 'Usage limit reached' || e.message === 'Code expired') {
            msg = e.message;
        }
        return { success: false, error: msg };
    }
};
