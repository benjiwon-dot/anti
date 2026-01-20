import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getOrderById } from '../utils/orders';
import { useLanguage } from '../context/LanguageContext';

export default function OrderSuccess() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('id');
    const order = getOrderById(orderId);

    useEffect(() => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#007AFF', '#34C759', '#FF3B30', '#FFCC00']
        });
    }, []);

    if (!order) {
        return (
            <div style={styles.container}>
                <h1 style={styles.title}>{t.orderNotFound}</h1>
                <button style={styles.primaryBtn} onClick={() => navigate('/')}>{t.goHome}</button>
            </div>
        );
    }

    return (
        <div style={styles.container} className="page-container animate-fade-in">
            <div style={styles.content}>
                <div style={styles.iconWrapper}>
                    <CheckCircle size={88} color="#10B981" fill="#D1FAE5" />
                </div>

                <h1 style={styles.title}>{t.thankYou}</h1>
                <p style={styles.message}>
                    {t.orderPlaced}<br />
                    {t.emailReceipt} {order.shipping.email}.
                </p>

                {/* Horizontal item previews */}
                <div style={styles.previewContainer}>
                    {order.items.map((item, idx) => (
                        <div key={idx} style={styles.previewBox}>
                            <img src={item.previewUrl || item.src} alt="" style={styles.previewImg} />
                        </div>
                    ))}
                </div>

                <div style={styles.orderInfo}>
                    <div style={{ marginBottom: 12 }}>
                        <span style={styles.label}>{t.orderNumberLabel}</span>
                        <div style={styles.value}>#{order.id}</div>
                    </div>
                    <div>
                        <span style={styles.estimate}>{t.estimatedDelivery}</span>
                    </div>
                </div>
            </div>

            <div style={styles.actions}>
                <button style={styles.primaryBtn} onClick={() => navigate('/orders')}>
                    {t.goMyOrders}
                </button>
                <button style={styles.secondaryBtn} onClick={() => navigate('/')}>
                    {t.backHome}
                </button>
            </div>
        </div>
    );
}


const styles = {
    container: {
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        padding: '30px',
        textAlign: 'center',
    },
    content: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: '400px',
        width: '100%',
    },
    iconWrapper: {
        marginBottom: '32px',
        // Optional: add keyframe animation in CSS
        animation: 'fadeIn 1s ease',
    },
    title: {
        fontSize: '28px',
        fontWeight: '800',
        marginBottom: '12px',
        color: '#111',
        letterSpacing: '-0.5px',
    },
    message: {
        fontSize: '16px',
        color: '#6B7280',
        marginBottom: '40px',
        lineHeight: '1.6',
    },
    orderInfo: {
        backgroundColor: '#F9FAFB',
        padding: '24px 40px',
        borderRadius: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        border: '1px solid #F3F4F6',
        width: '100%',
    },
    label: {
        fontSize: '12px',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: '1px',
    },
    value: {
        fontSize: '18px',
        fontWeight: '700',
        fontFamily: 'monospace',
        color: '#111',
    },
    estimate: {
        fontSize: '14px',
        color: '#10B981',
        marginTop: '8px',
        fontWeight: '500',
    },
    actions: {
        width: '100%',
        maxWidth: '400px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '20px',
    },
    primaryBtn: {
        backgroundColor: '#111',
        color: '#fff',
        height: '56px',
        borderRadius: '28px',
        fontSize: '17px',
        fontWeight: '600',
        width: '100%',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    },
    previewContainer: {
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        width: '100%',
        padding: '10px 0 30px 0',
        justifyContent: 'center',
    },
    previewBox: {
        width: '80px',
        height: '80px',
        borderRadius: '8px',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
    },
    previewImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    secondaryBtn: {
        backgroundColor: 'transparent',
        color: '#6B7280',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontSize: '15px',
        fontWeight: '500',
        border: 'none',
        cursor: 'pointer',
    }
};
