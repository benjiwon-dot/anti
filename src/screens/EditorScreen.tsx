// src/screens/EditorScreen.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  ActivityIndicator,
  Alert,
  Image as RNImage,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  cancelAnimation,
} from "react-native-reanimated";

import { usePhoto } from "../context/PhotoContext";
import { useLanguage } from "../context/LanguageContext";
import { colors } from "../theme/colors";

import TopBarRN from "../components/editorRN/TopBarRN";
import CropFrameRN from "../components/editorRN/CropFrameRN";
import FilterStripRN from "../components/editorRN/FilterStripRN";
import FilteredImageSkia, { FilteredImageSkiaRef } from "../components/editorRN/FilteredImageSkia";
import { FILTERS } from "../components/editorRN/filters";
import { IDENTITY, type ColorMatrix } from "../utils/colorMatrix";

import {
  calculatePrecisionCrop,
  defaultCenterCrop,
} from "../utils/cropMath";
import {
  generatePreviewExport,
  bakeFilterFromCanvasSnapshot,
} from "../utils/editorLogic";
import { exportQueue } from "../utils/exportQueue";

type EditState = {
  crop: { x: number; y: number; scale: number };
  filterId: string;
};

const makeDefaultEdit = (): EditState => ({
  crop: { x: 0, y: 0, scale: 1 },
  filterId: "original",
});

type ResolvedInfo = { uri: string; width: number; height: number };

const getImageSizeAsync = (uri: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    if (!uri) return resolve({ width: 0, height: 0 });
    RNImage.getSize(
      uri,
      (w, h) => resolve({ width: w, height: h }),
      (err) => reject(err)
    );
  });

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

// Helper: RAF
const waitRaf = () => new Promise<void>((res) => requestAnimationFrame(() => res()));

type BakeJob = {
  uri: string;
  w: number;
  h: number;
  matrix: ColorMatrix;
  overlayColor?: string;
  overlayOpacity?: number;
  resolve: (out: string | null) => void;
};

type OutgoingFrame = {
  index: number;
  resolved: ResolvedInfo;
  ui: EditState;
  matrix: ColorMatrix;
};

const sanitizeCropRect = (r: any, srcW: number, srcH: number) => {
  const w = Math.max(1, Math.floor(Number.isFinite(r?.width) ? r.width : 1));
  const h = Math.max(1, Math.floor(Number.isFinite(r?.height) ? r.height : 1));
  let x = Math.floor(Number.isFinite(r?.x) ? r.x : 0);
  let y = Math.floor(Number.isFinite(r?.y) ? r.y : 0);

  x = Math.max(0, Math.min(x, Math.max(0, srcW - 1)));
  y = Math.max(0, Math.min(y, Math.max(0, srcH - 1)));

  const maxSizeW = Math.max(1, srcW - x);
  const maxSizeH = Math.max(1, srcH - y);
  const size = Math.max(1, Math.min(Math.max(w, h), maxSizeW, maxSizeH));

  if (x + size > srcW) x = Math.max(0, srcW - size);
  if (y + size > srcH) y = Math.max(0, srcH - size);

  return { x, y, width: size, height: size, isValid: true };
};

async function waitForQueueIdle(timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!exportQueue.isBusy && exportQueue.pendingCount === 0) return true;
    await sleep(150);
  }
  return false;
}

async function waitForAllViewUris(getPhotos: () => any[], timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const arr = getPhotos() || [];
    const missing = arr
      .map((p: any, idx: number) => ({ idx, viewUri: p?.output?.viewUri }))
      .filter((x: any) => !x.viewUri);

    if (missing.length === 0) return true;
    await sleep(200);
  }
  return false;
}

