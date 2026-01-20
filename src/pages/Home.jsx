import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scissors, Truck, Info, Instagram, MessageCircle, Move, Crop } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from '../components/common/LanguageToggle';

const ASSETS = {
    dog: "/assets/hero_1_dog.png",
    family: "/assets/hero_2_family.png",
    couple: "/assets/hero_3_couple.png",
    travel: "/assets/hero_4_travel.jpg"
};

const slideshowImages = [ASSETS.dog, ASSETS.family, ASSETS.couple, ASSETS.travel];

export default function Home() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [slideshowIndex, setSlideshowIndex] = useState(0);
    const [billboardIndex, setBillboardIndex] = useState(0);

    useEffect(() => {
        const slideshowTimer = setInterval(() => {
            setSlideshowIndex(prev => (prev + 1) % slideshowImages.length);
        }, 3000);

        const billboardTimer = setInterval(() => {
            setBillboardIndex(prev => (prev + 1) % 4);
        }, 4000);

        return () => {
            clearInterval(slideshowTimer);
            clearInterval(billboardTimer);
        };
    }, []);

    const billboardThemes = [
        { id: 'couple', img: ASSETS.couple },
        { id: 'pet', img: ASSETS.dog },
        { id: 'travel', img: ASSETS.travel },
        { id: 'family', img: ASSETS.family },
    ];

    return (
        <div style={styles.container}>
            {/* --- TOP NAV --- */}
            <div style={styles.topNav}>
                <div style={styles.logoGroup}>
                    <h2 style={styles.brandTitle}>MEMOTILE</h2>
                </div>
                <LanguageToggle />
            </div>

            {/* --- HERO SECTION --- */}
            <section style={styles.hero}>
                <div style={styles.heroContent}>
                    <div style={styles.headlineGroup}>
                        <h1 style={styles.heroHeadline1}>{t.heroHeadlineLine1}</h1>
                        <h2 style={styles.heroHeadline2}>{t.heroHeadlineLine2}</h2>
                    </div>
                    <p style={styles.heroSupporting}>{t.heroSupporting}</p>

                    <div style={styles.heroPreview}>
                        <div style={styles.slideshowContainer}>
                            {slideshowImages.map((img, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        ...styles.slideshowImage,
                                        opacity: slideshowIndex === idx ? 1 : 0,
                                    }}
                                >
                                    <img
                                        src={img}
                                        alt="Memotile Preview"
                                        style={{ ...styles.heroTile, width: '260px', height: '260px', objectFit: 'cover' }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={styles.ctaWrapper}>
                        <div style={styles.ctaGroup}>
                            <button
                                className="primary-cta"
                                style={styles.primaryBtn}
                                onClick={() => navigate('/create/select')}
                            >
                                <div style={styles.ctaInner}>
                                    <Crop size={20} style={{ marginRight: 12 }} />
                                    <span>{t.ctaStart}</span>
                                </div>
                            </button>
                            <div style={styles.ctaHint}>{t.ctaHint}</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- KEY BENEFITS --- */}
            <section style={{ ...styles.section, backgroundColor: '#f9fafb' }}>
                <h3 style={styles.sectionSmallTitle}>{t.benefitsTitle}</h3>
                <div style={styles.grid}>
                    {t.benefits.map((b, i) => (
                        <BenefitCard
                            key={i}
                            icon={i === 0 ? <Scissors size={20} /> : i === 1 ? <Move size={20} /> : <Info size={20} />}
                            title={b.title}
                            desc={b.desc}
                        />
                    ))}
                </div>
            </section>

            {/* --- AUTO-ROTATING BILLBOARD --- */}
            <section style={styles.section}>
                <div style={styles.billboardContainer}>
                    <div style={styles.billboardImgWrapper}>
                        {billboardThemes.map((theme, idx) => (
                            <div
                                key={theme.id}
                                style={{
                                    ...styles.billboardSlide,
                                    opacity: billboardIndex === idx ? 1 : 0,
                                    transform: `scale(${billboardIndex === idx ? 1 : 0.98})`,
                                    zIndex: billboardIndex === idx ? 2 : 1,
                                }}
                            >
                                <div style={styles.billboardImgContainer}>
                                    <img src={theme.img} style={{ width: '280px', height: '280px', objectFit: 'cover', borderRadius: '4px' }} alt="" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={styles.billboardInfo}>
                        <span style={styles.billboardLabel}>{t.billboard[billboardIndex].label}</span>
                        <p style={styles.billboardCaption}>{t.billboard[billboardIndex].caption}</p>
                    </div>
                    <div style={styles.billboardDots}>
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} style={{ ...styles.dot, backgroundColor: billboardIndex === i ? '#111' : '#ddd' }} />
                        ))}
                    </div>
                </div>
            </section>

            {/* --- HOW IT WORKS --- */}
            <section style={styles.section}>
                <h3 style={styles.sectionTitle}>{t.howItWorks}</h3>
                <div style={styles.stepsContainer}>
                    {t.steps.map((s, i) => (
                        <StepItem key={i} num={i + 1} title={s.title} desc={s.desc} />
                    ))}
                </div>
            </section>

            {/* --- DELIVERY PROMISE --- */}
            <section style={styles.deliverySection}>
                <Truck size={40} style={{ marginBottom: 16 }} />
                <h2 style={styles.deliveryTitle}>{t.deliveryHeadline}</h2>
                <p style={styles.deliverySubtitle}>{t.deliverySub}</p>
            </section>

            {/* --- FOOTER --- */}
            <section style={styles.footer}>
                <h3 style={styles.footerHelpTitle}>{t.needHelp}</h3>
                <div style={styles.footerActions}>
                    <button style={styles.footerBtn}><MessageCircle size={18} /> LINE</button>
                    <button style={styles.footerBtn}><Instagram size={18} /> Instagram</button>
                </div>
                <p style={styles.legal}>{t.copyright}</p>
            </section>

            <div style={{ height: 100 }} /> {/* Clearance */}
        </div>
    );
}

