import React from 'react';

export default function OrderSummaryCard({ item }) {
    return (
        <div style={styles.card}>
            <div style={styles.imageContainer}>
                <img src={item.previewUrl} alt="Tile Preview" style={styles.image} />
            </div>
            <div style={styles.details}>
                <div style={styles.topRow}>
                    <span style={styles.productName}>Memotile (8x8)</span>
                    <span style={styles.price}>฿200.00</span>
                </div>
                <div style={styles.options}>
                    <div style={styles.optionTag}>Filter: {item.filterName}</div>
                    <div style={styles.optionTag}>Qty: {item.qty}</div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    card: {
        display: 'flex',
        padding: '12px',
        backgroundColor: '#fff',
        borderRadius: '16px',
        border: '1px solid #F3F4F6',
        marginBottom: '12px',
        alignItems: 'center',
    },
    imageContainer: {
        width: '80px',
        height: '80px',
        borderRadius: '12px',
        overflow: 'hidden',
        flexShrink: 0,
        backgroundColor: '#f9fafb',
    },
    image: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    details: {
        flex: 1,
        paddingLeft: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
    },
    topRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
    },
    productName: {
        fontSize: '15px',
        fontWeight: '600',
        color: '#111',
    },
    price: {
        fontSize: '15px',
        fontWeight: '700', // Bold as requested
        color: '#111',
    },
    options: {
        display: 'flex',
        gap: '8px',
    },
    optionTag: {
        fontSize: '12px',
        color: '#6B7280',
        backgroundColor: '#F9FAFB',
        padding: '4px 8px',
        borderRadius: '6px',
        fontWeight: '500',
    }
};
