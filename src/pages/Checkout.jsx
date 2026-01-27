import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, X, CreditCard, Smartphone, ChevronDown, ChevronUp, QrCode } from 'lucide-react';
import promptPayLogo from '../assets/promptpay_logo.png';
import trueMoneyLogo from '../assets/truemoney_logo.png';
import { readEditorCartMeta, addOrder, clearEditorCartMeta } from '../utils/orders';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

// [Modal] PromptPay QR 모달
const QrModal = ({ isOpen, onClose, amount }) => {
    const { t, locale } = useLanguage();
    const currency = locale === 'TH' ? '฿' : '$';
    if (!isOpen) return null;
    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <button onClick={onClose} style={styles.closeBtn}><X size={24} /></button>
                <QrCode size={150} color="#000" style={{ marginBottom: 16 }} />
                <h3 style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>{t['promptpay']}</h3>
                <p style={{ color: '#666', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
                    {t['scanQrCode']}
                </p>
                <div style={{ padding: '12px 24px', backgroundColor: '#F3F4F6', borderRadius: 8, fontSize: 16, fontWeight: '700' }}>
                    {t['amount']}: {currency}{amount.toFixed(2)}
                </div>
            </div>
        </div>
    );
};

export default function Checkout() {
    const navigate = useNavigate();
    const { t, locale } = useLanguage();
    const { user, isLoading: authLoading } = useAuth();

    const [step, setStep] = useState(1);
    const [items, setItems] = useState([]);

    // [복원] 태국 배송에 필수적인 상세 주소 및 Province 필드 복원
    const [formData, setFormData] = useState({
        fullName: '',
        addressLine1: '', // Moo, Soi, Road
        addressLine2: '', // House No, Building, Room (Optional)
        city: '',         // District / Amphoe
        state: '',        // Province
        postalCode: '',
        country: 'Thailand',
        phone: '',
        email: '',
        instagram: '',    // [추가] 인스타그램 필드
    });

    const [paymentMethod, setPaymentMethod] = useState(() => {
        return sessionStorage.getItem('checkout_payment_method') || 'promptpay';
    });

    const [showPromoInput, setShowPromoInput] = useState(false);
    const [promoInput, setPromoInput] = useState('');
    const [promoApplied, setPromoApplied] = useState(null);
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);

    const PAYMENT_OPTIONS = [
        { id: 'promptpay', label: t['promptpay'], icon: <img src={promptPayLogo} alt="PromptPay" style={{ height: 24, objectFit: 'contain' }} /> },
        { id: 'truemoney', label: t['truemoney'], icon: <img src={trueMoneyLogo} alt="TrueMoney" style={{ height: 24, objectFit: 'contain' }} /> },
        { id: 'card', label: t['creditDebitCard'], icon: <CreditCard size={20} color="#333" /> },
        { id: 'apple', label: t['applePay'], icon: <Smartphone size={20} color="#333" /> },
        { id: 'google', label: t['googlePay'], icon: <Smartphone size={20} color="#333" /> }
    ];

    useEffect(() => {
        const cart = readEditorCartMeta();
        if (!cart || cart.length === 0) {
            navigate('/create/editor', { replace: true });
            return;
        }
        setItems(cart);
    }, [navigate]);

    const PRICE_PER_TILE = locale === 'TH' ? 200 : 6.45;
    const currency = locale === 'TH' ? '฿' : '$';

    const subtotal = items.reduce((sum, item) => sum + (PRICE_PER_TILE * (item.qty || 1)), 0);
    const total = subtotal - (promoApplied?.discountAmount || 0);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // [해결] TrueMoney 딥링크 핸들러 (실패 시 안내 로직 추가)
    const openTrueMoney = (orderId) => {
        const truemoneyUrl = `truemoney://pay?order=${orderId}`;
        const start = Date.now();

        window.location.href = truemoneyUrl;

        // 웹 브라우저에서 앱 실행 실패 시 대응
        setTimeout(() => {
            if (Date.now() - start < 2500) {
                alert(t['alertTrueMoneyFail']);
            }
        }, 2000);
    };

    const handlePlaceOrder = () => {
        if (!formData.fullName || !formData.addressLine1 || !formData.city || !formData.state || !formData.postalCode || !formData.phone || !formData.email) {
            alert(t['alertFillShipping']);
            return;
        }

        const orderId = `ORD-${Date.now()}`;

        if (paymentMethod === 'promptpay') {
            setShowQrModal(true);
            return;
        }

        if (paymentMethod === 'truemoney') {
            openTrueMoney(orderId);
            return;
        }

        addOrder({ id: orderId, items, shipping: formData, total, paymentMethod });
        clearEditorCartMeta();
        navigate(`/order-success?id=${orderId}`);
    };

    return (
        <div style={styles.container}>
            <QrModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} amount={total} />

            <div style={styles.header}>
                <button onClick={() => step === 1 ? navigate(-1) : setStep(1)} style={styles.backBtn}><ChevronLeft size={24} /></button>
                <h1 style={{ flex: 1, textAlign: 'center', fontWeight: '700', fontSize: '16px' }}>{t['checkoutTitle']}</h1>
                <div style={{ width: 40 }} />
            </div>

            <div style={styles.content}>
                {step === 1 ? (
                    <div style={styles.stepContainer}>
                        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '16px' }}>
                            {items.map((item, idx) => (
                                <img key={idx} src={item.previewUrl || item.src} alt="tile"
                                    style={{ width: '160px', height: '160px', objectFit: 'cover', flexShrink: 0 }} />
                            ))}
                        </div>

                        <div style={styles.summaryBlock}>
                            <div style={styles.summaryRow}><span>{items.length} {t['tilesSize']}</span><span>{currency}{subtotal.toFixed(2)}</span></div>
                            <div style={styles.summaryRow}><span style={{ color: '#10B981' }}>{t['shipping']}</span><span style={{ color: '#10B981' }}>{t['free']}</span></div>
                            <button onClick={() => setShowPromoInput(!showPromoInput)} style={styles.promoButton}>
                                {t['promoHaveCode']} {showPromoInput ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            <div style={styles.divider} />
                            <div style={styles.totalRow}><span>{t['totalLabel']}</span><span>{currency}{total.toFixed(2)}</span></div>
                        </div>

                        <div style={styles.authSection}>
                            <button style={styles.googleBtn} onClick={() => setStep(2)}>{t['signUpGoogle']}</button>
                            <button style={styles.createAccountBtn} onClick={() => setStep(2)}>{t['createAccount']}</button>
                        </div>
                    </div>
                ) : (
                    <div style={styles.stepContainer}>
                        <div style={styles.formSection}>
                            <h3 style={styles.sectionTitle}>{t['shippingAddressTitle']}</h3>
                            <input name="fullName" placeholder={t['fullName'] + " *"} style={styles.input} value={formData.fullName} onChange={handleInputChange} />
                            <input name="addressLine1" placeholder={t['streetAddress'] + " *"} style={styles.input} value={formData.addressLine1} onChange={handleInputChange} />
                            <input name="addressLine2" placeholder={t['address2'] + " " + t['optionalSuffix']} style={styles.input} value={formData.addressLine2} onChange={handleInputChange} />
                            <div style={styles.cardRow}>
                                <input name="city" placeholder={t['city'] + " *"} style={styles.input} value={formData.city} onChange={handleInputChange} />
                                <input name="state" placeholder={t['stateProv'] + " *"} style={styles.input} value={formData.state} onChange={handleInputChange} />
                            </div>
                            <div style={styles.cardRow}>
                                <input name="postalCode" placeholder={t['zipCode'] + " *"} style={styles.input} value={formData.postalCode} onChange={handleInputChange} />
                                <div style={{ ...styles.input, backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', color: '#666' }}>{t['thailand']}</div>
                            </div>
                            <input name="phone" placeholder={t['phoneNumber'] + " *"} style={styles.input} value={formData.phone} onChange={handleInputChange} />
                            <input name="email" placeholder={t['emailAddress'] + " *"} style={styles.input} value={formData.email} onChange={handleInputChange} />
                            <input name="instagram" placeholder={t['instagram'] + " " + t['optionalSuffix']} style={styles.input} value={formData.instagram} onChange={handleInputChange} />
                        </div>

                        <div style={styles.paymentSection}>
                            <h3 style={styles.sectionTitle}>{t['paymentTitle']}</h3>
                            <div style={styles.paymentMethods}>
                                {PAYMENT_OPTIONS.map(option => (
                                    <div key={option.id}
                                        style={paymentMethod === option.id ? { ...styles.payOption, ...styles.payOptionSelected } : styles.payOption}
                                        onClick={() => setPaymentMethod(option.id)}>
                                        <div style={{ ...styles.radioCircle, ...(paymentMethod === option.id ? styles.radioActive : {}) }} />
                                        {option.icon}
                                        <span style={styles.payText}>{option.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button style={styles.placeOrderBtn} onClick={handlePlaceOrder}>{t['placeOrder']} · {currency}{total.toFixed(2)}</button>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: { backgroundColor: '#fff', minHeight: '100vh' },
    header: { display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f3f4f6' },
    backBtn: { border: 'none', background: 'none', cursor: 'pointer' },
    content: { padding: '20px' },
    stepContainer: { maxWidth: '500px', margin: '0 auto' },
    summaryBlock: { backgroundColor: '#fff', borderRadius: '20px', padding: '20px', border: '1px solid #f0f0f0', marginBottom: '24px' },
    summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
    totalRow: { display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '700' },
    divider: { height: '1px', backgroundColor: '#eee', margin: '15px 0' },
    authSection: { display: 'flex', flexDirection: 'column', gap: 10 },
    googleBtn: { height: '54px', borderRadius: '27px', border: '1px solid #ddd', backgroundColor: '#fff', fontWeight: '600' },
    createAccountBtn: { height: '54px', border: '1px solid #ddd', borderRadius: '27px', backgroundColor: '#fff', fontWeight: '600' },
    promoButton: { background: 'none', border: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 5, marginTop: 10 },
    formSection: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 },
    sectionTitle: { fontSize: '14px', color: '#999', textTransform: 'uppercase', marginBottom: 15, fontWeight: '700' },
    paymentMethods: { display: 'flex', flexDirection: 'column', gap: 12 },
    // [Fix] border 스타일 충돌 해결
    payOption: {
        display: 'flex', alignItems: 'center', padding: '18px', borderRadius: '16px',
        borderWidth: '1px', borderStyle: 'solid', borderColor: '#E5E7EB', backgroundColor: '#fff'
    },
    payOptionSelected: { borderWidth: '2px', borderColor: '#000', backgroundColor: '#fafafa' },
    radioCircle: { width: 20, height: 20, borderRadius: '50%', border: '1.5px solid #ccc', marginRight: 15 },
    radioActive: { borderColor: '#111', borderWidth: 6 },
    payText: { fontWeight: '600' },
    input: { width: '100%', height: '52px', padding: '0 16px', borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '15px' },
    cardRow: { display: 'flex', gap: 12 },
    placeOrderBtn: { width: '100%', height: '58px', borderRadius: '29px', backgroundColor: '#000', color: '#fff', fontWeight: '700', border: 'none', marginTop: 20 },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' },
    closeBtn: { position: 'absolute', top: 15, right: 15, border: 'none', background: 'none' }
};