export const clamp = (v: number, min: number, max: number) => {
    "worklet";
    return Math.min(max, Math.max(min, v));
};
