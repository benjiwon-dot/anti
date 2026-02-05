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

export type Crop = { x: number; y: number; scale: number };

interface Props {
    imageSrc: string;
    imageWidth: number;
    imageHeight: number;
    containerWidth: number;
    containerHeight: number;
    crop: Crop;
    onChange: (crop: Crop) => void;
    matrix: ColorMatrix;
    photoIndex: number;
}

const CropFrameRN = forwardRef(({
    imageSrc,
    imageWidth,
    imageHeight,
    containerWidth,
    containerHeight,
    crop,
    onChange,
    matrix,
    photoIndex
}: Props, ref) => {
    const [imgSize, setImgSize] = useState({ w: imageWidth || 0, h: imageHeight || 0 });

    const PREVIEW_SIZE_W = containerWidth;
    const PREVIEW_SIZE_H = containerHeight;
    const CROP_SIZE = Math.min(PREVIEW_SIZE_W, PREVIEW_SIZE_H) * 0.75;
    const MARGIN_X = (PREVIEW_SIZE_W - CROP_SIZE) / 2;
    const MARGIN_Y = (PREVIEW_SIZE_H - CROP_SIZE) / 2;

    const translateX = useSharedValue(crop?.x ?? 0);
    const translateY = useSharedValue(crop?.y ?? 0);
    const scale = useSharedValue(crop?.scale ?? 1);

    const savedTranslateX = useSharedValue(crop?.x ?? 0);
    const savedTranslateY = useSharedValue(crop?.y ?? 0);
    const savedScale = useSharedValue(crop?.scale ?? 1);
    const isGesturing = useSharedValue(false);

    // 1) JS ref to hold the latest crop state (Strict Mode Safe)
    const latestCropRef = React.useRef<Crop>(crop ?? { x: 0, y: 0, scale: 1 });

    // 3) Update imperative handle: return JS ref
    useImperativeHandle(ref, () => ({
        getLatestCrop: () => {
            return latestCropRef.current;
        },
        getFrameRect: () => {
            return { x: MARGIN_X, y: MARGIN_Y, width: CROP_SIZE, height: CROP_SIZE };
        }
    }));

    useEffect(() => {
        if (imageWidth && imageHeight) {
            setImgSize({ w: imageWidth, h: imageHeight });
        }
    }, [imageWidth, imageHeight]);

    // 6) Prop-driven sync (Only when NOT gesturing)
    useEffect(() => {
        if (isGesturing.value) return;

        translateX.value = crop.x;
        translateY.value = crop.y;
        scale.value = crop.scale;

        savedTranslateX.value = crop.x;
        savedTranslateY.value = crop.y;
        savedScale.value = crop.scale;

        latestCropRef.current = crop;
    }, [crop]);

    // 5) Hard reset when photoIndex changes
    useEffect(() => {
        console.log(`[Crop] photoIndex changed to ${photoIndex}, hard reset`);
        latestCropRef.current = { x: 0, y: 0, scale: 1 };

        translateX.value = 0;
        translateY.value = 0;
        scale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        savedScale.value = 1;
        isGesturing.value = false;
    }, [photoIndex]);

    // 2) BS (Base Scale) as useMemo for render-safe usage
    const baseScale = useMemo(() => {
        if (!imgSize.w || !imgSize.h) return 1;
        return Math.max(PREVIEW_SIZE_W / imgSize.w, PREVIEW_SIZE_H / imgSize.h);
    }, [imgSize.w, imgSize.h, PREVIEW_SIZE_W, PREVIEW_SIZE_H]);

    const baseScaleValue = useDerivedValue(() => baseScale, [baseScale]);

    const { minScale } = useMemo(() => {
        return { minScale: 1.0 };
    }, []);

    // Worklet-safe clamp (Do NOT read BS.value from JS context)
    const clampValues = (tx: number, ty: number, sc: number, bs: number) => {
        "worklet";
        const s = Math.max(minScale, Math.min(sc, 4.0));

        const rW = imgSize.w * bs;
        const rH = imgSize.h * bs;
        const rX = (PREVIEW_SIZE_W - rW) / 2;
        const rY = (PREVIEW_SIZE_H - rH) / 2;

        const renderedRect = { x: rX, y: rY, width: rW, height: rH };
        const frameRect = {
            x: MARGIN_X,
            y: MARGIN_Y,
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

    const syncToJS = (clamped: Crop) => {
        latestCropRef.current = clamped;
        onChange(clamped);
        if (__DEV__) console.log("[Crop] latestCropRef updated:", clamped);
    };

    const panGesture = useMemo(
        () =>
            Gesture.Pan()
                .onBegin(() => {
                    isGesturing.value = true;
                })
                .onUpdate((e) => {
                    translateX.value = savedTranslateX.value + e.translationX * 0.56;
                    translateY.value = savedTranslateY.value + e.translationY * 0.56;
                })
                .onEnd(() => {
                    const bs = baseScaleValue.value;
                    const clamped = clampValues(
                        translateX.value,
                        translateY.value,
                        scale.value,
                        bs
                    );
                    translateX.value = withTiming(clamped.x);
                    translateY.value = withTiming(clamped.y);
                    savedTranslateX.value = clamped.x;
                    savedTranslateY.value = clamped.y;
                    savedScale.value = clamped.scale;
                    runOnJS(syncToJS)(clamped);
                })
                .onFinalize(() => {
                    isGesturing.value = false;
                }),
        [PREVIEW_SIZE_W, PREVIEW_SIZE_H, imgSize, minScale, baseScaleValue]
    );

    const pinchGesture = useMemo(
        () =>
            Gesture.Pinch()
                .onBegin(() => {
                    isGesturing.value = true;
                })
                .onUpdate((e) => {
                    const bs = baseScaleValue.value;
                    const dampedScale = savedScale.value * (1 + (e.scale - 1) * 0.56);
                    scale.value = clampValues(
                        translateX.value,
                        translateY.value,
                        dampedScale,
                        bs
                    ).scale;
                })
                .onEnd(() => {
                    const bs = baseScaleValue.value;
                    const clamped = clampValues(
                        translateX.value,
                        translateY.value,
                        scale.value,
                        bs
                    );
                    scale.value = withTiming(clamped.scale);
                    savedScale.value = clamped.scale;
                    runOnJS(syncToJS)(clamped);
                })
                .onFinalize(() => {
                    isGesturing.value = false;
                }),
        [PREVIEW_SIZE_W, PREVIEW_SIZE_H, imgSize, minScale, baseScaleValue]
    );

    const composedGesture = useMemo(
        () => Gesture.Race(panGesture, pinchGesture),
        [panGesture, pinchGesture]
    );

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
            <View style={[styles.container, { width: PREVIEW_SIZE_W, height: PREVIEW_SIZE_H }]}>
                <View style={[styles.previewWrap, { width: PREVIEW_SIZE_W, height: PREVIEW_SIZE_H }]}>
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

                    {/* Overlays */}
                    <View style={[styles.overlayTop, { height: MARGIN_Y }]} pointerEvents="none" />
                    <View style={[styles.overlayBottom, { height: MARGIN_Y }]} pointerEvents="none" />
                    <View style={[styles.overlayLeft, { top: MARGIN_Y, bottom: MARGIN_Y, width: MARGIN_X }]} pointerEvents="none" />
                    <View style={[styles.overlayRight, { top: MARGIN_Y, bottom: MARGIN_Y, width: MARGIN_X }]} pointerEvents="none" />

                    <View style={[styles.cropWindow, { width: CROP_SIZE, height: CROP_SIZE }]} pointerEvents="none">
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
        backgroundColor: "#F7F7F8",
        alignItems: "center",
        justifyContent: "center",
    },
    previewWrap: {
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    cropWindow: {
        overflow: "hidden",
        zIndex: 3,
        borderWidth: 1.5,
        borderColor: "rgba(0,0,0,0.85)",
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
        backgroundColor: "#E6E6E6",
        opacity: 0.28,
        zIndex: 2,
    },
    overlayBottom: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#E6E6E6",
        opacity: 0.28,
        zIndex: 2,
    },
    overlayLeft: {
        position: "absolute",
        left: 0,
        backgroundColor: "#E6E6E6",
        opacity: 0.28,
        zIndex: 2,
    },
    overlayRight: {
        position: "absolute",
        right: 0,
        backgroundColor: "#E6E6E6",
        opacity: 0.28,
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
