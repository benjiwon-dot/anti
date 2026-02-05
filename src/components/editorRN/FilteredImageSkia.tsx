import React, { useMemo } from "react";
import { ViewStyle, View } from "react-native";
import {
    Canvas,
    Image as SkiaImage,
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
};

export interface FilteredImageSkiaRef {
    snapshot: () => any;
}

const FilteredImageSkia = React.forwardRef<FilteredImageSkiaRef, Props>(({ uri, width, height, matrix, style }, ref) => {
    const img = useImage(uri);
    const canvasRef = useCanvasRef();

    // Safety: ensure matrix is valid 20-length array
    const safeMatrix = (matrix && matrix.length === 20) ? matrix : IDENTITY;

    const paint = useMemo(() => {
        const p = Skia.Paint();
        p.setColorFilter(Skia.ColorFilter.MakeMatrix(safeMatrix));
        return p;
    }, [safeMatrix]);

    React.useImperativeHandle(ref, () => ({
        snapshot: () => {
            return canvasRef.current?.makeImageSnapshot();
        }
    }));

    if (!img) return null;

    return (
        <View style={[{ width, height }, style]} pointerEvents="none">
            <Canvas ref={canvasRef} style={{ flex: 1 }}>
                <SkiaImage
                    image={img}
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    fit="cover"
                    paint={paint}
                />
            </Canvas>
        </View>
    );
});

export default FilteredImageSkia;
