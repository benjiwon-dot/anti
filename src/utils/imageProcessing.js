// utils/imageProcessing.js
import { FILTERS } from "../components/editor/filters";

/**
 * Applies a filter to a canvas context
 * ctx.filter accepts standard CSS filter strings
 */
export function applyFilterToContext(ctx, filterName) {
    const filterDef = FILTERS.find((f) => f.name === filterName);
    ctx.filter = filterDef?.style?.filter || "none";
}

/**
 * UI 기준(현재 CropFrame.jsx) 상수와 동일해야 함
 * - PREVIEW_SIZE: previewWrap 렌더 영역 (400x400)
 * - CROP_SIZE: 실제 cropWindow (300x300)
 */
const PREVIEW_SIZE = 400;
const CROP_SIZE = 300;

// 인쇄용 타겟 (요청: 3000 이상)
const PREVIEW_EXPORT = 900;  // 앱 내부 미리보기(가볍게)
const PRINT_EXPORT = 3000;   // 인쇄용 (진짜 고화질)

/**
 * generateCrops(imageSrc, crop, filterName)
 * crop = { x, y, scale }  // UI에서 쓰는 값 그대로
 *
 * 리턴:
 *  - preview: dataURL(jpg)
 *  - print: dataURL(jpg)  <-- 무거움. 실서비스면 toBlob 권장
 *  - meta:  sx, sy, sw, sh (natural px 기준)
 */
export async function generateCrops(imageSrc, crop, filterName) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";

        img.onload = () => {
            const iw = img.naturalWidth;
            const ih = img.naturalHeight;

            if (!iw || !ih) {
                reject(new Error("Invalid image dimensions"));
                return;
            }

            // ✅ UI와 동일한 baseScale (PREVIEW_SIZE를 꽉 채우는 cover 기준)
            // CropFrame.jsx에서:
            // baseScale = max(PREVIEW_SIZE/iw, PREVIEW_SIZE/ih)
            const baseScale = Math.max(PREVIEW_SIZE / iw, PREVIEW_SIZE / ih);

            // UI scale=1일 때 "rendered size"
            const renderW = iw * baseScale;
            const renderH = ih * baseScale;

            // 사용자 줌 포함 최종 렌더 크기
            const s = crop?.scale ?? 1;
            const finalW = renderW * s;
            const finalH = renderH * s;

            // ✅ UI에서 이미지 배치 방식과 동일:
            // 이미지 중심이 preview 중심에 있고, translate(crop.x, crop.y)로 이미지가 움직임
            // 따라서 이미지 top-left(Preview 좌표계)는 아래:
            const imgLeft = PREVIEW_SIZE / 2 - finalW / 2 + (crop?.x ?? 0);
            const imgTop = PREVIEW_SIZE / 2 - finalH / 2 + (crop?.y ?? 0);

            // cropWindow는 preview 중앙 고정
            const cropLeft = PREVIEW_SIZE / 2 - CROP_SIZE / 2;
            const cropTop = PREVIEW_SIZE / 2 - CROP_SIZE / 2;

            // cropWindow가 가리키는 "이미지 내부(렌더 좌표계)" 영역
            const srcLeft_R = cropLeft - imgLeft;
            const srcTop_R = cropTop - imgTop;

            // 렌더좌표 → 원본(natural px)로 변환 비율
            // finalW = iw * baseScale * s  => 1 렌더px 당 natural px = iw/finalW
            const ratioX = iw / finalW;
            const ratioY = ih / finalH;

            let sx = srcLeft_R * ratioX;
            let sy = srcTop_R * ratioY;
            let sw = CROP_SIZE * ratioX;
            let sh = CROP_SIZE * ratioY;

            // ✅ 안전 클램프: 아주 미세한 오차로 흰 테두리 생기는 것 방지
            // (원칙적으로 clampPos가 막아주지만, export는 더 엄격하게)
            if (sw <= 0 || sh <= 0) {
                reject(new Error("Invalid crop size computed"));
                return;
            }

            // sx/sy가 음수거나 경계 초과하면 잘라서 보정
            if (sx < 0) sx = 0;
            if (sy < 0) sy = 0;
            if (sx + sw > iw) sx = Math.max(0, iw - sw);
            if (sy + sh > ih) sy = Math.max(0, ih - sh);

            // 출력 생성 함수 (jpeg)
            const createOutput = (size, quality) => {
                const canvas = document.createElement("canvas");
                canvas.width = size;
                canvas.height = size;

                const ctx = canvas.getContext("2d");
                if (!ctx) throw new Error("Canvas context unavailable");

                // ✅ 고화질 렌더링 옵션
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";

                // 배경 (혹시 알파가 생길 경우 대비)
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, size, size);

                // 필터 적용
                applyFilterToContext(ctx, filterName);

                // ✅ 핵심: natural(px)에서 sx/sy/sw/sh만큼 잘라 size×size로 확대
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);

                // 주의: dataURL은 메모리 큼 (특히 3000)
                return canvas.toDataURL("image/jpeg", quality);
            };

            try {
                const preview = createOutput(PREVIEW_EXPORT, 0.85);
                const print = createOutput(PRINT_EXPORT, 0.95);

                resolve({
                    preview,
                    print,
                    meta: {
                        sx, sy, sw, sh,
                        natural: { w: iw, h: ih },
                        export: { preview: PREVIEW_EXPORT, print: PRINT_EXPORT },
                        ui: { PREVIEW_SIZE, CROP_SIZE, baseScale, scale: s, x: crop?.x ?? 0, y: crop?.y ?? 0 },
                    },
                });
            } catch (err) {
                reject(err);
            }
        };

        img.onerror = reject;
        img.src = imageSrc;
    });
}
