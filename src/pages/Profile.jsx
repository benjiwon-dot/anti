import React from "react";
import { useNavigate } from "react-router-dom";
import {
    User,
    MapPin,
    CreditCard,
    HelpCircle,
    MessageCircle,
    Shield,
    FileText,
    ChevronRight,
    LogIn
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export default function Profile() {
    const navigate = useNavigate();
    const { t } = useLanguage();

    const menuGroups = [
        {
            title: t.account,
            items: [
                { title: t.signIn, icon: LogIn, subtitle: t.exampleUser, onClick: () => { } },
                { title: t.addresses, icon: MapPin, onClick: () => { } },
                { title: t.paymentMethods, icon: CreditCard, onClick: () => { } },
            ]
        },
        {
            title: t.support,
            items: [
                { title: t.faq, icon: HelpCircle, onClick: () => navigate('/faq') },
                { title: t.chatWithUs, icon: MessageCircle, onClick: () => navigate('/contact') },
            ]
        },
        {
            title: t.legal,
            items: [
                { title: t.privacyPolicy, icon: Shield, onClick: () => navigate('/privacy') },
                { title: t.termsOfService, icon: FileText, onClick: () => navigate('/terms') },
            ]
        }
    ];

    const MenuRow = ({ item, isLast }) => (
        <button
            type="button"
            style={styles.row}
            onClick={item.onClick}
            onMouseDown={(e) => (e.currentTarget.style.backgroundColor = "#F2F2F7")}
            onMouseUp={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            onTouchStart={(e) => (e.currentTarget.style.backgroundColor = "#F2F2F7")}
            onTouchEnd={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            aria-label={item.title}
        >
            <div style={styles.rowLeft}>
                <item.icon size={20} color="#111" strokeWidth={2} />
                <span style={styles.rowTitle}>{item.title}</span>
            </div>
            <div style={styles.rowRight}>
                {item.subtitle && <span style={styles.rowSubtitle}>{item.subtitle}</span>}
                <ChevronRight size={18} color="#8E8E93" />
            </div>
            {!isLast && <div style={styles.divider}></div>}
        </button>
    );

    return (
        <div className="page-container" style={styles.container}>
            <h1 style={styles.header}>{t.profile}</h1>

            {menuGroups.map((group, gIdx) => (
                <div key={gIdx} style={styles.section}>
                    <div style={styles.sectionTitle}>{group.title}</div>
                    <div style={styles.card}>
                        {group.items.map((item, iIdx) => (
                            <MenuRow
                                key={`${group.title}-${iIdx}`}
                                item={item}
                                isLast={iIdx === group.items.length - 1}
                            />
                        ))}
                    </div>
                </div>
            ))}

            <div style={styles.footer}>
                <p style={styles.version}>{t.version} 1.0.0 (Build 124)</p>
                <p style={styles.copyright}>© 2026 Memotile</p>
            </div>
        </div>
    );
}

const styles = {
    container: {
        paddingBottom: '120px',
    },
    header: {
        fontSize: '28px',
        fontWeight: '800',
        marginBottom: '24px',
        color: '#111',
    },
    section: {
        marginBottom: '28px',
    },
    sectionTitle: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#8E8E93',
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        marginBottom: '8px',
        marginLeft: '4px',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    },
    row: {
        width: '100%',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        backgroundColor: 'transparent',
        border: 'none',
        position: 'relative',
        cursor: 'pointer',
        textAlign: 'left',
        transition: "background-color 0.1s",
    },
    rowLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    rowTitle: {
        fontSize: '16px',
        fontWeight: '500',
        color: '#111',
    },
    rowRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    rowSubtitle: {
        fontSize: '14px',
        color: '#8E8E93',
    },
    divider: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        left: '48px',
        height: '1px',
        backgroundColor: '#F2F2F7',
    },
    footer: {
        textAlign: 'center',
        marginTop: '12px',
    },
    version: {
        fontSize: '12px',
        color: '#C7C7CC',
        marginBottom: '4px',
    },
    copyright: {
        fontSize: '12px',
        color: '#C7C7CC',
    }
};
