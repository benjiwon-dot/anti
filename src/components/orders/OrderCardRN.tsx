import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { OrderDoc } from '../../types/order';
import { useLanguage } from '../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { shadows } from '../../theme/shadows';
import { formatDate } from '../../utils/date';

interface Props {
    order: OrderDoc;
    onPress: () => void;
}

export default function OrderCardRN({ order, onPress }: Props) {
    const { t } = useLanguage();
    const dateStr = formatDate(order.createdAt);

    return (
        <Pressable
            style={({ pressed }) => [
                styles.card,
                pressed && { opacity: 0.7 }
            ]}
            onPress={onPress}
        >
            <View style={styles.content}>
                <View style={styles.topRow}>
                    <Text style={styles.date}>{dateStr}</Text>
                    <Text style={styles.orderId}>#{order.orderCode || (order.id as string).slice(-7).toUpperCase()}</Text>
                </View>

                {/* Image strip */}
                <View style={styles.imageStrip}>
                    {order.items && order.items.slice(0, 5).map((item, idx) => (
                        <View key={idx} style={styles.stripItem}>
                            {(item.previewUrl || item.previewUri || item.src) ? (
                                <Image
                                    source={{ uri: item.previewUrl || item.previewUri || item.src || '' }}
                                    style={styles.stripImg}
                                />
                            ) : (
                                <View style={[styles.stripImg, { backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }]}>
                                    <Ionicons name="image-outline" size={16} color="#ccc" />
                                </View>
                            )}
                        </View>
                    ))}
                    {order.items && order.items.length > 5 && (
                        <View style={styles.moreCount}>
                            <Text style={styles.moreCountText}>+{order.items.length - 5}</Text>
                        </View>
                    )}
                    {!order.items && order.itemsCount > 0 && (
                        <View style={[styles.stripImg, { backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', borderRadius: 6, width: 44, height: 44 }]}>
                            <Ionicons name="images-outline" size={20} color="#ccc" />
                        </View>
                    )}
                </View>

                <View style={styles.bottomRow}>
                    <Text style={styles.itemCount}>{order.itemsCount || order.items?.length || 0} {t.items}</Text>
                    <Text style={styles.totalPrice}>฿{order.total.toFixed(2)}</Text>
                </View>
            </View>
            <ChevronRight size={20} color="#ccc" />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...shadows.sm,
        marginBottom: 16,
    },
    content: {
        flex: 1,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    date: {
        fontSize: 13,
        color: '#8E8E93',
        fontWeight: '500',
    },
    orderId: {
        fontSize: 13,
        color: '#111',
        fontWeight: '600',
        fontFamily: 'Courier', // Better than monospace for RN cross-platform
    },
    imageStrip: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 16,
    },
    stripItem: {
        width: 44,
        height: 44,
        borderRadius: 6,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    stripImg: {
        width: '100%',
        height: '100%',
    },
    moreCount: {
        width: 44,
        height: 44,
        borderRadius: 6,
        backgroundColor: '#f9f9f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    moreCountText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemCount: {
        fontSize: 14,
        color: '#666',
    },
    totalPrice: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111',
    }
});
