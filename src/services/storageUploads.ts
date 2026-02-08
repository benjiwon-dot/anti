import * as FileSystem from "expo-file-system/legacy";
import { ref, getDownloadURL, uploadBytes } from "firebase/storage";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { storage, db } from "../lib/firebase";
import { OrderItem } from "../types/order";
import { stripUndefined } from "../utils/firestore";

type UploadKind = "print"; // ✅ print only

function inferContentType(uri: string): string {
    const u = uri.toLowerCase();
    if (u.endsWith(".png")) return "image/png";
    if (u.endsWith(".webp")) return "image/webp";
    if (u.endsWith(".heic") || u.endsWith(".heif")) return "image/heic";
    return "image/jpeg";
}

function guessExtFromContentType(ct: string): string {
    if (ct === "image/png") return "png";
    if (ct === "image/webp") return "webp";
    if (ct === "image/heic") return "heic";
    return "jpg";
}

function yyyymmdd(d = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}${m}${day}`;
}

function slugifyCustomer(input?: string): string {
    const s = (input || "").trim().toLowerCase();
    if (!s) return "customer";
    return s.replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "").slice(0, 24) || "customer";
}

function fallbackOrderCode(orderId: string): string {
    return orderId.slice(-8).toUpperCase();
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3) {
    let lastErr: any;
    for (let i = 0; i < tries; i++) {
        try {
            return await fn();
        } catch (e) {
            lastErr = e;
            await new Promise(r => setTimeout(r, 300 * Math.pow(2, i)));
        }
    }
    throw lastErr;
}

/**
 * Upload single PRINT image
 * orders/{date}/{orderCode}/{customerSlug}/items/{index}_print.jpg
 */
export async function uploadLocalUriToStorage(params: {
    localUri: string;
    orderId: string;
    index: number;
    kind: UploadKind;
    orderCode?: string;
    customerSlug?: string;
}): Promise<string> {
    const { localUri, orderId, index } = params;

    const contentType = inferContentType(localUri);
    const ext = guessExtFromContentType(contentType);

    const dateKey = yyyymmdd();
    const orderCode = params.orderCode || fallbackOrderCode(orderId);
    const customerSlug = params.customerSlug || "customer";

    const storagePath =
        `orders/${dateKey}/${orderCode}/${customerSlug}/items/${index}_print.${ext}`;

    return await withRetry(async () => {
        const info = await FileSystem.getInfoAsync(localUri);
        if (!info.exists || (info.size ?? 0) === 0) {
            throw new Error(`File missing: ${localUri}`);
        }

        const storageRef = ref(storage, storagePath);
        const blob = await (await fetch(localUri)).blob();

        await uploadBytes(storageRef, blob, {
            contentType,
            cacheControl: "public,max-age=31536000",
        });

        return await getDownloadURL(storageRef);
    });
}

/**
 * Upload all order print images
 */
export async function uploadOrderImages(params: {
    orderId: string;
    items: OrderItem[];
}) {
    const { orderId, items } = params;
    const orderRef = doc(db, "orders", orderId);

    let orderCode = "";
    let customerSlug = "customer";

    try {
        const snap = await getDoc(orderRef);
        if (snap.exists()) {
            const data: any = snap.data();
            orderCode = data?.orderCode || "";
            customerSlug = slugifyCustomer(data?.shipping?.fullName);
        }
    } catch { }

    if (!orderCode) orderCode = fallbackOrderCode(orderId);

    const updatedItems = [...items];
    let hasChanges = false;

    for (let i = 0; i < updatedItems.length; i++) {
        const item: any = updatedItems[i];
        if (item.printUri && !item.printUrl) {
            const url = await uploadLocalUriToStorage({
                localUri: item.printUri,
                orderId,
                index: i,
                kind: "print",
                orderCode,
                customerSlug,
            });

            updatedItems[i].printUrl = url;
            updatedItems[i].previewUrl = url; // UI 재사용
            hasChanges = true;
        }
    }

    if (hasChanges) {
        const dateKey = yyyymmdd();
        await updateDoc(orderRef, stripUndefined({
            items: updatedItems,
            storageBasePath: `orders/${dateKey}/${orderCode}/${customerSlug}`,
        }) as any);
    }
}
