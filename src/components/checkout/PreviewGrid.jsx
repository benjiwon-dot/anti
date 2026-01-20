import React from 'react';
import { Minus, Plus, Pencil } from 'lucide-react';

export default function PreviewGrid({ items, onEdit, onUpdateQty }) {
    return (
        <div style={styles.container}>
            {items.map((item, idx) => (
                <div key={idx} style={styles.itemWrapper}>
                    {/* Image Card */}
                    <div style={styles.card} onClick={() => onEdit(idx)}>
                        <img src={item.previewUrl} alt="Tile" style={styles.img} />
                        <div style={styles.editOverlay}>
                            <Pencil size={16} color="#fff" />
                        </div>
                    </div>

                    {/* Qty Stepper */}
                    <div style={styles.stepper}>
                        <button
                            style={styles.stepBtn}
                            onClick={() => onUpdateQty(idx, -1)}
                            disabled={items.length === 1 && item.qty === 1} // Prevent clear all? Or allow remove?
                        >
                            <Minus size={14} />
                        </button>
                        <span style={styles.qty}>{item.qty}</span>
                        <button style={styles.stepBtn} onClick={() => onUpdateQty(idx, 1)}>
                            <Plus size={14} />
                        </button>
                    </div>
                </div>
            ))}

            {/* Horizontal Spacer for scroll feel */}
            <div style={{ width: '1px' }}></div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        gap: '20px',
        overflowX: 'auto',
        padding: '4px 20px', // Hit area
        marginBottom: '20px',
        marginRight: '-20px', // Full bleed right
        marginLeft: '-20px', // Full bleed left
        scrollbarWidth: 'none',
    },
    itemWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
    },
    card: {
        width: '140px',
        height: '140px',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        cursor: 'pointer',
    },
    img: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    editOverlay: {
        position: 'absolute',
        top: '8px',
        right: '8px',
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: '28px',
        height: '28px',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
    },
    stepper: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: '20px',
        padding: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    stepBtn: {
        width: '28px',
        height: '28px',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F2F2F7',
        color: '#000',
    },
    qty: {
        width: '24px',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: '600',
    }
};
