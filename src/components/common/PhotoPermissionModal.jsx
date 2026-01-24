import React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function PhotoPermissionModal({ isOpen, onClose, onContinue }) {
    const { t } = useLanguage();

    if (!isOpen) return null;

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} style={styles.closeBtn}>
                    <X size={24} color="#8E8E93" />
                </button>

                <div style={styles.content}>
                    <div style={styles.iconWrapper}>
                        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                            <rect width="64" height="64" rx="16" fill="#F3F4F6" />
                            <path
                                d="M32 20C28.13 20 25 23.13 25 27C25 30.87 28.13 34 32 34C35.87 34 39 30.87 39 27C39 23.13 35.87 20 32 20ZM32 32C29.24 32 27 29.76 27 27C27 24.24 29.24 22 32 22C34.76 22 37 24.24 37 27C37 29.76 34.76 32 32 32ZM44 18H20C18.9 18 18 18.9 18 20V44C18 45.1 18.9 46 20 46H44C45.1 46 46 45.1 46 44V20C46 18.9 45.1 18 44 18ZM44 44H20V20H44V44Z"
                                fill="#6B7280"
                            />
                        </svg>
                    </div>

                    <h2 style={styles.title}>{t.photoPermissionTitle}</h2>
                    <p style={styles.description}>{t.photoPermissionDescription}</p>

                    <div style={styles.bulletPoints}>
                        <div style={styles.bullet}>
                            <span style={styles.bulletIcon}>✓</span>
                            <span style={styles.bulletText}>{t.photoPermissionBullet1}</span>
                        </div>
                        <div style={styles.bullet}>
                            <span style={styles.bulletIcon}>✓</span>
                            <span style={styles.bulletText}>{t.photoPermissionBullet2}</span>
                        </div>
                        <div style={styles.bullet}>
                            <span style={styles.bulletIcon}>✓</span>
                            <span style={styles.bulletText}>{t.photoPermissionBullet3}</span>
                        </div>
                    </div>

                    <button style={styles.continueBtn} onClick={onContinue}>
                        {t.photoPermissionContinue}
                    </button>

                    <a
                        href="/privacy"
                        style={styles.privacyLink}
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                    >
                        {t.photoPermissionPrivacy}
                    </a>
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
    },
    modal: {
        backgroundColor: '#fff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '420px',
        position: 'relative',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        animation: 'slideUp 0.3s ease-out',
    },
    closeBtn: {
        position: 'absolute',
        top: '16px',
        right: '16px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        transition: 'background-color 0.2s',
    },
    content: {
        padding: '48px 32px 32px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
    },
    iconWrapper: {
        marginBottom: '24px',
    },
    title: {
        fontSize: '24px',
        fontWeight: '700',
        color: '#111',
        marginBottom: '12px',
        letterSpacing: '-0.5px',
    },
    description: {
        fontSize: '15px',
        color: '#6B7280',
        lineHeight: '1.6',
        marginBottom: '28px',
        maxWidth: '320px',
    },
    bulletPoints: {
        width: '100%',
        marginBottom: '32px',
        textAlign: 'left',
    },
    bullet: {
        display: 'flex',
        alignItems: 'flex-start',
        marginBottom: '12px',
    },
    bulletIcon: {
        fontSize: '16px',
        color: '#10B981',
        marginRight: '12px',
        marginTop: '2px',
        fontWeight: '700',
    },
    bulletText: {
        fontSize: '14px',
        color: '#374151',
        lineHeight: '1.5',
        flex: 1,
    },
    continueBtn: {
        backgroundColor: '#111',
        color: '#fff',
        border: 'none',
        borderRadius: '16px',
        padding: '16px 48px',
        fontSize: '17px',
        fontWeight: '600',
        cursor: 'pointer',
        width: '100%',
        marginBottom: '16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        transition: 'transform 0.1s, box-shadow 0.1s',
    },
    privacyLink: {
        fontSize: '13px',
        color: '#6B7280',
        textDecoration: 'none',
        fontWeight: '500',
    },
};
