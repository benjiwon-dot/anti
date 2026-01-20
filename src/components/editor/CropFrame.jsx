import React, { useRef, useState, useEffect } from 'react';

// Fixed logical crop box size
const CROP_SIZE = 300;

export default function CropFrame({ imageSrc, crop, onChange, filterStyle }) {
    const containerRef = useRef(null);
    const [imgState, setImgState] = useState({ w: 0, h: 0 });

    useEffect(() => {
        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            setImgState({ w: img.naturalWidth, h: img.naturalHeight });
        };
    }, [imageSrc]);

    // -- CLAMP Logic --
    // We need to ensure the image always covers the CROP_SIZE box.
    // The image is rendered centered at (0,0) (the box center).
    // The transform is: translate(-50%, -50%) translate(crop.x, crop.y) scale(crop.scale)
    // 
    // "Base Scale" is the scale at which the image exactly covers the box (like object-fit: cover).
    // renderW = imgState.w * baseScale * crop.scale
    //
    // Constraints:
    // Left edge of image <= 0 (relative to box left)
    // Right edge of image >= CROP_SIZE
    // Top edge of image <= 0
    // Bottom edge of image >= CROP_SIZE
    //
    // Since we are working from CENTER, let's map coordinates:
    // Box Center = (CROP_SIZE / 2, CROP_SIZE / 2)
    // Image Center current = Box Center + (crop.x, crop.y)
    // Image Half Width = (currentW / 2)
    //
    // Box Left (0) <= Image Left
    // 0 <= (CROP_SIZE/2 + crop.x) - (currentW / 2)
    // => currentW/2 - CROP_SIZE/2 <= crop.x  (Wait, Image Left must be LESS than or equal to 0 for coverage)
    //
    // Actually, let's use the explicit formulas from the request for robustness:
    // baseScale = max(frameSize / imgW, frameSize / imgH)
    // coverW = imgW * baseScale
    // zoomedW = coverW * zoom
    // maxX = max(0, (zoomedW - frameSize)/2)
    // dragX must be clamped [-maxX, maxX]

    const clampPos = (x, y, scale) => {
        if (!imgState.w || !imgState.h) return { x: 0, y: 0 };

        const baseScale = Math.max(CROP_SIZE / imgState.w, CROP_SIZE / imgState.h);
        const coverW = imgState.w * baseScale;
        const coverH = imgState.h * baseScale;

        const currentW = coverW * (scale || 1);
        const currentH = coverH * (scale || 1);

        const maxDx = Math.max(0, (currentW - CROP_SIZE) / 2);
        const maxDy = Math.max(0, (currentH - CROP_SIZE) / 2);

        const cx = Math.max(-maxDx, Math.min(maxDx, x));
        const cy = Math.max(-maxDy, Math.min(maxDy, y));

        return { x: cx, y: cy };
    };

    // -- Gesture Handling --
    const gesture = useRef({
        active: false,
        mode: 'none',
        startX: 0, startY: 0, // Pointer screen coords
        startCx: 0, startCy: 0, // Initial crop.x/y
        startDist: 0, startScale: 1
    });

    const getDist = (e) => Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
    );

    const onStart = (e) => {
        e.preventDefault();
        gesture.current.active = true;

        if (e.touches && e.touches.length === 2) {
            gesture.current.mode = 'pinch';
            gesture.current.startDist = getDist(e);
            gesture.current.startScale = crop.scale || 1; // Fallback to 1 if undefined
        } else {
            gesture.current.mode = 'drag';
            const p = e.touches ? e.touches[0] : e;
            gesture.current.startX = p.clientX;
            gesture.current.startY = p.clientY;
            gesture.current.startCx = crop.x || 0;
            gesture.current.startCy = crop.y || 0;
        }
    };

    const onMove = (e) => {
        if (!gesture.current.active) return;
        e.preventDefault();

        // 1. Calculate Raw Next Target
        let nextScale = crop.scale || 1;
        let nextX = crop.x || 0;
        let nextY = crop.y || 0;

        if (gesture.current.mode === 'pinch' && e.touches && e.touches.length === 2) {
            const dist = getDist(e);
            const factor = dist / gesture.current.startDist;
            nextScale = gesture.current.startScale * factor;
            // Clamp Zoom
            nextScale = Math.max(1.0, Math.min(nextScale, 3.0));
            // Note: We don't change X/Y during pinch in this simple version, 
            // BUT we must re-clamp X/Y because specific bounds shrink when zooming out.
        } else if (gesture.current.mode === 'drag') {
            const p = e.touches ? e.touches[0] : e;
            const dx = p.clientX - gesture.current.startX;
            const dy = p.clientY - gesture.current.startY;
            nextX = gesture.current.startCx + dx;
            nextY = gesture.current.startCy + dy;
        }

        // 2. Clamp
        const clampedPos = clampPos(nextX, nextY, nextScale);

        // 3. Update
        // Only update if changed
        if (clampedPos.x !== crop.x || clampedPos.y !== crop.y || nextScale !== crop.scale) {
            onChange({ x: clampedPos.x, y: clampedPos.y, scale: nextScale });
        }
    };

    const onEnd = () => {
        gesture.current.active = false;
        gesture.current.mode = 'none';

        // Final clamp check (e.g. if zoom bounced or inertia) - strictly needed?
        // Doing it on every move is safe.
    };

    // -- Image Rendering --
    // We need to establish the Base Size in pixels to set the IMG width/height correctly for the transform logic.
    // transform: translate(-50%, -50%) ... works best if we set width/height to the Cover Size.

    const baseScale = (imgState.w && imgState.h)
        ? Math.max(CROP_SIZE / imgState.w, CROP_SIZE / imgState.h)
        : 1;

    const renderW = imgState.w * baseScale;
    const renderH = imgState.h * baseScale;

    return (
        <div style={styles.container}>
            {/* Logic Container - captures events */}
            <div
                style={styles.frame}
                ref={containerRef}
                onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
                onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
            >
                {/* Image */}
                <img
                    src={imageSrc}
                    alt="Edit"
                    draggable={false}
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        width: renderW ? `${renderW}px` : '100%',
                        height: renderH ? `${renderH}px` : '100%',
                        // Transform composition: 
                        // 1. Center the element origin (translate -50, -50)
                        // 2. Apply drag translation (crop.x, crop.y)
                        // 3. Apply zoom scale (crop.scale)
                        transform: `translate(-50%, -50%) translate(${crop.x || 0}px, ${crop.y || 0}px) scale(${crop.scale || 1})`,
                        transformOrigin: 'center',
                        willChange: 'transform',
                        pointerEvents: 'none', // Frame handles interaction
                        maxWidth: 'none',
                        maxHeight: 'none',
                        ...filterStyle
                    }}
                />


                {/* Internal Grid Overlay */}
                <div style={styles.gridOverlay}></div>
            </div>
            <div style={styles.caption}>
                Print-safe crop · 20×20 cm tile
            </div>
        </div>
    );
}

const styles = {
    container: {
        width: '100%',
        flex: 1, // fill available vertical space
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F7F7F8', // Off-white app background
        overflow: 'hidden',
        minHeight: '380px', // Ensure space
        paddingBottom: '20px',
    },
    frame: {
        width: `${CROP_SIZE}px`,
        height: `${CROP_SIZE}px`,
        backgroundColor: '#fff',
        overflow: 'hidden', // Mask content outside
        position: 'relative',
        cursor: 'grab',
        touchAction: 'none', // Critical for mobile gestures
        borderRadius: '0', // Square tile product
        boxShadow: '0 10px 30px rgba(0,0,0,0.06)', // Soft shadow
        border: '1px solid rgba(0,0,0,0.08)', // Subtle border
    },
    gridOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        opacity: 0.08,
        backgroundImage: `
            linear-gradient(to right, #000 1px, transparent 1px),
            linear-gradient(to bottom, #000 1px, transparent 1px)
        `,
        backgroundSize: '33.333% 33.333%'
    },
    caption: {
        marginTop: '20px',
        color: '#9CA3AF', // Muted gray
        fontSize: '12px',
        fontWeight: '500',
        letterSpacing: '0.3px',
    }
};
