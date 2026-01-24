// components/editor/CropFrame.jsx
import React, { useRef, useState, useEffect, useMemo } from "react";
import { useLanguage } from "../../context/LanguageContext";

const CROP_SIZE = 300;      // 고정 프레임(정사각)
const PREVIEW_SIZE = 400;   // previewWrap 실제 렌더 영역(400x400)

export default function CropFrame({ imageSrc, crop, onChange, filterStyle }) {
    const { t } = useLanguage();
    const containerRef = useRef(null);
    const [imgState, setImgState] = useState({ w: 0, h: 0 });

    // ✅ 버퍼링 감소용 (리렌더 폭주 방지)
    const rafRef = useRef(null);
    const pendingCropRef = useRef(null);

    useEffect(() => {
        if (!imageSrc) return;
        const img = new Image();
        img.src = imageSrc;
        img.onload = () => setImgState({ w: img.naturalWidth, h: img.naturalHeight });
    }, [imageSrc]);

    // ✅ 컴포넌트 언마운트 시 남은 rAF 정리
    useEffect(() => {
        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            pendingCropRef.current = null;
        };
    }, []);

    // ✅ filterStyle spread 금지 (opacity/filter 덮어쓸 수 있음)
    const selectedFilter = useMemo(() => {
        if (!filterStyle) return "";
        return typeof filterStyle.filter === "string" ? filterStyle.filter : "";
    }, [filterStyle]);

    // ✅ UI에서 쓰는 baseScale은 PREVIEW_SIZE 기준 (배경이 400을 꽉 채우도록)
    const baseScale =
        imgState.w && imgState.h
            ? Math.max(PREVIEW_SIZE / imgState.w, PREVIEW_SIZE / imgState.h)
            : 1;

    const renderW = imgState.w * baseScale;
    const renderH = imgState.h * baseScale;

    // ✅ 최소 줌(minScale) = "전체 사진이 300 프레임 안에 다 들어올 수 있는 수준"까지 허용
    // - 무한 줌아웃 방지: HARD_FLOOR 아래로는 못 내려감
    const minScale = useMemo(() => {
        if (!imgState.w || !imgState.h) return 1;

        const sContain = Math.min(
            CROP_SIZE / (imgState.w * baseScale),
            CROP_SIZE / (imgState.h * baseScale)
        );

        const HARD_FLOOR = 0.65; // 필요하면 0.6~0.75 사이에서 조정
        const computed = Math.max(HARD_FLOOR, sContain);

        return Math.min(1, computed);
    }, [imgState.w, imgState.h, baseScale]);

    // ----- Clamp (프레임(CROP_SIZE) 기준으로만 제한) -----
    const clampPos = (x, y, scale) => {
        if (!imgState.w || !imgState.h) return { x: 0, y: 0 };

        // ✅ scale도 여기서 clamp (minScale 반영)
        const s = Math.max(minScale, Math.min(scale || 1, 3.0));

        const coverW = imgState.w * baseScale;
        const coverH = imgState.h * baseScale;

        const currentW = coverW * s;
        const currentH = coverH * s;

        const maxDx = Math.max(0, (currentW - CROP_SIZE) / 2);
        const maxDy = Math.max(0, (currentH - CROP_SIZE) / 2);

        return {
            x: Math.max(-maxDx, Math.min(maxDx, x)),
            y: Math.max(-maxDy, Math.min(maxDy, y)),
        };
    };

    // ----- Gesture -----
    const gesture = useRef({
        active: false,
        mode: "none",
        startX: 0,
        startY: 0,
        startCx: 0,
        startCy: 0,
        startDist: 0,
        startScale: 1,
    });

    const getDist = (e) =>
        Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
        );

    const onStart = (e) => {
        e.preventDefault();
        gesture.current.active = true;

        if (e.touches && e.touches.length === 2) {
            gesture.current.mode = "pinch";
            gesture.current.startDist = getDist(e);
            gesture.current.startScale = crop.scale || 1;
        } else {
            gesture.current.mode = "drag";
            const p = e.touches ? e.touches[0] : e;
            gesture.current.startX = p.clientX;
            gesture.current.startY = p.clientY;
            gesture.current.startCx = crop.x || 0;
            gesture.current.startCy = crop.y || 0;
        }
    };

    // ✅ 핵심: onChange를 매 move마다 호출하지 말고 rAF로 1프레임에 1번만 호출 (버퍼링 감소)
    const flushPending = () => {
        rafRef.current = null;
        if (!pendingCropRef.current) return;
        onChange(pendingCropRef.current);
        pendingCropRef.current = null;
    };

    const onMove = (e) => {
        if (!gesture.current.active) return;
        e.preventDefault();

        let nextScale = crop.scale || 1;
        let nextX = crop.x || 0;
        let nextY = crop.y || 0;

        if (gesture.current.mode === "pinch" && e.touches && e.touches.length === 2) {
            const dist = getDist(e);
            const factor = dist / gesture.current.startDist;
            nextScale = gesture.current.startScale * factor;
            nextScale = Math.max(minScale, Math.min(nextScale, 3.0));
        } else if (gesture.current.mode === "drag") {
            const p = e.touches ? e.touches[0] : e;
            const dx = p.clientX - gesture.current.startX;
            const dy = p.clientY - gesture.current.startY;
            nextX = gesture.current.startCx + dx;
            nextY = gesture.current.startCy + dy;
        }

        const clamped = clampPos(nextX, nextY, nextScale);
        const finalScale = Math.max(minScale, Math.min(nextScale, 3.0));

        // 변경이 없으면 스킵
        if (
            clamped.x === (crop.x || 0) &&
            clamped.y === (crop.y || 0) &&
            finalScale === (crop.scale || 1)
        ) {
            return;
        }

        // ✅ pending에만 저장하고, 화면 업데이트는 rAF에서 1회 처리
        pendingCropRef.current = { x: clamped.x, y: clamped.y, scale: finalScale };

        if (!rafRef.current) {
            rafRef.current = requestAnimationFrame(flushPending);
        }
    };

    const onEnd = () => {
        gesture.current.active = false;
        gesture.current.mode = "none";

        // ✅ 손을 떼는 순간 마지막 pending 값을 즉시 반영 (프레임/상태 싱크 보장)
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        if (pendingCropRef.current) {
            onChange(pendingCropRef.current);
            pendingCropRef.current = null;
        }
    };

    const sharedTransform = `translate(-50%, -50%) translate(${crop.x || 0}px, ${crop.y || 0}px) scale(${crop.scale || 1})`;

    const dimFilter = `${selectedFilter} grayscale(0.18) brightness(0.72) contrast(0.98)`;
    const dimBlur = "blur(0.6px)";

    if (!imageSrc) return null;

    return (
        <div style={styles.container}>
            <div
                style={styles.previewWrap}
                ref={containerRef}
                onTouchStart={onStart}
                onTouchMove={onMove}
                onTouchEnd={onEnd}
                onTouchCancel={onEnd}
                onMouseDown={onStart}
                onMouseMove={onMove}
                onMouseUp={onEnd}
                onMouseLeave={onEnd}
            >
                {/* Background: dimmed photo fills entire 400 */}
                <img
                    src={imageSrc}
                    alt="Background"
                    draggable={false}
                    style={{
                        ...styles.sharedImgBase,
                        width: `${renderW}px`,
                        height: `${renderH}px`,
                        transform: sharedTransform,
                        filter: `${dimFilter} ${dimBlur}`,
                        opacity: 0.62,
                    }}
                />

                {/* Foreground: sharp photo ONLY inside 300x300 crop window */}
                <div style={styles.cropWindow} aria-hidden="true">
                    <img
                        src={imageSrc}
                        alt="Crop"
                        draggable={false}
                        style={{
                            ...styles.sharedImgBase,
                            width: `${renderW}px`,
                            height: `${renderH}px`,
                            transform: sharedTransform,
                            filter: selectedFilter || "none",
                            opacity: 1,
                        }}
                    />
                </div>

                {/* Frame overlay: square, NO 내부 실선 */}
                <div style={styles.cropOverlay} aria-hidden="true">
                    <div style={styles.frameDecoration}>
                        <div style={styles.cornerTL} />
                        <div style={styles.cornerTR} />
                        <div style={styles.cornerBL} />
                        <div style={styles.cornerBR} />
                    </div>
                </div>
            </div>

            <div style={styles.caption}>{t.printArea}</div>
        </div>
    );
}

