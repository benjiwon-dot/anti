import React from 'react';

export default function SummaryCard({ itemCount, subtotal, discount, total }) {
    return (
        <div style={styles.card}>
            <h3 style={styles.title}>Order Summary</h3>

            <div style={styles.row}>
                <span>{itemCount} Tile{itemCount !== 1 ? 's' : ''} (20x20cm)</span>
                <span>${subtotal.toFixed(2)}</span>
            </div>

            {discount > 0 && (
                <div style={{ ...styles.row, color: 'var(--success)' }}>
                    <span>Bundle Discount (20% off)</span>
                    <span>-${discount.toFixed(2)}</span>
                </div>
            )}

            <div style={styles.row}>
                <span>Shipping</span>
                <span>FREE</span>
            </div>

            <div style={styles.divider}></div>

            <div style={{ ...styles.row, fontWeight: '700', fontSize: '18px' }}>
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
            </div>
        </div>
    );
}

const styles = {
    card: {
        backgroundColor: '#fff',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    title: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#8E8E93',
        textTransform: 'uppercase',
        marginBottom: '16px',
        letterSpacing: '0.5px',
    },
    row: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '10px',
        fontSize: '15px',
        color: 'var(--text)',
    },
    divider: {
        height: '1px',
        backgroundColor: '#E5E5EA',
        margin: '12px 0',
    }
};
