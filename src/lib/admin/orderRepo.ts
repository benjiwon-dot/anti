import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    doc,
    getDoc
} from "firebase/firestore";
import { db } from "../firebase";
import {
    OrderHeader,
    OrderDetail,
    OrderItemAdmin,
    OrderStatus,
    ListOrdersParams
} from "./types";

/**
 * Normalizes Firestore timestamps to ISO strings.
 */
function toISO(ts: any): string {
    if (!ts) return new Date().toISOString();
    if (typeof ts.toDate === "function") return ts.toDate().toISOString();
    if (ts instanceof Date) return ts.toISOString();
    if (typeof ts === "string") return ts;
    if (typeof ts === "number") return new Date(ts).toISOString();
    // Firestore Timestamp check
    if (ts.seconds !== undefined) return new Date(ts.seconds * 1000).toISOString();
    return new Date().toISOString();
}

/**
 * Normalizes customer data from various legacy formats.
 */
function normalizeCustomer(data: any): any {
    return {
        fullName: data.customer?.fullName || data.customer?.name || data.shipping?.fullName || "Guest",
        email: data.customer?.email || data.uid || "no-email",
        phone: data.customer?.phone || data.shipping?.phone || "",
    };
}

export async function listOrders(params: ListOrdersParams): Promise<{ rows: OrderHeader[]; nextCursor?: string }> {
    const { q, status, country, limit: limitCount = 20 } = params;

    let qry = query(collection(db, "orders"), orderBy("createdAt", "desc"));

    if (status && status !== "ALL") {
        qry = query(qry, where("status", "==", status));
    }

    if (q && q.trim().length > 0) {
        qry = query(qry, where("orderCode", "==", q.trim().toUpperCase()));
    }

    const snap = await getDocs(query(qry, limit(limitCount)));

    let rows: OrderHeader[] = snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            orderCode: data.orderCode || d.id.slice(-7).toUpperCase(),
            status: data.status as OrderStatus,
            createdAt: toISO(data.createdAt),
            updatedAt: toISO(data.updatedAt),
            uid: data.uid,
            currency: data.currency || "THB",
            pricing: data.pricing || {
                subtotal: data.subtotal || 0,
                shippingFee: data.shippingFee || 0,
                discount: data.discount || 0,
                total: data.total || 0,
            },
            customer: normalizeCustomer(data),
            shipping: data.shipping || {},
            payment: {
                provider: data.payment?.provider || data.paymentMethod || "UNKNOWN",
                transactionId: data.payment?.transactionId || "",
                method: data.payment?.method || "",
                paidAt: toISO(data.payment?.paidAt),
            },
            itemsCount: data.itemsCount || data.items?.length || 0,
            storageBasePath: data.storageBasePath,
            locale: data.locale || "EN",
        };
    });

    if (country && country !== "ALL") {
        rows = rows.filter(r => r.shipping?.country === country);
    }

    return { rows };
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
    const docRef = doc(db, "orders", orderId);
    const d = await getDoc(docRef);

    if (!d.exists()) return null;

    const data = d.data()!;
    const header: OrderHeader = {
        id: d.id,
        orderCode: data.orderCode || d.id.slice(-7).toUpperCase(),
        status: data.status as OrderStatus,
        createdAt: toISO(data.createdAt),
        updatedAt: toISO(data.updatedAt),
        uid: data.uid,
        currency: data.currency || "THB",
        pricing: data.pricing || {
            subtotal: data.subtotal || 0,
            shippingFee: data.shippingFee || 0,
            discount: data.discount || 0,
            total: data.total || 0,
        },
        customer: normalizeCustomer(data),
        shipping: data.shipping || {},
        payment: {
            provider: data.payment?.provider || data.paymentMethod || "UNKNOWN",
            transactionId: data.payment?.transactionId || "",
            method: data.payment?.method || "",
            paidAt: toISO(data.payment?.paidAt),
        },
        itemsCount: data.itemsCount || data.items?.length || 0,
        storageBasePath: data.storageBasePath,
        locale: data.locale || "EN",
    };

    // Subcollection items
    const itemsSnap = await getDocs(query(collection(db, "orders", orderId, "items"), orderBy("index", "asc")));
    let items: OrderItemAdmin[] = [];

    if (!itemsSnap.empty) {
        items = itemsSnap.docs.map(i => {
            const idata = i.data();
            return {
                index: idata.index,
                size: idata.size || "20x20",
                quantity: idata.quantity || 1,
                unitPrice: idata.unitPrice || 0,
                lineTotal: idata.lineTotal || 0,
                filterId: idata.filterId || "original",
                crop: idata.crop || idata.cropPx,
                assets: idata.assets || {
                    previewUrl: idata.previewUrl,
                    printUrl: idata.printUrl,
                    previewPath: idata.previewPath || idata.storagePath,
                    printPath: idata.printPath || idata.printStoragePath,
                },
            };
        });
    } else if (data.items && Array.isArray(data.items)) {
        items = data.items.map((idata: any, idx: number) => ({
            index: idata.index ?? idx,
            size: idata.size || "20x20",
            quantity: idata.quantity || 1,
            unitPrice: idata.unitPrice || 0,
            lineTotal: idata.lineTotal || 0,
            filterId: idata.filterId || "original",
            crop: idata.crop || idata.cropPx,
            assets: {
                previewUrl: idata.previewUrl,
                printUrl: idata.printUrl,
                previewPath: idata.storagePath,
                printPath: idata.printStoragePath,
            },
        }));
    }

    return { ...header, items };
}
