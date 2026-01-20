import React from 'react';

export default function CTAOverlay({ onClick }) {
    return (
        <div style={styles.overlay} onClick={onClick}>
            <button style={styles.button}>
                Create My Tile
            </button>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)', // Slight dim for contrast
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    button: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        color: '#000',
        padding: '16px 32px',
        borderRadius: '30px',
        fontSize: '18px',
        fontWeight: '600',
        border: 'none',
        boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
        pointerEvents: 'none', // Let parent click handle it or just wrapper
    }
};
