import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Clean Native-only placeholder for Admin Order Details.
 */
export default function OrderDetailNative() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Admin is Web-only</Text>
            <Text style={styles.subtitle}>
                Detailed order views are available on web.
            </Text>

            <TouchableOpacity style={styles.button} onPress={() => router.back()}>
                <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: '#09090b',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#71717a',
        textAlign: 'center',
        marginBottom: 24,
    },
    button: {
        backgroundColor: '#27272a',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: 'bold',
    }
});
