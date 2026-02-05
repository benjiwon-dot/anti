// src/services/orders.ts
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
    DocumentReference,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { uploadLocalUriToStorage } from "./storageUploads";
import { OrderDoc, OrderItem } from "../types/order";

/**
 * Generates a random 7-character alphanumeric string.
 */
function generateOrderCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 7; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

/** simple concurrency limiter */
async function runWithConcurrency(tasks: Array<() => Promise<void>>, concurrency = 2) {
    const queue = [...tasks];
    const workers = new Array(Math.max(1, concurrency)).fill(0).map(async () => {
        while (queue.length) {
            const t = queue.shift();
            if (!t) break;
            await t();
        }
    });
    await Promise.all(workers);
}

/**
 * Creates a "DEV_FREE" order and uploads photos to Storage.
 */
export async function createDevOrder(params: {
    uid: string;
    shipping: OrderDoc["shipping"];
    photos: any[];
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
    const { uid, shipping, photos, totals, promoCode, locale = "EN" } = params;

    // 1. Generate Order ID
    const orderRef = doc(collection(db, "orders")) as DocumentReference;
    const orderId = orderRef.id;
    const orderCode = generateOrderCode();

    // 2. Prepare Items
    const items: OrderItem[] = photos.map((p, index) => ({
        index,
        quantity: p.quantity || 1,
        previewUri: p.output?.previewUri || p.uri,
        printUri: p.output?.printUri || p.uri,
        filterId: p.edits?.filterId || "original",
        filterParams: p.edits?.committed?.filterParams || p.edits?.filterParams || null,
        cropPx: p.edits?.committed?.cropPx || null,
        unitPrice: totals.subtotal / photos.length || 0,
        lineTotal: (totals.subtotal / photos.length || 0) * (p.quantity || 1),
        size: "20x20",
    }));

    console.log(`[OrderService] Starting uploads for ${photos.length} items...`);

    const updatedItems = [...items];

    try {
        if (!uid) throw new Error("User identifier (uid) is missing. Cannot upload photos.");

        // Build upload tasks (preview + print per item), but run with limited concurrency
        const tasks: Array<() => Promise<void>> = [];

        updatedItems.forEach((item, i) => {
            if (item.previewUri && !item.previewUrl) {
                tasks.push(async () => {
                    item.previewUrl = await uploadLocalUriToStorage({
                        localUri: item.previewUri,
                        uid,
                        orderId,
                        index: i,
                        kind: "preview",
                    });
                    console.log(`[OrderService] Preview ${i} uploaded`);
                });
            }
            if (item.printUri && !item.printUrl) {
                tasks.push(async () => {
                    item.printUrl = await uploadLocalUriToStorage({
                        localUri: item.printUri!,
                        uid,
                        orderId,
                        index: i,
                        kind: "print",
                    });
                    console.log(`[OrderService] Print ${i} uploaded`);
                });
            }
        });

        // concurrency=2 (안정성 최우선). 필요하면 3까지 올릴 수 있음.
        await runWithConcurrency(tasks, 2);

        console.log(`[OrderService] All uploads completed.`);
    } catch (e) {
        console.error(`[OrderService] Upload failed. Aborting order creation.`, e);
        throw new Error("Failed to upload photos. Please try again.");
    }

    // 4. Create Firestore document with FULL data including URLs
    const orderData: Omit<OrderDoc, "id"> = {
        uid,
        orderCode,
        itemsCount: updatedItems.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: "paid",
        currency: "THB",
        subtotal: totals.subtotal,
        discount: totals.discount,
        shippingFee: totals.shippingFee,
        total: totals.total,
        customer: {
            email: shipping.email,
            fullName: shipping.fullName,
            phone: shipping.phone,
        },
        shipping,
        items: updatedItems,
        payment: {
            provider: totals.total === 0 ? "PROMO_FREE" : "DEV_FREE",
            transactionId: `SIM_${orderCode}`,
            method: "FREE",
            paidAt: serverTimestamp(),
        },
        paymentMethod: "FREE",
        locale,
    };

    if (promoCode) {
        orderData.promoCode = promoCode.code;
        (orderData as any).promo = promoCode;
    }

    await setDoc(orderRef, orderData);
    console.log(`[OrderService] Firestore order ${orderId} created successfully.`);

    return orderId;
}


/**
 * Retrieves a single order by ID.
 */
export async function getOrder(orderId: string): Promise<OrderDoc | null> {
    const docRef = doc(db, "orders", orderId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as OrderDoc;
}

/**
 * Lists all orders for a specific user.
 */
export async function listOrders(uid: string): Promise<OrderDoc[]> {
    const q = query(
        collection(db, "orders"),
        where("uid", "==", uid),
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderDoc));
}

/**
 * Subscribes to a specific order doc.
 */
export function subscribeOrder(orderId: string, onUpdate: (order: OrderDoc | null) => void) {
    const docRef = doc(db, "orders", orderId);
    return onSnapshot(docRef, (snap) => {
        if (!snap.exists()) {
            onUpdate(null);
        } else {
            onUpdate({ id: snap.id, ...snap.data() } as OrderDoc);
        }
    });
}
