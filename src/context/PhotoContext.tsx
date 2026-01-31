import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    ReactNode,
} from "react";
import type { ImagePickerAsset } from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";

type DraftStep = "select" | "editor";

const DRAFT_KEY = "memotile_draft";

type SerializableAsset = Pick<
    ImagePickerAsset,
    | "uri"
    | "width"
    | "height"
    | "assetId"
    | "fileName"
    | "fileSize"
    | "mimeType"
    | "duration"
    | "exif"
> & {
    cachedPreviewUri?: string;
    edits?: {
        crop: { x: number; y: number; width: number; height: number };
        filterId: string;
        rotate?: number;
        // Exact UI state for restoring editor
        ui?: {
            crop: { x: number; y: number; scale: number };
            filterId: string;
        };
        // Final committed crop (pixel-based)
        committed?: {
            cropPx: { x: number; y: number; width: number; height: number };
            filterId: string;
        };
    };
    output?: {
        printUri: string;
        previewUri: string;
        quantity: number;
        printWidth?: number;
        printHeight?: number;
    };
};

type DraftPayload = {
    photos: SerializableAsset[];
    currentIndex: number;
    step: DraftStep;
    timestamp: number;
};

interface PhotoContextType {
    photos: ImagePickerAsset[];
    currentIndex: number;
    hasDraft: boolean;

    setPhotos: (photos: ImagePickerAsset[], opts?: { persist?: boolean; step?: DraftStep }) => Promise<void>;
    addPhotos: (newPhotos: ImagePickerAsset[], opts?: { persist?: boolean; step?: DraftStep }) => Promise<void>;
    updatePhoto: (index: number, updates: Partial<SerializableAsset>) => Promise<void>;

    clearPhotos: () => void;

    setCurrentIndex: (index: number, opts?: { persist?: boolean; step?: DraftStep }) => Promise<void>;

    saveDraft: (step: DraftStep, override?: { photos?: ImagePickerAsset[]; currentIndex?: number }) => Promise<void>;
    loadDraft: () => Promise<boolean>;
    clearDraft: () => Promise<void>;
}

const PhotoContext = createContext<PhotoContextType | undefined>(undefined);

export const usePhoto = () => {
    const ctx = useContext(PhotoContext);
    if (!ctx) throw new Error("usePhoto must be used within a PhotoProvider");
    return ctx;
};

function toSerializableAsset(a: ImagePickerAsset): SerializableAsset {
    // 안전하게 JSON 저장 가능한 필드만 유지
    return {
        uri: a.uri,
        width: a.width,
        height: a.height,
        assetId: a.assetId,
        fileName: a.fileName,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        duration: (a as any).duration,
        exif: (a as any).exif,
        cachedPreviewUri: (a as any).cachedPreviewUri,
        edits: (a as any).edits,
        output: (a as any).output,
    };
}

