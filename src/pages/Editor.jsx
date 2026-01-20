import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TopBar from '../components/editor/TopBar';
import CropFrame from '../components/editor/CropFrame';
import FilterStrip from '../components/editor/FilterStrip';
import { FILTERS } from '../components/editor/filters';
import { generateCrops } from '../utils/imageProcessing';
import { useLanguage } from '../context/LanguageContext';

export default function Editor() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [searchParams] = useSearchParams();
    const editModeIndex = searchParams.get('index'); // If editing specific item

    const [photos, setPhotos] = useState([]); // Raw URLs if new flow, or Cart Items if edit flow
    const [currentIndex, setCurrentIndex] = useState(0);

    // New State Model:
    // "edits" object keyed by index.
    // Values: { crop: {x,y,scale}, filter: {...}, previewUrl: '...', printUrl: '...' }
    const [edits, setEdits] = useState({});

    useEffect(() => {
        // Determine source
        const cart = JSON.parse(sessionStorage.getItem('cartItems') || '[]');
        const raw = JSON.parse(sessionStorage.getItem('selectedPhotos') || '[]');

        if (editModeIndex !== null) {
            // Mode: Edit single item from checkout
            // We load the cart items as the "photos" context but might only range over one?
            // Actually simpler to just load that one or load all and jump to index.
            setPhotos(cart.map(c => c.sourceUrl));
            setCurrentIndex(parseInt(editModeIndex));

            // Hydrate state
            const initialEdits = {};
            cart.forEach((c, i) => {
                initialEdits[i] = {
                    crop: c.crop,
                    filter: FILTERS.find(f => f.name === c.filterName) || FILTERS[0]
                };
            });
            setEdits(initialEdits);

        } else if (raw.length > 0) {
            // Mode: New Flow
            setPhotos(raw);
            // Clean start
        } else {
            navigate('/select');
        }
    }, [navigate, editModeIndex]);

    const currentPhotoUrl = photos[currentIndex];
    // Default crop centers the image? 
    // For now, CropFrame handles Cover logic if 0,0,1 passed.
    const currentEdit = edits[currentIndex] || {
        crop: { x: 0, y: 0, scale: 1 },
        filter: FILTERS[0]
    };

    const updateEdit = (partial) => {
        setEdits(prev => ({
            ...prev,
            [currentIndex]: { ...currentEdit, ...partial }
        }));
    };

    const saveCurrentAndGo = async (nextIndex) => {
        // 1. GENERATE EXPORTS
        // This is async and might be slow for full res, 
        // but we can generate preview fast.
        try {
            const { preview, print } = await generateCrops(currentPhotoUrl, currentEdit.crop, currentEdit.filter.name);

            // Update local state detailed with blobs
            // Actually, normally we'd upload these. For demo, we keep DataURLs (can be large).
            // To save memory, maybe only keep preview? 
            // User asked for logic. Let's store preview.

            const updatedItem = {
                ...currentEdit,
                previewUrl: preview,
                // printUrl: print, // Too heavy for sessionStorage!
                // In real app, we'd upload 'print' blob now or store in IndexedDB.
                // keeping it simple: just metadata + preview.
                sourceUrl: currentPhotoUrl,
            };

            // Save to temporary "Working Cart" in memory?
            // We need to persist to pass to Checkout.
            // Let's modify cart array directly.

            const existingCart = JSON.parse(sessionStorage.getItem('cartItems') || '[]');
            // If we are in "New Flow", we are building the cart 1 by 1.
            // If "Edit Flow", updating.

            // It's easier if we build a "pendingCart" structure in storage.
            // Or just map all "photos" to "cartItems" at the end.

            // Let's store individual progress in edits and persist `edits` to sessionStorage
            // so if reload, we don't lose.
            // Actually, let's just use `edits` state as source of truth until Finish.

            // We'll attach the generated preview to the `edits` state.
            setEdits(prev => ({
                ...prev,
                [currentIndex]: updatedItem
            }));

            if (nextIndex !== null) {
                setCurrentIndex(nextIndex);
            } else {
                // FINISH
                // compile all
                const finalCart = photos.map((url, idx) => {
                    const e = (idx === currentIndex ? updatedItem : edits[idx]) || { crop: { x: 0, y: 0, scale: 1 }, filter: FILTERS[0], sourceUrl: url };
                    // If we skipped generating preview for others (e.g. jumped), we might miss it.
                    // Ideally we generate on the fly or just use source as fallback.
                    return {
                        id: `T-${Date.now()}-${idx}`,
                        sourceUrl: url,
                        previewUrl: e.previewUrl || url, // Fallback
                        crop: e.crop,
                        filterName: e.filter.name,
                        qty: 1
                    };
                });

                sessionStorage.setItem('cartItems', JSON.stringify(finalCart));
                navigate('/create/checkout');
            }

        } catch (e) {
            console.error("Export failed", e);
        }
    };

    const handleNext = () => {
        if (currentIndex < photos.length - 1) {
            saveCurrentAndGo(currentIndex + 1);
        } else {
            saveCurrentAndGo(null); // Finish
        }
    };

    const handleBack = () => {
        if (currentIndex > 0) {
            // Should we save? Maybe just move.
            setCurrentIndex(currentIndex - 1);
        } else {
            navigate(-1);
        }
    };

    if (!currentPhotoUrl) return null;

    return (
        <div style={styles.container}>
            <TopBar
                current={currentIndex + 1}
                total={photos.length}
                onBack={handleBack}
                onNext={handleNext}
            />

            <CropFrame
                imageSrc={currentPhotoUrl}
                crop={currentEdit.crop}
                onChange={(newCrop) => updateEdit({ crop: newCrop })}
                filterStyle={currentEdit.filter.style}
            />

            <FilterStrip
                currentFilter={currentEdit.filter}
                imageSrc={currentPhotoUrl}
                onSelect={(newFilter) => updateEdit({ filter: newFilter })}
            />

            <div style={styles.bottomArea}>
                <button style={styles.primaryBtn} onClick={handleNext}>
                    {currentIndex === photos.length - 1 ? t.saveCheckout : t.nextPhoto}
                </button>
            </div>
        </div>
    );
}


const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#F7F7F8', // App bg
    },
    bottomArea: {
        padding: '20px 24px',
        backgroundColor: '#F7F7F8', // Blend with bg
        // borderTop: '1px solid rgba(0,0,0,0.05)', // Optional, maybe remove for cleaner look
        paddingBottom: 'max(24px, var(--safe-area-bottom))',
        display: 'flex',
        justifyContent: 'center',
    },
    primaryBtn: {
        width: '100%',
        maxWidth: '340px',
        height: '52px',
        backgroundColor: '#111', // Dark premium black
        color: '#fff',
        borderRadius: '26px', // Pill
        fontSize: '16px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 20px rgba(0,0,0,0.12)', // Stronger shadow
        border: 'none',
        cursor: 'pointer',
        transition: 'transform 0.1s active',
    }
};
