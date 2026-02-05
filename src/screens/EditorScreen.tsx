// src/screens/EditorScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  ActivityIndicator,
  Alert,
  Image as RNImage,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";

import { usePhoto } from "../context/PhotoContext";
import { useLanguage } from "../context/LanguageContext";
import { colors } from "../theme/colors";

// RN Editor Components
import TopBarRN from "../components/editorRN/TopBarRN";
import CropFrameRN from "../components/editorRN/CropFrameRN";
import FilterStripRN from "../components/editorRN/FilterStripRN";
import FilteredImageSkia, { FilteredImageSkiaRef } from "../components/editorRN/FilteredImageSkia";
import { FILTERS } from "../components/editorRN/filters";
import { IDENTITY } from "../utils/colorMatrix";

// Import Utils
import { calculatePrecisionCrop } from "../utils/cropMath";
import { generatePreviewExport, generatePrintExport, bakeFilterFromCanvasSnapshot, withTimeout } from "../utils/editorLogic";
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
    RNImage.getSize(
      uri,
      (w, h) => resolve({ width: w, height: h }),
      (err) => reject(err)
    );
  });

export default function EditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { photos, currentIndex, setCurrentIndex, saveDraft, updatePhoto } = usePhoto();
  const { t } = useLanguage();

  const resolvedCache = useRef<Record<string, ResolvedInfo>>({});
  const currentPhoto = photos?.[currentIndex] as any;

  const [resolved, setResolved] = useState<ResolvedInfo | null>(null);
  const [currentUi, setCurrentUi] = useState<EditState>(makeDefaultEdit());
  const [viewportDim, setViewportDim] = useState<{ width: number; height: number } | null>(null);
  const [exportBakeInfo, setExportBakeInfo] = useState<{ uri: string; w: number; h: number } | null>(null);

  const isExporting = useRef(false);
  const cropRef = useRef<any>(null);
  const filteredCanvasRef = useRef<FilteredImageSkiaRef>(null);
  const isTransitioningRef = useRef(false);
  const isSavingRef = useRef(false);

  const initialInfo = useMemo<ResolvedInfo | null>(() => {
    if (!currentPhoto) return null;
    return {
      uri: (currentPhoto as any).cachedPreviewUri || currentPhoto.uri,
      width: currentPhoto.width,
      height: currentPhoto.height
    };
  }, [currentPhoto?.uri, (currentPhoto as any)?.cachedPreviewUri]);

  useEffect(() => {
    let alive = true;
    const uri = currentPhoto?.uri;
    if (!uri) {
      setResolved(null);
      return;
    }
    if (resolvedCache.current[uri]) {
      setResolved(resolvedCache.current[uri]);
      return;
    }

    const resolve = async () => {
      try {
        let inputUri = uri;
        if (uri.startsWith("content://")) {
          const base = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory;
          const dest = `${base}editor_import_${Date.now()}.jpg`;
          await FileSystem.copyAsync({ from: uri, to: dest });
          inputUri = dest;
        }

        const result = await manipulateAsync(inputUri, [{ resize: { width: 1000 } }], { compress: 0.9, format: SaveFormat.JPEG });
        const info: ResolvedInfo = { uri: result.uri, width: result.width ?? 1000, height: result.height ?? 1000 };

        if (alive) {
          resolvedCache.current[uri] = info;
          const p = photos?.[currentIndex] as any;
          setCurrentUi(p?.edits?.ui ? p.edits.ui : makeDefaultEdit());
          setResolved(info);
        }
      } catch (e) {
        console.warn("Resolution failed", e);
        try {
          const s = await getImageSizeAsync(uri);
          const info: ResolvedInfo = { uri, width: s.width, height: s.height };
          if (alive) {
            const p = photos?.[currentIndex] as any;
            setCurrentUi(p?.edits?.ui ? p.edits.ui : makeDefaultEdit());
            setResolved(info);
          }
        } catch {
          if (alive) setResolved({ uri, width: 1, height: 1 });
        }
      }
    };
    resolve();
    return () => { alive = false; };
  }, [currentPhoto?.uri]);

  const activeResolved = resolved || initialInfo;
  const displayUri = activeResolved?.uri || currentPhoto?.uri;

  const activeFilterId = currentUi.filterId;
  const activeFilterObj = useMemo(() => FILTERS.find((f) => f.id === activeFilterId) || FILTERS[0], [activeFilterId]);
  const activeMatrix = useMemo(() => activeFilterObj.matrix ?? IDENTITY, [activeFilterObj]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { saveDraft("editor").catch(() => { }); }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [currentUi, currentIndex, saveDraft]);

  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    else router.replace("/create/select");
  };

  const handleNext = async () => {
    if (!photos || photos.length === 0 || isExporting.current) return;

    // 1. Freeze EVERYTHING immediately (Deterministic)
    const idx = currentIndex;
    const photo = { ...photos[idx] } as any;
    const vp = viewportDim;
    const cropState = cropRef.current?.getLatestCrop();
    const frameRect = cropRef.current?.getFrameRect();
    const filterUi = { ...currentUi };
    const matrix = activeMatrix;
    const resolvedInfo = resolved;
    const activeFilter = activeFilterObj;

    if (__DEV__) {
      console.log("[Next] Frozen State:", {
        idx,
        photoUri: photo.uri,
        vp,
        frameRect,
        cropState,
        filterId: filterUi.filterId
      });
    }

    if (!vp || !cropState || !frameRect || !activeResolved) {
      Alert.alert("Editor not ready", "Please wait for image to load.");
      return;
    }

    try {
      isExporting.current = true;
      isTransitioningRef.current = true;
      isSavingRef.current = true;

      const uiUri = resolvedInfo?.uri || photo.uri;
      const uiW = resolvedInfo?.width ?? photo.width;
      const uiH = resolvedInfo?.height ?? photo.height;

      // 2. Precision Crop using frozen vp
      const cropRes = calculatePrecisionCrop({
        sourceSize: { width: uiW, height: uiH },
        containerSize: { width: vp.width, height: vp.height },
        frameRect,
        transform: { scale: cropState.scale, translateX: cropState.x, translateY: cropState.y }
      });

      if (!cropRes.isValid) throw new Error("[Editor] Invalid crop result");

      // 3. Export Preview (Crop only)
      const previewRes = await generatePreviewExport(uiUri, cropRes);
      let finalPreviewUri = previewRes.uri;
      let finalPrintUri = ""; // Will be populated by queue or snapshot

      // 4. Bake Filter via Snapshot (Wait 2 frames)
      if (filterUi.filterId !== "original") {
        setExportBakeInfo({ uri: finalPreviewUri, w: previewRes.width, h: previewRes.height });
        // Wait 2 frames for rendering stability
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        try {
          const snapshot = filteredCanvasRef.current?.snapshot();
          if (snapshot) {
            const bakedUri = await bakeFilterFromCanvasSnapshot(snapshot);
            finalPreviewUri = bakedUri;
            finalPrintUri = bakedUri; // Instruction: bakedUriPrint must be assigned to printUri
            if (__DEV__) console.log("[Filter] Baked URI used for preview and print");
          } else {
            console.warn("[Filter] Snapshot unavailable after wait");
          }
        } catch (bakeErr) {
          console.error("[Filter] Snapshot baking failed:", bakeErr);
        }
        setExportBakeInfo(null);
      }

      // 5. Update Photo Context
      const filterParams = { matrix, overlayColor: activeFilter.overlayColor, overlayOpacity: activeFilter.overlayOpacity };
      await updatePhoto(idx, {
        edits: {
          crop: cropRes,
          filterId: filterUi.filterId,
          filterParams,
          ui: { ...filterUi, crop: cropState },
          committed: { cropPx: cropRes as any, filterId: filterUi.filterId, filterParams }
        } as any,
        output: {
          ...(photo.output || {}),
          previewUri: finalPreviewUri,
          printUri: finalPrintUri,
          quantity: photo.output?.quantity || 1
        }
      });

      // 6. High-res Print Export (Queue) - Only if NOT filtered (already high-enough or need real high-res)
      // If filtered, we already set finalPrintUri above. If original, we need to crop from original high-res.
      if (filterUi.filterId === "original") {
        exportQueue.enqueue(async () => {
          try {
            let origW = photo.width, origH = photo.height;
            if (!origW || !origH) {
              const s = await manipulateAsync(photo.uri, [], {});
              origW = s.width; origH = s.height;
            }
            const sx = origW / uiW;
            const sy = origH / uiH;
            const origCrop = {
              x: Math.round(cropRes.x * sx),
              y: Math.round(cropRes.y * sy),
              width: Math.round(cropRes.width * sx),
              height: Math.round(cropRes.height * sy)
            };
            const printRes = await generatePrintExport(photo.uri, origCrop, { srcW: origW, srcH: origH, viewW: uiW, viewH: uiH, viewCrop: cropRes });
            await updatePhoto(idx, { output: { ...(photos[idx] as any).output, printUri: printRes.uri } });
          } catch (err) { console.error(`[ExportQueue] High-res failed for ${idx}:`, err); }
        }, `Print-${idx}`);
      }

      // 7. Navigation
      if (idx < photos.length - 1) {
        requestAnimationFrame(() => {
          setCurrentIndex(idx + 1);
          setTimeout(() => { isTransitioningRef.current = false; }, 50);
        });
      } else {
        router.push("/create/checkout");
      }
    } catch (e) {
      console.error("[Next] HandleNext Error:", e);
      Alert.alert(t.failedTitle || "Error", t.failedBody || "Failed to process photo.");
      isTransitioningRef.current = false;
    } finally {
      isSavingRef.current = false;
      isExporting.current = false;
    }
  };

  if (!currentPhoto) return <View style={styles.loading}><ActivityIndicator /></View>;

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: insets.top }}>
        <TopBarRN current={currentIndex + 1} total={photos.length} onBack={handleBack} onNext={handleNext} />
      </View>

      <View
        style={styles.editorArea}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0) setViewportDim({ width, height });
        }}
      >
        {activeResolved && viewportDim ? (
          <CropFrameRN
            key={`crop-${currentIndex}`}
            ref={cropRef}
            imageSrc={activeResolved.uri}
            imageWidth={activeResolved.width}
            imageHeight={activeResolved.height}
            containerWidth={viewportDim.width}
            containerHeight={viewportDim.height}
            crop={currentUi.crop}
            onChange={(newCrop: any) => setCurrentUi((prev) => ({ ...prev, crop: newCrop }))}
            matrix={activeMatrix}
            photoIndex={currentIndex}
          />
        ) : (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <ActivityIndicator size="large" color={colors.ink} />
          </View>
        )}

        {/* Hidden Snapshot Component (Mounted for Export Baking) */}
        {exportBakeInfo && (
          <View style={{ position: "absolute", opacity: 0, width: exportBakeInfo.w, height: exportBakeInfo.h }} pointerEvents="none">
            <FilteredImageSkia
              ref={filteredCanvasRef}
              uri={exportBakeInfo.uri}
              width={exportBakeInfo.w}
              height={exportBakeInfo.h}
              matrix={activeMatrix}
            />
          </View>
        )}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(20, insets.bottom) }]}>
        <FilterStripRN currentFilter={activeFilterObj} imageSrc={displayUri} onSelect={(f) => setCurrentUi((prev) => ({ ...prev, filterId: f.id }))} />
        <View style={styles.primaryBtnContainer}>
          <Pressable style={[styles.primaryBtn, (!viewportDim || !resolved) && { opacity: 0.5 }]} onPress={handleNext} disabled={!viewportDim || !resolved || isExporting.current}>
            <Text style={styles.primaryBtnText}>
              {currentIndex === photos.length - 1 ? (t.saveCheckout || "Save & Checkout") : (t.nextPhoto || "Next Photo")}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  editorArea: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7F7F8" },
  bottomBar: { backgroundColor: "#F7F7F8", borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)" },
  primaryBtnContainer: { padding: 16, alignItems: "center" },
  primaryBtn: { width: "100%", maxWidth: 340, height: 52, backgroundColor: colors.ink, borderRadius: 26, alignItems: "center", justifyContent: "center", elevation: 6 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
