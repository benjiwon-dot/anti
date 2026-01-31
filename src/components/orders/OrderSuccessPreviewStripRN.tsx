import React from 'react';
import { View, ScrollView, Image, StyleSheet } from 'react-native';
import { OrderItem } from '../../types/order';

interface Props {
    items: OrderItem[];
}

export default function OrderSuccessPreviewStripRN({ items }: Props) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
        >
            {items.map((item, idx) => (
                <View key={idx} style={styles.previewBox}>
                    <Image
                        source={{ uri: item.previewUrl || item.previewUri || item.src || '' }}
                        style={styles.previewImg}
                    />
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        gap: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1, // To center if few items
    },
    previewBox: {
        width: 80,
        height: 80,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    previewImg: {
        width: '100%',
        height: '100%',
    }
});
