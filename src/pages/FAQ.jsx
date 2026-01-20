import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function FAQ() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [openIndex, setOpenIndex] = useState(null);

    const faqItems = [
        {
            question: t.qSize,
            answer: t.aSize
        },
        {
            question: t.qDamage,
            answer: t.aDamage
        },
        {
            question: t.qShipping,
            answer: t.aShipping
        },
        {
            question: t.qFallOff,
            answer: t.aFallOff
        },
        {
            question: t.qLowQuality,
            answer: t.aLowQuality
        },
        {
            question: t.qModifyOrder,
            answer: t.aModifyOrder
        }
    ];

    const toggleAccordion = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button onClick={() => navigate(-1)} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#111" />
                </button>
                <div style={styles.title}>{t.faqTitle}</div>
                <div style={{ width: 24 }}></div>
            </div>

            <div style={styles.content}>
                <div style={styles.accordionList}>
                    {faqItems.map((item, index) => (
                        <div key={index} style={styles.accordionItem}>
                            <button
                                style={styles.accordionHeader}
                                onClick={() => toggleAccordion(index)}
                            >
                                <span style={styles.questionText}>{item.question}</span>
                                {openIndex === index ? (
                                    <ChevronUp size={20} color="#8E8E93" />
                                ) : (
                                    <ChevronDown size={20} color="#8E8E93" />
                                )}
                            </button>
                            {openIndex === index && (
                                <div style={styles.accordionBody}>
                                    <p style={styles.answerText}>{item.answer}</p>
                                </div>
                            )}
                            {index < faqItems.length - 1 && <div style={styles.divider}></div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        backgroundColor: '#F2F2F7',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        backgroundColor: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        borderBottom: '1px solid #E5E5EA',
    },
    backBtn: {
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
    },
    title: {
        fontSize: '17px',
        fontWeight: '600',
        color: '#111',
    },
    content: {
        padding: '20px',
        paddingBottom: '100px',
        flex: 1,
        overflowY: 'auto',
    },
    accordionList: {
        backgroundColor: '#fff',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    },
    accordionItem: {
        display: 'flex',
        flexDirection: 'column',
    },
    accordionHeader: {
        minHeight: '56px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        textAlign: 'left',
        width: '100%',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
    },
    questionText: {
        fontSize: '16px',
        fontWeight: '500',
        color: '#111',
        paddingRight: '12px',
        lineHeight: '1.4',
    },
    accordionBody: {
        padding: '0 16px 16px 16px',
    },
    answerText: {
        fontSize: '15px',
        lineHeight: '1.5',
        color: '#666',
    },
    divider: {
        height: '1px',
        backgroundColor: '#F2F2F7',
        margin: '0 16px',
    }
};