export const PhotoProvider = ({ children }: { children: ReactNode }) => {
    const [photos, setPhotosState] = useState<ImagePickerAsset[]>([]);
    const [currentIndex, setCurrentIndexState] = useState<number>(0);
    const [hasDraft, setHasDraft] = useState<boolean>(false);

    // Background generation queue to avoid multiple simultaneous manipulations
    const generationQueue = React.useRef<Set<string>>(new Set());

    const generatePreview = async (asset: ImagePickerAsset, index: number) => {
        const id = asset.assetId || asset.uri;
        if (generationQueue.current.has(id)) return;
        if ((asset as any).cachedPreviewUri) return;

        generationQueue.current.add(id);
        try {
            let inputUri = asset.uri;
            if (inputUri.startsWith("content://")) {
                const base = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory;
                const dest = `${base}cache_pre_${Date.now()}.jpg`;
                await FileSystem.copyAsync({ from: inputUri, to: dest });
                inputUri = dest;
            }

            const result = await manipulateAsync(
                inputUri,
                [{ resize: { width: 1000 } }],
                { compress: 0.8, format: SaveFormat.JPEG }
            );

            setPhotosState(prev => {
                const newPhotos = [...prev];
                if (newPhotos[index] && (newPhotos[index].assetId === asset.assetId || newPhotos[index].uri === asset.uri)) {
                    newPhotos[index] = { ...newPhotos[index], cachedPreviewUri: result.uri } as any;
                }
                return newPhotos;
            });
        } catch (e) {
            console.warn("Background preview generation failed", e);
        } finally {
            generationQueue.current.delete(id);
        }
    };

    // 앱 시작 시 draft 존재 여부만 빠르게 체크 (배너용)
    useEffect(() => {
        (async () => {
            try {
                const data = await AsyncStorage.getItem(DRAFT_KEY);
                setHasDraft(!!data);
            } catch {
                setHasDraft(false);
            }
        })();
    }, []);

    const saveDraft: PhotoContextType["saveDraft"] = async (step, override) => {
        try {
            const usePhotos = override?.photos ?? photos;
            const useIndex = override?.currentIndex ?? currentIndex;

            const payload: DraftPayload = {
                photos: usePhotos.map(toSerializableAsset),
                currentIndex: Math.max(0, Math.min(useIndex, Math.max(0, usePhotos.length - 1))),
                step,
                timestamp: Date.now(),
            };

            await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
            setHasDraft(true);
        } catch (e) {
            console.error("Failed to save draft", e);
        }
    };

    const loadDraft: PhotoContextType["loadDraft"] = async () => {
        try {
            const data = await AsyncStorage.getItem(DRAFT_KEY);
            if (!data) {
                setHasDraft(false);
                return false;
            }

            const draft: DraftPayload = JSON.parse(data);
            if (!draft?.photos?.length) {
                setHasDraft(false);
                return false;
            }

            // draft.photos는 SerializableAsset[] 이지만, ImagePickerAsset과 호환되는 필드들이라 그대로 사용 가능
            setPhotosState(draft.photos as unknown as ImagePickerAsset[]);
            setCurrentIndexState(draft.currentIndex || 0);
            setHasDraft(true);
            return true;
        } catch (e) {
            console.error("Failed to load draft", e);
            setHasDraft(false);
            return false;
        }
    };

    const clearDraft: PhotoContextType["clearDraft"] = async () => {
        try {
            await AsyncStorage.removeItem(DRAFT_KEY);
            setHasDraft(false);
        } catch (e) {
            console.error("Failed to clear draft", e);
        }
    };

    const setPhotos: PhotoContextType["setPhotos"] = async (newPhotos, opts) => {
        setPhotosState(newPhotos);
        setCurrentIndexState(0);

        if (opts?.persist) {
            await saveDraft(opts.step ?? "select", { photos: newPhotos, currentIndex: 0 });
        }

        // Trigger background generation for the first few photos
        newPhotos.slice(0, 5).forEach((p, i) => generatePreview(p, i));
    };

    const addPhotos: PhotoContextType["addPhotos"] = async (newPhotos, opts) => {
        setPhotosState((prev) => {
            const existing = new Set(prev.map((p) => p.assetId || p.uri));
            const filtered = newPhotos.filter((p) => !existing.has(p.assetId || p.uri));
            const merged = [...prev, ...filtered];

            if (opts?.persist) {
                // setState 내부라 즉시 저장을 위해 merged를 override로 전달
                saveDraft(opts.step ?? "select", { photos: merged, currentIndex });
            }

            // Trigger background generation for newly added photos
            const startIdx = prev.length;
            filtered.forEach((p, i) => generatePreview(p, startIdx + i));

            return merged;
        });
    };

    const updatePhoto: PhotoContextType["updatePhoto"] = async (index, updates) => {
        setPhotosState((prev) => {
            const newPhotos = [...prev];
            if (!newPhotos[index]) return prev;
            newPhotos[index] = { ...newPhotos[index], ...updates };
            // Update draft immediately
            saveDraft("editor", { photos: newPhotos, currentIndex });
            return newPhotos;
        });
    };

    const clearPhotos = () => {
        setPhotosState([]);
        setCurrentIndexState(0);
    };

    const setCurrentIndex: PhotoContextType["setCurrentIndex"] = async (index, opts) => {
        const next = Math.max(0, Math.min(index, Math.max(0, photos.length - 1)));
        setCurrentIndexState(next);

        if (opts?.persist) {
            await saveDraft(opts.step ?? "editor", { currentIndex: next });
        }
    };

    const value = useMemo<PhotoContextType>(
        () => ({
            photos,
            currentIndex,
            hasDraft,

            setPhotos,
            addPhotos,
            updatePhoto,
            clearPhotos,

            setCurrentIndex,

            saveDraft,
            loadDraft,
            clearDraft,
        }),
        [photos, currentIndex, hasDraft]
    );

    return <PhotoContext.Provider value={value}>{children}</PhotoContext.Provider>;
};
