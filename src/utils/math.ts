/**
 * Math utilities & procedural generation helpers for the universe simulation.
 */

// Deterministic PRNG (Mulberry32)
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Gaussian random using Box-Muller transform
export function gaussianRandom(rand: () => number): number {
  const u1 = Math.max(1e-6, rand());
  const u2 = rand();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

// 2D value noise
export function valueNoise2D(x: number, y: number, seed: number = 0): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const hash = (a: number, b: number) => {
    let h = (a * 374761393 + b * 668265263 + seed * 2246822519) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = h ^ (h >>> 16);
    return (h & 0x7fffffff) / 0x7fffffff;
  };

  const n00 = hash(ix, iy);
  const n10 = hash(ix + 1, iy);
  const n01 = hash(ix, iy + 1);
  const n11 = hash(ix + 1, iy + 1);

  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return nx0 + (nx1 - nx0) * sy;
}

// Fractal Brownian Motion (fBm)
export function fbm(x: number, y: number, octaves: number = 4, lacunarity: number = 2.0, gain: number = 0.5, seed: number = 0): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let totalAmplitude = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * valueNoise2D(x * frequency, y * frequency, seed + i * 1337);
    totalAmplitude += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return value / totalAmplitude;
}

// Domain-warped fBm — produces organic, continent-like patterns
export function warpedFbm(x: number, y: number, octaves: number, seed: number, warp: number = 1.4): number {
  const qx = fbm(x + 11.3, y + 7.7, 3, 2.0, 0.5, seed + 31);
  const qy = fbm(x - 5.1, y + 3.9, 3, 2.0, 0.5, seed + 77);
  return fbm(x + warp * qx, y + warp * qy, octaves, 2.0, 0.5, seed);
}

// Fast seeded 2D value noise backed by a 256x256 lookup grid.
// Much faster than valueNoise2D for per-pixel texture generation.
export function createNoise2D(seed: number): (x: number, y: number) => number {
  const rand = mulberry32(seed);
  const size = 256;
  const mask = size - 1;
  const grid = new Float32Array(size * size);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();
  const at = (x: number, y: number) => grid[(y & mask) * size + (x & mask)];
  return (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const n00 = at(ix, iy);
    const n10 = at(ix + 1, iy);
    const n01 = at(ix, iy + 1);
    const n11 = at(ix + 1, iy + 1);
    return n00 + (n10 - n00) * sx + (n01 - n00) * sy + (n00 - n10 - n01 + n11) * sx * sy;
  };
}

export function createFbm2D(seed: number, octaves: number = 5, lacunarity: number = 2.0, gain: number = 0.5): (x: number, y: number) => number {
  const noise = createNoise2D(seed);
  return (x: number, y: number) => {
    let v = 0;
    let a = 1;
    let f = 1;
    let total = 0;
    for (let i = 0; i < octaves; i++) {
      v += a * noise(x * f, y * f);
      total += a;
      a *= gain;
      f *= lacunarity;
    }
    return v / total;
  };
}

// Clamp
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Lerp
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Smooth step
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Map value from one range to another
export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

// Exponential damping
export function damp(current: number, target: number, speed: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-speed * dt));
}

// Spherical to Cartesian
export function sphericalToCartesian(theta: number, phi: number, radius: number): [number, number, number] {
  const sinPhi = Math.sin(phi);
  return [
    radius * sinPhi * Math.sin(theta),
    radius * Math.cos(phi),
    radius * sinPhi * Math.cos(theta),
  ];
}

// Golden angle distribution on a sphere (Fibonacci sphere)
export function fibonacciSphere(index: number, total: number): [number, number, number] {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const y = total <= 1 ? 0 : 1 - (2 * index) / (total - 1);
  const radius = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = goldenAngle * index;
  return [Math.cos(theta) * radius, y, Math.sin(theta) * radius];
}

// Seed a string to a number
export function seedFromString(str: string): number {
  return str.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 17);
}

// Bengali digit conversion
const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export function toBn(val: string | number): string {
  return String(val).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

// Format large numbers
export function formatLargeNumber(n: number, locale: string = 'en-IN'): string {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + ' trillion';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + ' billion';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' million';
  if (n >= 1e3) return n.toLocaleString(locale);
  return String(n);
}

// Random helper bound to a PRNG
export function randRange(rand: () => number, min: number, max: number): number {
  return min + rand() * (max - min);
}

// Easing
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
