import * as FileSystem from 'expo-file-system';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '../lib/firebase';
import { OrderItem } from '../types/order';

/**
 * Uploads a local URI to Firebase Storage
 */
export async function uploadLocalUriToStorage(localUri: string, storagePath: string): Promise<string> {
    try {
        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(localUri, {
            encoding: FileSystem.EncodingType.Base64
        });

        // Convert to blob
        const res = await fetch("data:image/jpeg;base64," + base64);
        const blob = await res.blob();

        // Upload to storage
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });

        // Return download URL
        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error(`[StorageUpload] Failed for ${localUri}:`, error);
        throw error;
    }
}

/**
 * Background task to upload all images for an order
 */
export async function uploadOrderImages(params: {
    orderId: string;
    uid: string;
    items: OrderItem[];
}) {
    const { orderId, uid, items } = params;
    const orderRef = doc(db, 'orders', orderId);

    const updatedItems = [...items];
    let hasChanges = false;

    for (let i = 0; i < updatedItems.length; i++) {
        const item = updatedItems[i];

        // 1. Upload Preview
        if (item.previewUri && !item.previewUrl) {
            try {
                const path = `orders/${uid}/${orderId}/preview_${i}.jpg`;
                const url = await uploadLocalUriToStorage(item.previewUri, path);
                updatedItems[i].previewUrl = url;
                hasChanges = true;
                console.log(`[StorageUpload] Preview ${i} uploaded`);
            } catch (e) {
                console.warn(`[StorageUpload] Failed preview ${i}`, e);
            }
        }

        // 2. Upload Print (High Res)
        if (item.printUri && !item.printUrl) {
            try {
                const path = `orders/${uid}/${orderId}/print_${i}.jpg`;
                const url = await uploadLocalUriToStorage(item.printUri, path);
                updatedItems[i].printUrl = url;
                hasChanges = true;
                console.log(`[StorageUpload] Print ${i} uploaded`);
            } catch (e) {
                console.warn(`[StorageUpload] Failed print ${i}`, e);
            }
        }
    }

    if (hasChanges) {
        try {
            await updateDoc(orderRef, { items: updatedItems });
            console.log(`[StorageUpload] Firestore doc ${orderId} updated with downloadUrls`);
        } catch (e) {
            console.error(`[StorageUpload] Failed to update Firestore doc ${orderId}`, e);
        }
    }
}
