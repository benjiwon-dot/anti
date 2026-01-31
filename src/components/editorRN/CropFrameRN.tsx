import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { View, StyleSheet, Dimensions, Image as RNImage, Text } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS,
    useDerivedValue,
} from "react-native-reanimated";
import FilteredImageSkia from "./FilteredImageSkia";
import { ColorMatrix, IDENTITY } from "../../utils/colorMatrix";
import { useLanguage } from "../../context/LanguageContext";
import { clampTransformToCoverFrame } from "../../utils/cropMath";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PREVIEW_SIZE = SCREEN_WIDTH;
const CROP_SIZE = SCREEN_WIDTH * 0.75;
const MARGIN = (PREVIEW_SIZE - CROP_SIZE) / 2;

export type Crop = { x: number; y: number; scale: number };

interface Props {
    imageSrc: string;
    imageWidth: number;
    imageHeight: number;
    crop: Crop;
    onChange: (crop: Crop) => void;
    matrix: ColorMatrix;
}

const CropFrameRN = forwardRef(({ imageSrc, imageWidth, imageHeight, crop, onChange, matrix }: Props, ref) => {
    const [imgSize, setImgSize] = useState({ w: imageWidth || 0, h: imageHeight || 0 });

    const translateX = useSharedValue(crop?.x ?? 0);
    const translateY = useSharedValue(crop?.y ?? 0);
    const scale = useSharedValue(crop?.scale ?? 1);

    const savedTranslateX = useSharedValue(crop?.x ?? 0);
    const savedTranslateY = useSharedValue(crop?.y ?? 0);
    const savedScale = useSharedValue(crop?.scale ?? 1);
    const isGesturing = useSharedValue(false);

    useImperativeHandle(ref, () => ({
        getLatestCrop: () => {
            return clampValues(translateX.value, translateY.value, scale.value);
        }
    }));

    useEffect(() => {
        if (imageWidth && imageHeight) {
            setImgSize({ w: imageWidth, h: imageHeight });
        }
    }, [imageWidth, imageHeight]);

    useEffect(() => {
        // ✅ Prevent snap-back: if we are currently gesturing, don't overwrite with old prop values
        if (isGesturing.value) return;

        translateX.value = crop.x;
        translateY.value = crop.y;
        scale.value = crop.scale;

        savedTranslateX.value = crop.x;
        savedTranslateY.value = crop.y;
        savedScale.value = crop.scale;
    }, [crop]);

    // ✅ Use DerivedValues to ensure worklet sees stable sizes without re-rendering logic
    const baseScaleValue = useDerivedValue(() => {
        return Math.max(PREVIEW_SIZE / imgSize.w, PREVIEW_SIZE / imgSize.h);
    }, [imgSize]);

    const { baseScale, minScale } = useMemo(() => {
        const bs = Math.max(PREVIEW_SIZE / imgSize.w, PREVIEW_SIZE / imgSize.h);
        return { baseScale: bs, minScale: 1.0 };
    }, [imgSize]);

    const clampValues = (tx: number, ty: number, sc: number) => {
        "worklet";
        const s = Math.max(minScale, Math.min(sc, 4.0));

        const rW = imgSize.w * baseScaleValue.value;
        const rH = imgSize.h * baseScaleValue.value;
        const rX = (PREVIEW_SIZE - rW) / 2;
        const rY = (PREVIEW_SIZE - rH) / 2;

        const renderedRect = { x: rX, y: rY, width: rW, height: rH };
        const frameRect = {
            x: MARGIN,
            y: MARGIN,
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
                .onBegin(() => {
                    isGesturing.value = true;
                })
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

                    // ✅ Commit only on onEnd to prevent React re-render churn
                    runOnJS(onChange)(clamped);
                })
                .onFinalize(() => {
                    isGesturing.value = false;
                }),
        [baseScale, minScale]
    );

    const pinchGesture = useMemo(
        () =>
            Gesture.Pinch()
                .onBegin(() => {
                    isGesturing.value = true;
                })
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

                    // ✅ Commit only on onEnd to prevent React re-render churn
                    runOnJS(onChange)(clamped);
                })
                .onFinalize(() => {
                    isGesturing.value = false;
                }),
        [baseScale, minScale]
    );

    const composedGesture = useMemo(
        () => Gesture.Race(panGesture, pinchGesture),
        [panGesture, pinchGesture]
    );

    const w0 = imgSize.w * baseScale;
    const h0 = imgSize.h * baseScale;

    /**
     * ✅ 핵심 수정 포인트
     * scale → translate 순서
     * (cropMath와 좌표계 일치)
     */
    const animatedImageStyle = useAnimatedStyle(() => {
        const bs = baseScaleValue.value;
        const w = imgSize.w * bs;
        const h = imgSize.h * bs;
        return {
            width: w,
            height: h,
            transform: [
                { translateX: -w / 2 },
                { translateY: -h / 2 },
                { scale: scale.value },
                { translateX: translateX.value },
                { translateY: translateY.value },
            ],
        };
    });

    const childStyle = useAnimatedStyle(() => {
        const bs = baseScaleValue.value;
        return {
            width: imgSize.w * bs,
            height: imgSize.h * bs,
        };
    });

    if (!imageSrc) return null;

    const { t } = useLanguage();

    return (
        <GestureDetector gesture={composedGesture}>
            <View style={styles.container}>
                <View style={styles.previewWrap}>
                    <Animated.View style={[styles.centeredImage, animatedImageStyle]}>
                        <Animated.Image
                            source={{ uri: imageSrc }}
                            style={childStyle}
                            resizeMode="cover"
                        />
                        {/* 
                            Visual Filter Layer:
                            Overlaid on top of the base image.
                            `pointerEvents="none"` ensures it doesn't block gestures.
                            Only render FilteredImageSkia if a filter is actually applied.
                        */}
                        {matrix.some((v, i) => v !== IDENTITY[i]) && (
                            <FilteredImageSkia
                                uri={imageSrc}
                                width={imgSize.w * baseScale}
                                height={imgSize.h * baseScale}
                                matrix={matrix}
                                style={StyleSheet.absoluteFillObject as any}
                            />
                        )}
                    </Animated.View>

                    {/* Overlays */}
                    <View style={styles.overlayTop} pointerEvents="none" />
                    <View style={styles.overlayBottom} pointerEvents="none" />
                    <View style={styles.overlayLeft} pointerEvents="none" />
                    <View style={styles.overlayRight} pointerEvents="none" />

                    <View style={styles.cropWindow} pointerEvents="none">
                        <Animated.View style={[styles.centeredImage, animatedImageStyle]}>
                            <Animated.Image
                                source={{ uri: imageSrc }}
                                style={childStyle}
                                resizeMode="cover"
                            />
                            {matrix.some((v, i) => v !== IDENTITY[i]) && (
                                <FilteredImageSkia
                                    uri={imageSrc}
                                    width={imgSize.w * baseScale}
                                    height={imgSize.h * baseScale}
                                    matrix={matrix}
                                    style={StyleSheet.absoluteFillObject as any}
                                />
                            )}
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
