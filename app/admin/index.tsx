import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

/**
 * Clean Native-only placeholder for Admin Dashboard.
 * Admin functionality is web-only.
 */
export default function AdminIndexNative() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Admin is Web-only</Text>
            <Text style={styles.subtitle}>
                Please open the admin dashboard in a browser.
            </Text>

            <TouchableOpacity style={styles.button} onPress={() => router.replace("/")}>
                <Text style={styles.buttonText}>Return to App</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        backgroundColor: "#09090b",
    },
    title: {
        fontSize: 24,
        fontWeight: "900",
        color: "#ffffff",
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 16,
        color: "#71717a",
        textAlign: "center",
        lineHeight: 24,
        marginBottom: 32,
    },
    button: {
        backgroundColor: "#007AFF",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    buttonText: {
        color: "#ffffff",
        fontWeight: "bold",
        fontSize: 16,
    },
});
