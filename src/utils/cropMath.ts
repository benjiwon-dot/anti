/**
 * src/utils/cropMath.ts
 * 
 * Handles coordinate transformations matching legacy CropFrame.jsx behavior.
 * - Origin: CENTER
 * - Fit: COVER (Math.max ratio)
 */

export type Size = { width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };

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
 * Computes the 'renderedRect' assuming the image Covers the container.
 * This matches standard "Cover" behavior: baseScale = max(cw/iw, ch/ih).
 * Image is centered in container.
 */
export const computeRenderedRectCover = (
    imageSize: Size,
    containerSize: Size
): Rect => {
    const baseScale = Math.max(
        containerSize.width / imageSize.width,
        containerSize.height / imageSize.height
    );
    const rw = imageSize.width * baseScale;
    const rh = imageSize.height * baseScale;
    const rx = (containerSize.width - rw) / 2;
    const ry = (containerSize.height - rh) / 2;
    return { x: rx, y: ry, width: rw, height: rh };
};

/**
 * Calculates the crop rectangle in SOURCE PIXELS.
 * Uses Center-based transform logic.
 */
export const calculateCropRectPixels = (input: CropInput): CropResult => {
    const { imageSize, renderedRect, frameRect, transform } = input;
    const { scale, translateX: tx, translateY: ty } = transform;

    // A) Compute center of rendered base image in container
    const cx = renderedRect.x + renderedRect.width / 2;
    const cy = renderedRect.y + renderedRect.height / 2;

    // B) Convert frame rect corners from Container -> Untransformed Rendered Space
    // Formula:
    // P_screen = Center + Translate + (P_untrans - Center) * Scale
    // => P_untrans = Center + (P_screen - Center - Translate) / Scale

    const untransform = (px: number, py: number) => {
        // 1. Undo translation
        const px1 = px - tx;
        const py1 = py - ty;
        // 2. Undo scale around center
        const ux = cx + (px1 - cx) / scale;
        const uy = cy + (py1 - cy) / scale;
        return { x: ux, y: uy };
    };

    // Frame corners
    const tl = untransform(frameRect.x, frameRect.y);
    const tr = untransform(frameRect.x + frameRect.width, frameRect.y);
    const bl = untransform(frameRect.x, frameRect.y + frameRect.height);
    const br = untransform(frameRect.x + frameRect.width, frameRect.y + frameRect.height);

    // Normalize (in case of negative scale, though constrained positive usually)
    const left = Math.min(tl.x, tr.x, bl.x, br.x);
    const right = Math.max(tl.x, tr.x, bl.x, br.x);
    const top = Math.min(tl.y, tr.y, bl.y, br.y);
    const bottom = Math.max(tl.y, tr.y, bl.y, br.y);

    // C) Intersect with renderedRect bounds
    // The image data only exists within renderedRect.
    const iL = Math.max(left, renderedRect.x);
    const iT = Math.max(top, renderedRect.y);
    const iR = Math.min(right, renderedRect.x + renderedRect.width);
    const iB = Math.min(bottom, renderedRect.y + renderedRect.height);

    // Check validity
    if (iR <= iL || iB <= iT) {
        return { x: 0, y: 0, width: 0, height: 0, isValid: false };
    }

    // D) Map Intersection from Rendered Space to Source Pixels
    // sourceX = ( (intersectX - renderedRect.x) / renderedRect.width ) * sourceWidth
    const pL = (iL - renderedRect.x) / renderedRect.width;
    const pT = (iT - renderedRect.y) / renderedRect.height;
    const pW = (iR - iL) / renderedRect.width;
    const pH = (iB - iT) / renderedRect.height;

    let sx = Math.round(pL * imageSize.width);
    let sy = Math.round(pT * imageSize.height);
    let sw = Math.round(pW * imageSize.width);
    let sh = Math.round(pH * imageSize.height);

    // E) Clamp to Source Bounds
    sx = Math.max(0, Math.min(sx, imageSize.width - 1));
    sy = Math.max(0, Math.min(sy, imageSize.height - 1));
    sw = Math.max(1, Math.min(sw, imageSize.width - sx));
    sh = Math.max(1, Math.min(sh, imageSize.height - sy));

    return {
        x: sx,
        y: sy,
        width: sw,
        height: sh,
        isValid: true
    };
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
    // Origin is Rendered Center (cx, cy).
    // Transformed Image Center: icx = cx + tx, icy = cy + ty
    // Transformed Bounds: [icx - tw/2, icx + tw/2]
    // Condition: Frame [fx, fx+fw] must be inside Transformed Bounds.
    // Left: icx - tw/2 <= fx  => tx <= fx - cx + tw/2
    // Right: icx + tw/2 >= fx + fw => tx >= fx + fw - cx - tw/2
    // Top: icy - th/2 <= fy
    // Bottom: icy + th/2 >= fy + fh

    const cx = renderedRect.x + renderedRect.width / 2;
    const cy = renderedRect.y + renderedRect.height / 2;

    const tx_min = (frameRect.x + frameRect.width) - cx - tw / 2;
    const tx_max = frameRect.x - cx + tw / 2;

    const ty_min = (frameRect.y + frameRect.height) - cy - th / 2;
    const ty_max = frameRect.y - cy + th / 2;

    // 4. Return clamped result (tx, ty initialized to 0 usually, but input might be provided)
    // Note: The function signature in CropFrameRN passes current tx/ty. 
    // We should return the clamped range? 
    // Or if we follow the pattern: return { scale, minTx, maxTx, minTy, maxTy }?
    // The previous implementation returned limits.
    // Let's return the min/max bounds so the caller can clamp their specific tx/ty.

    return {
        scale: s,
        minTx: tx_min,
        maxTx: tx_max,
        minTy: ty_min,
        maxTy: ty_max
    };
};
