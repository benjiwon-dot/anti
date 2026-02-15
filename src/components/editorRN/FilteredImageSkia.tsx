// src/components/editorRN/FilteredImageSkia.tsx
import React, { useMemo } from "react";
import { View, type ViewStyle } from "react-native";
import {
    Canvas,
    Image as SkiaImage,
    Rect,
    Skia,
    useImage,
    useCanvasRef,
} from "@shopify/react-native-skia";
import { IDENTITY, type ColorMatrix as M } from "../../utils/colorMatrix";

type Props = {
    uri: string;
    width: number;
    height: number;
    matrix?: M;
    style?: ViewStyle;
    overlayColor?: string;
    overlayOpacity?: number;
};

export interface FilteredImageSkiaRef {
    snapshot: () => any;
}

const clamp01 = (v: any) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
};

const FilteredImageSkia = React.forwardRef<FilteredImageSkiaRef, Props>(
    ({ uri, width, height, matrix, style, overlayColor, overlayOpacity }, ref) => {
        const img = useImage(uri || "");
        const canvasRef = useCanvasRef();

        const W = Number(width) || 1;
        const H = Number(height) || 1;

        const safeMatrix = matrix && matrix.length === 20 ? matrix : IDENTITY;

        const imagePaint = useMemo(() => {
            const p = Skia.Paint();
            p.setAntiAlias(true);
            p.setColorFilter(Skia.ColorFilter.MakeMatrix(safeMatrix));
            return p;
        }, [safeMatrix]);

        const overlayPaint = useMemo(() => {
            const color = (overlayColor || "").trim();
            const a = clamp01(overlayOpacity);

            if (!color || a <= 0) return null;

            try {
                const p = Skia.Paint();
                p.setAntiAlias(true);
                p.setColor(Skia.Color(color));
                p.setAlphaf(a);
                return p;
            } catch {
                return null;
            }
        }, [overlayColor, overlayOpacity]);

        React.useImperativeHandle(ref, () => ({
            snapshot: () => {
                // 이미지가 로드되지 않았으면 null 반환 (재시도 유도)
                if (!img && uri) return null;

                // ✅ [핵심 수정] try-catch로 감싸서 에러 방지
                try {
                    // 캔버스 참조가 없거나 Skia 뷰가 준비되지 않았을 때 에러가 날 수 있음
                    return canvasRef.current?.makeImageSnapshot() || null;
                } catch (e) {
                    // 에러 로그만 남기고 null 반환 -> 상위 컴포넌트가 알아서 재시도함
                    console.warn("[FilteredImageSkia] Snapshot not ready yet, retrying...", e);
                    return null;
                }
            },
        }));

        return (
            <View style={[{ width: W, height: H }, style]} pointerEvents="none">
                <Canvas
                    ref={canvasRef}
                    style={{ flex: 1 }}
                >
                    {img ? (
                        <SkiaImage
                            image={img}
                            x={0}
                            y={0}
                            width={W}
                            height={H}
                            fit="cover"
                            paint={imagePaint}
                        />
                    ) : (
                        <Rect x={0} y={0} width={W} height={H} color="transparent" />
                    )}

                    {overlayPaint && (
                        <Rect x={0} y={0} width={W} height={H} paint={overlayPaint} />
                    )}
                </Canvas>
            </View>
        );
    }
);

export default FilteredImageSkia;