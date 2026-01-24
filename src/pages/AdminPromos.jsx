import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { getOrders } from '../utils/orders';

export default function AdminPromos() {
    const navigate = useNavigate();
    const [promoStats, setPromoStats] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        calculatePromoStats();
    }, []);

    const calculatePromoStats = () => {
        try {
            const orders = getOrders();

            // Filter orders with promo codes
            const ordersWithPromo = orders.filter(order => order.promoCode);

            if (ordersWithPromo.length === 0) {
                setIsLoading(false);
                return;
            }

            // Aggregate by promo code
            const statsMap = {};

            ordersWithPromo.forEach(order => {
                const code = order.promoCode;

                if (!statsMap[code]) {
                    statsMap[code] = {
                        code: code,
                        ordersCount: 0,
                        totalRevenue: 0,
                        totalDiscount: 0,
                    };
                }

                statsMap[code].ordersCount++;
                statsMap[code].totalRevenue += order.total || 0;
                statsMap[code].totalDiscount += order.discountAmount || 0;
            });

            // Convert to array and sort by orders count
            const statsArray = Object.values(statsMap).sort((a, b) => b.ordersCount - a.ordersCount);

            setPromoStats(statsArray);
            setIsLoading(false);
        } catch (error) {
            console.error('Error calculating promo stats:', error);
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button onClick={() => navigate(-1)} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#111" />
                    <span style={styles.backText}>Back</span>
                </button>
                <h1 style={styles.title}>Promo Code Performance</h1>
            </div>

            <div style={styles.content}>
                {isLoading ? (
                    <div style={styles.emptyState}>Loading...</div>
                ) : promoStats.length === 0 ? (
                    <div style={styles.emptyState}>
                        <h3 style={styles.emptyTitle}>No Promo Codes Used Yet</h3>
                        <p style={styles.emptyText}>
                            When customers use promo codes, their performance will appear here.
                        </p>
                    </div>
                ) : (
                    <div style={styles.tableWrapper}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.tableHeader}>
                                    <th style={{ ...styles.th, textAlign: 'left' }}>Code</th>
                                    <th style={styles.th}>Orders</th>
                                    <th style={styles.th}>Total Revenue</th>
                                    <th style={styles.th}>Total Discount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {promoStats.map((stat, idx) => (
                                    <tr key={stat.code} style={idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                                        <td style={{ ...styles.td, fontWeight: '600', color: '#111' }}>
                                            {stat.code}
                                        </td>
                                        <td style={{ ...styles.td, textAlign: 'center' }}>
                                            {stat.ordersCount}
                                        </td>
                                        <td style={{ ...styles.td, textAlign: 'right', color: '#10B981', fontWeight: '600' }}>
                                            ฿{stat.totalRevenue.toFixed(2)}
                                        </td>
                                        <td style={{ ...styles.td, textAlign: 'right', color: '#EF4444', fontWeight: '600' }}>
                                            -฿{stat.totalDiscount.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div style={styles.infoBox}>
                    <h4 style={styles.infoTitle}>About this page</h4>
                    <p style={styles.infoText}>
                        This page shows aggregated statistics for promo codes based on completed orders.
                        Data is calculated from local order storage.
                    </p>
                    <p style={styles.infoText}>
                        <strong>Note:</strong> For production use, implement server-side aggregation with Firestore
                        for real-time and accurate reporting.
                    </p>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        backgroundColor: '#F7F7F8',
        minHeight: '100vh',
        paddingBottom: '60px',
    },
    header: {
        backgroundColor: '#fff',
        padding: '16px 20px',
        borderBottom: '1px solid #E5E7EB',
        marginTop: 'var(--safe-area-top)',
        position: 'relative',
    },
    backBtn: {
        border: 'none',
        background: 'none',
        display: 'flex',
        alignItems: 'center',
        padding: '8px 0',
        cursor: 'pointer',
        marginBottom: '12px',
    },
    backText: {
        fontSize: '16px',
        color: '#111',
        fontWeight: '500',
        marginLeft: '4px',
    },
    title: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#111',
        margin: 0,
        letterSpacing: '-0.5px',
    },
    content: {
        padding: '20px',
    },
    emptyState: {
        backgroundColor: '#fff',
        borderRadius: '16px',
        padding: '60px 20px',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    },
    emptyTitle: {
        fontSize: '20px',
        fontWeight: '600',
        color: '#111',
        marginBottom: '8px',
    },
    emptyText: {
        fontSize: '15px',
        color: '#6B7280',
        lineHeight: 1.5,
        margin: '0 auto',
        maxWidth: '400px',
    },
    tableWrapper: {
        backgroundColor: '#fff',
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        overflow: 'hidden',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    tableHeader: {
        backgroundColor: '#F9FAFB',
        borderBottom: '2px solid #E5E7EB',
    },
    th: {
        padding: '16px 20px',
        fontSize: '13px',
        fontWeight: '600',
        color: '#6B7280',
        textAlign: 'right',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    tableRowEven: {
        backgroundColor: '#fff',
    },
    tableRowOdd: {
        backgroundColor: '#FAFAFA',
    },
    td: {
        padding: '16px 20px',
        fontSize: '15px',
        color: '#333',
        borderBottom: '1px solid #F3F4F6',
    },
    infoBox: {
        backgroundColor: '#FEF3C7',
        border: '1px solid #FDE68A',
        borderRadius: '12px',
        padding: '20px',
        marginTop: '24px',
    },
    infoTitle: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#92400E',
        marginTop: 0,
        marginBottom: '12px',
    },
    infoText: {
        fontSize: '14px',
        color: '#78350F',
        lineHeight: 1.6,
        margin: '8px 0',
    },
};