// --- Subcomponents ---

const BenefitCard = ({ icon, title, desc }) => (
    <div style={styles.benefitCard}>
        <div style={styles.benefitIcon}>{icon}</div>
        <div>
            <h4 style={styles.benefitTitle}>{title}</h4>
            <p style={styles.benefitDesc}>{desc}</p>
        </div>
    </div>
);

const StepItem = ({ num, title, desc }) => (
    <div style={styles.stepItem}>
        <div style={styles.stepNum}>{num}</div>
        <div style={styles.stepInfo}>
            <h4 style={styles.stepTitle}>{title}</h4>
            <p style={styles.stepDesc}>{desc}</p>
        </div>
    </div>
);

// --- STYLES ---

const styles = {
    container: {
        backgroundColor: '#FFFFFF',
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        overflowX: 'hidden',
    },
    topNav: {
        height: '64px',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(10px)',
        zIndex: 100,
    },
    logoGroup: {
        display: 'flex',
        alignItems: 'center',
    },
    brandTitle: {
        fontSize: '18px',
        fontWeight: '700',
        letterSpacing: '0.15em',
        color: '#000',
        margin: 0,
    },
    section: {
        padding: '40px 24px',
    },
    hero: {
        paddingTop: '32px',
        paddingBottom: '48px',
        textAlign: 'center',
    },
    heroContent: {
        maxWidth: '480px',
        margin: '0 auto',
    },
    headlineGroup: {
        marginBottom: '8px',
        padding: '0 20px',
    },
    heroHeadline1: {
        fontSize: '36px',
        fontWeight: '900',
        lineHeight: '1.1',
        color: '#111',
        margin: 0,
        letterSpacing: '-0.02em',
    },
    heroHeadline2: {
        fontSize: '28px',
        fontWeight: '800',
        lineHeight: '1.2',
        color: '#111',
        margin: '4px 0 0 0',
        letterSpacing: '-0.01em',
    },
    heroSupporting: {
        fontSize: '16px',
        fontWeight: '400',
        color: '#6B7280',
        marginBottom: '40px',
        padding: '0 24px',
        opacity: 0.9,
    },
    heroPreview: {
        position: 'relative',
        height: '280px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '40px',
    },
    slideshowContainer: {
        position: 'relative',
        width: '260px',
        height: '260px',
        zIndex: 1,
    },
    slideshowImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        transition: 'opacity 0.4s ease-in-out',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroTile: {
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        borderRadius: '4px',
    },
    ctaWrapper: {
        display: 'flex',
        justifyContent: 'center',
        padding: '0 24px',
    },
    ctaGroup: {
        width: '100%',
        maxWidth: '360px',
    },
    primaryBtn: {
        width: '100%',
        backgroundColor: '#111',
        color: '#fff',
        height: '52px',
        padding: '0 24px',
        borderRadius: '16px',
        fontSize: '17px',
        fontWeight: '700',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        outline: 'none',
    },
    ctaInner: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaHint: {
        fontSize: '12px',
        color: '#8E8E93',
        marginTop: '10px',
        textAlign: 'center',
        fontWeight: '500',
        letterSpacing: '0.02em',
    },
    sectionTitle: {
        fontSize: '22px',
        fontWeight: '800',
        marginBottom: '24px',
        letterSpacing: '-0.02em',
        textAlign: 'center',
    },
    sectionSmallTitle: {
        fontSize: '13px',
        fontWeight: '800',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#9ba3af',
        marginBottom: '24px',
        textAlign: 'center',
    },
    grid: {
        display: 'grid',
        gap: '24px',
    },
    benefitCard: {
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
    },
    benefitIcon: {
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        backgroundColor: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
    },
    benefitTitle: {
        fontSize: '17px',
        fontWeight: '700',
        marginBottom: '4px',
        color: '#111',
    },
    benefitDesc: {
        fontSize: '14px',
        color: '#6b7280',
        lineHeight: '1.5',
    },
    billboardContainer: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 0',
        backgroundColor: '#fafafa',
        borderRadius: '32px',
    },
    billboardImgWrapper: {
        position: 'relative',
        width: '280px',
        height: '280px',
        marginBottom: '32px',
    },
    billboardSlide: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        transition: 'opacity 0.8s ease-in-out, transform 0.8s ease-out',
        display: 'flex',
        justifyContent: 'center',
    },
    billboardImgContainer: {
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        borderRadius: '4px',
        overflow: 'hidden',
    },
    billboardInfo: {
        textAlign: 'center',
        padding: '0 24px',
    },
    billboardLabel: {
        display: 'inline-block',
        fontSize: '11px',
        fontWeight: '800',
        padding: '6px 14px',
        backgroundColor: '#eee',
        borderRadius: '20px',
        marginBottom: '16px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    billboardCaption: {
        fontSize: '19px',
        fontWeight: '700',
        color: '#111',
        lineHeight: '1.4',
    },
    billboardDots: {
        display: 'flex',
        gap: '8px',
        marginTop: '24px',
    },
    dot: {
        width: '6px',
        height: '6px',
        borderRadius: '3px',
        transition: '0.3s',
    },
    stepsContainer: {
        display: 'grid',
        gap: '40px',
        padding: '10px 0',
    },
    stepItem: {
        display: 'flex',
        gap: '20px',
        alignItems: 'flex-start',
    },
    stepNum: {
        width: '32px',
        height: '32px',
        borderRadius: '16px',
        backgroundColor: '#111',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: '800',
        flexShrink: 0,
    },
    stepInfo: {
        flex: 1,
    },
    stepTitle: {
        fontSize: '20px',
        fontWeight: '900',
        marginBottom: '6px',
        color: '#111',
        letterSpacing: '-0.01em',
    },
    stepDesc: {
        fontSize: '15px',
        color: '#6b7280',
        lineHeight: '1.6',
    },
    deliverySection: {
        margin: '24px',
        padding: '60px 24px',
        backgroundColor: '#111',
        color: '#fff',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        borderRadius: '32px',
    },
    deliveryTitle: {
        fontSize: '28px',
        fontWeight: '800',
        marginBottom: '12px',
        letterSpacing: '-0.02em',
    },
    deliverySubtitle: {
        fontSize: '18px',
        opacity: 0.8,
    },
    footer: {
        padding: '60px 24px',
        textAlign: 'center',
        borderTop: '1px solid #f2f2f7',
    },
    footerHelpTitle: {
        fontSize: '20px',
        fontWeight: '800',
        marginBottom: '24px',
        color: '#111',
    },
    footerActions: {
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
        marginBottom: '48px',
    },
    footerBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '14px 24px',
        border: '1px solid #E5E5EA',
        borderRadius: '14px',
        backgroundColor: '#fff',
        fontSize: '15px',
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
    },
    legal: {
        fontSize: '13px',
        color: '#9ca3af',
    }
};

// Add active state and other global styles for Home
const homeStyleTag = document.createElement("style");
homeStyleTag.innerHTML = `
  .primary-cta:active {
    transform: scale(0.99);
    box-shadow: 0 6px 16px rgba(0,0,0,0.14);
  }
`;
document.head.appendChild(homeStyleTag);
