import React, { useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePhoto } from "../context/PhotoContext";
import { useLanguage } from "../context/LanguageContext";
import { colors } from "../theme/colors";

const PAYMENT_OPTIONS = [
    { id: 'promptpay', labelKey: 'promptpay', icon: require('../assets/promptpay_logo.png') },
    { id: 'truemoney', labelKey: 'truemoney', icon: require('../assets/truemoney_logo.png') },
    { id: 'card', labelKey: 'creditDebitCard', icon: 'card-outline' },
    { id: 'apple', labelKey: 'applePay', icon: 'logo-apple' },
    { id: 'google', labelKey: 'googlePay', icon: 'logo-google' }
];

export default function CheckoutStepTwoScreen() {
    const router = useRouter();
    const { photos } = usePhoto();
    const { t, locale } = useLanguage();

    const [formData, setFormData] = useState({
        fullName: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        phone: '',
        email: '',
        instagram: '',
    });

    const [paymentMethod, setPaymentMethod] = useState('promptpay');

    // Constants
    const PRICE_PER_TILE = locale === 'TH' ? 200 : 6.45;
    const CURRENCY_SYMBOL = locale === 'TH' ? '฿' : '$';

    // Total calc
    const total = photos.length * PRICE_PER_TILE;

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePlaceOrder = () => {
        // Stub: log data
        const orderData = {
            items: photos.map((p: any) => ({
                uri: p.uri,
                previewUri: p.previewUri, // if exists
                assetId: p.assetId
            })),
            shipping: formData,
            paymentMethod,
            total,
            currency: CURRENCY_SYMBOL
        };

        console.log("PAYMENT STUB: Placing Order", orderData);
        alert(`Order Placed (Stub)! \nMethod: ${paymentMethod} \nTotal: ${CURRENCY_SYMBOL}${total}`);

        // Possibly navigate to success or home
        // router.replace("/"); 
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t['checkoutTitle'] || "Checkout"}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.stepContainer}>

                    {/* Shipping Form */}
                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>{t['shippingAddressTitle'] || "SHIPPING ADDRESS"}</Text>

                        <TextInput
                            placeholder={`${t['fullName'] || "Full Name"} *`}
                            style={styles.input}
                            value={formData.fullName}
                            onChangeText={(v) => handleInputChange('fullName', v)}
                        />
                        <TextInput
                            placeholder={`${t['streetAddress'] || "Street Address"} *`}
                            style={styles.input}
                            value={formData.addressLine1}
                            onChangeText={(v) => handleInputChange('addressLine1', v)}
                        />
                        <TextInput
                            placeholder={`${t['address2'] || "Apartment, suite, etc."} ${t['optionalSuffix'] || "(optional)"}`}
                            style={styles.input}
                            value={formData.addressLine2}
                            onChangeText={(v) => handleInputChange('addressLine2', v)}
                        />

                        <View style={styles.row}>
                            <TextInput
                                placeholder={`${t['city'] || "City"} *`}
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                                value={formData.city}
                                onChangeText={(v) => handleInputChange('city', v)}
                            />
                            <TextInput
                                placeholder={`${t['stateProv'] || "State"} *`}
                                style={[styles.input, { flex: 1 }]}
                                value={formData.state}
                                onChangeText={(v) => handleInputChange('state', v)}
                            />
                        </View>

                        <View style={styles.row}>
                            <TextInput
                                placeholder={`${t['zipCode'] || "Zip Code"} *`}
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                                value={formData.postalCode}
                                onChangeText={(v) => handleInputChange('postalCode', v)}
                            />
                            <View style={[styles.input, styles.readOnlyInput, { flex: 1 }]}>
                                <Text style={{ color: '#666' }}>{t['thailand'] || "Thailand"}</Text>
                            </View>
                        </View>

                        <TextInput
                            placeholder={`${t['phoneNumber'] || "Phone"} *`}
                            style={styles.input}
                            value={formData.phone}
                            keyboardType="phone-pad"
                            onChangeText={(v) => handleInputChange('phone', v)}
                        />
                        <TextInput
                            placeholder={`${t['emailAddress'] || "Email"} *`}
                            style={styles.input}
                            value={formData.email}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            onChangeText={(v) => handleInputChange('email', v)}
                        />
                        <TextInput
                            placeholder={`${t['instagram'] || "Instagram"} ${t['optionalSuffix'] || "(optional)"}`}
                            style={styles.input}
                            value={formData.instagram}
                            autoCapitalize="none"
                            onChangeText={(v) => handleInputChange('instagram', v)}
                        />
                    </View>

                    {/* Payment Method */}
                    <View style={styles.paymentSection}>
                        <Text style={styles.sectionTitle}>{t['paymentTitle'] || "PAYMENT METHOD"}</Text>

                        {PAYMENT_OPTIONS.map((option) => {
                            const selected = paymentMethod === option.id;
                            return (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[styles.payOption, selected && styles.payOptionSelected]}
                                    onPress={() => setPaymentMethod(option.id)}
                                >
                                    <View style={[styles.radioCircle, selected && styles.radioActive]} />
                                    {option.icon && typeof option.icon === 'number' ? (
                                        <Image source={option.icon} style={{ width: 32, height: 32, marginRight: 10 }} resizeMode="contain" />
                                    ) : option.icon && typeof option.icon === 'string' ? (
                                        <Ionicons name={option.icon as any} size={20} color="#333" style={{ marginRight: 10 }} />
                                    ) : (
                                        <View style={{ width: 32, height: 32, backgroundColor: '#eee', borderRadius: 4, marginRight: 10 }} />
                                    )}
                                    <Text style={styles.payText}>{(t as any)[option.labelKey] || option.labelKey}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>

                    {/* Pay Button */}
                    <TouchableOpacity style={styles.placeOrderBtn} onPress={handlePlaceOrder}>
                        <Text style={styles.placeOrderBtnText}>
                            {t['placeOrder'] || "Place Order"} · {CURRENCY_SYMBOL}{total.toFixed(2)}
                        </Text>
                    </TouchableOpacity>

                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    backBtn: { padding: 4 },
    headerTitle: { flex: 1, textAlign: 'center', fontWeight: '700', fontSize: 16 },
    content: { padding: 20 },
    stepContainer: { maxWidth: 500, alignSelf: 'center', width: '100%' },

    formSection: { marginBottom: 32 },
    sectionTitle: { fontSize: 13, color: '#999', fontWeight: '700', marginBottom: 15, textTransform: 'uppercase' },
    input: { width: '100%', height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 16, marginBottom: 12, fontSize: 15, backgroundColor: '#fff' },
    readOnlyInput: { backgroundColor: '#f9fafb', justifyContent: 'center' },
    row: { flexDirection: 'row' },

    paymentSection: { marginBottom: 32 },
    payOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10, backgroundColor: '#fff' },
    payOptionSelected: { borderColor: '#000', borderWidth: 2, backgroundColor: '#fafafa' },
    radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#ccc', marginRight: 12 },
    radioActive: { borderColor: '#000', borderWidth: 6 },
    payText: { fontWeight: '600', fontSize: 15 },

    placeOrderBtn: { width: '100%', height: 56, borderRadius: 28, backgroundColor: colors.ink || '#000', alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: "#000", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
    placeOrderBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
