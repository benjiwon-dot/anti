import React from 'react';
import { Apple, CreditCard } from 'lucide-react';

export default function PaymentMethodCard() {
    return (
        <div style={styles.card}>
            <h3 style={styles.title}>Payment Method</h3>

            <div style={styles.option}>
                <div style={styles.icon}><Apple size={20} /></div>
                <span style={styles.label}>Apple Pay</span>
                <input type="radio" name="payment" defaultChecked style={styles.radio} />
            </div>

            <div style={styles.divider}></div>

            <div style={styles.option}>
                <div style={styles.icon}><CreditCard size={20} /></div>
                <span style={styles.label}>Credit Card</span>
                <input type="radio" name="payment" style={styles.radio} />
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
        marginBottom: '8px',
        letterSpacing: '0.5px',
    },
    option: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 0',
    },
    icon: {
        width: '32px',
        marginRight: '8px',
        display: 'flex',
        justifyContent: 'center',
    },
    label: {
        flex: 1,
        fontSize: '16px',
        fontWeight: '500',
    },
    divider: {
        height: '1px',
        backgroundColor: '#F2F2F7',
        marginLeft: '40px',
    },
    radio: {
        width: '20px',
        height: '20px',
        accentColor: 'var(--text)',
    }
};
