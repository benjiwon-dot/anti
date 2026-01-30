import React, { useEffect, useMemo, useState, useImperativeHandle } from "react";
import { View, StyleSheet, Dimensions, Image as RNImage, Text } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS,
} from "react-native-reanimated";
import FilteredImageSkia from "./FilteredImageSkia";
import { ColorMatrix } from "../../utils/colorMatrix";
import { useLanguage } from "../../context/LanguageContext";
import { clampTransformToCoverFrame } from "../../utils/cropMath";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PREVIEW_SIZE = SCREEN_WIDTH;
const CROP_SIZE = SCREEN_WIDTH * 0.75;
const MARGIN = (PREVIEW_SIZE - CROP_SIZE) / 2;

export type Crop = { x: number; y: number; scale: number };

type Props = {
    imageSrc: string;
    crop: Crop;
    onChange: (newCrop: Crop) => void;
    matrix: ColorMatrix;
};

const CropFrameRN = React.forwardRef((props: Props, ref) => {
    const { imageSrc, crop, onChange, matrix } = props;
    const [imgSize, setImgSize] = useState({ w: 1, h: 1 });

    const translateX = useSharedValue(crop?.x ?? 0);
    const translateY = useSharedValue(crop?.y ?? 0);
    const scale = useSharedValue(crop?.scale ?? 1);

    const savedTranslateX = useSharedValue(crop?.x ?? 0);
    const savedTranslateY = useSharedValue(crop?.y ?? 0);
    const savedScale = useSharedValue(crop?.scale ?? 1);

    useImperativeHandle(ref, () => ({
        getLatestCrop: () => {
            return clampValues(translateX.value, translateY.value, scale.value);
        }
    }));

    useEffect(() => {
        if (!imageSrc) return;
        RNImage.getSize(
            imageSrc,
            (w, h) => setImgSize({ w, h }),
            (err) => console.error("RNImage.getSize failed:", err)
        );
    }, [imageSrc]);

    useEffect(() => {
        translateX.value = crop.x;
        translateY.value = crop.y;
        scale.value = crop.scale;

        savedTranslateX.value = crop.x;
        savedTranslateY.value = crop.y;
        savedScale.value = crop.scale;
    }, [crop]);

    const { baseScale, minScale } = useMemo(() => {
        const bs = Math.max(PREVIEW_SIZE / imgSize.w, PREVIEW_SIZE / imgSize.h);
        return { baseScale: bs, minScale: 1.0 };
    }, [imgSize]);

    const clampValues = (tx: number, ty: number, sc: number) => {
        "worklet";
        const s = Math.max(minScale, Math.min(sc, 4.0));

        const rW = imgSize.w * baseScale;
        const rH = imgSize.h * baseScale;
        const rX = (PREVIEW_SIZE - rW) / 2;
        const rY = (PREVIEW_SIZE - rH) / 2;

        const renderedRect = { x: rX, y: rY, width: rW, height: rH };
        const frameRect = {
            x: (PREVIEW_SIZE - CROP_SIZE) / 2,
            y: (PREVIEW_SIZE - CROP_SIZE) / 2,
            width: CROP_SIZE,
            height: CROP_SIZE,
        };

        const limits = clampTransformToCoverFrame(s, renderedRect, frameRect);

        return {
            x: Math.max(limits.minTx, Math.min(limits.maxTx, tx)),
            y: Math.max(limits.minTy, Math.min(limits.maxTy, ty)),
            scale: s,
        };
    };

    const panGesture = useMemo(
        () =>
            Gesture.Pan()
                .onUpdate((e) => {
                    translateX.value = savedTranslateX.value + e.translationX;
                    translateY.value = savedTranslateY.value + e.translationY;
                })
                .onEnd(() => {
                    const clamped = clampValues(
                        translateX.value,
                        translateY.value,
                        scale.value
                    );
                    translateX.value = withTiming(clamped.x);
                    translateY.value = withTiming(clamped.y);
                    savedTranslateX.value = clamped.x;
                    savedTranslateY.value = clamped.y;
                    savedScale.value = clamped.scale;
                    runOnJS(onChange)(clamped);
                }),
        [baseScale, minScale]
    );

    const pinchGesture = useMemo(
        () =>
            Gesture.Pinch()
                .onUpdate((e) => {
                    scale.value = clampValues(
                        translateX.value,
                        translateY.value,
                        savedScale.value * e.scale
                    ).scale;
                })
                .onEnd(() => {
                    const clamped = clampValues(
                        translateX.value,
                        translateY.value,
                        scale.value
                    );
                    scale.value = withTiming(clamped.scale);
                    savedScale.value = clamped.scale;
                    runOnJS(onChange)(clamped);
                }),
        [baseScale, minScale]
    );

    const composedGesture = useMemo(
        () => Gesture.Simultaneous(panGesture, pinchGesture),
        [panGesture, pinchGesture]
    );

    const w0 = imgSize.w * baseScale;
    const h0 = imgSize.h * baseScale;

    /**
     * ✅ 핵심 수정 포인트
     * scale → translate 순서
     * (cropMath와 좌표계 일치)
     */
    const animatedImageStyle = useAnimatedStyle(() => ({
        width: w0,
        height: h0,
        transform: [
            { translateX: -w0 / 2 },
            { translateY: -h0 / 2 },
            { scale: scale.value },
            { translateX: translateX.value },
            { translateY: translateY.value },
        ],
    }));

    if (!imageSrc) return null;

    const { t } = useLanguage();

    return (
        <GestureDetector gesture={composedGesture}>
            <View style={styles.container}>
                <View style={styles.previewWrap}>
                    {/* Background */}
                    <Animated.View style={[styles.centeredImage, animatedImageStyle]}>
                        <FilteredImageSkia
                            uri={imageSrc}
                            width={w0}
                            height={h0}
                            matrix={matrix}
                        />
                    </Animated.View>

                    {/* Overlays */}
                    <View style={styles.overlayTop} pointerEvents="none" />
                    <View style={styles.overlayBottom} pointerEvents="none" />
                    <View style={styles.overlayLeft} pointerEvents="none" />
                    <View style={styles.overlayRight} pointerEvents="none" />

                    {/* Crop Window */}
                    <View style={styles.cropWindow} pointerEvents="none">
                        <Animated.View style={[styles.centeredImage, animatedImageStyle]}>
                            <FilteredImageSkia
                                key={`main:${imageSrc}:${matrix.join(",")}`}
                                uri={imageSrc}
                                width={w0}
                                height={h0}
                                matrix={matrix}
                            />
                        </Animated.View>
                    </View>
                </View>

                <View style={styles.labelContainer} pointerEvents="none">
                    <Text style={styles.label}>
                        {t["printArea"] || "Print area (20×20cm)"}
                    </Text>
                </View>
            </View>
        </GestureDetector>
    );
});

