import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
    status: 'paid' | 'processing' | 'printed' | 'shipping' | 'delivered' | 'failed' | 'refunded';
}

export default function StatusBadgeRN({ status }: Props) {
    const { t } = useLanguage();

    const getStatusInfo = (s: string) => {
        const statuses: any = {
            paid: { label: t.statusPaid, color: '#4CAF50', bg: '#E8F5E9' },
            processing: { label: t.statusProcessing, color: '#FF9800', bg: '#FFF3E0' },
            printed: { label: t.statusPrinted, color: '#2196F3', bg: '#E3F2FD' },
            shipping: { label: t.statusShipping, color: '#9C27B0', bg: '#F3E5F5' },
            delivered: { label: t.statusDelivered, color: '#607D8B', bg: '#ECEFF1' },
            failed: { label: t.statusFailed || "FAILED", color: '#F44336', bg: '#FFEBEE' },
            refunded: { label: t.statusRefunded || "REFUNDED", color: '#9E9E9E', bg: '#F5F5F5' },
        };
        return statuses[s] || statuses.processing;
    };

    const info = getStatusInfo(status);

    return (
        <View style={[styles.badge, { backgroundColor: info.bg }]}>
            <Text style={[styles.text, { color: info.color }]}>{info.label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    text: {
        fontSize: 12,
        fontWeight: '800',
    }
});
