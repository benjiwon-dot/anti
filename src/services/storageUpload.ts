import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";

/**
 * Uploads a local file URI to Firebase Storage at the specified path.
 * Converts file:// to blob before uploading.
 */
export async function uploadFileUriToStorage(path: string, fileUri: string) {
    const res = await fetch(fileUri);
    const blob = await res.blob();

    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, blob, {
        cacheControl: "public,max-age=31536000",
        contentType: "image/jpeg"
    });

    const downloadUrl = await getDownloadURL(storageRef);
    return { path, downloadUrl };
}
