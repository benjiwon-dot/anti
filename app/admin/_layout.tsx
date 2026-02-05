import { Slot } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

/**
 * Native-safe layout for Admin.
 * Since the Admin UI uses HTML tags (div, header, etc.) and global CSS,
 * we keep it primarily for Web. 
 * On Native, we show a redirection or a placeholder.
 */
export default function AdminLayout() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Memotile Admin (Web Only)</Text>
            </View>
            <View style={styles.content}>
                <Text style={styles.message}>
                    Admin operations are optimized for larger screens and are available on Web only.
                </Text>
                <Slot />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#09090b',
    },
    header: {
        height: 64,
        backgroundColor: '#18181b',
        borderBottomWidth: 1,
        borderBottomColor: '#27272a',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    headerText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    message: {
        color: '#a1a1aa',
        textAlign: 'center',
        fontSize: 16,
        marginBottom: 20,
    }
});
