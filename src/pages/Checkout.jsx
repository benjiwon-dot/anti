import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, X, CreditCard, Smartphone, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import ProgressBar from '../components/common/ProgressBar';
import ShippingDetailsCard from '../components/checkout/ShippingDetailsCard';
import { readEditorCartMeta, addOrder, clearEditorCartMeta } from '../utils/orders';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

export default function Checkout() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { user, login, isLoading: authLoading } = useAuth();

    // Steps: 1 = Summary & Auth, 2 = Shipping & Payment
    const [step, setStep] = useState(1);

    // Auto-advance removed to allow Summary view for all users
    // If logged in, they will see a "Continue" button instead of Login buttons

    const [items, setItems] = useState([]);
    const [previewTile, setPreviewTile] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('card');

    // Promo code state
    const [promoOpen, setPromoOpen] = useState(false);
    const [promoInput, setPromoInput] = useState('');
    const [promoApplied, setPromoApplied] = useState(null);
    const [promoError, setPromoError] = useState(null);
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);

    // Shipping form state
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        email: '', // If user is logged in, we might autofill this
        instagram: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Thailand'
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const cart = readEditorCartMeta();
        setItems(cart);
        // Autofill email if user exists
        if (user?.email) {
            setFormData(prev => ({ ...prev, email: user.email }));
        }
    }, [user]);

    const TILE_PRICE = 200;
    const subtotal = items.length * TILE_PRICE;
    const discountAmount = promoApplied?.discountAmount || 0;
    const total = Math.max(0, subtotal - discountAmount);

    // --- LOGIC: Promo, Validation, etc ---

    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const updated = { ...prev };
                delete updated[field];
                return updated;
            });
        }
    };

    const validate = () => {
        const newErrors = {};
        const required = ['fullName', 'phone', 'email', 'address1', 'city', 'state', 'postalCode'];
        required.forEach(field => {
            if (!formData[field]) newErrors[field] = t.required;
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleApplyPromo = async () => {
        if (!promoInput.trim()) return;
        setIsApplyingPromo(true);
        setPromoError(null);
        try {
            const code = promoInput.trim().toUpperCase();
            const promoRef = doc(db, 'promoCodes', code);
            const promoSnap = await getDoc(promoRef);

            if (!promoSnap.exists()) {
                setPromoError(t.promoInvalid);
                setIsApplyingPromo(false);
                return;
            }
            const promoData = promoSnap.data();
            if (!promoData.isActive) {
                setPromoError(t.promoInactive);
                setIsApplyingPromo(false);
                return;
            }
            if (promoData.expiresAt) {
                const expiresAt = promoData.expiresAt.toMillis ? promoData.expiresAt.toMillis() : promoData.expiresAt;
                if (expiresAt < Date.now()) {
                    setPromoError(t.promoExpired);
                    setIsApplyingPromo(false);
                    return;
                }
            }
            if (promoData.maxRedemptions && promoData.redeemedCount >= promoData.maxRedemptions) {
                setPromoError(t.promoMaxed);
                setIsApplyingPromo(false);
                return;
            }
            let discount = 0;
            if (promoData.type === 'percent') {
                discount = Math.round((subtotal * promoData.value) / 100);
            } else if (promoData.type === 'amount') {
                discount = promoData.value;
            }
            discount = Math.min(discount, subtotal);
            setPromoApplied({
                code: code,
                discountAmount: discount,
                type: promoData.type,
                value: promoData.value
            });
            setPromoInput('');
            setPromoOpen(false);
            setIsApplyingPromo(false);
        } catch (error) {
            console.error('Error applying promo:', error);
            setPromoError(t.promoInvalid);
            setIsApplyingPromo(false);
        }
    };

    const handleRemovePromo = () => {
        setPromoApplied(null);
        setPromoError(null);
        setPromoInput('');
    };

    const handlePlaceOrder = () => {
        if (items.length === 0) {
            alert(t.cartEmpty);
            return;
        }
        if (!validate()) {
            alert(t.fillRequired);
            return;
        }

        const order = {
            id: `ORD-${Date.now()}`,
            createdAt: Date.now(),
            items: items.map(x => ({
                id: x.id,
                previewUrl: x.previewUrl || x.sourceUrl || x.src || "",
                src: x.sourceUrl || x.src,
                qty: x.qty ?? 1
            })).filter(item => item.previewUrl !== ""),
            shipping: formData,
            paymentMethod: paymentMethod.toUpperCase() === 'CARD' ? 'CARD' :
                paymentMethod.toUpperCase() === 'APPLE' ? 'APPLE_PAY' : 'GOOGLE_PAY',
            subtotal: subtotal,
            promoCode: promoApplied?.code || null,
            discountAmount: discountAmount,
            total: total
        };

        addOrder(order);
        clearEditorCartMeta();
        navigate(`/order-success?id=${order.id}`);
    };

    // --- RENDER HELPERS ---

    if (authLoading) {
        // Prevent flicker
        return <div style={{ height: '100vh', backgroundColor: '#fff' }}></div>;
    }

    return (
        <div style={styles.container}>
            {/* Header - No Progress Bar as requested */}
            <div style={styles.header}>
                <button onClick={() => step === 2 && !user ? setStep(1) : navigate(-1)} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#111" />
                </button>
                <div style={styles.title}>{t.checkoutTitle}</div>
                <div style={{ width: 40 }}></div>
            </div>

            <div style={styles.content}>

                {/* STEP 1: SUMMARY & AUTH */}
                {step === 1 && (
                    <div style={styles.stepContainer}>
                        {/* 1. Preview Section (Carousel) */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{
                                display: 'flex',
                                overflowX: 'auto',
                                gap: '16px',
                                padding: '0 20px',
                                scrollSnapType: 'x mandatory',
                                scrollbarWidth: 'none', // Hide scrollbar Firefox
                                msOverflowStyle: 'none', // Hide scrollbar IE/Edge
                                WebkitOverflowScrolling: 'touch'
                            }}>
                                {/* Hide scrollbar Webkit */}
                                <style>
                                    {`
                                    .hide-scroll::-webkit-scrollbar {
                                        display: none;
                                    }
                                    `}
                                </style>
                                {items.map((item, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            flex: '0 0 auto',
                                            width: '160px',
                                            height: '160px',
                                            boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                                            borderRadius: '4px',
                                            overflow: 'hidden',
                                            scrollSnapAlign: 'center',
                                            position: 'relative'
                                        }}
                                    >
                                        <img
                                            src={item.previewUrl}
                                            alt={`Preview ${idx + 1}`}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onClick={() => setPreviewTile(item)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. Summary Card */}
                        <div style={styles.summaryBlock}>
                            {/* Item Row */}
                            <div style={styles.summaryRow}>
                                <span style={{ fontWeight: '500', color: '#111' }}>
                                    {items.length} Tiles (20x20cm)
                                </span>
                                <span style={{ fontWeight: '600', color: '#111' }}>
                                    ฿{subtotal.toFixed(2)}
                                </span>
                            </div>

                            {/* Shipping Row */}
                            <div style={styles.summaryRow}>
                                <span style={{ color: '#10B981', fontWeight: '500' }}>{t.shipping}</span>
                                <span style={{ color: '#10B981', fontWeight: '700' }}>{t.free}</span>
                            </div>

                            {/* Promo Code Toggle */}
                            {!promoApplied ? (
                                <div style={{ marginTop: '16px', marginBottom: '8px' }}>
                                    <button onClick={() => setPromoOpen(!promoOpen)} style={styles.promoButton}>
                                        {t.promoHaveCode}
                                        {promoOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                </div>
                            ) : (
                                <div style={styles.promoAppliedRow}>
                                    <div style={styles.promoBadge}>
                                        <span>{promoApplied.code}</span>
                                        <button onClick={handleRemovePromo} style={styles.promoRemoveBtn}>{t.promoRemove}</button>
                                    </div>
                                </div>
                            )}

                            {/* Promo Input */}
                            {promoOpen && !promoApplied && (
                                <div style={styles.promoInputArea}>
                                    <input
                                        type="text"
                                        placeholder={t.promoEnterCode}
                                        value={promoInput}
                                        onChange={(e) => setPromoInput(e.target.value)}
                                        style={styles.promoInput}
                                    />
                                    <button onClick={handleApplyPromo} disabled={isApplyingPromo} style={styles.promoApplyBtn}>
                                        {t.promoApply}
                                    </button>
                                </div>
                            )}
                            {promoError && <div style={styles.promoError}>{promoError}</div>}
                            {promoApplied && (
                                <div style={{ ...styles.summaryRow, color: '#EF4444' }}>
                                    <span>{t.discountLabel}</span>
                                    <span>-฿{discountAmount.toFixed(2)}</span>
                                </div>
                            )}

                            {/* Divider & Total */}
                            <div style={styles.divider} />

                            <div style={styles.totalRow}>
                                <span>{t.totalLabel}</span>
                                <span>฿{total.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Auth Section */}
                        <div style={styles.authSection}>
                            {/* Google Sign Up */}
                            <button
                                style={styles.googleBtn}
                                onClick={() => {
                                    login('google');
                                    setStep(2);
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: 12 }}>
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                <span>Sign up with Google</span>
                            </button>

                            {/* Create Account (Small Button) */}
                            <button
                                style={styles.createAccountBtn}
                                onClick={() => {
                                    login('email');
                                    setStep(2);
                                }}
                            >
                                Create account
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: SHIPPING & PAYMENT */}
                {step === 2 && (
                    <div style={styles.stepContainer}>
                        <div style={styles.miniHeader}>
                            <h2 style={styles.pageTitle}>{t.shippingPayment}</h2>
                            <div style={styles.miniTotal}>Total: ฿{total.toFixed(2)}</div>
                        </div>

                        <ShippingDetailsCard formData={formData} onChange={handleFormChange} errors={errors} />

                        <div style={styles.paymentSection}>
                            <h3 style={styles.sectionTitle}>{t.payment}</h3>
                            <div style={styles.paymentMethods}>
                                <div
                                    style={paymentMethod === 'card' ? { ...styles.payOption, ...styles.payOptionSelected } : styles.payOption}
                                    onClick={() => setPaymentMethod('card')}
                                >
                                    <div style={{ ...styles.radioCircle, ...(paymentMethod === 'card' ? styles.radioActive : {}) }} />
                                    <CreditCard size={20} color="#333" style={{ marginRight: 10 }} />
                                    <span style={styles.payText}>{t.creditDebitCard}</span>
                                </div>

                                {paymentMethod === 'card' && (
                                    <div style={{ padding: '12px 0 0 0' }}>
                                        <input type="text" placeholder={t.cardNumber} style={styles.input} />
                                        <div style={styles.cardRow}>
                                            <input type="text" placeholder={t.expiryDate} style={styles.input} />
                                            <input type="text" placeholder={t.cvc} style={styles.input} />
                                        </div>
                                    </div>
                                )}

                                <div
                                    style={paymentMethod === 'apple' ? { ...styles.payOption, ...styles.payOptionSelected } : styles.payOption}
                                    onClick={() => setPaymentMethod('apple')}
                                >
                                    <div style={{ ...styles.radioCircle, ...(paymentMethod === 'apple' ? styles.radioActive : {}) }} />
                                    <Smartphone size={20} color="#333" style={{ marginRight: 10 }} />
                                    <span style={styles.payText}>{t.applePay}</span>
                                </div>

                                <div
                                    style={paymentMethod === 'google' ? { ...styles.payOption, ...styles.payOptionSelected } : styles.payOption}
                                    onClick={() => setPaymentMethod('google')}
                                >
                                    <div style={{ ...styles.radioCircle, ...(paymentMethod === 'google' ? styles.radioActive : {}) }} />
                                    <span style={styles.payText}>{t.googlePay}</span>
                                </div>
                            </div>
                        </div>

                        <div style={styles.bottomAction}>
                            <button style={styles.placeOrderBtn} onClick={handlePlaceOrder}>
                                {t.placeOrder} · ฿{total.toFixed(2)}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        backgroundColor: '#fff',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        marginTop: 'var(--safe-area-top)',
        backgroundColor: '#fff',
        borderBottom: '1px solid #f3f4f6',
    },
    backBtn: {
        padding: '12px',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
    },
    content: {
        flex: 1,
        backgroundColor: '#FAFAFA',
        paddingBottom: '40px',
    },
    stepContainer: {
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px',
    },
    pageTitle: {
        fontSize: '20px',
        fontWeight: '700',
        marginBottom: '20px',
        color: '#111',
    },
    listContainer: {
        marginBottom: '24px',
    },
    summaryBlock: {
        backgroundColor: '#fff',
        borderRadius: '20px',
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        marginBottom: '32px',
    },
    summaryRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '10px',
        color: '#333',
        fontSize: '15px',
    },
    totalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '18px',
        fontWeight: '700',
        color: '#111',
    },
    divider: {
        height: '1px',
        backgroundColor: '#f0f0f0',
        margin: '16px 0',
    },
    // Auth Styles
    authSection: {
        textAlign: 'center',
    },
    authTitle: {
        fontSize: '16px',
        fontWeight: '600',
        marginBottom: '16px',
        color: '#6B7280',
    },
    googleBtn: {
        width: '100%',
        height: '50px',
        borderRadius: '25px',
        border: '1px solid #E5E7EB',
        backgroundColor: '#fff',
        fontSize: '16px',
        fontWeight: '600',
        color: '#111',
        marginBottom: '12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
    },
    createAccountBtn: {
        width: '100%',
        height: '40px',
        backgroundColor: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: '20px',
        color: '#111',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        marginTop: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    guestHint: {
        fontSize: '13px',
        color: '#9CA3AF',
    },
    // Promo
    promoTrigger: { marginTop: 12, marginBottom: 8 },
    promoButton: { background: 'none', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
    promoInputArea: { display: 'flex', gap: 8, marginTop: 12, marginBottom: 12 },
    promoInput: { flex: 1, height: 40, padding: '0 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 14 },
    promoApplyBtn: { backgroundColor: '#111', color: '#fff', border: 'none', borderRadius: 8, padding: '0 20px', fontWeight: 600, cursor: 'pointer' },
    promoAppliedRow: { marginTop: 12, marginBottom: 8 },
    promoBadge: { display: 'inline-flex', alignItems: 'center', gap: 12, backgroundColor: '#F3F4F6', padding: '8px 12px', borderRadius: 8, fontWeight: 600, fontSize: 13 },
    promoRemoveBtn: { background: 'none', border: 'none', color: '#EF4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' },
    promoError: { color: '#EF4444', fontSize: 12, marginTop: 8 },
    // Step 2 Styles
    miniHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    miniTotal: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#111',
    },
    paymentSection: { marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 700, marginBottom: 20 },
    paymentMethods: { display: 'flex', flexDirection: 'column', gap: 12 },
    payOption: { display: 'flex', alignItems: 'center', padding: 16, borderRadius: 16, border: '1px solid #E5E7EB', backgroundColor: '#fff', cursor: 'pointer' },
    payOptionSelected: { borderColor: '#111', backgroundColor: '#FAFAFA' },
    radioCircle: { width: 20, height: 20, borderRadius: '50%', border: '1.5px solid #ccc', marginRight: 12 },
    radioActive: { borderColor: '#111', borderWidth: 5 },
    payText: { fontWeight: 500 },
    input: { width: '100%', height: 48, padding: '0 16px', borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 8, fontSize: 16 },
    cardRow: { display: 'flex', gap: 12 },
    bottomAction: { padding: '20px 0 40px 0', textAlign: 'center' },
    placeOrderBtn: { backgroundColor: '#111', color: '#fff', height: 56, width: '100%', borderRadius: 28, fontSize: 17, fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.15)' },
};


