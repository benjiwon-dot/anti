import React, { useMemo, useState, useEffect } from "react";
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, SafeAreaView, TextInput, ActivityIndicator, Alert, Platform, Modal } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePhoto } from "../context/PhotoContext";
import { useLanguage } from "../context/LanguageContext";
import { colors } from "../theme/colors";

// Firebase / Auth / Promo
import { getAuth, User } from "firebase/auth";
import { useGoogleAuthRequest, signInWithGoogleCredential } from "../utils/firebaseAuth";
import { verifyAndRedeemPromo, PromoResult, PromoType } from "../utils/promo";

const LoginButton = ({ text, onPress, style, disabled, icon }: { text: string, onPress: () => void, style?: any, disabled?: boolean, icon?: React.ReactNode }) => (
    <TouchableOpacity style={[styles.loginBtn, style, disabled && { opacity: 0.6 }, { flexDirection: 'row', gap: 8 }]} onPress={onPress} disabled={disabled}>
        {icon}
        <Text style={styles.loginBtnText}>{text}</Text>
    </TouchableOpacity>
);

export default function CheckoutStepOneScreen() {
    const router = useRouter();
    const { photos } = usePhoto();
    const { t, locale } = useLanguage();

    // Auth State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const auth = getAuth();

    // Promo State
    const [showPromo, setShowPromo] = useState(false);
    const [promoCode, setPromoCode] = useState('');
    const [promoStatus, setPromoStatus] = useState<'idle' | 'checking' | 'applied' | 'invalid'>('idle');
    const [discount, setDiscount] = useState<{ type: PromoType, value: number, text?: string } | null>(null);
    const [isApplyingPromo, setIsApplyingPromo] = useState(false);

    // Preview Modal State
    const [previewUri, setPreviewUri] = useState<string | null>(null);

    // Constants
    const PRICE_PER_TILE = locale === 'TH' ? 200 : 6.45;
    const CURRENCY_SYMBOL = locale === 'TH' ? '฿' : '$';

    // Google Auth Hook
    const { request, response, promptAsync } = useGoogleAuthRequest();

    useEffect(() => {
        // Handle Google Response
        if (response?.type === 'success') {
            const { id_token } = response.params;
            if (id_token) {
                setIsLoggingIn(true);
                signInWithGoogleCredential(auth, id_token)
                    .then((cred) => setCurrentUser(cred.user))
                    .catch((e) => Alert.alert("Login Failed", e.message))
                    .finally(() => setIsLoggingIn(false));
            }
        } else if (response?.type === 'error') {
            Alert.alert("Login Error", "Could not sign in with Google.");
        }
    }, [response]);

    useEffect(() => {
        const unsub = auth.onAuthStateChanged(user => {
            setCurrentUser(user);
        });
        return unsub;
    }, []);

    // Price Calculation
    const subtotal = useMemo(() => photos.length * PRICE_PER_TILE, [photos.length, locale]);

    const total = useMemo(() => {
        if (!discount) return subtotal;

        let final = subtotal;
        if (discount.type === 'free') {
            final = 0;
        } else if (discount.type === 'amount') {
            final = Math.max(0, subtotal - discount.value);
        } else if (discount.type === 'percent') {
            final = subtotal * (1 - discount.value / 100);
        }
        return final;
    }, [subtotal, discount]);

    const handleApplyPromo = async () => {
        if (!promoCode.trim()) return;
        if (!currentUser) {
            Alert.alert("Please login first", "You must be logged in to use a promo code.");
            return;
        }

        setIsApplyingPromo(true);
        setPromoStatus('checking');

        try {
            const result = await verifyAndRedeemPromo(promoCode.trim(), currentUser.uid);
            if (result.success && result.data) {
                setPromoStatus('applied');
                setDiscount({
                    type: result.data.type,
                    value: result.data.value,
                    text: `${result.data.type === 'free' ? 'Free' : result.data.type === 'percent' ? result.data.value + '%' : CURRENCY_SYMBOL + result.data.value} Off`
                });
                Alert.alert("Success", "Promo code applied!");
            } else {
                setPromoStatus('invalid');
                setDiscount(null);
                Alert.alert("Invalid Code", result.error || "Code could not be applied.");
            }
        } catch (e) {
            setPromoStatus('invalid');
            setDiscount(null);
            Alert.alert("Error", "Failed to apply promo code.");
        } finally {
            setIsApplyingPromo(false);
        }
    };

    const handleGoogleLogin = () => {
        if (isLoggingIn) return;
        promptAsync();
    };

    const handleAppleLogin = () => {
        Alert.alert("Apple Sign-In", t['auth.appleNotConfigured'] || "Apple Sign-In is not configured yet.");
    };

    const handleStubLogin = (provider: string) => {
        console.log(`Stub login for ${provider}`);
        Alert.alert("Stub Login", `${provider} login is not implemented in this demo.`);
    };

    const handleNext = () => {
        if (currentUser) {
            router.push("/create/checkout/payment");
        }
    };

    const GoogleIconFallback = () => (
        <Image
            source={require('../assets/google_logo.png')}
            style={{ width: 18, height: 18, marginRight: 0 }}
            resizeMode="contain"
        />
    );

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
                    {/* Horizontal Image Preview */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll} contentContainerStyle={{ gap: 12 }}>
                        {photos.map((item, idx) => {
                            // Resolution Priority: 1) previewUri (if exists on item), 2) uri
                            const sourceUri = (item as any).output?.previewUri || item.uri;
                            return (
                                <TouchableOpacity key={item.assetId || idx} onPress={() => setPreviewUri(sourceUri)}>
                                    <Image
                                        source={{ uri: sourceUri }}
                                        style={styles.previewImage}
                                    />
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Summary Block */}
                    <View style={styles.summaryBlock}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>{photos.length} {t['tilesSize'] || "Tiles"}</Text>
                            <Text style={styles.summaryValue}>{CURRENCY_SYMBOL}{subtotal.toFixed(2)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: '#10B981' }]}>{t['shipping'] || "Shipping"}</Text>
                            <Text style={[styles.summaryValue, { color: '#10B981' }]}>{t['free'] || "Free"}</Text>
                        </View>

                        {discount && (
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: '#007AFF' }]}>Discount</Text>
                                <Text style={[styles.summaryValue, { color: '#007AFF' }]}>-{discount.text}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.promoButton}
                            onPress={() => setShowPromo(!showPromo)}
                        >
                            <Text style={styles.promoText}>{t['promoHaveCode'] || "Have a promo code?"}</Text>
                            <Ionicons name={showPromo ? "chevron-up" : "chevron-down"} size={16} color="#000" />
                        </TouchableOpacity>

                        {showPromo && (
                            <View style={styles.promoInputContainer}>
                                <TextInput
                                    style={styles.promoInput}
                                    placeholder="Enter code"
                                    value={promoCode}
                                    onChangeText={setPromoCode}
                                    autoCapitalize="characters"
                                    editable={!isApplyingPromo && promoStatus !== 'applied'}
                                />
                                <TouchableOpacity
                                    style={[styles.applyBtn, (isApplyingPromo || promoStatus === 'applied') && { opacity: 0.5 }]}
                                    onPress={handleApplyPromo}
                                    disabled={isApplyingPromo || promoStatus === 'applied'}
                                >
                                    {isApplyingPromo ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Apply</Text>}
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.divider} />
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>{t['totalLabel'] || "Total"}</Text>
                            <Text style={styles.totalValue}>{CURRENCY_SYMBOL}{total.toFixed(2)}</Text>
                        </View>
                    </View>

                    {/* Login Section */}
                    <View style={styles.authSection}>
                        {!currentUser ? (
                            <>
                                <LoginButton
                                    text={t['signUpGoogle'] || "Sign up with Google"}
                                    onPress={handleGoogleLogin}
                                    style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' }}
                                    disabled={isLoggingIn}
                                    icon={<GoogleIconFallback />}
                                />
                                {Platform.OS === 'ios' && (
                                    <LoginButton
                                        text={t['auth.signinApple'] || "Continue with Apple"}
                                        onPress={handleAppleLogin}
                                        style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' }}
                                        icon={<Ionicons name="logo-apple" size={20} color="#000" />}
                                    />
                                )}
                                <LoginButton
                                    text={t['auth.continueEmail'] || "Continue with email"}
                                    onPress={() => router.push("/auth/email")}
                                    style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' }}
                                    icon={<Ionicons name="mail" size={20} color="#333" />}
                                />
                            </>
                        ) : (
                            <View style={styles.loggedInInfo}>
                                <Text style={styles.loggedInText}>Logged in as {currentUser.email || "User"}</Text>
                                <TouchableOpacity onPress={() => auth.signOut()}>
                                    <Text style={{ color: '#666', fontSize: 13, marginTop: 4, textDecorationLine: 'underline' }}>Sign Out</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Next Button - Visible always but disabled style if not logged in */}
                    <TouchableOpacity
                        style={[styles.nextBtn, !currentUser && styles.disabledBtn]}
                        onPress={handleNext}
                        disabled={!currentUser}
                    >
                        <Text style={styles.nextBtnText}>
                            {t['next'] || "Next"}
                        </Text>
                    </TouchableOpacity>

                </View>
            </ScrollView>

            {/* Photo Preview Modal */}
            <Modal visible={!!previewUri} transparent={true} animationType="fade" onRequestClose={() => setPreviewUri(null)}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity style={styles.modalBackground} onPress={() => setPreviewUri(null)} />
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPreviewUri(null)}>
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                    {previewUri && (
                        <Image
                            source={{ uri: previewUri }}
                            style={styles.modalImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>
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
    imageScroll: { marginBottom: 16, flexDirection: 'row' },
    previewImage: { width: 100, height: 100, backgroundColor: '#eee', resizeMode: 'cover' }, // No borderRadius

    summaryBlock: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f0f0f0', marginBottom: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    summaryLabel: { fontSize: 15, color: '#333' },
    summaryValue: { fontSize: 15, fontWeight: '600' },

    promoButton: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    promoText: { fontWeight: '600', marginRight: 5, fontSize: 14 },
    promoInputContainer: { marginTop: 10, flexDirection: 'row', gap: 8 },
    promoInput: { flex: 1, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 12, backgroundColor: '#f9fafb' },
    applyBtn: { width: 70, height: 44, borderRadius: 8, backgroundColor: colors.ink || '#000', alignItems: 'center', justifyContent: 'center' },

    divider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
    totalLabel: { fontSize: 18, fontWeight: '700' },
    totalValue: { fontSize: 18, fontWeight: '700' },

    authSection: { gap: 10, marginBottom: 20 },
    loginBtn: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
    loginBtnText: { fontWeight: '600', fontSize: 15, color: '#333' },

    loggedInInfo: { padding: 15, backgroundColor: '#e0f2fe', borderRadius: 12, alignItems: 'center' },
    loggedInText: { color: '#0284c7', fontWeight: '600' },

    nextBtn: { height: 56, borderRadius: 28, backgroundColor: colors.ink || '#000', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    disabledBtn: { backgroundColor: '#ccc' },
    nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

    // Modal Styles
    modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    modalBackground: { ...StyleSheet.absoluteFillObject },
    modalCloseBtn: { position: "absolute", top: 60, right: 30, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
    modalImage: { width: '100%', height: '80%' },
});
