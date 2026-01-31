import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';

interface PromptPayModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function PromptPayModal({ visible, onClose }: PromptPayModalProps) {
    const { t } = useLanguage();

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>PromptPay QR</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="black" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.qrContainer}>
                        {/* Placeholder QR */}
                        <View style={styles.qrPlaceholder}>
                            <Ionicons name="qr-code-outline" size={100} color="#ccc" />
                        </View>
                        <Text style={styles.guideText}>
                            {t['promptpayGuide'] || "PromptPay is a QR payment method. (Current UI Only)\nPayment will be displayed after Paymentwall integration."}
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Text style={styles.closeBtnText}>{t['close'] || "Close"}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    content: { backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
    title: { fontSize: 18, fontWeight: '700' },
    qrContainer: { width: '100%', alignItems: 'center', marginBottom: 24 },
    qrPlaceholder: { width: 200, height: 200, backgroundColor: '#f3f4f6', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    guideText: { textAlign: 'center', color: '#666', fontSize: 14, lineHeight: 20 },
    closeBtn: { width: '100%', height: 50, borderRadius: 25, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
    closeBtnText: { fontWeight: '600' }
});
