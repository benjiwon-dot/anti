import { Timestamp } from 'firebase/firestore';

export interface OrderItem {
    // Local / Legacy compat
    previewUri: string;         // local path or cached uri
    printUri?: string;          // high-res local path for background upload
    src?: string;               // legacy/fallback src

    // Web compat (Firestore fields)
    previewUrl?: string;        // downloadURL (filled after upload)
    printUrl?: string;          // downloadURL (filled after upload)

    quantity: number;
    filterId: string;
    filterParams?: {
        matrix: number[];
        overlayColor?: string;
        overlayOpacity?: number;
    } | null;
    cropPx: {
        x: number;
        y: number;
        width: number;
        height: number;
        scale: number;
    } | null;
    unitPrice: number;
    lineTotal: number;
    size: "20x20";
}

export interface OrderDoc {
    id?: string;
    uid: string;
    orderCode: string; // 7-char code (e.g. ABC1234)
    itemsCount: number;
    createdAt: any; // Timestamp | Date | number | string
    updatedAt: any;
    status: "paid" | "processing" | "printed" | "shipping" | "delivered" | "failed" | "refunded";
    currency: string;
    subtotal: number;
    discount: number;
    shippingFee: number;
    total: number;
    promoCode?: string;

    customer: {
        email: string;
        fullName: string;
        phone: string;
    };

    shipping: {
        fullName: string;
        address1: string;
        address2?: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
        phone: string;
        email: string;
    };

    items: OrderItem[];

    payment: {
        provider: string;
        transactionId?: string;
        method?: string;
        brand?: string;
        last4?: string;
        paidAt?: Timestamp | any;
    };

    promo?: {
        code: string;
        type: string;
        value: number;
    } | null;
    paymentMethod: string; // "CARD" etc
    locale: string;
}
