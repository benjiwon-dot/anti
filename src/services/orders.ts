import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    DocumentReference
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { uploadLocalUriToStorage } from './storageUploads';
import { OrderDoc, OrderItem } from '../types/order';

/**
 * Generates a random 7-character alphanumeric string.
 */
function generateOrderCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 7; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Creates a "DEV_FREE" order and uploads photos to Storage.
 */
export async function createDevOrder(params: {
    uid: string;
    shipping: OrderDoc['shipping'];
    photos: any[]; // The photos from editor context
    totals: {
        subtotal: number;
        discount: number;
        shippingFee: number;
        total: number;
    };
    promoCode?: {
        code: string;
        discountType: string;
        discountValue: number;
    };
    locale?: string;
}): Promise<string> {
    const { uid, shipping, photos, totals, promoCode, locale = 'EN' } = params;

    // 1. Generate Order ID
    const orderRef = doc(collection(db, 'orders')) as DocumentReference;
    const orderId = orderRef.id;
    const orderCode = generateOrderCode();

    // 2. Prepare Items
    const items: OrderItem[] = photos.map((p, index) => ({
        index,
        quantity: p.quantity || 1,
        previewUri: p.output?.previewUri || p.uri,
        printUri: p.output?.printUri || p.uri,
        filterId: p.edits?.filterId || "original",
        cropPx: p.edits?.committed?.cropPx || null,
        unitPrice: totals.subtotal / photos.length || 0,
        lineTotal: (totals.subtotal / photos.length || 0) * (p.quantity || 1),
        size: "20x20"
    }));

    // 3. Create initial Firestore document
    const orderData: Omit<OrderDoc, 'id'> = {
        uid,
        orderCode,
        itemsCount: items.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'paid',
        currency: 'THB',
        subtotal: totals.subtotal,
        discount: totals.discount,
        shippingFee: totals.shippingFee,
        total: totals.total,
        customer: {
            email: shipping.email,
            fullName: shipping.fullName,
            phone: shipping.phone
        },
        shipping,
        items,
        payment: {
            provider: totals.total === 0 ? 'PROMO_FREE' : 'DEV_FREE',
            transactionId: `SIM_${orderCode}`,
            method: 'FREE',
            paidAt: serverTimestamp()
        },
        paymentMethod: 'FREE',
        locale
    };

    if (promoCode) {
        orderData.promoCode = promoCode.code;
        (orderData as any).promo = promoCode;
    }

    await setDoc(orderRef, orderData);

    // 4. Upload Photos to Storage
    const updatedItems = [...items];
    const uploadPromises = updatedItems.map(async (item, i) => {
        try {
            if (item.previewUri) {
                // Using user requested path: orders/{orderId}/items/{index}/preview.jpg
                const previewPath = `orders/${orderId}/items/${i}/preview.jpg`;
                item.previewUrl = await uploadLocalUriToStorage(item.previewUri, previewPath);
            }
            if (item.printUri) {
                const printPath = `orders/${orderId}/items/${i}/print.jpg`;
                item.printUrl = await uploadLocalUriToStorage(item.printUri, printPath);
            }
        } catch (e) {
            console.warn(`[OrderService] Upload failed for item ${i}`, e);
        }
    });

    await Promise.all(uploadPromises);

    // 5. Update Firestore with download URLs
    await updateDoc(orderRef, {
        items: updatedItems,
        updatedAt: serverTimestamp()
    });

    return orderId;
}

export async function listOrders(uid: string): Promise<OrderDoc[]> {
    if (!uid) return [];
    try {
        const q = query(
            collection(db, 'orders'),
            where('uid', '==', uid),
            orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderDoc));
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            console.error("[OrderService] listOrders failed: Permission denied. Check Firestore rules.", e);
        } else if (e.code === 'unauthenticated') {
            console.error("[OrderService] listOrders failed: User not authenticated.", e);
        } else {
            console.error("[OrderService] listOrders failed:", e);
        }

        // Fallback if index is not created yet
        try {
            const qBasic = query(
                collection(db, 'orders'),
                where('uid', '==', uid)
            );
            const snap = await getDocs(qBasic);
            const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderDoc));
            return orders.sort((a, b) => {
                const dateA = a.createdAt?.seconds || (new Date(a.createdAt).getTime() / 1000) || 0;
                const dateB = b.createdAt?.seconds || (new Date(b.createdAt).getTime() / 1000) || 0;
                return dateB - dateA;
            });
        } catch (innerE) {
            console.error("[OrderService] listOrders fallback failed:", innerE);
            throw innerE;
        }
    }
}

export async function getOrder(orderId: string): Promise<OrderDoc | null> {
    const docRef = doc(db, 'orders', orderId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as OrderDoc;
}

export function subscribeOrder(orderId: string, callback: (order: OrderDoc | null) => void) {
    const docRef = doc(db, 'orders', orderId);
    return onSnapshot(docRef, (snap) => {
        if (!snap.exists()) {
            callback(null);
        } else {
            callback({ id: snap.id, ...snap.data() } as OrderDoc);
        }
    });
}
