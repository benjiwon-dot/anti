import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { View, StyleSheet, Text } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS,
    runOnUI,
    cancelAnimation,
} from "react-native-reanimated";
import FilteredImageSkia from "./FilteredImageSkia";
import { ColorMatrix, IDENTITY } from "../../utils/colorMatrix";
import { useLanguage } from "../../context/LanguageContext";
import { clampTransform } from "../../utils/cropMath";

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
    const PREVIEW_SIZE_W = containerWidth;
    const PREVIEW_SIZE_H = containerHeight;
    const CROP_SIZE = Math.min(PREVIEW_SIZE_W, PREVIEW_SIZE_H) * 0.75;
    const MARGIN_X = (PREVIEW_SIZE_W - CROP_SIZE) / 2;
    const MARGIN_Y = (PREVIEW_SIZE_H - CROP_SIZE) / 2;

    // 1) Shared Values for normalization
    const baseW = useSharedValue(0);
    const baseH = useSharedValue(0);

    const translateX = useSharedValue(crop?.x ?? 0);
    const translateY = useSharedValue(crop?.y ?? 0);
    const scale = useSharedValue(crop?.scale ?? 1);

    const savedTranslateX = useSharedValue(crop?.x ?? 0);
    const savedTranslateY = useSharedValue(crop?.y ?? 0);
    const savedScale = useSharedValue(crop?.scale ?? 1);
    const isGesturing = useSharedValue(false);

    const latestCropRef = React.useRef<Crop>(crop ?? { x: 0, y: 0, scale: 1 });

    useImperativeHandle(ref, () => ({
        getLatestCrop: () => latestCropRef.current,
        getFrameRect: () => ({ x: MARGIN_X, y: MARGIN_Y, width: CROP_SIZE, height: CROP_SIZE })
    }));

    const normalizedBaseSize = useMemo(() => {
        if (!imageWidth || !imageHeight) return { bw: 0, bh: 0 };
        const cover = Math.max(CROP_SIZE / imageWidth, CROP_SIZE / imageHeight);
        return { bw: imageWidth * cover, bh: imageHeight * cover };
    }, [imageWidth, imageHeight, CROP_SIZE]);

    // 2) Initialization Logic (Normalized Base)
    useEffect(() => {
        if (!normalizedBaseSize.bw || !normalizedBaseSize.bh) return;
        const { bw, bh } = normalizedBaseSize;

        runOnUI(() => {
            "worklet";
            baseW.value = bw;
            baseH.value = bh;

            // If new photo (no saved crop), reset to stable center
            if (!crop || (crop.x === 0 && crop.y === 0 && crop.scale === 1)) {
                translateX.value = 0;
                translateY.value = 0;
                scale.value = 1;
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
                savedScale.value = 1;
            }
        })();
    }, [normalizedBaseSize]);

    // 3) Sync from Prop (Only if not gesturing)
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

    const syncToJS = (clamped: Crop) => {
        latestCropRef.current = clamped;
        onChange(clamped);
    };

    const panGesture = useMemo(() =>
        Gesture.Pan()
            .onBegin(() => {
                isGesturing.value = true;
                cancelAnimation(translateX);
                cancelAnimation(translateY);
            })
            .onUpdate((e) => {
                const nextTx = savedTranslateX.value + e.translationX * 0.8;
                const nextTy = savedTranslateY.value + e.translationY * 0.8;

                const t = clampTransform(
                    nextTx,
                    nextTy,
                    scale.value,
                    baseW.value,
                    baseH.value,
                    CROP_SIZE,
                    5.0
                );

                translateX.value = t.tx;
                translateY.value = t.ty;
                scale.value = t.scale;
            })
            .onEnd(() => {
                const t = clampTransform(
                    translateX.value,
                    translateY.value,
                    scale.value,
                    baseW.value,
                    baseH.value,
                    CROP_SIZE,
                    5.0
                );
                translateX.value = withTiming(t.tx);
                translateY.value = withTiming(t.ty);
                savedTranslateX.value = t.tx;
                savedTranslateY.value = t.ty;
                savedScale.value = t.scale;
                runOnJS(syncToJS)({ x: t.tx, y: t.ty, scale: t.scale });
            })
            .onFinalize(() => {
                isGesturing.value = false;
            }),
        [CROP_SIZE]
    );

    const pinchGesture = useMemo(() =>
        Gesture.Pinch()
            .onBegin(() => {
                isGesturing.value = true;
                cancelAnimation(scale);
            })
            .onUpdate((e) => {
                const dampedScale = savedScale.value * (1 + (e.scale - 1) * 0.8);
                const t = clampTransform(
                    translateX.value,
                    translateY.value,
                    dampedScale,
                    baseW.value,
                    baseH.value,
                    CROP_SIZE,
                    5.0
                );
                scale.value = t.scale;
                translateX.value = t.tx;
                translateY.value = t.ty;
            })
            .onEnd(() => {
                const t = clampTransform(
                    translateX.value,
                    translateY.value,
                    scale.value,
                    baseW.value,
                    baseH.value,
                    CROP_SIZE,
                    5.0
                );
                scale.value = withTiming(t.scale);
                translateX.value = withTiming(t.tx);
                translateY.value = withTiming(t.ty);
                savedScale.value = t.scale;
                savedTranslateX.value = t.tx;
                savedTranslateY.value = t.ty;
                runOnJS(syncToJS)({ x: t.tx, y: t.ty, scale: t.scale });
            })
            .onFinalize(() => {
                isGesturing.value = false;
            }),
        [CROP_SIZE]
    );

    const composedGesture = useMemo(() => Gesture.Race(panGesture, pinchGesture), [panGesture, pinchGesture]);

    const animatedImageStyle = useAnimatedStyle(() => {
        const w = baseW.value;
        const h = baseH.value;
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

    if (!imageSrc) return null;
    const { t } = useLanguage();

    return (
        <GestureDetector gesture={composedGesture}>
            <View style={[styles.container, { width: PREVIEW_SIZE_W, height: PREVIEW_SIZE_H }]}>
                <View style={[styles.previewWrap, { width: PREVIEW_SIZE_W, height: PREVIEW_SIZE_H }]}>
                    {/* Background Layer (Visual only) */}
                    <Animated.View style={[styles.centeredImage, animatedImageStyle]}>
                        <Animated.Image source={{ uri: imageSrc }} style={styles.baseImage} resizeMode="cover" />
                        <FilteredImageSkia
                            uri={imageSrc}
                            width={normalizedBaseSize.bw}
                            height={normalizedBaseSize.bh}
                            matrix={matrix}
                            style={StyleSheet.absoluteFillObject as any}
                        />
                    </Animated.View>

                    {/* Overlays */}
                    <View style={[styles.overlayTop, { height: MARGIN_Y }]} pointerEvents="none" />
                    <View style={[styles.overlayBottom, { height: MARGIN_Y }]} pointerEvents="none" />
                    <View style={[styles.overlayLeft, { top: MARGIN_Y, bottom: MARGIN_Y, width: MARGIN_X }]} pointerEvents="none" />
                    <View style={[styles.overlayRight, { top: MARGIN_Y, bottom: MARGIN_Y, width: MARGIN_X }]} pointerEvents="none" />

                    {/* Active Crop Window */}
                    <View style={[styles.cropWindow, { width: CROP_SIZE, height: CROP_SIZE, left: MARGIN_X, top: MARGIN_Y }]} pointerEvents="none">
                        <Animated.View style={[styles.centeredImage, animatedImageStyle]}>
                            <Animated.Image source={{ uri: imageSrc }} style={styles.baseImage} resizeMode="cover" />
                            <FilteredImageSkia
                                uri={imageSrc}
                                width={normalizedBaseSize.bw}
                                height={normalizedBaseSize.bh}
                                matrix={matrix}
                                style={StyleSheet.absoluteFillObject as any}
                            />
                        </Animated.View>
                    </View>
                </View>
                <View style={styles.labelContainer} pointerEvents="none">
                    <Text style={styles.label}>{t["printArea"] || "Print area (20×20cm)"}</Text>
                </View>
            </View>
        </GestureDetector>
    );
});

export default CropFrameRN;

const styles = StyleSheet.create({
    container: { backgroundColor: "#F7F7F8", alignItems: "center", justifyContent: "center" },
    previewWrap: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
    cropWindow: { position: "absolute", overflow: "hidden", zIndex: 3, borderWidth: 2, borderColor: "rgba(0,0,0,0.75)", borderRadius: 2 },
    centeredImage: { position: "absolute", left: "50%", top: "50%" },
    baseImage: { width: '100%', height: '100%' },
    overlayTop: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: "#BEBEBE", opacity: 0.30, zIndex: 2 },
    overlayBottom: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#BEBEBE", opacity: 0.30, zIndex: 2 },
    overlayLeft: { position: "absolute", left: 0, backgroundColor: "#BEBEBE", opacity: 0.30, zIndex: 2 },
    overlayRight: { position: "absolute", right: 0, backgroundColor: "#BEBEBE", opacity: 0.30, zIndex: 2 },
    labelContainer: { marginTop: 12, height: 20, justifyContent: "center", alignItems: "center" },
    label: { color: "rgba(0,0,0,0.35)", fontSize: 13, fontWeight: "500", textAlign: "center" },
});
