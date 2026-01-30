// src/utils/colorMatrix.ts
// 4x5 color matrix (20 numbers), row-major
export type ColorMatrix = number[]; // length 20

const LUMA_R = 0.2126;
const LUMA_G = 0.7152;
const LUMA_B = 0.0722;

// ✅ 상수/함수 둘 다 제공 (import 꼬여도 런타임 방어)
export const IDENTITY: ColorMatrix = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0,
];

// 기존 코드와의 호환을 위해 유지 (함수 형태)
export const identityMatrix = (): ColorMatrix => ([...IDENTITY]);

// Multiply matrices: A ∘ B (apply B first, then A)
export function multiplyMatrix(A: ColorMatrix, B: ColorMatrix): ColorMatrix {
  // Both are 4x5. Treat as 4x5 affine on RGBA (with implicit 1).
  const out = new Array(20).fill(0);

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += A[row * 5 + k] * B[k * 5 + col];
      }
      if (col === 4) {
        sum += A[row * 5 + 4]; // add A bias
      }
      out[row * 5 + col] = sum;
    }
  }
  return out;
}

// brightness(x): multiply RGB by x
export function brightnessMatrix(x: number): ColorMatrix {
  return [
    x, 0, 0, 0, 0,
    0, x, 0, 0, 0,
    0, 0, x, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

// contrast(c): (RGB - 0.5)*c + 0.5
// ⚠️ 여기의 bias는 “0.5 기준”이므로 CSS 대비와 완벽히 동일은 아니지만,
// 현재 단계에서 web 감성 유지 목적에는 충분히 근접합니다.
export function contrastMatrix(c: number): ColorMatrix {
  const t = 0.5 * (1 - c);
  return [
    c, 0, 0, 0, t,
    0, c, 0, 0, t,
    0, 0, c, 0, t,
    0, 0, 0, 1, 0,
  ];
}

// saturate(s): standard luma-based saturation matrix
export function saturateMatrix(s: number): ColorMatrix {
  const ir = (1 - s) * LUMA_R;
  const ig = (1 - s) * LUMA_G;
  const ib = (1 - s) * LUMA_B;

  return [
    ir + s, ig, ib, 0, 0,
    ir, ig + s, ib, 0, 0,
    ir, ig, ib + s, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

// grayscale(p): p in [0..1], interpolate identity -> grayscale
export function grayscaleMatrix(p: number): ColorMatrix {
  const inv = 1 - p;

  return [
    inv + p * LUMA_R, p * LUMA_G, p * LUMA_B, 0, 0,
    p * LUMA_R, inv + p * LUMA_G, p * LUMA_B, 0, 0,
    p * LUMA_R, p * LUMA_G, inv + p * LUMA_B, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

// sepia(p): p in [0..1], interpolate identity -> sepia
export function sepiaMatrix(p: number): ColorMatrix {
  const inv = 1 - p;
  const S: ColorMatrix = [
    0.393, 0.769, 0.189, 0, 0,
    0.349, 0.686, 0.168, 0, 0,
    0.272, 0.534, 0.131, 0, 0,
    0, 0, 0, 1, 0,
  ];

  const I = IDENTITY; // ✅ 상수 사용 (불필요한 배열 생성 제거)
  const out = new Array(20).fill(0);
  for (let i = 0; i < 20; i++) out[i] = inv * I[i] + p * S[i];
  return out;
}

// hue-rotate(deg): standard SVG/CSS hue rotation matrix
export function hueRotateMatrix(deg: number): ColorMatrix {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const r = LUMA_R;
  const g = LUMA_G;
  const b = LUMA_B;

  return [
    r + cos * (1 - r) + sin * (-r), g + cos * (-g) + sin * (-g), b + cos * (-b) + sin * (1 - b), 0, 0,
    r + cos * (-r) + sin * (0.143), g + cos * (1 - g) + sin * (0.14), b + cos * (-b) + sin * (-0.283), 0, 0,
    r + cos * (-r) + sin * (-(1 - r)), g + cos * (-g) + sin * (g), b + cos * (1 - b) + sin * (b), 0, 0,
    0, 0, 0, 1, 0,
  ];
}

// Parse CSS filter string like: "sepia(0.3) saturate(1.2) hue-rotate(-30deg)"
export function matrixFromCssFilter(filter: string | undefined | null): ColorMatrix {
  if (!filter || filter === "none") return identityMatrix();

  const parts = filter
    .split(")")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s + ")");

  let M = identityMatrix();

  for (const p of parts) {
    const m = p.match(/^([a-z-]+)\((.+)\)$/i);
    if (!m) continue;

    const fn = m[1].toLowerCase();
    const rawArg = m[2].trim();

    let next = identityMatrix();

    if (fn === "brightness") {
      next = brightnessMatrix(parseFloat(rawArg));
    } else if (fn === "contrast") {
      next = contrastMatrix(parseFloat(rawArg));
    } else if (fn === "saturate") {
      next = saturateMatrix(parseFloat(rawArg));
    } else if (fn === "grayscale") {
      if (rawArg.endsWith("%")) next = grayscaleMatrix(parseFloat(rawArg) / 100);
      else next = grayscaleMatrix(parseFloat(rawArg));
    } else if (fn === "sepia") {
      if (rawArg.endsWith("%")) next = sepiaMatrix(parseFloat(rawArg) / 100);
      else next = sepiaMatrix(parseFloat(rawArg));
    } else if (fn === "hue-rotate") {
      const deg = rawArg.endsWith("deg")
        ? parseFloat(rawArg.replace("deg", ""))
        : parseFloat(rawArg);
      next = hueRotateMatrix(deg);
    } else {
      // blur(), etc. 는 여기서 무시 (BlurView로 별도 처리)
      continue;
    }

    // apply in order (CSS order: left->right)
    M = multiplyMatrix(next, M);
  }

  return M;
}
