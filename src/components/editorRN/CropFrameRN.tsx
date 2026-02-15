import React, { useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { View, StyleSheet, Text } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS,
    cancelAnimation,
} from "react-native-reanimated";

import FilteredImageSkia from "./FilteredImageSkia";
import { ColorMatrix } from "../../utils/colorMatrix";
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
    overlayColor?: string;
    overlayOpacity?: number;
}

const CropFrameRN = forwardRef((props: Props, ref) => {
    const {
        imageSrc,
        imageWidth,
        imageHeight,
        containerWidth,
        containerHeight,
        crop,
        onChange,
        matrix,
    } = props;

    const { t } = useLanguage();

    const PREVIEW_W = containerWidth;
    const PREVIEW_H = containerHeight;

    const CROP_SIZE = Math.min(PREVIEW_W, PREVIEW_H) * 0.75;
    const MARGIN_X = (PREVIEW_W - CROP_SIZE) / 2;
    const MARGIN_Y = (PREVIEW_H - CROP_SIZE) / 2;

    const base = useMemo(() => {
        if (!imageWidth || !imageHeight) return { w: 0, h: 0 };
        const cover = Math.max(CROP_SIZE / imageWidth, CROP_SIZE / imageHeight);
        return { w: imageWidth * cover, h: imageHeight * cover };
    }, [imageWidth, imageHeight, CROP_SIZE]);

    const tx = useSharedValue(crop?.x ?? 0);
    const ty = useSharedValue(crop?.y ?? 0);
    const sc = useSharedValue(crop?.scale ?? 1);

    const savedTx = useSharedValue(0);
    const savedTy = useSharedValue(0);
    const savedSc = useSharedValue(1);

    useImperativeHandle(ref, () => ({
        getLatestCrop: () => ({ x: tx.value, y: ty.value, scale: sc.value }),
        getFrameRect: () => ({ x: MARGIN_X, y: MARGIN_Y, width: CROP_SIZE, height: CROP_SIZE }),
    }));

    // props sync
    useEffect(() => {
        tx.value = crop.x;
        ty.value = crop.y;
        sc.value = crop.scale;

        // 싱크 맞추기
        savedTx.value = crop.x;
        savedTy.value = crop.y;
        savedSc.value = crop.scale;
    }, [crop]);

    const PAN_DAMP = 0.8; // 드래그 감도 살짝 올림
    const SPRING_CONFIG = {
        mass: 0.5, // 가볍게
        damping: 15,
        stiffness: 150,
        overshootClamping: true,
    };

    const clampNow = (nx: number, ny: number, ns: number) => {
        "worklet";
        if (base.w <= 0 || base.h <= 0) return { tx: 0, ty: 0, scale: 1 };
        return clampTransform(nx, ny, ns, base.w, base.h, CROP_SIZE, 5.0);
    };

    // 1. 드래그 (Pan)
    const panGesture = Gesture.Pan()
        .averageTouches(true)
        .onBegin(() => {
            cancelAnimation(tx); cancelAnimation(ty);
            savedTx.value = tx.value; savedTy.value = ty.value;
        })
        .onUpdate((e) => {
            const nx = savedTx.value + e.translationX * PAN_DAMP;
            const ny = savedTy.value + e.translationY * PAN_DAMP;
            const t0 = clampNow(nx, ny, sc.value);
            tx.value = t0.tx; ty.value = t0.ty;
        })
        .onEnd(() => {
            savedTx.value = tx.value; savedTy.value = ty.value;
            runOnJS(onChange)({ x: tx.value, y: ty.value, scale: sc.value });
        });

    // 2. 줌 (Pinch)
    const pinchGesture = Gesture.Pinch()
        .onBegin(() => {
            cancelAnimation(sc); cancelAnimation(tx); cancelAnimation(ty);
            savedSc.value = sc.value; savedTx.value = tx.value; savedTy.value = ty.value;
        })
        .onUpdate((e) => {
            const nextScale = Math.max(1, Math.min(savedSc.value * e.scale, 5.0));

            // 줌 중심점 계산 (Focal Point Logic)
            const fx = e.focalX - PREVIEW_W / 2;
            const fy = e.focalY - PREVIEW_H / 2;

            // 비율에 따라 위치 이동 (줌인하면 중심점 쪽으로 당겨짐)
            const ratio = nextScale / savedSc.value;
            const nx = fx + (savedTx.value - fx) * ratio;
            const ny = fy + (savedTy.value - fy) * ratio;

            const t0 = clampNow(nx, ny, nextScale);
            sc.value = t0.scale; tx.value = t0.tx; ty.value = t0.ty;
        })
        .onEnd(() => {
            const t0 = clampNow(tx.value, ty.value, sc.value);
            // 줌 끝났을 때 위치 저장
            savedSc.value = t0.scale; savedTx.value = t0.tx; savedTy.value = t0.ty;

            sc.value = withSpring(t0.scale, SPRING_CONFIG);
            tx.value = withSpring(t0.tx, SPRING_CONFIG);
            ty.value = withSpring(t0.ty, SPRING_CONFIG);
            runOnJS(onChange)({ x: t0.tx, y: t0.ty, scale: t0.scale });
        });

    // 동시 인식 (Simultaneous)
    const gesture = Gesture.Simultaneous(panGesture, pinchGesture);

    const animatedImageStyle = useAnimatedStyle(() => ({
        width: base.w, height: base.h,
        transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: sc.value }]
    }));

    if (!imageSrc) return null;

    return (
        <View style={styles.container}>
            <GestureDetector gesture={gesture}>
                <View style={[styles.previewWrap, { width: PREVIEW_W, height: PREVIEW_H }]}>
                    <Animated.View style={[styles.imageAnchor, animatedImageStyle]}>
                        <FilteredImageSkia uri={imageSrc} width={base.w} height={base.h} matrix={matrix}
                            overlayColor={props.overlayColor} overlayOpacity={props.overlayOpacity} />
                    </Animated.View>

                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                        <View style={[styles.dim, { top: 0, left: 0, right: 0, height: MARGIN_Y }]} />
                        <View style={[styles.dim, { bottom: 0, left: 0, right: 0, height: MARGIN_Y }]} />
                        <View style={[styles.dim, { top: MARGIN_Y, bottom: MARGIN_Y, left: 0, width: MARGIN_X }]} />
                        <View style={[styles.dim, { top: MARGIN_Y, bottom: MARGIN_Y, right: 0, width: MARGIN_X }]} />

                        {/* 흰색 테두리 + 그림자 */}
                        <View style={[styles.embossedFrame, { width: CROP_SIZE, height: CROP_SIZE, left: MARGIN_X, top: MARGIN_Y }]} />
                    </View>
                </View>
            </GestureDetector>
            <View style={styles.labelArea} pointerEvents="none">
                <Text style={styles.labelText}>{t["printArea"] || "Print area (20×20cm)"}</Text>
            </View>
        </View>
    );
});

export default CropFrameRN;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F7F7F8", alignItems: "center", justifyContent: "center" },
    previewWrap: { overflow: "hidden", justifyContent: 'center', alignItems: 'center' },
    imageAnchor: { position: "absolute" },
    dim: { position: "absolute", backgroundColor: "rgba(0,0,0,0.5)" },
    embossedFrame: {
        position: "absolute", borderWidth: 1.5, borderColor: "#FFFFFF", borderRadius: 0,
        shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 15, elevation: 12,
    },
    labelArea: { marginTop: 16, height: 24, justifyContent: 'center' },
    labelText: { color: "rgba(0,0,0,0.45)", fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
});