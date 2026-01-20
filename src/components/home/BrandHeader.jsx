import React from 'react';

export default function BrandHeader() {
    return (
        <div style={styles.container}>
            <h1 style={styles.title}>MEMOTILE</h1>
            <p style={styles.tagline}>Premium photo tiles. Stick & restick.</p>
        </div>
    );
}

const styles = {
    container: {
        textAlign: 'center',
        padding: '20px 0',
        marginTop: 'var(--safe-area-top)',
    },
    title: {
        fontSize: '32px',
        fontWeight: '800',
        letterSpacing: '2px',
        margin: 0,
        marginBottom: '8px',
    },
    tagline: {
        fontSize: '15px',
        color: 'var(--text-secondary)',
        fontWeight: '400',
        margin: 0,
    }
};
