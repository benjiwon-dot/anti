// src/utils/cropMath.ts
import { clamp } from "./clamp";

export type Size = { width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };
export type Transform = { scale: number; translateX: number; translateY: number };

// ✅ 기존 유지
export const getMinScale = (baseW: number, baseH: number, cropSize: number) => {
    "worklet";
    if (baseW === 0 || baseH === 0) return 1;
    const s = Math.max(cropSize / baseW, cropSize / baseH);
    return Math.max(s, 1);
};

// ✅ 기존 유지
export const getMaxTranslate = (baseW: number, baseH: number, cropSize: number, scale: number) => {
    "worklet";
    const renderedW = baseW * scale;
    const renderedH = baseH * scale;

    const maxX = Math.max(0, (renderedW - cropSize) / 2);
    const maxY = Math.max(0, (renderedH - cropSize) / 2);

    return { maxX, maxY };
};

// ✅ 기존 유지
export const clampTransform = (
    tx: number,
    ty: number,
    scale: number,
    baseW: number,
    baseH: number,
    cropSize: number,
    maxScale: number
) => {
    "worklet";

    if (baseW <= 0 || baseH <= 0) return { tx, ty, scale: 1 };

    const minScale = getMinScale(baseW, baseH, cropSize);
    const nextScale = clamp(scale, minScale, maxScale);

    const { maxX, maxY } = getMaxTranslate(baseW, baseH, cropSize, nextScale);

    const nextTx = clamp(tx, -maxX, maxX);
    const nextTy = clamp(ty, -maxY, maxY);

    return { tx: nextTx, ty: nextTy, scale: nextScale };
};

// ✅ 기존 유지
export const computeBaseCoverSize = (originalW: number, originalH: number, cropSquare: number) => {
    if (originalW <= 0 || originalH <= 0 || cropSquare <= 0) {
        return { baseW: cropSquare || 1, baseH: cropSquare || 1 };
    }
    const cover = Math.max(cropSquare / originalW, cropSquare / originalH);
    return { baseW: originalW * cover, baseH: originalH * cover };
};

/**
 * ✅ [수정됨] 창문형(Window) 방식에 맞춰 좌표 역산 로직 정밀화
 * - 사용자가 화면에서 보는 그림 그대로 원본에서 잘라내도록 보정
 */
export const mapToOriginalCropRect = (params: {
    originalW: number;
    originalH: number;
    containerW: number;
    containerH: number;
    frameRect: Rect;
    transform: { scale: number; translateX: number; translateY: number };
}) => {
    const { originalW, originalH, containerW, containerH, frameRect, transform } = params;

    if (originalW <= 1 || originalH <= 1) return { x: 0, y: 0, width: 1, height: 1 };

    // 1. 현재 화면상에서 이미지가 차지하는 실제 크기 (Rendered Size)
    const baseScale = Math.max(frameRect.width / originalW, frameRect.height / originalH); // Cover Scale
    const currentScale = transform.scale * baseScale;

    const renderedW = originalW * currentScale;
    const renderedH = originalH * currentScale;

    // 2. 이미지의 좌상단(Left-Top)이 컨테이너 기준 어디에 있는지 계산
    // (중앙 정렬 상태에서 translateX/Y 만큼 이동)
    const imageLeft = (containerW - renderedW) / 2 + transform.translateX;
    const imageTop = (containerH - renderedH) / 2 + transform.translateY;

    // 3. 크롭 프레임(고정창)이 이미지의 어디에 위치하는지 상대 좌표 계산
    // (Frame - ImageStart) / Scale = Original Coordinate
    const cropX_on_Rendered = frameRect.x - imageLeft;
    const cropY_on_Rendered = frameRect.y - imageTop;

    // 4. 원본 좌표로 변환 (비율 역산)
    let sx = cropX_on_Rendered / currentScale;
    let sy = cropY_on_Rendered / currentScale;
    let sSize = frameRect.width / currentScale; // 정사각형이므로 width만 사용

    // 5. 정수화 및 안전장치 (소수점 오차 보정)
    sx = Math.floor(sx);
    sy = Math.floor(sy);
    sSize = Math.floor(sSize);

    // 6. 경계 벗어남 방지 (Hard Clamp)
    sx = Math.max(0, Math.min(sx, originalW - 1));
    sy = Math.max(0, Math.min(sy, originalH - 1));

    // 크기가 원본을 초과하지 않도록
    sSize = Math.min(sSize, originalW - sx, originalH - sy);
    sSize = Math.max(1, sSize);

    return { x: sx, y: sy, width: sSize, height: sSize };
};

// ✅ 기존 유지
export const calculatePrecisionCrop = (params: {
    sourceSize: Size;
    containerSize: Size;
    frameRect: Rect;
    transform: Transform;
}) => {
    const rect = mapToOriginalCropRect({
        originalW: params.sourceSize.width,
        originalH: params.sourceSize.height,
        containerW: params.containerSize.width,
        containerH: params.containerSize.height,
        frameRect: params.frameRect,
        transform: params.transform,
    });

    const isValid =
        Number.isFinite(rect.x) &&
        Number.isFinite(rect.y) &&
        Number.isFinite(rect.width) &&
        rect.width > 0 &&
        rect.height > 0;

    return { ...rect, isValid };
};

export const defaultCenterCrop = () => {
    return { x: 0, y: 0, scale: 1 };
};