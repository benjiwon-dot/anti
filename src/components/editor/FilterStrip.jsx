import React, { useRef, useEffect } from 'react';
import { FILTERS } from './filters';

export default function FilterStrip({ currentFilter, imageSrc, onSelect }) {

    // Auto scroll to active?
    const scrollRef = useRef(null);
    useEffect(() => {
        // Optional: scroll active into view on mount or change
    }, []);

    return (
        <div style={styles.scrollContainer} ref={scrollRef}>
            {FILTERS.map((f) => {
                const isActive = currentFilter.name === f.name;
                return (
                    <div
                        key={f.name}
                        style={styles.item}
                        onClick={() => onSelect(f)}
                    >
                        <div style={{
                            ...styles.previewBox,
                            ...(isActive ? styles.activeBox : {})
                        }}>
                            <img
                                src={imageSrc}
                                alt={f.name}
                                style={{ ...styles.thumb, ...f.style }}
                            />
                        </div>
                        <span style={{
                            ...styles.label,
                            ...(isActive ? styles.activeLabel : {})
                        }}>
                            {f.name}
                        </span>
                    </div>
                );
            })}
            {/* Spacers for edge padding */}
            <div style={{ minWidth: '1px' }}></div>
        </div>
    );
}

const styles = {
    scrollContainer: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        overflowX: 'auto',
        gap: '4px',
        padding: '16px 20px', // Increased side padding
        backgroundColor: '#F7F7F8', // Match page bg
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        minHeight: '110px', // Ensure touch area
    },
    item: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginRight: '16px', // Increased spacing
        cursor: 'pointer',
        flexShrink: 0,
        width: '64px',
    },
    previewBox: {
        width: '60px',
        height: '60px',
        marginBottom: '8px',
        borderRadius: '0', // Square
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.1)', // Subtle inactive border
        transition: 'all 0.2s ease',
        boxSizing: 'border-box',
    },
    activeBox: {
        border: '2px solid rgba(17,17,17,0.75)', // Refined active border
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        transform: 'scale(1.02)', // Pop effect
    },
    thumb: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
    },
    label: {
        fontSize: '12px', // Slightly larger
        color: '#9CA3AF',
        fontWeight: '500',
        textAlign: 'center',
        whiteSpace: 'nowrap',
    },
    activeLabel: {
        color: '#111',
        fontWeight: '600',
    }
};
