import { Platform } from "react-native";

export const shadows = {
    sm: Platform.select({
        ios: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 6,
        },
        android: { elevation: 3 },
        default: {},
    }),
    md: Platform.select({
        ios: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.14,
            shadowRadius: 10,
        },
        android: { elevation: 6 },
        default: {},
    }),
};
