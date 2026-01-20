import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function TopBar({ current, total, onBack, onNext }) {
    const { t } = useLanguage();
    return (
        <div style={styles.header}>
            <button onClick={onBack} style={styles.navBtn}>
                <ChevronLeft size={28} color="var(--text)" strokeWidth={2} />
            </button>
            <span style={styles.title}>
                {t.editCount.replace('%current%', current).replace('%total%', total)}
            </span>
            <button onClick={onNext} style={styles.doneBtn}>
                {t.next}
            </button>
        </div>
    );
}


const styles = {
    header: {
        height: '52px', // Slightly taller
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 16px',
        marginTop: 'var(--safe-area-top)',
        backgroundColor: 'rgba(247,247,248, 0.92)', // Match app bg with transparency
        backdropFilter: 'blur(10px)',
        zIndex: 10,
        borderBottom: '1px solid rgba(0,0,0,0.06)',
    },
    navBtn: {
        display: 'flex',
        alignItems: 'center',
        background: 'none',
        border: 'none',
        padding: '8px',
        cursor: 'pointer',
    },
    title: {
        fontWeight: '600',
        fontSize: '16px',
        color: '#111',
    },
    doneBtn: {
        fontWeight: '600',
        color: '#111', // Neutral for "Next" unless primary action?
        // User asked for "Next" on right. 
        fontSize: '16px',
        background: 'none',
        border: 'none',
        padding: '8px',
        cursor: 'pointer',
    }
};
