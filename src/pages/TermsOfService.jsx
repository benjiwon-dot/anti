import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function TermsOfService() {
    const navigate = useNavigate();

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button onClick={() => navigate(-1)} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#111" />
                </button>
                <div style={styles.title}>Terms of Service</div>
                <div style={{ width: 24 }}></div>
            </div>

            <div style={styles.content}>
                <h1 style={styles.pageTitle}>Terms of Service</h1>

                {/* 1 ~ 13 섹션은 동일하므로 생략 (기존 코드 그대로 유지) */}
                <section style={styles.section}>
                    <h2 style={styles.sectionHeading}>1. Service Description</h2>
                    <p style={styles.paragraph}>
                        MEMOTILES provides a service for uploading and editing photos to create and deliver custom-made photo tiles. All products are produced on a made-to-order basis.
                    </p>
                </section>

                {/* ... (중간 생략: 2번부터 13번 섹션까지는 기존과 동일하게 유지하세요) ... */}

                <section style={styles.section}>
                    <h2 style={styles.sectionHeading}>13. Changes to Terms</h2>
                    <p style={styles.paragraph}>
                        These Terms may be updated from time to time, and updated Terms become effective immediately upon being posted on the website.
                    </p>
                </section>

                {/* ✅ 14번 섹션 수정: 이메일 삭제 및 라인 연결 */}
                <section style={styles.section}>
                    <h2 style={styles.sectionHeading}>14. Contact Information</h2>
                    <p style={styles.paragraph}>
                        If you have any questions, please contact our support team via LINE:
                        <a href="https://line.me/R/ti/p/@946zhley" target="_blank" rel="noreferrer" style={styles.link}>
                            {" "}@946zhley
                        </a>
                    </p>
                </section>
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
        padding: '24px 20px',
        paddingBottom: '100px',
        flex: 1,
        overflowY: 'auto',
    },
    pageTitle: {
        fontSize: '24px',
        fontWeight: '700',
        marginBottom: '24px',
        color: '#111',
    },
    section: {
        marginBottom: '28px',
    },
    sectionHeading: {
        fontSize: '18px',
        fontWeight: '600',
        marginBottom: '12px',
        color: '#111',
    },
    paragraph: {
        fontSize: '15px',
        lineHeight: '1.6',
        color: '#333',
        marginBottom: '8px',
    },
    link: {
        color: '#00B900', // 라인 고유 브랜드 색상으로 변경 제안 (선택사항)
        textDecoration: 'none',
        fontWeight: '600',
    }
};