export default CropFrameRN;

const styles = StyleSheet.create({
    container: {
        width: "100%",
        backgroundColor: "#F7F7F8",
        alignItems: "center",
        justifyContent: "center",
    },
    previewWrap: {
        width: PREVIEW_SIZE,
        height: PREVIEW_SIZE,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    cropWindow: {
        width: CROP_SIZE,
        height: CROP_SIZE,
        overflow: "hidden",
        zIndex: 3,
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.9)",
        borderRadius: 2,
    },
    centeredImage: {
        position: "absolute",
        left: "50%",
        top: "50%",
    },
    overlayTop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: MARGIN,
        backgroundColor: "#E6E6E6",
        opacity: 0.2,
        zIndex: 2,
    },
    overlayBottom: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: MARGIN,
        backgroundColor: "#E6E6E6",
        opacity: 0.2,
        zIndex: 2,
    },
    overlayLeft: {
        position: "absolute",
        top: MARGIN,
        bottom: MARGIN,
        left: 0,
        width: MARGIN,
        backgroundColor: "#E6E6E6",
        opacity: 0.2,
        zIndex: 2,
    },
    overlayRight: {
        position: "absolute",
        top: MARGIN,
        bottom: MARGIN,
        right: 0,
        width: MARGIN,
        backgroundColor: "#E6E6E6",
        opacity: 0.2,
        zIndex: 2,
    },
    labelContainer: {
        marginTop: 12,
        height: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    label: {
        color: "rgba(0,0,0,0.35)",
        fontSize: 13,
        fontWeight: "500",
        textAlign: "center",
    },
});
