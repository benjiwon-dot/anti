import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { FILTERS, FilterType } from "./filters";
import { colors } from "../../theme/colors";
import FilteredImageSkia from "./FilteredImageSkia";

interface FilterStripProps {
    currentFilter: FilterType;
    imageSrc: string;
    onSelect: (filter: FilterType) => void;
}

export default function FilterStripRN({ currentFilter, imageSrc, onSelect }: FilterStripProps) {
    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {FILTERS.map((f) => {
                    const isActive = currentFilter?.id === f.id;

                    return (
                        <Pressable
                            key={f.id}
                            style={[styles.item, !isActive && { opacity: 0.85 }]}
                            onPress={() => onSelect(f)}
                        >
                            <View style={[styles.previewBox, isActive && styles.activeBox]}>
                                <View style={styles.innerClip}>
                                    <FilteredImageSkia uri={imageSrc} width={60} height={60} matrix={f.matrix} />
                                </View>
                            </View>

                            <Text style={[styles.label, isActive && styles.activeLabel]} numberOfLines={1}>
                                {f.name}
                            </Text>
                        </Pressable>
                    );
                })}
                <View style={{ width: 12 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 100,
        backgroundColor: "#F7F7F8",
        borderTopWidth: 1,
        borderTopColor: "rgba(0,0,0,0.05)",
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 6,
        alignItems: "flex-start",
    },
    item: {
        width: 64,
        alignItems: "center",
        marginRight: 6,
    },
    previewBox: {
        width: 60,
        height: 60,
        marginBottom: 4,
        borderRadius: 10,
        // Removed overflow: hidden from here to allow shadow
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.10)",
        backgroundColor: "#fff",
    },
    innerClip: {
        width: "100%",
        height: "100%",
        borderRadius: 9, // Slightly less than outer to prevent bleeding? Or matches.
        overflow: "hidden",
    },
    activeBox: {
        // Removed thick border
        borderColor: "transparent", // or keep separate
        borderWidth: 0,
        transform: [{ translateY: -2 }, { scale: 1.08 }],
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 5,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    label: {
        fontSize: 11,
        color: colors.textMuted,
        fontWeight: "500",
        textAlign: "center",
    },
    activeLabel: {
        color: colors.ink,
        fontWeight: "600",
    },
});
