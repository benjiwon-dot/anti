import {
  ColorMatrix,
  IDENTITY,
  brightnessMatrix,
  contrastMatrix,
  grayscaleMatrix,
  hueRotateMatrix,
  multiplyMatrix,
  saturateMatrix,
  sepiaMatrix,
} from "../../utils/colorMatrix";

export type FilterType = {
  id: string;
  name: string;
  matrix: ColorMatrix;
  overlayColor?: string;
  overlayOpacity?: number;
};

// Helpers to compose matrices easily
const combine = (...matrices: ColorMatrix[]) => {
  // Apply in order: first argument applied LAST (standard matrix mult order A*B means B applied then A)
  // But multiplyMatrix(A, B) in utils might be A*B.
  // Let's check utils: "multiplyMatrix(A, B): A ∘ B (apply B first, then A)"
  // So combine(A, B, C) -> A(B(C))
  return matrices.reduce((acc, m) => multiplyMatrix(acc, m), IDENTITY);
};

// Pre-defined matrices
const warmM = combine(sepiaMatrix(0.3), brightnessMatrix(1.05));
const coolM = hueRotateMatrix(180); // Just a guess, let's use proper tint if possible. Hue rotate 180 is huge.
// Better Cool: Blue tint. We don't have tintMatrix, but we can fake it or use internal knowledge.
// Actually, simple way for "Cool" is slightly reduce Red, increase Blue.
// But we only have primitives. Let's use hueRotate(10) or similar, or just keeping it simple.
// user requested "ColorMatrix(matrix) 반영".
// Let's stick to standard ops available.
const coolSafeM = hueRotateMatrix(-20);

const vividM = saturateMatrix(1.5);
const bwM = grayscaleMatrix(1.0);
const softM = combine(contrastMatrix(0.9), brightnessMatrix(1.05));
const contrastM = contrastMatrix(1.3);
const fadeM = combine(contrastMatrix(0.8), brightnessMatrix(1.1));
const filmM = combine(sepiaMatrix(0.2), contrastMatrix(1.1));
const brightM = brightnessMatrix(1.2);
const monoM = combine(grayscaleMatrix(1.0), contrastMatrix(1.2));
const noirM = combine(grayscaleMatrix(1.0), contrastMatrix(1.5), brightnessMatrix(0.8));
const dramaticM = combine(contrastMatrix(1.4), saturateMatrix(1.2));
const sepiaM = sepiaMatrix(1.0);
const vintageM = combine(sepiaMatrix(0.6), contrastMatrix(1.1));
const matteM = combine(contrastMatrix(0.9), brightnessMatrix(1.1), saturateMatrix(0.8));
const goldenM = combine(sepiaMatrix(0.4), saturateMatrix(1.4));
const tealOrangeM = combine(hueRotateMatrix(15), contrastMatrix(1.2)); // Approximation
const crispM = combine(contrastMatrix(1.3), saturateMatrix(1.1));
const pastelM = combine(contrastMatrix(0.8), saturateMatrix(1.2), brightnessMatrix(1.1));
const cleanM = combine(brightnessMatrix(1.05), contrastMatrix(1.05));
const pinkM = combine(hueRotateMatrix(30), brightnessMatrix(1.05)); // tinted
const nightM = combine(brightnessMatrix(0.7), contrastMatrix(1.1), hueRotateMatrix(-10));
const sharpenM = contrastMatrix(1.4); // Fake sharpen

export const FILTERS: FilterType[] = [
  { id: 'original', name: 'Original', matrix: IDENTITY },
  { id: 'warm', name: 'Warm', matrix: warmM, overlayColor: '#f5deb3', overlayOpacity: 0.2 },
  { id: 'cool', name: 'Cool', matrix: coolSafeM, overlayColor: '#e0ffff', overlayOpacity: 0.2 },
  { id: 'vivid', name: 'Vivid', matrix: vividM, overlayColor: 'transparent' },
  { id: 'bw', name: 'B&W', matrix: bwM, overlayColor: '#333', overlayOpacity: 0.1 },
  { id: 'soft', name: 'Soft', matrix: softM, overlayColor: '#fff', overlayOpacity: 0.1 },
  { id: 'contrast', name: 'Contrast', matrix: contrastM, overlayColor: 'transparent' },
  { id: 'fade', name: 'Fade', matrix: fadeM, overlayColor: 'rgba(255,255,255,0.3)' },
  { id: 'film', name: 'Film', matrix: filmM, overlayColor: '#f0e68c', overlayOpacity: 0.15 },
  { id: 'bright', name: 'Bright', matrix: brightM, overlayColor: 'rgba(255,255,255,0.1)' },
  { id: 'mono', name: 'Mono', matrix: monoM, overlayColor: '#000', overlayOpacity: 0.3 },
  { id: 'noir', name: 'Noir', matrix: noirM, overlayColor: '#000', overlayOpacity: 0.4 },
  { id: 'dramatic', name: 'Dramatic', matrix: dramaticM, overlayColor: '#800000', overlayOpacity: 0.1 },
  { id: 'sepia', name: 'Sepia', matrix: sepiaM, overlayColor: '#704214', overlayOpacity: 0.3 },
  { id: 'vintage', name: 'Vintage', matrix: vintageM, overlayColor: '#DEB887', overlayOpacity: 0.3 },
  { id: 'matte', name: 'Matte', matrix: matteM, overlayColor: 'rgba(255,255,255,0.15)' },
  { id: 'golden', name: 'Golden', matrix: goldenM, overlayColor: '#FFD700', overlayOpacity: 0.2 },
  { id: 'tealorange', name: 'TealOrange', matrix: tealOrangeM, overlayColor: '#008080', overlayOpacity: 0.2 },
  { id: 'crisp', name: 'Crisp', matrix: crispM, overlayColor: 'transparent' },
  { id: 'pastel', name: 'Pastel', matrix: pastelM, overlayColor: '#FFE4E1', overlayOpacity: 0.2 },
  { id: 'clean', name: 'Clean', matrix: cleanM, overlayColor: 'rgba(255,255,255,0.05)' },
  { id: 'pink', name: 'Pink', matrix: pinkM, overlayColor: '#FFC0CB', overlayOpacity: 0.2 },
  { id: 'night', name: 'Night', matrix: nightM, overlayColor: '#191970', overlayOpacity: 0.3 },
  { id: 'sharpen', name: 'Sharpen', matrix: sharpenM, overlayColor: 'transparent' },
];

