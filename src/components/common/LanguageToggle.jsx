import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageToggle() {
    const { locale, setLocale } = useLanguage();

    return (
        <div style={styles.container}>
            <Globe size={14} color="#8E8E93" style={{ marginRight: 6 }} />
            <div style={styles.togglePill}>
                <button
                    style={{
                        ...styles.btn,
                        ...(locale === 'TH' ? styles.btnActive : {}),
                    }}
                    onClick={() => setLocale('TH')}
                >
                    TH
                </button>
                <button
                    style={{
                        ...styles.btn,
                        ...(locale === 'EN' ? styles.btnActive : {}),
                    }}
                    onClick={() => setLocale('EN')}
                >
                    EN
                </button>
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        alignItems: 'center',
        padding: '4px 8px',
    },
    togglePill: {
        display: 'flex',
        backgroundColor: '#F2F2F7',
        borderRadius: '20px',
        padding: '2px',
        border: '1px solid #E5E5EA',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
    },
    btn: {
        fontSize: '11px',
        fontWeight: '700',
        padding: '4px 10px',
        borderRadius: '16px',
        border: 'none',
        backgroundColor: 'transparent',
        color: '#8E8E93',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnActive: {
        backgroundColor: '#FFFFFF',
        color: '#111',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
};