export default function EditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { photos, currentIndex, setCurrentIndex, saveDraft, updatePhoto } = usePhoto();
  const { t } = useLanguage();

  const photosRef = useRef<any[]>(photos as any[]);
  useEffect(() => {
    photosRef.current = photos as any[];
  }, [photos]);

  const resolvedCache = useRef<Record<string, ResolvedInfo>>({});
  const currentPhoto = photos?.[currentIndex] as any;

  const isAliveRef = useRef(true);
  const bgPausedRef = useRef(false);
  const bgTokenRef = useRef(0);

  const [bakeJob, setBakeJob] = useState<BakeJob | null>(null);
  const bakeBusyRef = useRef(false);
  const pendingBakeResolveRef = useRef<((out: string | null) => void) | null>(null);
  const filteredCanvasRef = useRef<FilteredImageSkiaRef>(null);

  useEffect(() => {
    isAliveRef.current = true;
    return () => {
      isAliveRef.current = false;
      try { exportQueue.clear(); } catch { }
      try { pendingBakeResolveRef.current?.(null); } catch { }
      pendingBakeResolveRef.current = null;
      setBakeJob(null);
    };
  }, []);

  const [activeResolved, setActiveResolved] = useState<ResolvedInfo | null>(null);
  const [incomingResolved, setIncomingResolved] = useState<ResolvedInfo | null>(null);
  const [currentUi, setCurrentUi] = useState<EditState>(makeDefaultEdit());
  const [viewportDim, setViewportDim] = useState<{ width: number; height: number } | null>(null);

  const [isSwitchingPhoto, setIsSwitchingPhoto] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const isExporting = useRef(false);

  const cropRef = useRef<any>(null);
  const outgoingRef = useRef<OutgoingFrame | null>(null);

  const outgoingOpacity = useSharedValue(0);
  const incomingOpacity = useSharedValue(1);

  const outgoingStyle = useAnimatedStyle(() => ({ opacity: outgoingOpacity.value }));
  const incomingStyle = useAnimatedStyle(() => ({ opacity: incomingOpacity.value }));

  // ✅ 전환 완료 시점 처리
  const commitCrossfade = useCallback(() => {
    if (!isAliveRef.current) return;
    bgPausedRef.current = false;
    if (incomingResolved) setActiveResolved(incomingResolved);
    setIncomingResolved(null);
    outgoingRef.current = null;
    outgoingOpacity.value = 0;
    incomingOpacity.value = 1;
    setIsSwitchingPhoto(false);
    // ✅ 전환 애니메이션이 끝난 후에야 Processing 해제
    setIsProcessing(false);
  }, [incomingResolved, outgoingOpacity, incomingOpacity]);

  // ✅ 초기 정보 로드 (1080px Preview 우선 사용)
  const initialInfo = useMemo<ResolvedInfo | null>(() => {
    if (!currentPhoto) return null;
    // usePhoto에서 생성한 cachedPreviewUri (1080px)를 최우선으로 사용
    const bestUri = (currentPhoto as any).cachedPreviewUri || currentPhoto.uri;
    return {
      uri: bestUri,
      width: currentPhoto.width,
      height: currentPhoto.height,
    };
  }, [currentPhoto]);

  useEffect(() => {
    if (!isSwitchingPhoto && initialInfo?.uri) {
      setActiveResolved((prev) => {
        if (!prev) return initialInfo;
        if (prev.uri !== initialInfo.uri) return initialInfo;
        return prev;
      });
    }
  }, [initialInfo?.uri, isSwitchingPhoto]);

  // 이미지 로딩/해상도 확보
  useEffect(() => {
    let alive = true;
    const uri = currentPhoto?.uri;

    if (!uri) {
      setActiveResolved(null);
      setIncomingResolved(null);
      return;
    }

    const applyUiForIndex = (info: ResolvedInfo) => {
      const p = photos?.[currentIndex] as any;
      const savedUi = p?.edits?.ui;
      const savedFilterId = p?.edits?.filterId ?? "original";

      if (savedUi) {
        setCurrentUi({ ...savedUi, filterId: savedFilterId });
      } else {
        setCurrentUi({
          ...makeDefaultEdit(),
          filterId: "original",
          crop: defaultCenterCrop(),
        });
      }

      if (isSwitchingPhoto) setIncomingResolved(info);
      else {
        setActiveResolved(info);
        setIncomingResolved(null);
      }
    };

    const resolve = async () => {
      // 1. 이미 PhotoContext에서 1080px 프리뷰를 만들었으므로 그걸 씁니다.
      const cachedPreview = (currentPhoto as any)?.cachedPreviewUri;
      if (cachedPreview) {
        // 사이즈가 없으면 가져옴
        let w = 1080; let h = 1080;
        try {
          const s = await getImageSizeAsync(cachedPreview);
          w = s.width; h = s.height;
        } catch { }

        const info = { uri: cachedPreview, width: w, height: h };
        if (!alive) return;
        resolvedCache.current[uri] = info;
        applyUiForIndex(info);
        return;
      }

      // 2. 만약 없으면 (매우 드묾) 기존 로직대로 리사이즈
      try {
        if (resolvedCache.current[uri]) {
          if (!alive) return;
          applyUiForIndex(resolvedCache.current[uri]);
          return;
        }

        let inputUri = uri;
        if (uri.startsWith("content://")) {
          const baseDir = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory;
          const dest = `${baseDir}editor_import_${Date.now()}.jpg`;
          await FileSystem.copyAsync({ from: uri, to: dest });
          inputUri = dest;
        }

        const targetPreviewW = 1280; // ✅ 에디터 화면용 (가벼움)
        const result = await manipulateAsync(
          inputUri,
          [{ resize: { width: targetPreviewW } }],
          { compress: 0.9, format: SaveFormat.JPEG }
        );

        const info: ResolvedInfo = { uri: result.uri, width: result.width, height: result.height };
        if (!alive) return;

        resolvedCache.current[uri] = info;
        applyUiForIndex(info);
      } catch (e) {
        // 실패시 원본
        try {
          const s = await getImageSizeAsync(uri);
          const info = { uri, width: s.width, height: s.height };
          if (!alive) return;
          applyUiForIndex(info);
        } catch {
          applyUiForIndex({ uri, width: 1000, height: 1000 });
        }
      }
    };

    resolve();
    return () => { alive = false; };
  }, [currentPhoto?.uri, currentIndex, photos, isSwitchingPhoto]);

  const displayResolved = activeResolved || initialInfo;
  const displayUri = displayResolved?.uri || currentPhoto?.uri;
  // ✅ 필터 스트립용 썸네일 (200px) - 버벅임 방지 핵심
  const thumbnailUri = (currentPhoto as any)?.cachedThumbnailUri || displayUri;

  const activeFilterId = currentUi.filterId;
  const activeFilterObj = useMemo(
    () => FILTERS.find((f) => f.id === activeFilterId) || FILTERS[0],
    [activeFilterId]
  );
  const activeMatrix = useMemo(
    () => (activeFilterObj.matrix ?? IDENTITY) as ColorMatrix,
    [activeFilterObj]
  );

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSigRef = useRef<string>("");
  const savingRef = useRef(false);

  const buildDraftSig = (ui: EditState, idx: number) => {
    const c = ui.crop;
    const cropSig = `${Math.round(c.x)}|${Math.round(c.y)}|${Math.round(c.scale * 1000)}`;
    return `${idx}|${ui.filterId}|${cropSig}`;
  };

  useEffect(() => {
    if (isSwitchingPhoto || isExporting.current) return;
    const sig = buildDraftSig(currentUi, currentIndex);
    if (sig === lastSavedSigRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (savingRef.current) return;
      savingRef.current = true;
      try {
        await saveDraft("editor");
        lastSavedSigRef.current = sig;
      } catch { } finally { savingRef.current = false; }
    }, 700);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [currentUi, currentIndex, saveDraft, isSwitchingPhoto]);

  const handleBack = () => {
    if (isSwitchingPhoto || isProcessing) return;
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    else router.replace("/create/select");
  };

  const requestSkiaBake = useCallback(
    async (
      uri: string, w: number, h: number, matrix: ColorMatrix,
      opts?: { maxSide?: number; overlayColor?: string; overlayOpacity?: number }
    ): Promise<string | null> => {
      if (!isAliveRef.current) return null;
      const maxSide = Math.max(512, Math.floor(opts?.maxSide ?? 3072));
      let bakeUri = uri;
      let bakeW = Number(w) || 0;
      let bakeH = Number(h) || 0;

      if (!bakeW || !bakeH) {
        try {
          const real = await getImageSizeAsync(uri);
          bakeW = real.width; bakeH = real.height;
        } catch { }
      }
      const bigger = Math.max(bakeW, bakeH);
      if (bigger > maxSide) {
        try {
          const scale = maxSide / bigger;
          const targetW = Math.max(1, Math.round(bakeW * scale));
          const targetH = Math.max(1, Math.round(bakeH * scale));
          const resized = await manipulateAsync(
            uri,
            [{ resize: { width: targetW, height: targetH } }],
            { compress: 0.92, format: SaveFormat.JPEG }
          );
          bakeUri = resized.uri;
          bakeW = resized.width || targetW;
          bakeH = resized.height || targetH;
        } catch (e) { console.warn("[Filter] Pre-resize failed", e); }
      }

      while (bakeBusyRef.current) await waitRaf();
      bakeBusyRef.current = true;
      try {
        if (!isAliveRef.current) return null;
        return await new Promise<string | null>((resolve) => {
          pendingBakeResolveRef.current = resolve;
          setBakeJob({
            uri: bakeUri, w: bakeW, h: bakeH, matrix,
            overlayColor: opts?.overlayColor,
            overlayOpacity: opts?.overlayOpacity,
            resolve,
          });
        });
      } finally {
        pendingBakeResolveRef.current = null;
        bakeBusyRef.current = false;
      }
    },
    []
  );

  // Bake 재시도 로직
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!bakeJob) return;

      const finish = (out: string | null) => {
        if (cancelled) return;
        try { bakeJob.resolve(out); } catch { }
        setBakeJob(null);
      };

      if (!isAliveRef.current) return finish(null);

      for (let i = 0; i < 10; i++) {
        if (cancelled || !isAliveRef.current) return finish(null);

        const snapshot = filteredCanvasRef.current?.snapshot();

        if (snapshot) {
          try {
            const result = await bakeFilterFromCanvasSnapshot(snapshot);
            if (result) return finish(result);
          } catch (e) {
            console.warn("Bake attempt failed", e);
          }
        }
        await sleep(100);
      }

      console.warn("Snapshot retry failed: Timed out");
      return finish(null);
    };

    run();
    return () => { cancelled = true; };
  }, [bakeJob]);

  // Transition Animation
  useEffect(() => {
    if (!isSwitchingPhoto) return;
    if (!incomingResolved) return;
    if (!outgoingRef.current) return;
    if (!isAliveRef.current) return;

    cancelAnimation(outgoingOpacity);
    cancelAnimation(incomingOpacity);

    outgoingOpacity.value = 1;
    incomingOpacity.value = 0;

    incomingOpacity.value = withTiming(1, { duration: 180 });
    outgoingOpacity.value = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) runOnJS(commitCrossfade)();
    });
  }, [incomingResolved, isSwitchingPhoto, commitCrossfade, outgoingOpacity, incomingOpacity]);

  const handleNext = async () => {
    if (!photos || photos.length === 0 || isExporting.current) return;
    if (isSwitchingPhoto || isProcessing) return;

    setIsProcessing(true); // ✅ 로딩 시작
    isExporting.current = true;

    const idx = currentIndex;

    try {
      await sleep(100); // UI 반응 대기

      const photo = { ...photos[idx] } as any;
      const vp = viewportDim;
      const cropState = cropRef.current?.getLatestCrop();
      const frameRect = cropRef.current?.getFrameRect();
      const filterUi = { ...currentUi };
      const matrix = activeMatrix;
      const resolvedInfo = displayResolved;
      const activeFilter = activeFilterObj;

      if (!vp || !cropState || !frameRect || !resolvedInfo) {
        setIsProcessing(false);
        isExporting.current = false;
        return;
      }

      // 화면에 보여지는 이미지의 정보 (1080px resized)
      const uiUri = resolvedInfo.uri || photo.uri;
      let uiW = resolvedInfo.width ?? photo.width;
      let uiH = resolvedInfo.height ?? photo.height;

      // 안전장치
      try {
        const real = await getImageSizeAsync(uiUri);
        if (real?.width && real?.height) {
          uiW = real.width; uiH = real.height;
        }
      } catch { }

      // 1. 화면 기준 Crop 계산
      const rawCropUI = calculatePrecisionCrop({
        sourceSize: { width: uiW, height: uiH },
        containerSize: { width: vp.width, height: vp.height },
        frameRect,
        transform: {
          scale: cropState.scale,
          translateX: cropState.x,
          translateY: cropState.y,
        },
      });

      const safeUI = sanitizeCropRect(rawCropUI, uiW, uiH);
      const uiX = Math.floor(safeUI.x);
      const uiY = Math.floor(safeUI.y);
      const uiSize = Math.floor(Math.min(safeUI.width, uiW - uiX, uiH - uiY));
      const finalCropUI = { x: uiX, y: uiY, width: uiSize, height: uiSize };

      // 2. 원본(12MP) 기준 Crop 계산 (비율 변환)
      const realSrcW = photo.originalWidth || photo.width;
      const realSrcH = photo.originalHeight || photo.height;
      const scale = realSrcW / (uiW || 1);

      const sx = Math.floor(finalCropUI.x * scale);
      const sy = Math.floor(finalCropUI.y * scale);
      const sSize = Math.floor(finalCropUI.width * scale);

      const safeSx = Math.max(0, Math.min(sx, realSrcW - 1));
      const safeSy = Math.max(0, Math.min(sy, realSrcH - 1));
      const safeSSize = Math.floor(Math.min(sSize, realSrcW - safeSx, realSrcH - safeSy));
      const finalCropSRC = { x: safeSx, y: safeSy, width: safeSSize, height: safeSSize };

      // Preview 생성 (빠름)
      const previewRes = await generatePreviewExport(uiUri, finalCropUI);
      let finalPreviewUri = previewRes.uri;

      if (filterUi.filterId !== "original") {
        const bakedPreview = await requestSkiaBake(
          finalPreviewUri,
          previewRes.width,
          previewRes.height,
          matrix,
          {
            maxSide: 768,
            overlayColor: activeFilter.overlayColor,
            overlayOpacity: activeFilter.overlayOpacity,
          }
        );
        if (bakedPreview) finalPreviewUri = bakedPreview;
        await sleep(200); // GPU 해제 대기
      }

      await sleep(100);

      // 3. Context 저장
      await updatePhoto(idx, {
        edits: {
          crop: finalCropUI,
          filterId: filterUi.filterId,
          filterParams: { matrix, overlayColor: activeFilter.overlayColor, overlayOpacity: activeFilter.overlayOpacity },
          ui: { ...filterUi, crop: cropState },
          committed: {
            cropPx: finalCropSRC as any,
            filterId: filterUi.filterId,
            filterParams: { matrix },
          },
        } as any,
        output: {
          ...(photo.output || {}),
          previewUri: finalPreviewUri,
          viewUri: "", // viewUri는 백그라운드 큐에서 생성
        },
      });

      const myToken = bgTokenRef.current;

      // ✅ 백그라운드 큐: 고화질(2048px) viewUri 생성
      exportQueue.enqueue(async () => {
        if (!isAliveRef.current || bgPausedRef.current || myToken !== bgTokenRef.current) return;

        try {
          const fileInfo = await manipulateAsync(photo.uri, [], { format: SaveFormat.JPEG });
          const fileW = fileInfo.width;
          const fileH = fileInfo.height;

          if (!isAliveRef.current || bgPausedRef.current) return;

          // UI 좌표를 실제 파일 크기에 맞춰 비율 변환
          const scaleX = fileW / (uiW || 1);
          const scaleY = fileH / (uiH || 1);

          let cropX = Math.floor(finalCropUI.x * scaleX);
          let cropY = Math.floor(finalCropUI.y * scaleY);
          let cropW = Math.floor(finalCropUI.width * scaleX);
          let cropH = Math.floor(finalCropUI.height * scaleY);

          // 안전 clamp
          cropX = Math.max(0, Math.min(cropX, fileW - 1));
          cropY = Math.max(0, Math.min(cropY, fileH - 1));
          cropW = Math.max(1, Math.min(cropW, fileW - cropX));
          cropH = Math.max(1, Math.min(cropH, fileH - cropY));

          const cropSize = Math.min(cropW, cropH);
          const viewTarget = 2048;

          const viewRes = await manipulateAsync(
            photo.uri,
            [
              { crop: { originX: cropX, originY: cropY, width: cropSize, height: cropSize } },
              { resize: { width: viewTarget, height: viewTarget } },
            ],
            { compress: 0.92, format: SaveFormat.JPEG }
          );

          if (!isAliveRef.current || bgPausedRef.current) return;
          let finalView = viewRes.uri;

          if (filterUi.filterId !== "original") {
            const bakedView = await requestSkiaBake(
              finalView,
              viewRes.width || viewTarget,
              viewRes.height || viewTarget,
              matrix,
              { maxSide: 3072, overlayColor: activeFilter.overlayColor, overlayOpacity: activeFilter.overlayOpacity }
            );
            if (bakedView) finalView = bakedView;
          }

          const latestPhoto = (photosRef.current?.[idx] as any) || {};
          await updatePhoto(idx, {
            output: { ...(latestPhoto.output || {}), viewUri: finalView },
          });
        } catch (err) {
          console.error(`[ExportQueue] Failed for ${idx}`, err);
        }
      }, `View-${idx}`);

      if (idx < photos.length - 1) {
        // 다음 사진으로 이동
        const nextIdx = idx + 1;

        outgoingRef.current = {
          index: idx,
          resolved: displayResolved!,
          ui: filterUi,
          matrix,
        };

        cancelAnimation(outgoingOpacity); cancelAnimation(incomingOpacity);
        outgoingOpacity.value = 1; incomingOpacity.value = 0;

        setIsSwitchingPhoto(true);
        setIncomingResolved(null);
        // setIsProcessing(false); // ❌ 여기서 끄지 않습니다! 애니메이션 끝날때 끕니다.
        isExporting.current = false;
        setCurrentIndex(nextIdx);
        return;
      }

      // 마지막 사진
      const idleOk = await waitForQueueIdle(60000);
      const viewsOk = await waitForAllViewUris(() => photosRef.current, 60000);

      if (!idleOk || !viewsOk) {
        Alert.alert(
          (t as any).pleaseWait || "Wait",
          (t as any).generatingPreview || "Photos are still processing..."
        );
        setIsProcessing(false);
        isExporting.current = false;
        return;
      }

      await sleep(100);
      router.push("/create/checkout");

    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to process photo.");
      setIsProcessing(false); // 에러시에만 끔
      isExporting.current = false;
    }
  };

  useFocusEffect(
    useCallback(() => {
      setIsProcessing(false);
      isExporting.current = false;

      const p = photos?.[currentIndex] as any;
      if (!p) return;
      const savedUi = p.edits?.ui;
      const savedFilterId = p.edits?.filterId ?? "original";

      if (savedUi) {
        setCurrentUi({ ...savedUi, filterId: savedFilterId });
      } else {
        setCurrentUi((prev) => ({ ...prev, filterId: savedFilterId }));
      }
    }, [currentIndex, photos])
  );

  const onSelectFilter = async (f: any) => {
    if (isSwitchingPhoto || isProcessing) return; // ✅ Block filter change if processing
    const newId = f.id;
    setCurrentUi((prev) => ({ ...prev, filterId: newId }));
    const p = photos[currentIndex] as any;
    try {
      await updatePhoto(currentIndex, {
        edits: {
          ...p?.edits,
          filterId: newId,
          ui: { ...currentUi, filterId: newId },
        },
      });
    } catch (e) { console.warn("Failed to persist filter choice", e); }
  };

  const outgoing = outgoingRef.current;
  const incomingDisplayResolved = isSwitchingPhoto ? incomingResolved : activeResolved || initialInfo;

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top }}>
        <TopBarRN
          current={currentIndex + 1}
          total={photos.length}
          onBack={handleBack}
          onNext={handleNext}
        />
      </View>

      <View
        style={styles.editorArea}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0) setViewportDim({ width, height });
        }}
      >
        <View style={{ flex: 1, width: "100%", height: "100%" }}>
          {isSwitchingPhoto && outgoing && viewportDim && (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, outgoingStyle]}>
              <CropFrameRN
                key={`out-${outgoing.index}-${outgoing.resolved.uri}`}
                imageSrc={outgoing.resolved.uri}
                imageWidth={outgoing.resolved.width}
                imageHeight={outgoing.resolved.height}
                containerWidth={viewportDim.width}
                containerHeight={viewportDim.height}
                crop={outgoing.ui.crop}
                onChange={() => { }}
                matrix={outgoing.matrix}
                overlayColor={FILTERS.find(f => f.id === outgoing.ui.filterId)?.overlayColor}
                overlayOpacity={FILTERS.find(f => f.id === outgoing.ui.filterId)?.overlayOpacity}
                photoIndex={outgoing.index}
              />
            </Animated.View>
          )}

          <Animated.View
            pointerEvents={isSwitchingPhoto ? "none" : "auto"}
            style={[StyleSheet.absoluteFill, incomingStyle]}
          >
            {viewportDim && incomingDisplayResolved ? (
              <CropFrameRN
                key={`in-${currentIndex}-${incomingDisplayResolved.uri}`}
                ref={cropRef}
                imageSrc={incomingDisplayResolved.uri}
                imageWidth={incomingDisplayResolved.width}
                imageHeight={incomingDisplayResolved.height}
                containerWidth={viewportDim.width}
                containerHeight={viewportDim.height}
                crop={currentUi.crop}
                onChange={(newCrop: any) =>
                  setCurrentUi((prev) => {
                    const p = prev.crop;
                    const dx = Math.abs((newCrop?.x ?? 0) - p.x);
                    const dy = Math.abs((newCrop?.y ?? 0) - p.y);
                    const ds = Math.abs((newCrop?.scale ?? 1) - p.scale);
                    if (dx < 0.25 && dy < 0.25 && ds < 0.0005) return prev;
                    return { ...prev, crop: newCrop };
                  })
                }
                matrix={activeMatrix}
                overlayColor={activeFilterObj.overlayColor}
                overlayOpacity={activeFilterObj.overlayOpacity}
                photoIndex={currentIndex}
              />) : isSwitchingPhoto ? null : (
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                  <ActivityIndicator size="large" color={colors.ink} />
                </View>
              )}
          </Animated.View>
        </View>

        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            top: '50%',
            left: '50%',
            opacity: 0.01,
            zIndex: -1,
          }}
        >
          {bakeJob?.uri ? (
            <FilteredImageSkia
              ref={filteredCanvasRef}
              uri={bakeJob.uri}
              width={bakeJob.w}
              height={bakeJob.h}
              matrix={bakeJob.matrix}
              overlayColor={bakeJob.overlayColor}
              overlayOpacity={bakeJob.overlayOpacity}
            />
          ) : null}
        </View>

        {isProcessing && (
          <View style={styles.fullLoading}>
            <ActivityIndicator size="large" color={colors.ink} />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(20, insets.bottom) }]}>
        {/* ✅ 필터 스트립에 200px 썸네일 전달 */}
        <FilterStripRN currentFilter={activeFilterObj} imageSrc={thumbnailUri} onSelect={onSelectFilter} />
        <View style={styles.primaryBtnContainer}>
          <Pressable
            style={[
              styles.primaryBtn,
              (!viewportDim || !activeResolved || isSwitchingPhoto || isProcessing) && { opacity: 0.5, backgroundColor: '#888' },
            ]}
            onPress={handleNext}
            disabled={!viewportDim || !activeResolved || isSwitchingPhoto || isExporting.current || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {currentIndex === photos.length - 1
                  ? ((t as any).saveCheckout || "Save & Checkout")
                  : ((t as any).nextPhoto || "Next Photo")}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  editorArea: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7F7F8" },
  bottomBar: { backgroundColor: "#F7F7F8", borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)" },
  primaryBtnContainer: { padding: 16, alignItems: "center" },
  primaryBtn: {
    width: "100%",
    maxWidth: 340,
    height: 52,
    backgroundColor: colors.ink,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  fullLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.8)",
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { marginTop: 15, fontWeight: "700", color: "#111" }
});