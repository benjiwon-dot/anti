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

                <section style={styles.section}>
                    <h2 style={styles.sectionHeading}>1. Service Description</h2>
                    <p style={styles.paragraph}>
                        MEMOTILES provides a service for uploading and editing photos to create and deliver custom-made photo tiles. All products are produced on a made-to-order basis.
                    </p>
                </section>

                <section style={styles.section}>
                    <h2 style={styles.sectionHeading}>2. User Responsibility & Purchase Authority</h2>
                    <p style={styles.paragraph}>
                        Users confirm they have the legal authority to use this service or have received permission from a parent, guardian, or authorized payer. The responsibility for all purchases and payments made within the service lies with the person who completes the transaction.
                    </p>
                </section>

                <section style={styles.section}>
                    <h2 style={styles.sectionHeading}>3. User Content & Copyright</h2>
                    <p style={styles.paragraph}>
                        Users retain ownership of the photos they upload. Users grant MEMOTILES a non-exclusive, royalty-free license to the extent necessary for order fulfillment (processing, printing, and delivery). MEMOTILES does not use user photos for marketing purposes without explicit consent. Users are responsible for any copyright violations resulting from uploaded photos.
                    </p>
                </section>

                <section style={styles.section}>
                    <h2 style={styles.sectionHeading}>4. Prohibited Content</h2>
                    <p style={styles.paragraph}>
                        Uploading illegal content, items that infringe on copyrights or privacy, or harmful content involving minors is strictly prohibited. MEMOTILES reserves the right to refuse or cancel orders that violate these regulations.
                    </p>
                </section>

                <section style={styles.section}>
                    <h2 style={styles.sectionHeading}>5. Orders & Custom Products</h2>
                    <p style={styles.paragraph}>
                        Since all products are custom-made, orders cannot be canceled or changed once printing has begun. Users must carefully review the editing and cropping state of their photos before checkout.
                    </p>
                </section>

                <section style={styles.section}>
                    <h2 style={styles.sectionHeading}>6. Order Status Information</h2>
                    <p style={styles.paragraph}>
                        Order statuses (Paid, Processing, Printing, Shipped, Delivered, etc.) are provided for informational purposes only and may differ slightly from the real-time situation.
                    </p>
                </section>

                <section style={styles.section}>
                    <h2 style={styles.sectionHeading}>7. Pricing & Payments</h2>
                    <p style={styles.paragraph}>
                        Product prices are displayed on the screen before checkout. Payments are processed through third-party payment systems, and any applicable taxes or customs duties are the responsibility of the user.
                    </p>
                </section>

                <section style={styles.section}>
                    <h2 style={styles.sectionHeading}>8. Shipping & Delivery</h2>
                    <p style={styles.paragraph}>
                        Delivery dates are estimates and not guaranteed arrival dates. MEMOTILES is not responsible for delivery delays caused by logistics conditions, customs, or incorrect address entry.
                    </p>
                </section>

                <section style={styles.section}>
                    <h2 style={styles.sectionHeading}>9. Returns & Refunds</h2>
                    <p style={styles.paragraph}>
                        Due to the nature of custom-made products, refunds for a simple change of mind are not possible. Reprints or refunds are only available in cases of defective or damaged products, and users must contact customer support within a reasonable period after delivery.
                    </p>
                </section>

                <section style={styles.section}>
                    <h2 style={styles.sectionHeading}>10. Intellectual Property</h2>
                    <p style={styles.paragraph}>
                        All rights to the MEMOTILES brand, UI design, and systems belong to MEMOTILES, and unauthorized use is prohibited.
                    </p>
                </section>

                <section style={styles.section}>
                    <h2 style={styles.sectionHeading}>11. Service Changes</h2>
                    <p style={styles.paragraph}>
                        MEMOTILES may modify, suspend, or terminate part or all of the service as needed.
                    </p>
                </section>

                <section style={styles.section}>
                    <h2 style={styles.sectionHeading}>12. Limitation of Liability</h2>
                    <p style={styles.paragraph}>
                        The service is provided 'as is'. Minor differences between screen colors and actual printed materials may occur. MEMOTILES' liability is limited to the amount paid at the time of the order.
                    </p>
                </section>

                <section style={styles.section}>
                    <h2 style={styles.sectionHeading}>13. Changes to Terms</h2>
                    <p style={styles.paragraph}>
                        These Terms may be updated from time to time, and updated Terms become effective immediately upon being posted on the website.
                    </p>
                </section>

                <section style={styles.section}>
                    <h2 style={styles.sectionHeading}>14. Contact Information</h2>
                    <p style={styles.paragraph}>
                        If you have any questions, please contact our support team at <a href="mailto:support@memotiles.com" style={styles.link}>support@memotiles.com</a>.
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
        color: 'var(--primary)',
        textDecoration: 'none',
        fontWeight: '500',
    }
};
