import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Image,
    FlatList,
    ActivityIndicator,
    Dimensions,
    TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getOrder, subscribeOrder } from '../../src/services/orders';
import { OrderDoc } from '../../src/types/order';
import { useLanguage } from '../../src/context/LanguageContext';
import StatusBadgeRN from '../../src/components/orders/StatusBadgeRN';
import PreviewModalRN from '../../src/components/orders/PreviewModalRN';
import { formatDate } from '../../src/utils/date';

const { width } = Dimensions.get('window');
const GRID_SPACING = 12;
const ITEM_WIDTH = (width - 40 - (GRID_SPACING * 2)) / 3;

export default function OrderDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { t } = useLanguage();

    const [order, setOrder] = useState<OrderDoc | null>(null);
    const [loading, setLoading] = useState(true);
    const [previewUri, setPreviewUri] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        let unsub: any;
        const init = async () => {
            try {
                // First fetch
                const initial = await getOrder(id as string);
                setOrder(initial);
                setLoading(false);

                // Then subscribe for status updates
                unsub = subscribeOrder(id as string, (updated) => {
                    if (updated) setOrder(updated);
                });
            } catch (e) {
                console.error("Failed to load order", e);
                setLoading(false);
            }
        };

        init();
        return () => unsub && unsub();
    }, [id]);

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.replace('/(tabs)/myorder')} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={24} color="#111" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t.orderDetailTitle || "Order Details"}</Text>
            <View style={{ width: 44 }} />
        </View>
    );

    const renderPaymentText = () => {
        if (!order) return "";
        if (order.payment?.provider === 'DEV_FREE' || order.payment?.provider === 'PROMO_FREE') {
            return t.payFreeDev || "Free (Dev Order)";
        }
        if (order.payment?.brand && order.payment?.last4) {
            const brand = order.payment.brand.toUpperCase();
            return `${brand} •••• ${order.payment.last4}`;
        }
        return order.paymentMethod || t.paymentTitle || "Payment";
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                {renderHeader()}
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#111" />
                </View>
            </SafeAreaView>
        );
    }

    if (!order) {
        return (
            <SafeAreaView style={styles.container}>
                {renderHeader()}
                <View style={styles.content}>
                    <Text style={styles.notFoundTitle}>{t.orderNotFound || "Order Not Found"}</Text>
                    <Text style={styles.notFoundDesc}>{t.orderNotFoundDesc || "We couldn't find the order."}</Text>
                </View>
            </SafeAreaView>
        );
    }

    const sections = [
        { type: 'summary' },
        { type: 'items' },
        { type: 'shipping' },
        { type: 'payment' }
    ];

    return (
        <SafeAreaView style={styles.container}>
            {renderHeader()}

            <FlatList
                contentContainerStyle={styles.scrollContent}
                data={sections}
                keyExtractor={(item) => item.type}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                    if (item.type === 'summary') {
                        return (
                            <View style={styles.section}>
                                <View style={styles.orderSummary}>
                                    <View style={styles.summaryRowTop}>
                                        <View style={styles.orderMeta}>
                                            <Text style={styles.orderMetaLabel}>{t.ordersId || "Order Code"}</Text>
                                            <Text style={styles.orderMetaValue}>#{order.orderCode || (order.id as string).slice(-7).toUpperCase()}</Text>
                                        </View>
                                        <StatusBadgeRN status={order.status as any} />
                                    </View>

                                    <View style={styles.summaryRowBottom}>
                                        <Text style={styles.orderDate}>
                                            {formatDate(order.createdAt)}
                                        </Text>
                                        <Text style={styles.orderTotal}>
                                            ฿{order.total.toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        );
                    }
                    if (item.type === 'items') {
                        return (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>{t.itemsTitle || "Items"}</Text>
                                <View style={styles.itemGrid}>
                                    {order.items.map((item, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            style={styles.itemCard}
                                            onPress={() => setPreviewUri(item.previewUrl || item.previewUri || null)}
                                        >
                                            {(item.previewUrl || item.previewUri) ? (
                                                <Image
                                                    source={{ uri: item.previewUrl || item.previewUri || '' }}
                                                    style={styles.itemImg}
                                                />
                                            ) : (
                                                <View style={[styles.itemImg, { backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }]}>
                                                    <Ionicons name="image-outline" size={24} color="#ccc" />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        );
                    }
                    if (item.type === 'shipping') {
                        return (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>{t.shippingAddressTitle || "Shipping Address"}</Text>
                                <View style={styles.detailsCard}>
                                    <DetailRow label={t.fullName || "Full Name"} value={order.shipping.fullName} />
                                    <DetailRow label={t.addressLabel || t.address1 || "Address"} value={order.shipping.address1} />
                                    {order.shipping.address2 && <DetailRow label={t.address2Label || "Address 2"} value={order.shipping.address2} />}
                                    <DetailRow label={`${t.city || "City"} / ${t.state || "State"}`} value={`${order.shipping.city}, ${order.shipping.state}`} />
                                    <DetailRow label={t.postalCode || "Zip"} value={order.shipping.postalCode} />
                                    <DetailRow label={t.phoneLabel || "Phone"} value={order.shipping.phone} />
                                    <DetailRow label={t.emailLabel || "Email"} value={order.shipping.email} />
                                </View>
                            </View>
                        );
                    }
                    if (item.type === 'payment') {
                        return (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>{t.paymentTitle || "Payment"}</Text>
                                <View style={styles.detailsCard}>
                                    <Text style={styles.paymentText}>{renderPaymentText()}</Text>
                                    {order.promo && (
                                        <View style={styles.promoLabel}>
                                            <Ionicons name="pricetag-outline" size={12} color="#10B981" />
                                            <Text style={styles.promoText}> {order.promo.code} (-฿{order.discount.toFixed(2)})</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    }
                    return null;
                }}
            />

            <PreviewModalRN
                visible={!!previewUri}
                imageUri={previewUri}
                onClose={() => setPreviewUri(null)}
            />
        </SafeAreaView>
    );
}

function DetailRow({ label, value }: { label: string, value: string }) {
    return (
        <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F7F8' },
    content: { padding: 20 },
    header: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    backBtn: { padding: 4, width: 44 },
    headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111', textAlign: 'center' },
    scrollContent: { padding: 20, paddingBottom: 60 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', marginBottom: 12, color: '#999', textTransform: 'uppercase' },
    orderSummary: { backgroundColor: '#fff', padding: 20, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 2 },
    summaryRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    summaryRowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    orderMeta: { gap: 4 },
    orderMetaLabel: { fontSize: 11, textTransform: 'uppercase', color: '#999', fontWeight: '800' },
    orderMetaValue: { fontSize: 14, fontFamily: 'Courier', color: '#111', fontWeight: '700' },
    orderDate: { fontSize: 14, color: '#666', fontWeight: '600' },
    orderTotal: { fontSize: 22, fontWeight: '800', color: '#111' },
    itemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_SPACING },
    itemCard: { width: ITEM_WIDTH, height: ITEM_WIDTH, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee' },
    itemImg: { width: '100%', height: '100%' },
    detailsCard: { backgroundColor: '#fff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#eee' },
    detailRow: { marginBottom: 12 },
    detailLabel: { fontSize: 11, fontWeight: '700', color: '#999', textTransform: 'uppercase', marginBottom: 2 },
    detailValue: { fontSize: 15, color: '#111', fontWeight: '600' },
    paymentText: { fontSize: 16, fontWeight: '700', color: '#111' },
    promoLabel: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    promoText: { color: '#10B981', fontWeight: '700', fontSize: 14 },
    notFoundTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center', marginTop: 40 },
    notFoundDesc: { fontSize: 14, color: '#666', textAlign: 'center' }
});
