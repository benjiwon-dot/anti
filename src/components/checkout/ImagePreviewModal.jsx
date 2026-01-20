import React from 'react';
import { X, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ImagePreviewModal({ isOpen, onClose, imageUrl, onEdit }) {
    if (!isOpen) return null;

    return (
        <div style={styles.overlay}>
            <div style={styles.backdrop} onClick={onClose}></div>

            <div style={styles.content}>
                <div style={styles.header}>
                    <button style={styles.closeBtn} onClick={onClose}>
                        <X size={24} color="#fff" />
                    </button>
                </div>

                <div style={styles.imageContainer}>
                    <img src={imageUrl} alt="Preview" style={styles.image} />
                </div>

                <div style={styles.footer}>
                    <button style={styles.editBtn} onClick={onEdit}>
                        <Pencil size={18} style={{ marginRight: '8px' }} />
                        Edit in Editor
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fade-in 0.2s ease-out'
    },
    backdrop: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(10px)',
    },
    content: {
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001,
    },
    header: {
        position: 'absolute',
        top: 'max(20px, var(--safe-area-top))',
        left: '20px',
        width: '100%',
        display: 'flex',
        justifyContent: 'flex-start',
    },
    closeBtn: {
        width: '44px',
        height: '44px',
        borderRadius: '22px',
        backgroundColor: 'rgba(255,255,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        cursor: 'pointer',
    },
    imageContainer: {
        width: '100%',
        maxWidth: '500px',
        padding: '20px',
        display: 'flex',
        justifyContent: 'center',
    },
    image: {
        width: '100%',
        height: 'auto',
        maxHeight: '70vh',
        objectFit: 'contain',
        borderRadius: '12px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
    },
    footer: {
        position: 'absolute',
        bottom: 'max(40px, var(--safe-area-bottom))',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
    },
    editBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: '25px',
        padding: '12px 24px',
        fontSize: '16px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        backdropFilter: 'blur(5px)',
    }
};
