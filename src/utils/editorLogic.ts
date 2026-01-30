import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Skia } from "@shopify/react-native-skia";
import { IDENTITY, type ColorMatrix } from './colorMatrix';

/**
 * Applies a color matrix filter to a URI using offscreen Skia.
 * Returns a new local URI.
 */
export const applyFilterToUri = async (uri: string, matrix: ColorMatrix) => {
    if (!matrix || JSON.stringify(matrix) === JSON.stringify(IDENTITY)) {
        return uri;
    }

    // 1. Load image data
    const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: (FileSystem as any).EncodingType?.Base64 || 'base64',
    });
    const data = Skia.Data.fromBase64(base64);
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (!image) return uri;

    const width = image.width();
    const height = image.height();

    // 2. Offscreen render
    // Use Skia.MakeSurface if it exists, otherwise Skia.Surface.MakeRasterN32Premul
    const surface = (Skia as any).MakeSurface?.(width, height) ||
        (Skia.Surface as any).MakeRasterN32Premul?.(width, height);
    if (!surface) return uri;

    const canvas = surface.getCanvas();
    const paint = Skia.Paint();
    paint.setColorFilter(Skia.ColorFilter.MakeMatrix(matrix));

    canvas.drawImage(image, 0, 0, paint);

    // 3. Save
    const snapshot = surface.makeImageSnapshot();
    const encoded = snapshot.encodeToData(3, 90); // 3 is JPEG
    if (!encoded) return uri;

    const dest = `${(FileSystem as any).cacheDirectory}filtered_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(dest, encoded.toBase64(), {
        encoding: (FileSystem as any).EncodingType?.Base64 || 'base64',
    });

    return dest;
};

/**
 * Generates a fast preview export (max 1200px).
 */
export const generatePreviewExport = async (
    uri: string,
    cropRect: { x: number; y: number; width: number; height: number },
    matrix?: ColorMatrix
) => {
    const cropAction = {
        crop: {
            originX: cropRect.x,
            originY: cropRect.y,
            width: cropRect.width,
            height: cropRect.height,
        }
    };

    // Resize for preview
    const resizeAction = { resize: { width: Math.min(cropRect.width, 1200) } };

    const result = await manipulateAsync(
        uri,
        [cropAction, resizeAction],
        { compress: 0.8, format: SaveFormat.JPEG }
    );

    let finalUri = result.uri;
    if (matrix) {
        finalUri = await applyFilterToUri(finalUri, matrix);
    }

    return { uri: finalUri, width: result.width, height: result.height };
};

/**
 * Generates a high-quality print export (max 5000px).
 */
export const generatePrintExport = async (
    uri: string,
    cropRect: { x: number; y: number; width: number; height: number },
    matrix?: ColorMatrix
) => {
    const cropAction = {
        crop: {
            originX: cropRect.x,
            originY: cropRect.y,
            width: cropRect.width,
            height: cropRect.height,
        }
    };

    // Resize only if larger than 5000px
    const actions: any[] = [cropAction];
    // We strictly avoid upscaling.
    if (cropRect.width > 5000 || cropRect.height > 5000) {
        actions.push({ resize: { width: 5000 } }); // maintains aspect ratio
    }

    const result = await manipulateAsync(
        uri,
        actions,
        { compress: 0.95, format: SaveFormat.JPEG }
    );

    let finalUri = result.uri;
    if (matrix) {
        finalUri = await applyFilterToUri(finalUri, matrix);
    }

    return { uri: finalUri, width: result.width, height: result.height };
};
