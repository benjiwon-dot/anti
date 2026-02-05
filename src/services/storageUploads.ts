import * as FileSystem from "expo-file-system/legacy";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { storage, db } from "../lib/firebase";
import { OrderItem } from "../types/order";

type UploadKind = "preview" | "print";

function inferContentType(uri: string): string {
    const u = uri.toLowerCase();
    if (u.endsWith(".png")) return "image/png";
    if (u.endsWith(".webp")) return "image/webp";
    if (u.endsWith(".jpeg") || u.endsWith(".jpg")) return "image/jpeg";
    if (u.endsWith(".heic") || u.endsWith(".heif")) return "image/heic";
    return "image/jpeg";
}

function guessExtFromContentType(ct: string): string {
    if (ct === "image/png") return "png";
    if (ct === "image/webp") return "webp";
    if (ct === "image/heic") return "heic";
    return "jpg";
}

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(fn: () => Promise<T>, opts?: { tries?: number; baseDelayMs?: number }) {
    const tries = opts?.tries ?? 3;
    const baseDelayMs = opts?.baseDelayMs ?? 350;

    let lastErr: any;
    for (let attempt = 1; attempt <= tries; attempt++) {
        try {
            return await fn();
        } catch (e: any) {
            lastErr = e;
            const code = e?.code || "";
            const retryable =
                code === "storage/unknown" ||
                code === "storage/retry-limit-exceeded" ||
                code === "storage/network-request-failed";

            if (!retryable || attempt === tries) break;

            const backoff = baseDelayMs * Math.pow(2, attempt - 1);
            await sleep(backoff);
        }
    }
    throw lastErr;
}

/**
 * Uploads a local URI to Firebase Storage (RN/Expo-safe)
 * - strictly base64 uploadString
 */
export async function uploadLocalUriToStorage(params: {
    localUri: string;
    uid: string;
    orderId: string;
    index: number;
    kind: UploadKind;
}): Promise<string> {
    const { localUri, uid, orderId, index, kind } = params;

    const contentType = inferContentType(localUri);
    const ext = guessExtFromContentType(contentType);
    const storagePath = `orders/${uid}/${orderId}/items/${index}/${kind}.${ext}`;

    if (__DEV__) {
        console.log(`[StorageUpload] uid=${uid}, orderId=${orderId}, path=${storagePath}`);
    }

    try {
        const result = await withRetry(async () => {
            // 1) base64 read (NO blob/ArrayBuffer pathway)
            const base64 = await FileSystem.readAsStringAsync(localUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // 2) guard: ensure non-empty
            if (!base64 || base64.length === 0) throw new Error(`File content empty or read failed: ${localUri}`);

            // 3) upload base64
            const storageRef = ref(storage, storagePath);
            await uploadString(storageRef, base64, "base64", {
                contentType,
                cacheControl: "public,max-age=31536000",
            });

            const downloadURL = await getDownloadURL(storageRef);

            if (__DEV__) {
                console.log(`[StorageUpload] Success! path=${storagePath}`);
            }

            return downloadURL;
        });

        return result;
    } catch (error: any) {
        console.error(`[StorageUpload] Failed for ${localUri}: ${error?.code || error?.message}`);
        throw error;
    }
}

/**
 * Background task to upload all images for an order
 */
export async function uploadOrderImages(params: { orderId: string; uid: string; items: OrderItem[] }) {
    const { orderId, uid, items } = params;
    const orderRef = doc(db, "orders", orderId);

    const updatedItems = [...items];
    let hasChanges = false;

    for (let i = 0; i < updatedItems.length; i++) {
        const item = updatedItems[i];

        if (item.previewUri && !item.previewUrl) {
            try {
                const url = await uploadLocalUriToStorage({ localUri: item.previewUri, uid, orderId, index: i, kind: "preview" });
                updatedItems[i].previewUrl = url;
                hasChanges = true;
                console.log(`[StorageUpload] Preview ${i} uploaded`);
            } catch (e) {
                console.warn(`[StorageUpload] Failed preview ${i}`, e);
            }
        }

        if (item.printUri && !item.printUrl) {
            try {
                const url = await uploadLocalUriToStorage({ localUri: item.printUri, uid, orderId, index: i, kind: "print" });
                updatedItems[i].printUrl = url;
                hasChanges = true;
                console.log(`[StorageUpload] Print ${i} uploaded`);
            } catch (e) {
                console.warn(`[StorageUpload] Failed print ${i}`, e);
            }
        }
    }

    if (hasChanges) {
        await updateDoc(orderRef, { items: updatedItems });
        console.log(`[StorageUpload] Firestore doc ${orderId} updated with downloadUrls`);
    }
}
