import { colors } from "./colors";

/**
 * Design Tokens for Memotile
 * Derived from existing UI patterns in Editor and Checkout screens.
 */
export const tokens = {
    colors: {
        ...colors,
        // Semantic aliases
        primaryButton: colors.ink,
        primaryButtonText: colors.surface,
        secondaryButton: colors.surface,
        secondaryButtonText: colors.text,
        inputBackground: '#F9FAFB',
        inputBorder: '#DDDDDD',
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        buttonPadding: 16,
    },
    radius: {
        none: 0,
        sm: 4,
        md: 8,
        lg: 12,
        xl: 20,
        full: 9999,
        button: 28, // Matches Checkout "Next" button
    },
    typography: {
        fontFamily: {
            // Defaulting to system fonts as per current app usage
            sans: 'System',
        },
        size: {
            xs: 12,
            sm: 13, // textSecondary/muted font size
            base: 15, // Standard body size
            md: 16, // Header/Title size
            lg: 18, // Total price size
            xl: 22, // Splash/Brand size
        },
        weight: {
            normal: '400',
            medium: '500',
            semibold: '600',
            bold: '700',
        },
        letterSpacing: {
            brand: 2.6, // Matches Splash letter spacing
        }
    },
    shadows: {
        sm: {
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 8,
            elevation: 2,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.08,
            shadowRadius: 30,
            elevation: 10,
        }
    }
};
