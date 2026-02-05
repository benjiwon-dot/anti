export const formatYYYYMMDD = (d = new Date()) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}${mm}${dd}`;
};

export const buildOrderStorageBasePath = (orderCode: string, createdAt?: Date) => {
    const dateKey = formatYYYYMMDD(createdAt ?? new Date());
    return `orders/${dateKey}/${orderCode}`;
};

export const buildItemPreviewPath = (basePath: string, index: number) =>
    `${basePath}/items/${index}_preview.jpg`;

export const buildItemPrintPath = (basePath: string, index: number) =>
    `${basePath}/items/${index}_print.jpg`;
