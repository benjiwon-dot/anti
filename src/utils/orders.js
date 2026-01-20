const ORDERS_KEY = "MEMOTILES_ORDERS_V1";

export const readEditorCartMeta = () => {
    // Fallback chain:
    // 1. sessionStorage "MYTILE_ORDER_ITEMS"
    // 2. localStorage "MEMOTILES_CART_V1" (simplified prefix handling)
    // 3. legacy "memotiles_orders" (read only)

    try {
        let items = sessionStorage.getItem("MYTILE_ORDER_ITEMS");
        if (!items) {
            // For localStorage prefix, search for keys starting with MEMOTILES_CART_V1
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith("MEMOTILES_CART_V1")) {
                    items = localStorage.getItem(key);
                    break;
                }
            }
        }
        if (!items) {
            items = localStorage.getItem("memotiles_orders");
        }
        // Special case for this project's existing Editor behavior if above fails
        if (!items) {
            items = sessionStorage.getItem("cartItems");
        }

        return items ? JSON.parse(items) : [];
    } catch (e) {
        console.error("Failed to read cart meta", e);
        return [];
    }
};

export const getOrders = () => {
    try {
        const data = localStorage.getItem(ORDERS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Failed to load orders", e);
        return [];
    }
};

export const addOrder = (order) => {
    try {
        const orders = getOrders();
        orders.unshift(order);
        localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch (e) {
        console.error("Failed to save order", e);
    }
};

export const clearEditorCartMeta = () => {
    sessionStorage.removeItem("MYTILE_ORDER_ITEMS");
    sessionStorage.removeItem("cartItems"); // project's own key

    // Clear localStorage cart keys
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("MEMOTILES_CART_V1")) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
};

export const getOrderById = (id) => {
    const orders = getOrders();
    return orders.find(o => o.id === id);
};
