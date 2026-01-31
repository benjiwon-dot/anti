import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay
} from 'react-native-reanimated';
import { getOrder } from '../../src/services/orders';
import { OrderDoc } from '../../src/types/order';
import { useLanguage } from '../../src/context/LanguageContext';
import OrderSuccessPreviewStripRN from '../../src/components/orders/OrderSuccessPreviewStripRN';

export default function OrderSuccessScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { t } = useLanguage();
    const [order, setOrder] = useState<OrderDoc | null>(null);

    // Celebration Animation
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (id) {
            getOrder(id as string).then(setOrder);
        }

        // Trigger animation
        scale.value = withSpring(1, { damping: 10, stiffness: 100 });
        opacity.value = withDelay(300, withSpring(1));

        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
            // Silently fail if haptics not available
        }
    }, [id]);

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const animatedContentStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: (1 - opacity.value) * 30 }],
    }));

    if (!id || (!order && id)) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <Text style={styles.title}>{t.orderNotFound || "Processing..."}</Text>
                    {/* If it takes too long, just show a back button */}
                    {!order && (
                        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/')}>
                            <Text style={styles.primaryBtnText}>{t.goHome || "Back Home"}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    <Animated.View style={[styles.iconWrapper, animatedIconStyle]}>
                        <CheckCircle size={100} color="#10B981" fill="#D1FAE5" strokeWidth={1} />
                    </Animated.View>

                    <Animated.View style={[styles.textCenter, animatedContentStyle]}>
                        <Text style={styles.title}>{t.thankYou || "Thank You!"}</Text>
                        <Text style={styles.message}>
                            {t.orderPlaced || "Your order has been placed successfully."}{"\n"}
                            {t.emailReceipt || "We've sent a receipt to"} {order?.shipping.email || "your email"}.
                        </Text>
                    </Animated.View>

                    {/* Horizontal item previews */}
                    {order?.items && (
                        <View style={styles.stripContainer}>
                            <OrderSuccessPreviewStripRN items={order.items} />
                        </View>
                    )}

                    <Animated.View style={[styles.orderInfo, animatedContentStyle]}>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>{t.orderNumberLabel || "ORDER NUMBER"}</Text>
                            <Text style={styles.value}>#{order?.id}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.estimate}>{t.estimatedDelivery || "Estimated delivery: 5 days"}</Text>
                        </View>
                    </Animated.View>
                </View>
            </ScrollView>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => router.replace('/(tabs)/myorder')}
                >
                    <Text style={styles.primaryBtnText}>{t.goMyOrders || "View My Orders"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => router.replace('/')}
                >
                    <Text style={styles.secondaryBtnText}>{t.backHome || "Back to Home"}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    scrollContent: { flexGrow: 1, justifyContent: 'center' },
    content: { alignItems: 'center', paddingHorizontal: 30, paddingVertical: 40 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
    iconWrapper: { marginBottom: 32 },
    textCenter: { alignItems: 'center' },
    title: { fontSize: 32, fontWeight: '900', marginBottom: 16, color: '#111', textAlign: 'center' },
    message: { fontSize: 16, color: '#6B7280', marginBottom: 40, lineHeight: 24, textAlign: 'center' },
    stripContainer: { width: '100%', marginBottom: 32 },
    orderInfo: { backgroundColor: '#F9FAFB', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#F3F4F6', width: '100%' },
    infoRow: { alignItems: 'center', marginBottom: 12 },
    label: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
    value: { fontSize: 18, fontWeight: '700', fontFamily: 'Courier', color: '#111' },
    estimate: { fontSize: 14, color: '#10B981', fontWeight: '700' },
    actions: { paddingHorizontal: 30, paddingBottom: 40, gap: 16 },
    primaryBtn: { backgroundColor: '#000', height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    secondaryBtn: { height: 50, alignItems: 'center', justifyContent: 'center' },
    secondaryBtnText: { color: '#6B7280', fontSize: 15, fontWeight: '600' },
});
