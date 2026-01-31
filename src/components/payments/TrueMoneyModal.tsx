import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';

interface TrueMoneyModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function TrueMoneyModal({ visible, onClose }: TrueMoneyModalProps) {
    const { t } = useLanguage();

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>TrueMoney Wallet</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="black" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.body}>
                        <View style={styles.illustration}>
                            <Ionicons name="wallet-outline" size={80} color="#FF6F00" />
                        </View>

                        <Text style={styles.guideText}>
                            {t['truemoneyGuide'] || "TrueMoney payment flow involves authentication. (Current UI Only)\nPayment will be enabled after Paymentwall integration."}
                        </Text>

                        <View style={styles.dummyInput}>
                            <Text style={styles.dummyLabel}>{t['phoneNumber'] || "Phone Number"}</Text>
                            <TextInput style={styles.input} placeholder="08x-xxx-xxxx" editable={false} />
                        </View>
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
    body: { width: '100%', alignItems: 'center', marginBottom: 24 },
    illustration: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    guideText: { textAlign: 'center', color: '#666', fontSize: 14, lineHeight: 20, marginBottom: 20 },
    dummyInput: { width: '100%' },
    dummyLabel: { fontSize: 12, color: '#999', marginBottom: 4, fontWeight: '600' },
    input: { width: '100%', height: 45, backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 12, color: '#aaa' },
    closeBtn: { width: '100%', height: 50, borderRadius: 25, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
    closeBtnText: { fontWeight: '600' }
});
