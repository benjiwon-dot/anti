import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function ShippingDetailsCard({ formData, onChange, errors = {} }) {
    const { t } = useLanguage();
    const handleChange = (field, value) => {
        if (onChange) onChange(field, value);
    };

    const getErrorStyle = (field) => {
        return errors[field] ? { ...styles.input, borderColor: '#EF4444', backgroundColor: '#FEF2F2' } : styles.input;
    };

    return (
        <div style={styles.card}>
            <h3 style={styles.title}>{t.shippingAddress}</h3>

            <div style={styles.formGroup}>
                {/* Full Name */}
                <div style={styles.field}>
                    <label style={styles.label}>{t.fullName} <span style={styles.required}>*</span></label>
                    <input
                        type="text"
                        placeholder={t.fullName}
                        style={getErrorStyle('fullName')}
                        value={formData.fullName}
                        onChange={e => handleChange('fullName', e.target.value)}
                    />
                </div>

                {/* Address Line 1 */}
                <div style={styles.field}>
                    <label style={styles.label}>{t.address1} <span style={styles.required}>*</span></label>
                    <input
                        type="text"
                        placeholder={t.streetAddress}
                        style={getErrorStyle('address1')}
                        value={formData.address1}
                        onChange={e => handleChange('address1', e.target.value)}
                    />
                </div>

                {/* Address Line 2 */}
                <div style={styles.field}>
                    <label style={styles.label}>{t.address2} <span style={styles.opt}>({t.optional})</span></label>
                    <input
                        type="text"
                        placeholder={t.aptSuite}
                        style={styles.input}
                        value={formData.address2}
                        onChange={e => handleChange('address2', e.target.value)}
                    />
                </div>

                {/* City & State */}
                <div style={styles.row}>
                    <div style={styles.field}>
                        <label style={styles.label}>{t.city} <span style={styles.required}>*</span></label>
                        <input
                            type="text"
                            placeholder={t.city}
                            style={getErrorStyle('city')}
                            value={formData.city}
                            onChange={e => handleChange('city', e.target.value)}
                        />
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>{t.stateProv} <span style={styles.required}>*</span></label>
                        <input
                            type="text"
                            placeholder={t.state}
                            style={getErrorStyle('state')}
                            value={formData.state}
                            onChange={e => handleChange('state', e.target.value)}
                        />
                    </div>
                </div>

                {/* ZIP & Country */}
                <div style={styles.row}>
                    <div style={styles.field}>
                        <label style={styles.label}>{t.postalCode} <span style={styles.required}>*</span></label>
                        <input
                            type="text"
                            placeholder={t.zipCode}
                            style={getErrorStyle('postalCode')}
                            value={formData.postalCode}
                            onChange={e => handleChange('postalCode', e.target.value)}
                        />
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>{t.country} <span style={styles.required}>*</span></label>
                        <select
                            style={styles.select}
                            value={formData.country}
                            onChange={e => handleChange('country', e.target.value)}
                        >
                            <option value="Thailand">{t.thailand}</option>
                            <option value="United States">{t.unitedStates}</option>
                            <option value="United Kingdom">{t.unitedKingdom}</option>
                            <option value="Other">{t.other}</option>
                        </select>
                    </div>
                </div>

                {/* Phone */}
                <div style={styles.field}>
                    <label style={styles.label}>{t.phoneNumber} <span style={styles.required}>*</span></label>
                    <input
                        type="tel"
                        placeholder={t.phoneNumber}
                        style={getErrorStyle('phone')}
                        value={formData.phone}
                        onChange={e => handleChange('phone', e.target.value)}
                    />
                </div>

                {/* Email */}
                <div style={styles.field}>
                    <label style={styles.label}>{t.emailAddress} <span style={styles.required}>*</span></label>
                    <input
                        type="email"
                        placeholder={t.emailAddress}
                        style={getErrorStyle('email')}
                        value={formData.email}
                        onChange={e => handleChange('email', e.target.value)}
                    />
                </div>

                {/* Instagram */}
                <div style={styles.field}>
                    <label style={styles.label}>{t.instagram} <span style={styles.opt}>({t.optional})</span></label>
                    <input
                        type="text"
                        placeholder="@username"
                        style={styles.input}
                        value={formData.instagram}
                        onChange={e => handleChange('instagram', e.target.value)}
                    />
                </div>

            </div>
        </div>
    );
}


const styles = {
    card: {
        backgroundColor: '#fff',
        // No explicit border, just flow
        padding: '0 20px', // Matches page padding
        marginBottom: '30px',
    },
    title: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#111',
        marginBottom: '20px',
        letterSpacing: '-0.3px',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    field: {
        display: 'flex',
        flexDirection: 'column',
    },
    row: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
    },
    label: {
        fontSize: '13px',
        fontWeight: '500',
        marginBottom: '8px',
        color: '#555',
    },
    required: {
        color: '#EF4444',
        marginLeft: '2px',
    },
    opt: {
        color: '#9CA3AF',
        fontWeight: '400',
        marginLeft: '4px',
        fontSize: '12px',
    },
    input: {
        height: '50px',
        padding: '0 16px',
        fontSize: '16px',
        border: '1px solid #E5E7EB', // Very light gray
        borderRadius: '12px', // Slightly more rounded
        backgroundColor: '#FAFAFA',
        color: '#111',
        outline: 'none',
        transition: 'all 0.2s ease',
        WebkitAppearance: 'none',
    },
    select: {
        height: '50px',
        padding: '0 16px',
        fontSize: '16px',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        backgroundColor: '#FAFAFA',
        color: '#111',
        outline: 'none',
        width: '100%',
        WebkitAppearance: 'none',
    }
};
