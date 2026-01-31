import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

interface Props {
    visible: boolean;
    imageUri: string | null;
    onClose: () => void;
}

export default function PreviewModalRN({ visible, imageUri, onClose }: Props) {
    if (!imageUri) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <X size={32} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <Pressable style={styles.content} onPress={onClose}>
                        <Pressable style={styles.imageContainer} onPress={(e) => { e.stopPropagation(); }}>
                            <Image
                                source={{ uri: imageUri }}
                                style={styles.image}
                                resizeMode="contain"
                            />
                        </Pressable>
                    </Pressable>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        height: 60,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    closeBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageContainer: {
        width: '90%',
        aspectRatio: 1,
        backgroundColor: '#000',
    },
    image: {
        width: '100%',
        height: '100%',
    }
});
