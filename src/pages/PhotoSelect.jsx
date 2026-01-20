import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const MOCK_PHOTOS = [
    "https://images.unsplash.com/photo-1513161455079-7dc1bad1563f?q=80&w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1517404215738-15263e9f9178?q=80&w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=400&h=400&fit=crop",
];

export default function PhotoSelect() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [selected, setSelected] = useState([]);

    const toggleSelect = (src) => {
        if (selected.includes(src)) {
            setSelected(selected.filter(s => s !== src));
        } else {
            setSelected([...selected, src]);
        }
    };

    const handleContinue = () => {
        if (selected.length > 0) {
            sessionStorage.setItem('selectedPhotos', JSON.stringify(selected));
            navigate('/create/editor');
        }
    };

    return (
        <div style={styles.container} className="page-container">
            {/* Header */}
            <div style={styles.header}>
                <button onClick={() => navigate(-1)} style={styles.backButton}>
                    <ChevronLeft size={28} color="var(--primary)" />
                    <span style={{ color: 'var(--primary)', fontSize: '17px' }}>{t.home}</span>
                </button>
                <h2 style={styles.title}>{t.selectPhotos}</h2>
                <div style={{ width: '60px' }}></div> {/* Spacer */}
            </div>

            {/* Grid */}
            <div style={styles.grid}>
                {MOCK_PHOTOS.map((src, idx) => {
                    const isSelected = selected.includes(src);
                    return (
                        <div key={idx} style={styles.photoWrapper} onClick={() => toggleSelect(src)}>
                            <img src={src} style={styles.img} alt="select" />
                            {isSelected && (
                                <div style={styles.overlay}>
                                    <CheckCircle color="#fff" fill="var(--primary)" size={24} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Floating Bottom Bar */}
            <div style={styles.bottomBar}>
                <div style={styles.counter}>
                    {selected.length} {t.photosSelected}
                </div>
                <button
                    style={{
                        ...styles.continueBtn,
                        opacity: selected.length > 0 ? 1 : 0.5,
                    }}
                    disabled={selected.length === 0}
                    onClick={handleContinue}
                >
                    {t.continue}
                </button>
            </div>
        </div>
    );
}


const styles = {
    container: {
        padding: 0,
        paddingTop: 'var(--safe-area-top)',
        minHeight: '100vh',
        backgroundColor: '#fff',
    },
    header: {
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(10px)',
        zIndex: 10,
    },
    backButton: {
        display: 'flex',
        alignItems: 'center',
        background: 'none',
        border: 'none',
        padding: 0,
    },
    title: {
        fontSize: '17px',
        fontWeight: '600',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0px',
        paddingBottom: '100px',
    },
    photoWrapper: {
        position: 'relative',
        aspectRatio: '1',
        cursor: 'pointer',
        overflow: 'hidden',
        padding: 0,
    },
    img: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
    },
    overlay: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'rgba(255,255,255,0.2)', // subtle background
        borderRadius: '50%',
    },
    bottomBar: {
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        padding: '20px',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 'max(20px, var(--safe-area-bottom))',
    },
    counter: {
        fontSize: '16px',
        fontWeight: '500',
    },
    continueBtn: {
        backgroundColor: 'var(--primary)',
        color: '#fff',
        padding: '12px 24px',
        borderRadius: '24px',
        fontWeight: '600',
        fontSize: '16px',
    }
};
