/**
 * src/utils/cropMath.ts
 * 
 * Handles coordinate transformations matching legacy CropFrame.jsx behavior.
 * - Origin: CENTER
 * - Fit: COVER (Math.max ratio)
 */

export type Size = { width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };

export type PrecisionCropInput = {
    sourceSize: Size;
    containerSize: Size;
    frameRect: Rect;
    transform: { scale: number; translateX: number; translateY: number };
};

export type CropInput = {
    imageSize: Size;         // Source dimensions
    renderedRect: Rect;      // Base image position in container (before user transform)
    frameRect: Rect;         // Crop window in container
    transform: { scale: number; translateX: number; translateY: number };
};

export type CropResult = {
    x: number;
    y: number;
    width: number;
    height: number;
    isValid: boolean;
};

/**
 * Calculates the crop rectangle in SOURCE PIXELS with high precision.
 * Matches the transform order: [Translate(-w/2, -h/2), Scale(s), Translate(tx, ty)]
 * applied from container center (50%, 50%).
 */
export const calculatePrecisionCrop = (input: PrecisionCropInput): CropResult => {
    const { sourceSize, containerSize, frameRect, transform } = input;
    const { scale: s, translateX: tx, translateY: ty } = transform;

    if (__DEV__) {
        console.log("[CropMath] calculatePrecisionCrop Input:", JSON.stringify(input, null, 2));
    }

    // 1. Base Scale: How we render the image initially to fit the container (COVER)
    const baseScale = Math.max(
        containerSize.width / sourceSize.width,
        containerSize.height / sourceSize.height
    );

    // 2. Rendered dimensions at baseScale (untransformed scale=1)
    const rw = sourceSize.width * baseScale;
    const rh = sourceSize.height * baseScale;

    // 3. Center of the image in the container space
    // Since the image is centered at (containerW/2, containerH/2) and then translated by (tx, ty)
    const imgCenterX = containerSize.width / 2 + tx;
    const imgCenterY = containerSize.height / 2 + ty;

    // 4. Untransform frame corners from screen space to image local space (0..1 normalized)
    const untransformToNormalized = (screenX: number, screenY: number) => {
        // Distance from image center in screen pixels
        const dx = screenX - imgCenterX;
        const dy = screenY - imgCenterY;

        // Distance from image center in "rendered but unscaled" pixels
        const ux = dx / s;
        const uy = dy / s;

        // Offset from top-left of rendered image (0..rw, 0..rh)
        const localX = ux + rw / 2;
        const localY = uy + rh / 2;

        // Normalized (0..1)
        return {
            nx: localX / rw,
            ny: localY / rh
        };
    };

    const tl = untransformToNormalized(frameRect.x, frameRect.y);
    const br = untransformToNormalized(frameRect.x + frameRect.width, frameRect.y + frameRect.height);

    // 5. Convert Normalized to Source Pixels
    // TL은 내림, BR은 올림으로 잡아서 “밀림” 방지
    let sx = Math.floor(tl.nx * sourceSize.width);
    let sy = Math.floor(tl.ny * sourceSize.height);

    const ex = Math.ceil(br.nx * sourceSize.width);
    const ey = Math.ceil(br.ny * sourceSize.height);

    let sw = ex - sx;
    let sh = ey - sy;

    // 6. Assertions and Clamping
    const original = { sx, sy, sw, sh };

    sx = Math.max(0, Math.min(sx, sourceSize.width - 1));
    sy = Math.max(0, Math.min(sy, sourceSize.height - 1));
    sw = Math.max(1, Math.min(sw, sourceSize.width - sx));
    sh = Math.max(1, Math.min(sh, sourceSize.height - sy));

    const result = { x: sx, y: sy, width: sw, height: sh, isValid: true };

    if (__DEV__) {
        console.log("[CropMath] Precision Rendered:", { rw, rh, baseScale });
        console.log("[CropMath] Precision Result:", JSON.stringify({ original, result }, null, 2));
    }

    return result;
};

/**
 * @deprecated Use calculatePrecisionCrop with explicit containerSize to avoid drift.
 */
export const calculateCropRectPixels = () => {
    console.error("[CropMath] DEPRECATED calculateCropRectPixels called", new Error().stack);
    throw new Error("Deprecated. Use calculatePrecisionCrop.");
};

/**
 * Calculates clamping values to ensure the image always covers the crop frame.
 * Center-based transform logic.
 */
export const clampTransformToCoverFrame = (
    scale: number,
    renderedRect: Rect,
    frameRect: Rect,
    limits: { minScale: number; maxScale: number } = { minScale: 1.0, maxScale: 4.0 }
) => {
    "worklet"; // For Reanimated

    // 1. Clamp Scale
    const s = Math.max(limits.minScale, Math.min(scale, limits.maxScale));

    // 2. Compute Transformed Image Size
    const tw = renderedRect.width * s;
    const th = renderedRect.height * s;

    // 3. Compute limits for Translation (tx, ty)
    // Origin is Container Center (cx, cy).
    const containerCenterX = renderedRect.x + renderedRect.width / 2;
    const containerCenterY = renderedRect.y + renderedRect.height / 2;

    // Transformed Image Bounds in container space:
    // [containerCenterX + tx - tw/2, containerCenterX + tx + tw/2]
    // Must contain frameRect: [fx, fx + fw]

    // Left: containerCenterX + tx - tw/2 <= fx  => tx <= fx - containerCenterX + tw/2
    // Right: containerCenterX + tx + tw/2 >= fx + fw => tx >= fx + fw - containerCenterX - tw/2

    const tx_min = (frameRect.x + frameRect.width) - containerCenterX - tw / 2;
    const tx_max = frameRect.x - containerCenterX + tw / 2;

    const ty_min = (frameRect.y + frameRect.height) - containerCenterY - th / 2;
    const ty_max = frameRect.y - containerCenterY + th / 2;

    return {
        scale: s,
        minTx: tx_min,
        maxTx: tx_max,
        minTy: ty_min,
        maxTy: ty_max
    };
};
