import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app, db } from "./firebase";
import { doc, writeBatch } from "firebase/firestore";
import * as FileSystem from 'expo-file-system';

const storage = getStorage(app);

export const uploadOrderPhotos = async (orderId: string, photos: any[]) => {
    const batch = writeBatch(db);
    const orderRef = doc(db, "orders", orderId);

    const uploads = photos.map(async (photo, index) => {
        const printUri = photo.output?.printUri || photo.uri; // Fallback? careful
        if (!printUri) return null;

        try {
            // 1. Fetch Blob
            const response = await fetch(printUri);
            const blob = await response.blob();

            // 2. Upload
            const filename = `photo_${index}_print.jpg`;
            const storageRef = ref(storage, `orders/${orderId}/photos/${filename}`);
            await uploadBytes(storageRef, blob);
            const downloadUrl = await getDownloadURL(storageRef);

            // 3. Firestore Metadata (batch)
            const itemRef = doc(db, `orders/${orderId}/items`, `photo_${index}`);
            batch.set(itemRef, {
                originalUri: photo.uri,
                storagePath: storageRef.fullPath,
                downloadUrl,
                edits: photo.edits || {},
                index,
                type: 'print_asset'
            });

            return downloadUrl;
        } catch (e) {
            console.error(`Upload failed for photo ${index}`, e);
            throw e;
        }
    });

    await Promise.all(uploads);
    await batch.commit();
};
