import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { signUpWithEmail, signInWithEmail } from '../utils/firebaseAuth';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';

export default function AuthEmailScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();

    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuth = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }

        if (isSignUp && password !== confirmPassword) {
            Alert.alert("Error", t['auth.passwordMismatch'] || "Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                await signUpWithEmail(email, password);
                router.back();
            } else {
                await signInWithEmail(email, password);
                router.back();
            }
        } catch (error: any) {
            console.error("Auth Error:", error);
            let msg = error.message;
            if (msg.includes("api-key-not-valid")) {
                msg = "Firebase 설정(apiKey)을 확인하세요. EXPO_PUBLIC_FIREBASE_API_KEY가 로드되지 않았습니다.";
            } else if (error.code === 'auth/email-already-in-use') {
                msg = "Email already in use.";
            } else if (error.code === 'auth/invalid-email') {
                msg = "Invalid email address.";
            } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                msg = "Invalid email or password.";
            } else if (error.code === 'auth/weak-password') {
                msg = "Password should be at least 6 characters.";
            }
            Alert.alert("Authentication Failed", msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isSignUp ? (t['auth.signupTab'] || "Sign Up") : (t['auth.loginTab'] || "Log In")}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.formContainer}>

                        {/* Tab Switcher */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tab, !isSignUp && styles.activeTab]}
                                onPress={() => setIsSignUp(false)}
                            >
                                <Text style={[styles.tabText, !isSignUp && styles.activeTabText]}>
                                    {t['auth.loginTab'] || "Log In"}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, isSignUp && styles.activeTab]}
                                onPress={() => setIsSignUp(true)}
                            >
                                <Text style={[styles.tabText, isSignUp && styles.activeTabText]}>
                                    {t['auth.signupTab'] || "Sign Up"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Form Inputs */}
                        <View style={styles.inputs}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t['auth.emailLabel'] || "Email"}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="name@example.com"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t['auth.passwordLabel'] || "Password"}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </View>

                            {isSignUp && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>{t['auth.confirmPasswordLabel'] || "Confirm Password"}</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="••••••"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry
                                    />
                                </View>
                            )}
                        </View>

                        {/* Action Button */}
                        <TouchableOpacity
                            style={[styles.mainBtn, loading && styles.disabledBtn]}
                            onPress={handleAuth}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.mainBtnText}>
                                    {isSignUp ? (t['auth.signupAction'] || "Create Account") : (t['auth.loginAction'] || "Log In")}
                                </Text>
                            )}
                        </TouchableOpacity>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6'
    },
    backBtn: { padding: 4 },
    headerTitle: { flex: 1, textAlign: 'center', fontWeight: '700', fontSize: 16 },
    content: { flexGrow: 1, padding: 24, paddingTop: 40, justifyContent: 'flex-start' }, // Updated layout
    formContainer: { maxWidth: 400, width: '100%', alignSelf: 'center' },

    tabContainer: {
        flexDirection: 'row',
        marginBottom: 24,
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#fff',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontWeight: '600',
        color: '#666',
        fontSize: 14,
    },
    activeTabText: {
        color: '#000',
    },

    inputs: { gap: 16, marginBottom: 24 },
    inputGroup: { gap: 8 },
    label: { fontSize: 14, fontWeight: '600', color: '#333' },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        backgroundColor: '#f9fafb'
    },

    mainBtn: {
        height: 52,
        backgroundColor: colors.ink || '#000',
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    disabledBtn: { opacity: 0.7 },
    mainBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

