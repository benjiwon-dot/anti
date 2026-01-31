/**
 * Safely converts various date-like values into a JavaScript Date object.
 * Supports Firestore Timestamps, ISO strings, epoch numbers (seconds or milliseconds), and Date objects.
 */
export function toDate(value: any): Date | null {
    if (!value) return null;

    // Firestore Timestamp
    if (typeof value.toDate === 'function') {
        return value.toDate();
    }

    // Seconds/Nanoseconds object (sometimes manually constructed)
    if (typeof value.seconds === 'number') {
        return new Date(value.seconds * 1000);
    }

    // JavaScript Date
    if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value;
    }

    // Number (Epoch)
    if (typeof value === 'number') {
        // Basic heuristic: if > 1e11, it's probably milliseconds, otherwise seconds
        const ms = value < 100000000000 ? value * 1000 : value;
        return new Date(ms);
    }

    // String (ISO or similar)
    if (typeof value === 'string') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    }

    return null;
}

/**
 * Formats a Date object into a human-readable string (e.g., "MM/DD/YYYY").
 */
export function formatDate(value: any, fallback: string = '-'): string {
    const date = toDate(value);
    if (!date) return fallback;

    try {
        return date.toLocaleDateString();
    } catch (e) {
        return fallback;
    }
}
