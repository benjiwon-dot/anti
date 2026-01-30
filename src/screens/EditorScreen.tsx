// src/screens/EditorScreen.tsx
import React, { useEffect, useMemo, useRef, useState, forwardRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  ActivityIndicator,
  Alert,
  Image as RNImage,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";

import { usePhoto } from "../context/PhotoContext";
import { useLanguage } from "../context/LanguageContext";
import { colors } from "../theme/colors";

// RN Editor Components
import TopBarRN from "../components/editorRN/TopBarRN";
import CropFrameRN from "../components/editorRN/CropFrameRN";
import FilterStripRN from "../components/editorRN/FilterStripRN";
import { FILTERS } from "../components/editorRN/filters";
import { IDENTITY } from "../utils/colorMatrix";

// Import Utils
import { calculateCropRectPixels } from "../utils/cropMath";
import { generatePreviewExport, generatePrintExport } from "../utils/editorLogic";
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

  const [resolved, setResolved] = useState<ResolvedInfo | null>(null);

  // Cache for resolved URIs
  const resolvedCache = useRef<Record<string, ResolvedInfo>>({});

  const currentPhoto = photos?.[currentIndex] as any;

  // Local UI state (Gestures)
  const [currentUi, setCurrentUi] = useState<EditState>(makeDefaultEdit());
  const isExporting = useRef(false);
  const cropRef = useRef<any>(null);
  const isTransitioningRef = useRef(false);
  const isSavingRef = useRef(false);

  // Sync state when index changes (Single Source of Truth) - Sync During Render to avoid flicker
  const [prevIndex, setPrevIndex] = useState(currentIndex);
  if (currentIndex !== prevIndex) {
    setPrevIndex(currentIndex);
    const p = photos?.[currentIndex] as any;
    if (p?.edits && p.edits.ui) {
      setCurrentUi(p.edits.ui);
    } else {
      setCurrentUi(makeDefaultEdit());
    }
  }

  // Remove the old useEffect-based sync

  // URI Resolution (keep your flow, but ALSO store size)
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

        // content:// => copy to file for manipulator
        if (uri.startsWith("content://")) {
          // @ts-ignore
          const base = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory;
          const dest = `${base}editor_import_${Date.now()}.jpg`;
          await FileSystem.copyAsync({ from: uri, to: dest });
          inputUri = dest;
        }

        // Resize for fast preview UI
        const result = await manipulateAsync(
          inputUri,
          [{ resize: { width: 1000 } }],
          { compress: 0.9, format: SaveFormat.JPEG }
        );

        // ✅ store resolved uri + true size
        const info: ResolvedInfo = {
          uri: result.uri,
          width: result.width ?? 1000,
          height: result.height ?? 1000,
        };

        if (alive) {
          resolvedCache.current[uri] = info;
          setResolved(info);
        }
      } catch (e) {
        console.warn("Resolution failed", e);

        // fallback: try to get size from original uri
        try {
          const s = await getImageSizeAsync(uri);
          const info: ResolvedInfo = { uri, width: s.width, height: s.height };
          if (alive) setResolved(info);
        } catch {
          if (alive) setResolved({ uri, width: 1, height: 1 });
        }
      }
    };

    resolve();
    return () => {
      alive = false;
    };
  }, [currentPhoto?.uri]);

  const displayUri = resolved?.uri ?? currentPhoto?.uri;

  // Filter Logic
  const activeFilterId = currentUi.filterId;
  const activeFilterObj = useMemo(
    () => FILTERS.find((f) => f.id === activeFilterId) || FILTERS[0],
    [activeFilterId]
  );
  const activeMatrix = useMemo(() => activeFilterObj.matrix ?? IDENTITY, [activeFilterObj]);

  // Draft Autosave
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDraft("editor").catch(() => { });
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [currentUi, currentIndex, saveDraft]);

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      router.replace("/create/select");
    }
  };

  const handleNext = async () => {
    if (!photos || photos.length === 0) return;
    if (isExporting.current) return;

    try {
      isExporting.current = true;
      isTransitioningRef.current = true; // Lock UI re-sync

      const p = photos[currentIndex] as any;
      const originalUri = p.uri;
      const uiUri = displayUri;
      const uiW = resolved?.width ?? p.width;
      const uiH = resolved?.height ?? p.height;

      // 1. Get latest sync transform
      const latestCrop = cropRef.current?.getLatestCrop() || currentUi.crop;

      const SCREEN_WIDTH = Dimensions.get("window").width;
      const PREVIEW_SIZE = SCREEN_WIDTH;
      const CROP_SIZE = SCREEN_WIDTH * 0.75;

      const baseScale = Math.max(PREVIEW_SIZE / uiW, PREVIEW_SIZE / uiH);
      const renderedW = uiW * baseScale;
      const renderedH = uiH * baseScale;
      const renderedX = (PREVIEW_SIZE - renderedW) / 2;
      const renderedY = (PREVIEW_SIZE - renderedH) / 2;

      const cropRes = calculateCropRectPixels({
        imageSize: { width: uiW, height: uiH },
        renderedRect: { x: renderedX, y: renderedY, width: renderedW, height: renderedH },
        frameRect: {
          x: (PREVIEW_SIZE - CROP_SIZE) / 2,
          y: (PREVIEW_SIZE - CROP_SIZE) / 2,
          width: CROP_SIZE,
          height: CROP_SIZE,
        },
        transform: {
          scale: latestCrop.scale,
          translateX: latestCrop.x,
          translateY: latestCrop.y,
        },
      });

      if (!cropRes.isValid) {
        Alert.alert(
          t.cropInvalidTitle || "Crop not valid",
          t.cropInvalidBody || "Please adjust crop to cover the frame fully."
        );
        isTransitioningRef.current = false;
        return;
      }

      // 2. Export preview WITH filter
      const previewExp = await generatePreviewExport(uiUri, cropRes, activeMatrix);

      // 3. Persist ALL states
      isSavingRef.current = true;
      await updatePhoto(currentIndex, {
        edits: {
          crop: cropRes, // for legacy compatibility
          filterId: currentUi.filterId,
          rotate: 0,
          ui: {
            ...currentUi,
            crop: latestCrop,
          },
          committed: {
            cropPx: cropRes as any,
            filterId: currentUi.filterId,
          }
        } as any,
        output: {
          ...(photos[currentIndex] as any).output,
          previewUri: previewExp.uri,
          printUri: "", // placeholder
          quantity: (photos[currentIndex] as any).output?.quantity || 1,
        },
      });
      isSavingRef.current = false;

      // 4. Async Print Export (High-res)
      exportQueue.enqueue(
        async () => {
          let origW = p.width;
          let origH = p.height;
          if (!origW || !origH) {
            const s = await getImageSizeAsync(originalUri);
            origW = s.width;
            origH = s.height;
          }

          const sx = origW / uiW;
          const sy = origH / uiH;

          const c: any = cropRes;
          const origCrop: any = {
            ...c,
            originX: Math.round(c.originX * sx),
            originY: Math.round(c.originY * sy),
            width: Math.round(c.width * sx),
            height: Math.round(c.height * sy),
          };

          // Apply filter to high-res print as well
          const printExp = await generatePrintExport(originalUri, origCrop, activeMatrix);

          await updatePhoto(currentIndex, {
            output: {
              ...(photos[currentIndex] as any).output,
              printUri: printExp.uri,
              previewUri: previewExp.uri,
            },
          });
        },
        `Print-${currentIndex}`
      );

      // 5. Navigate
      if (currentIndex < photos.length - 1) {
        setCurrentIndex(currentIndex + 1);
        // isTransitioningRef will be reset by the effect or after next tick
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 50);
      } else {
        router.push("/create/checkout");
      }
    } catch (e) {
      console.error("HandleNext Error", e);
      Alert.alert(t.failedTitle || "Error", t.failedBody || "Failed to process photo.");
      isTransitioningRef.current = false;
    } finally {
      isExporting.current = false;
    }
  };

  if (!currentPhoto) return <View style={styles.loading}><ActivityIndicator /></View>;

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

      <View style={styles.editorArea}>
        <CropFrameRN
          ref={cropRef}
          imageSrc={displayUri}
          crop={currentUi.crop}
          onChange={(newCrop: any) => setCurrentUi((prev) => ({ ...prev, crop: newCrop }))}
          matrix={activeMatrix}
        />
      </View>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(20, insets.bottom) }]}>
        <FilterStripRN
          currentFilter={activeFilterObj}
          imageSrc={displayUri}
          onSelect={(f) => setCurrentUi((prev) => ({ ...prev, filterId: f.id }))}
        />

        <View style={styles.primaryBtnContainer}>
          <Pressable style={styles.primaryBtn} onPress={handleNext}>
            <Text style={styles.primaryBtnText}>
              {currentIndex === photos.length - 1
                ? (t.saveCheckout || "Save & Checkout")
                : (t.nextPhoto || "Next Photo")}
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
  primaryBtn: {
    width: "100%",
    maxWidth: 340,
    height: 52,
    backgroundColor: colors.ink,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 6,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