const styles = {
    container: {
        width: "100%",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F7F7F8",
        overflow: "hidden",
        minHeight: "380px",
        padding: "20px 0",
    },

    previewWrap: {
        width: "100%",
        maxWidth: "400px",
        height: "400px",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "grab",
        touchAction: "none",
        backgroundColor: "transparent",
        overflow: "hidden",
    },

    sharedImgBase: {
        position: "absolute",
        left: "50%",
        top: "50%",
        transformOrigin: "center",
        willChange: "transform",
        pointerEvents: "none",
        maxWidth: "none",
        maxHeight: "none",
        userSelect: "none",

        // ✅ 현재 유지 (요청: 화질/기능/프레임 동일)
        transition: "transform 70ms linear",
    },

    cropWindow: {
        position: "absolute",
        left: "50%",
        top: "50%",
        width: `${CROP_SIZE}px`,
        height: `${CROP_SIZE}px`,
        transform: "translate(-50%, -50%)",
        overflow: "hidden",
        borderRadius: 0, // ✅ 정사각
        zIndex: 3,
        pointerEvents: "none",
    },

    cropOverlay: {
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },

    frameDecoration: {
        width: `${CROP_SIZE}px`,
        height: `${CROP_SIZE}px`,
        position: "relative",
        borderRadius: 0, // ✅ 정사각
        background: "transparent",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.68), 0 12px 28px rgba(0,0,0,0.18)",
    },

    cornerTL: {
        position: "absolute",
        top: 8,
        left: 8,
        width: 10,
        height: 10,
        borderLeft: "1px solid #fff",
        borderTop: "1px solid #fff",
        opacity: 0.22,
    },
    cornerTR: {
        position: "absolute",
        top: 8,
        right: 8,
        width: 10,
        height: 10,
        borderRight: "1px solid #fff",
        borderTop: "1px solid #fff",
        opacity: 0.22,
    },
    cornerBL: {
        position: "absolute",
        bottom: 8,
        left: 8,
        width: 10,
        height: 10,
        borderLeft: "1px solid #fff",
        borderBottom: "1px solid #fff",
        opacity: 0.22,
    },
    cornerBR: {
        position: "absolute",
        bottom: 8,
        right: 8,
        width: 10,
        height: 10,
        borderRight: "1px solid #fff",
        borderBottom: "1px solid #fff",
        opacity: 0.22,
    },

    caption: {
        marginTop: "20px",
        color: "#9CA3AF",
        fontSize: "12px",
        fontWeight: "500",
        letterSpacing: "0.3px",
    },
};
