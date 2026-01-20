import { FILTERS } from '../components/editor/filters';

/**
 * Applies a filter to a canvas context
 * @param {CanvasRenderingContext2D} ctx 
 * @param {string} filterName 
 */
export function applyFilterToContext(ctx, filterName) {
    const filterDef = FILTERS.find(f => f.name === filterName);
    // ctx.filter accepts the standard CSS filter string
    ctx.filter = filterDef?.style?.filter || 'none';
}


/**
 * Generates a cropped image blob/url
 */
export async function generateCrops(imageSrc, crop, filterName) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            // 1. Calculate source coordinates to crop from
            // The crop object {x, y, scale} refers to the UI translation relative to 300x300 box
            // We need to map this back to natural image dimensions.

            // UI Constants
            const BOX_SIZE = 300;

            // Calculate the "displayed" size of the image in the UI before cropping
            // In the UI, we scale the image by `crop.scale`. 
            // We also rely on the fact that we forced the image to "cover" the box initially.
            // Let's derive the base scale (fitting scale).

            let baseScale = Math.max(BOX_SIZE / img.naturalWidth, BOX_SIZE / img.naturalHeight);

            // Current actual rendered scale = baseScale * crop.scale (if we implemented it that way)
            // BUT in my previous Editor code, I treated scale=1 as "whatever 100% width is".
            // Wait, looking at previous CropFrame: 
            // style={{ minWidth: '100%', minHeight: '100%', objectFit: 'cover' }}
            // This is tricky because `object-fit: cover` does its own centering and scaling.
            // To get pixel-perfect export, we must replicate the "cover" logic math explicitly.

            // RE-IMPLEMENTATION STRATEGY: 
            // To ensure consistency, calculate `baseScale` exactly like `object-fit: cover` does.
            const aspectImg = img.naturalWidth / img.naturalHeight;
            const aspectBox = 1; // 300/300

            // Cover logic:
            let renderW, renderH;
            if (aspectImg > aspectBox) {
                // Image is wider, so Height dominates
                renderH = BOX_SIZE;
                renderW = renderH * aspectImg;
            } else {
                // Image is taller, Width dominates
                renderW = BOX_SIZE;
                renderH = renderW / aspectImg;
            }

            // This is the size at scale=1. 
            // Then we apply user's `crop.scale`.
            // 2. Updated Math for Center-Origin Crop
            // UI Render Logic:
            // The image is scaled to `finalRenderW = img.naturalWidth * baseScale * crop.scale`
            // The image is centered in the box, then translated by (crop.x, crop.y).
            // This means the Pixel at (crop.x, crop.y) from the Image Center is now at the Box Center.
            // NO, wait. `translate(crop.x, crop.y)` moves the image.
            // If crop.x is POSITIVE, image moves RIGHT.
            // So the Box (which is stationary) effectively moves LEFT over the image.
            // Box Center relative to Image Center = (-crop.x, -crop.y).

            // Image Center (in rendered coords) = (finalRenderW / 2, finalRenderH / 2)
            // Box Center (in rendered coords relative to Image TopLeft) = (finalRenderW / 2) - crop.x

            // Box TopLeft (in rendered coords) = BoxCenter - (BOX_SIZE / 2)
            // = (finalRenderW / 2) - crop.x - (BOX_SIZE / 2)

            const finalRenderW = img.naturalWidth * baseScale * crop.scale;
            // const finalRenderH = img.naturalHeight * baseScale * crop.scale;

            const boxCenterX_in_Rendered = (finalRenderW / 2) - crop.x;
            const boxCenterY_in_Rendered = (finalRenderW / 2) * (img.naturalHeight / img.naturalWidth) - crop.y;
            // Note: finalRenderH might differ, so calculate Y separately or use ratio.

            // Actually simpler:
            const ratio = img.naturalWidth / finalRenderW; // Source Pixels per Rendered Pixel

            // Box TopLeft relative to Image TopLeft (Rendered Domain)
            const boxLeft_R = (finalRenderW / 2) - crop.x - (BOX_SIZE / 2);
            const boxTop_R = ((img.naturalHeight * baseScale * crop.scale) / 2) - crop.y - (BOX_SIZE / 2);

            // Map to Source Domain
            const sx = boxLeft_R * ratio;
            const sy = boxTop_R * ratio;
            const sw = BOX_SIZE * ratio;
            const sh = BOX_SIZE * ratio;

            // Validated generation function
            const createOutput = (width, quality) => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = width; // Square
                const ctx = canvas.getContext('2d');

                // Background white
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, width);

                // Filter
                applyFilterToContext(ctx, filterName);

                // Draw
                // We must ensure we don't draw out of bounds if floating point math is slightly off, 
                // but drawImage handles it loosely.
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, width);

                return canvas.toDataURL('image/jpeg', quality);
            };

            resolve({
                preview: createOutput(900, 0.8),
                print: createOutput(3000, 0.95), // High res
                meta: { sx, sy, sw, sh }
            });
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
}
