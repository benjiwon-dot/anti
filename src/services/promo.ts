import {
    doc,
    runTransaction,
    serverTimestamp,
    DocumentReference,
    collection
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export type PromoType = 'percent' | 'amount';

export interface PromoCode {
    code: string;
    type: PromoType;
    value: number;
    active: boolean;
    maxRedemptions?: number;
    redeemedCount?: number;
    expiresAt?: any; // Timestamp
}

export interface PromoResult {
    success: boolean;
    discountAmount: number;
    total: number;
    promoCode?: string;
    discountType?: PromoType;
    discountValue?: number;
    error?: string;
}

/**
 * Validates a promo code and records redemption in a single transaction.
 */
export const validatePromo = async (
    code: string,
    uid: string,
    subtotal: number
): Promise<PromoResult> => {
    if (!code) return { success: false, discountAmount: 0, total: subtotal, error: 'Empty code' };

    const promoRef = doc(db, 'promoCodes', code.toUpperCase()) as DocumentReference;
    const redemptionRef = doc(db, 'promoRedemptions', `${code.toUpperCase()}_${uid}`);

    try {
        const result = await runTransaction(db, async (transaction) => {
            const promoSnap = await transaction.get(promoRef);

            if (!promoSnap.exists()) {
                throw new Error('promoInvalid');
            }

            const data = promoSnap.data() as PromoCode;

            // 1. Check Active
            if (!data.active) {
                throw new Error('promoInvalid');
            }

            // 2. Check Expiry
            if (data.expiresAt) {
                const now = new Date();
                const expiry = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
                if (now > expiry) {
                    throw new Error('promoExpired');
                }
            }

            // 3. Check Max Redemptions
            if (data.maxRedemptions && (data.redeemedCount || 0) >= data.maxRedemptions) {
                throw new Error('promoLimitReached');
            }

            // 4. Check if user already used it (redundant but safe)
            const redemptionSnap = await transaction.get(redemptionRef);
            if (redemptionSnap.exists()) {
                throw new Error('promoAlreadyUsed');
            }

            // Calculate Discount
            let discountAmount = 0;
            if (data.type === 'percent') {
                discountAmount = (subtotal * data.value) / 100;
            } else {
                discountAmount = data.value;
            }

            // Clamp discount
            discountAmount = Math.min(discountAmount, subtotal);
            const finalTotal = subtotal - discountAmount;

            // Update Promo usage count
            transaction.update(promoRef, {
                redeemedCount: (data.redeemedCount || 0) + 1
            });

            // Create Redemption record
            transaction.set(redemptionRef, {
                code: code.toUpperCase(),
                uid,
                createdAt: serverTimestamp()
            });

            return {
                discountAmount,
                total: finalTotal,
                promoCode: code.toUpperCase(),
                discountType: data.type,
                discountValue: data.value
            };
        });

        return { success: true, ...result };

    } catch (e: any) {
        console.warn("[PromoService] Validation Failed:", e.message);
        return {
            success: false,
            discountAmount: 0,
            total: subtotal,
            error: e.message || 'promoInvalid'
        };
    }
};
