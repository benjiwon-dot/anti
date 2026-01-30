import React, { useMemo } from "react";
import { ViewStyle, View } from "react-native";
import {
    Canvas,
    Image as SkiaImage,
    Skia,
    useImage,
} from "@shopify/react-native-skia";
import { IDENTITY, type ColorMatrix as M } from "../../utils/colorMatrix";

type Props = {
    uri: string;
    width: number;
    height: number;
    matrix?: M; // Make optional to match usage
    style?: ViewStyle;
};

const FilteredImageSkia = React.memo(({ uri, width, height, matrix, style }: Props) => {
    const img = useImage(uri);

    // Safety: ensure matrix is valid 20-length array
    const safeMatrix = (matrix && matrix.length === 20) ? matrix : IDENTITY;

    const paint = useMemo(() => {
        const p = Skia.Paint();
        p.setColorFilter(Skia.ColorFilter.MakeMatrix(safeMatrix));
        return p;
    }, [safeMatrix]);

    if (!img) return null;

    return (
        <View style={[{ width, height }, style]} pointerEvents="none">
            <Canvas style={{ flex: 1 }}>
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
