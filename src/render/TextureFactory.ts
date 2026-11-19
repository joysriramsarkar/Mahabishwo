/**
 * Procedural Texture Factory
 * Generates high-resolution, physically-plausible textures for planets,
 * rings, stars and dust using fast seeded value noise + fBm.
 * No external image assets required.
 */
import * as THREE from 'three';
import { createFbm2D, mulberry32, clamp, smoothstep, lerp, seedFromString } from '../utils/math';

export interface SurfaceSpec {
  kind: 'earth' | 'rocky' | 'gas' | 'ice';
  base: string;
  secondary: string;
  accent: string;
  deep?: string;
  shallow?: string;
  noiseScale: number;
  threshold: number;
  warp: number;
  craters: number;
  bands: number;
  caps: number;
  clouds: number;
  roughness: number;
  metalness: number;
  water: boolean;
  nightLights: boolean;
  bumpStrength: number;
  seed: number;
  palette?: string[];
}

export interface PlanetTextureSet {
  map: THREE.CanvasTexture;
  bumpMap?: THREE.CanvasTexture;
  roughnessMap?: THREE.CanvasTexture;
  nightMap?: THREE.CanvasTexture;
  cloudMap?: THREE.CanvasTexture;
}

// ------------------------------------------------------------------
// Surface library — keyed by PlanetData.textureType
// ------------------------------------------------------------------
export const SURFACE_LIBRARY: Record<string, SurfaceSpec> = {
  earth: {
    kind: 'earth', base: '#2f6b3f', secondary: '#8a6b3f', accent: '#6b7280',
    deep: '#041d33', shallow: '#0e5f8a',
    noiseScale: 3.1, threshold: 0.52, warp: 1.7, craters: 0, bands: 0,
    caps: 0.9, clouds: 1, roughness: 0.6, metalness: 0.02, water: true,
    nightLights: true, bumpStrength: 0.55, seed: 1337,
  },
  mercury: {
    kind: 'rocky', base: '#6b6560', secondary: '#8a837c', accent: '#3f3b37',
    noiseScale: 6.5, threshold: 0.5, warp: 0.9, craters: 0.85, bands: 0,
    caps: 0, clouds: 0, roughness: 0.95, metalness: 0.02, water: false,
    nightLights: false, bumpStrength: 1, seed: 21,
  },
  moon: {
    kind: 'rocky', base: '#8a8d91', secondary: '#a8adb3', accent: '#5b6066',
    noiseScale: 5.5, threshold: 0.5, warp: 0.8, craters: 1, bands: 0,
    caps: 0, clouds: 0, roughness: 0.92, metalness: 0.02, water: false,
    nightLights: false, bumpStrength: 1, seed: 22,
  },
  mars: {
    kind: 'rocky', base: '#a84a1f', secondary: '#d97706', accent: '#5b2a12',
    noiseScale: 4.2, threshold: 0.5, warp: 1.1, craters: 0.35, bands: 0,
    caps: 0.75, clouds: 0.12, roughness: 0.9, metalness: 0.02, water: false,
    nightLights: false, bumpStrength: 0.8, seed: 31,
  },
  venus: {
    kind: 'gas', base: '#d97706', secondary: '#fde68a', accent: '#b45309',
    noiseScale: 2.4, threshold: 0.5, warp: 1.6, craters: 0, bands: 0.7,
    caps: 0, clouds: 1, roughness: 0.72, metalness: 0.02, water: false,
    nightLights: false, bumpStrength: 0.25, seed: 41,
  },
  jupiter: {
    kind: 'gas', base: '#d8c3a5', secondary: '#b45309', accent: '#7c3f10',
    noiseScale: 3.4, threshold: 0.5, warp: 1.2, craters: 0, bands: 1,
    caps: 0, clouds: 0, roughness: 0.66, metalness: 0.02, water: false,
    nightLights: false, bumpStrength: 0.35, seed: 51,
    palette: ['#d8c3a5', '#b45309', '#e8dcc8', '#7c3f10', '#f3e6cf', '#9a4a18', '#d8c3a5', '#8a4514'],
  },
  saturn: {
    kind: 'gas', base: '#e6d9b8', secondary: '#d4b46a', accent: '#b99a4e',
    noiseScale: 2.8, threshold: 0.5, warp: 1.1, craters: 0, bands: 0.85,
    caps: 0, clouds: 0, roughness: 0.68, metalness: 0.02, water: false,
    nightLights: false, bumpStrength: 0.3, seed: 52,
    palette: ['#e6d9b8', '#d4b46a', '#f5ecc8', '#c9a24a', '#efe3bd', '#b99a4e'],
  },
  uranus: {
    kind: 'ice', base: '#67e8f9', secondary: '#a5f3fc', accent: '#22d3ee',
    noiseScale: 2.2, threshold: 0.5, warp: 1.0, craters: 0, bands: 0.3,
    caps: 0, clouds: 0.15, roughness: 0.5, metalness: 0.02, water: false,
    nightLights: false, bumpStrength: 0.15, seed: 61,
  },
  neptune: {
    kind: 'ice', base: '#1d4ed8', secondary: '#3b82f6', accent: '#172554',
    noiseScale: 2.6, threshold: 0.5, warp: 1.1, craters: 0, bands: 0.5,
    caps: 0, clouds: 0.25, roughness: 0.5, metalness: 0.02, water: false,
    nightLights: false, bumpStrength: 0.2, seed: 62,
  },
  proxima_b: {
    kind: 'earth', base: '#7c2d12', secondary: '#b45309', accent: '#1e3a5f',
    deep: '#152238', shallow: '#2b4a6b',
    noiseScale: 3.6, threshold: 0.5, warp: 1.5, craters: 0.2, bands: 0,
    caps: 0.45, clouds: 0.55, roughness: 0.78, metalness: 0.02, water: true,
    nightLights: false, bumpStrength: 0.7, seed: 71,
  },
  trappist_e: {
    kind: 'earth', base: '#1f512e', secondary: '#8a6b3f', accent: '#3f6212',
    deep: '#06263f', shallow: '#0e5f8a',
    noiseScale: 3.4, threshold: 0.55, warp: 1.6, craters: 0.1, bands: 0,
    caps: 0.85, clouds: 0.8, roughness: 0.55, metalness: 0.02, water: true,
    nightLights: false, bumpStrength: 0.6, seed: 72,
  },
  kepler_186f: {
    kind: 'earth', base: '#9f3a38', secondary: '#b4532a', accent: '#2b4a6b',
    deep: '#0a2f4a', shallow: '#155e75',
    noiseScale: 3.2, threshold: 0.52, warp: 1.5, craters: 0.15, bands: 0,
    caps: 0.7, clouds: 0.7, roughness: 0.7, metalness: 0.02, water: true,
    nightLights: false, bumpStrength: 0.6, seed: 73,
  },
  t1_b: {
    kind: 'rocky', base: '#c2410c', secondary: '#f97316', accent: '#7c2d12',
    noiseScale: 4.5, threshold: 0.5, warp: 1.0, craters: 0.5, bands: 0,
    caps: 0.3, clouds: 0.1, roughness: 0.9, metalness: 0.02, water: false,
    nightLights: false, bumpStrength: 0.85, seed: 74,
  },
  t1_f: {
    kind: 'ice', base: '#67e8f9', secondary: '#a5f3fc', accent: '#0e7490',
    noiseScale: 2.4, threshold: 0.5, warp: 1.0, craters: 0, bands: 0.35,
    caps: 0.2, clouds: 0.5, roughness: 0.55, metalness: 0.02, water: false,
    nightLights: false, bumpStrength: 0.2, seed: 75,
  },
  proxima_d: {
    kind: 'rocky', base: '#d97757', secondary: '#f4a261', accent: '#8c4a32',
    noiseScale: 5.0, threshold: 0.5, warp: 0.9, craters: 0.65, bands: 0,
    caps: 0, clouds: 0, roughness: 0.92, metalness: 0.02, water: false,
    nightLights: false, bumpStrength: 1, seed: 76,
  },
};

// ------------------------------------------------------------------
// Color helpers
// ------------------------------------------------------------------
type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function rgbCss(c: RGB): string {
  return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
}

// ------------------------------------------------------------------
// Factory
// ------------------------------------------------------------------
export class TextureFactory {
  private static planetCache: Map<string, PlanetTextureSet> = new Map();
  private static simpleCache: Map<string, THREE.CanvasTexture> = new Map();

  public static getPlanetTextures(type: string, width = 1024, height = 512): PlanetTextureSet {
    const key = `${type}_${width}x${height}`;
    const cached = this.planetCache.get(key);
    if (cached) return cached;

    const spec = SURFACE_LIBRARY[type] || SURFACE_LIBRARY.mercury;
    const set = this.generatePlanet(spec, type, width, height);
    this.planetCache.set(key, set);
    return set;
  }

  private static generatePlanet(spec: SurfaceSpec, type: string, w: number, h: number): PlanetTextureSet {
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = w;
    colorCanvas.height = h;
    const cctx = colorCanvas.getContext('2d')!;
    const img = cctx.createImageData(w, h);
    const data = img.data;

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = w;
    bumpCanvas.height = h;
    const bctx = bumpCanvas.getContext('2d')!;
    const bimg = bctx.createImageData(w, h);
    const bdata = bimg.data;

    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = w;
    roughCanvas.height = h;
    const rctx = roughCanvas.getContext('2d')!;
    const rimg = rctx.createImageData(w, h);
    const rdata = rimg.data;

    const nightCanvas = spec.nightLights ? document.createElement('canvas') : null;
    if (nightCanvas) {
      nightCanvas.width = w;
      nightCanvas.height = h;
    }

    const cloudCanvas = spec.clouds > 0.01 ? document.createElement('canvas') : null;
    if (cloudCanvas) {
      cloudCanvas.width = w;
      cloudCanvas.height = h;
    }

    const base = hexToRgb(spec.base);
    const secondary = hexToRgb(spec.secondary);
    const accent = hexToRgb(spec.accent);
    const deep = hexToRgb(spec.deep || '#041d33');
    const shallow = hexToRgb(spec.shallow || spec.base);
    const ice = hexToRgb('#eef6fb');
    const snow = hexToRgb('#dfe7ee');

    const fbmA = createFbm2D(spec.seed, 6, 2.0, 0.5);
    const fbmB = createFbm2D(spec.seed + 101, 5, 2.1, 0.52);
    const fbmC = createFbm2D(spec.seed + 202, 4, 2.2, 0.5);
    const fbmD = createFbm2D(spec.seed + 303, 3, 2.0, 0.5);

    const landMask = new Uint8Array(w * h);
    const palette = spec.palette ? spec.palette.map(hexToRgb) : null;

    const scale = spec.noiseScale;
    const aspect = w / h;

    for (let y = 0; y < h; y++) {
      const v = y / h;
      const lat = (0.5 - v) * 2; // +1 north pole, -1 south pole
      const absLat = Math.abs(lat);

      for (let x = 0; x < w; x++) {
        const u = x / w;
        const idx = (y * w + x) * 4;

        // Domain-warped elevation
        const wx = u * scale * aspect + fbmC(u * scale * 0.6 * aspect, v * scale * 0.6) * spec.warp;
        const wy = v * scale + fbmC(u * scale * 0.6 * aspect + 31.7, v * scale * 0.6 + 11.3) * spec.warp;
        const elev = fbmA(wx, wy);
        const detail = fbmB(u * scale * 2.4 * aspect, v * scale * 2.4);
        const micro = fbmD(u * scale * 6 * aspect, v * scale * 6);

        let col: RGB;
        let bumpVal: number;
        let roughVal: number;

        if (spec.kind === 'gas' || spec.kind === 'ice') {
          // Horizontal banding with turbulence
          const turbulence = (fbmB(u * scale * 1.6 * aspect, v * scale * 1.6) - 0.5) * spec.bands * 0.9;
          const bandPos = (lat * 0.5 + 0.5) * (palette ? palette.length : 1) + turbulence * 2.0;
          if (palette) {
            const i0 = ((Math.floor(bandPos) % palette.length) + palette.length) % palette.length;
            const i1 = (i0 + 1) % palette.length;
            const ft = bandPos - Math.floor(bandPos);
            col = mixRgb(palette[i0], palette[i1], smoothstep(0.2, 0.8, ft));
          } else {
            col = mixRgb(base, secondary, smoothstep(0.2, 0.8, ((bandPos % 1) + 1) % 1));
          }
          // Storm spots / streaks
          const streak = smoothstep(0.62, 0.95, fbmC(u * scale * 3 * aspect, v * scale * 3));
          col = mixRgb(col, accent, streak * 0.35 * spec.bands);
          const bright = smoothstep(0.55, 0.9, detail) * 0.18;
          col = mixRgb(col, [255, 255, 255], bright);
          bumpVal = 0.5 + (detail - 0.5) * spec.bumpStrength;
          roughVal = spec.roughness;
        } else {
          const land = elev > spec.threshold;
          landMask[y * w + x] = land ? 1 : 0;

          if (spec.water && !land) {
            // Ocean depth gradient
            const depth = smoothstep(spec.threshold - 0.22, spec.threshold, elev);
            col = mixRgb(deep, shallow, depth);
            // Subtle wave detail
            const wave = (micro - 0.5) * 0.05;
            col = [col[0] + wave * 255, col[1] + wave * 255, col[2] + wave * 255];
            bumpVal = 0.18 + depth * 0.12;
            roughVal = 0.12 + depth * 0.1; // ocean is smooth
          } else {
            // Land: elevation-based color ramp
            const e = smoothstep(spec.threshold, spec.threshold + 0.28, elev);
            col = mixRgb(base, secondary, clamp(detail * 1.2, 0, 1));
            col = mixRgb(col, accent, smoothstep(0.6, 0.95, e));
            // Latitude climate: dry equator, cold poles
            const dry = smoothstep(0.55, 0.1, absLat) * 0.5;
            col = mixRgb(col, secondary, dry * 0.4);
            const cold = smoothstep(0.62, 0.92, absLat);
            col = mixRgb(col, snow, cold * 0.85);
            // Rocky detail
            const rock = (micro - 0.5) * 0.16;
            col = [col[0] + rock * 255, col[1] + rock * 255, col[2] + rock * 255];
            bumpVal = 0.35 + e * 0.55 + (detail - 0.5) * 0.2;
            roughVal = clamp(spec.roughness + (detail - 0.5) * 0.2, 0.3, 1);
          }
        }

        // Polar caps
        if (spec.caps > 0) {
          const capEdge = 0.8 - spec.caps * 0.22 + (fbmC(u * 8 * aspect, v * 8) - 0.5) * 0.16;
          if (absLat > capEdge) {
            const capT = smoothstep(capEdge, capEdge + 0.12, absLat);
            col = mixRgb(col, ice, capT);
            if (bumpVal !== undefined) bumpVal = lerp(bumpVal, 0.75, capT);
            if (roughVal !== undefined) roughVal = lerp(roughVal, 0.35, capT);
          }
        }

        data[idx] = clamp(col[0], 0, 255);
        data[idx + 1] = clamp(col[1], 0, 255);
        data[idx + 2] = clamp(col[2], 0, 255);
        data[idx + 3] = 255;

        const b = clamp(bumpVal * 255 * spec.bumpStrength + 128 * (1 - spec.bumpStrength), 0, 255);
        bdata[idx] = b;
        bdata[idx + 1] = b;
        bdata[idx + 2] = b;
        bdata[idx + 3] = 255;

        const r = clamp(roughVal * 255, 0, 255);
        rdata[idx] = r;
        rdata[idx + 1] = r;
        rdata[idx + 2] = r;
        rdata[idx + 3] = 255;
      }
    }

    cctx.putImageData(img, 0, 0);
    bctx.putImageData(bimg, 0, 0);
    rctx.putImageData(rimg, 0, 0);

    // --- Craters (rocky bodies) ---
    if (spec.craters > 0.01 && spec.kind === 'rocky') {
      this.drawCraters(cctx, bctx, w, h, spec.craters, spec.seed);
    }

    // --- Jupiter Great Red Spot ---
    if (type === 'jupiter') {
      this.drawGreatRedSpot(cctx, w, h);
    }

    // --- Night lights ---
    let nightTex: THREE.CanvasTexture | undefined;
    if (nightCanvas) {
      const nctx = nightCanvas.getContext('2d')!;
      nctx.fillStyle = '#000000';
      nctx.fillRect(0, 0, w, h);
      this.drawCityLights(nctx, landMask, w, h, spec.seed);
      nightTex = this.toTexture(nightCanvas, true);
    }

    // --- Clouds ---
    let cloudTex: THREE.CanvasTexture | undefined;
    if (cloudCanvas) {
      const clctx = cloudCanvas.getContext('2d')!;
      const cimg = clctx.createImageData(w, h);
      const cdata = cimg.data;
      const cfbm = createFbm2D(spec.seed + 555, 6, 2.1, 0.5);
      const cfbm2 = createFbm2D(spec.seed + 777, 4, 2.2, 0.5);
      for (let y = 0; y < h; y++) {
        const v = y / h;
        for (let x = 0; x < w; x++) {
          const u = x / w;
          const idx = (y * w + x) * 4;
          const n = cfbm(u * 5 * aspect + cfbm2(u * 3 * aspect, v * 3) * 1.2, v * 5);
          const n2 = cfbm2(u * 11 * aspect, v * 11);
          const coverage = smoothstep(0.52, 0.78, n * 0.75 + n2 * 0.25) * spec.clouds;
          const a = clamp(coverage, 0, 1);
          cdata[idx] = 255;
          cdata[idx + 1] = 255;
          cdata[idx + 2] = 255;
          cdata[idx + 3] = a * 255;
        }
      }
      clctx.putImageData(cimg, 0, 0);
      cloudTex = this.toTexture(cloudCanvas, true);
    }

    const map = this.toTexture(colorCanvas, true);
    const bumpMap = this.toTexture(bumpCanvas, false);
    const roughnessMap = this.toTexture(roughCanvas, false);

    return { map, bumpMap, roughnessMap, nightMap: nightTex, cloudMap: cloudTex };
  }

  private static drawCraters(
    ctx: CanvasRenderingContext2D,
    bctx: CanvasRenderingContext2D,
    w: number, h: number,
    amount: number, seed: number
  ): void {
    const rand = mulberry32(seed + 909);
    const count = Math.floor(140 * amount);
    for (let i = 0; i < count; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = (1.5 + rand() * rand() * 16) * (w / 1024);

      // Color: dark bowl + bright rim
      ctx.fillStyle = `rgba(20,18,16,${0.25 + rand() * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,250,240,${0.25 + rand() * 0.3})`;
      ctx.lineWidth = Math.max(0.6, r * 0.14);
      ctx.beginPath();
      ctx.arc(x - r * 0.12, y - r * 0.12, r * 0.92, 0, Math.PI * 2);
      ctx.stroke();

      // Bump: raised rim, sunken center
      const g = bctx.createRadialGradient(x, y, r * 0.1, x, y, r);
      g.addColorStop(0, 'rgb(40,40,40)');
      g.addColorStop(0.75, 'rgb(150,150,150)');
      g.addColorStop(1, 'rgb(128,128,128)');
      bctx.fillStyle = g;
      bctx.beginPath();
      bctx.arc(x, y, r, 0, Math.PI * 2);
      bctx.fill();
    }
  }

  private static drawGreatRedSpot(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const x = w * 0.63;
    const y = h * 0.66;
    const rx = w * 0.045;
    const ry = h * 0.075;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(153,27,27,0.9)';
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(254,215,170,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(220,38,38,0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.6, ry * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private static drawCityLights(
    ctx: CanvasRenderingContext2D,
    landMask: Uint8Array,
    w: number, h: number,
    seed: number
  ): void {
    const rand = mulberry32(seed + 4242);
    const clusters = 26;
    for (let c = 0; c < clusters; c++) {
      const cx = rand() * w;
      const cy = h * (0.18 + rand() * 0.64);
      const spread = w * (0.02 + rand() * 0.05);
      const count = 90 + Math.floor(rand() * 220);
      for (let i = 0; i < count; i++) {
        const px = cx + (rand() + rand() - 1) * spread;
        const py = cy + (rand() + rand() - 1) * spread * 0.6;
        const ix = ((px % w) + w) % w;
        const iy = clamp(Math.floor(py), 0, h - 1);
        if (!landMask[iy * w + Math.floor(ix)]) continue;
        const r = 0.5 + rand() * 1.4;
        ctx.fillStyle = rand() > 0.3 ? 'rgba(253,224,71,0.9)' : 'rgba(251,146,60,0.8)';
        ctx.beginPath();
        ctx.arc(ix, iy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private static toTexture(canvas: HTMLCanvasElement, srgb: boolean): THREE.CanvasTexture {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }

  // ------------------------------------------------------------------
  // Ring texture (radial bands + Cassini division)
  // ------------------------------------------------------------------
  public static getRingTexture(seed = 7, width = 512, height = 16): THREE.CanvasTexture {
    const key = `ring_${seed}_${width}x${height}`;
    const cached = this.simpleCache.get(key);
    if (cached) return cached;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(width, height);
    const data = img.data;

    const fbm = createFbm2D(seed, 4, 2.1, 0.5);
    const cA = hexToRgb('#8a6b3f');
    const cB = hexToRgb('#e8d9a8');
    const cC = hexToRgb('#b99a4e');

    for (let x = 0; x < width; x++) {
      const t = x / width;
      // Radial band profile
      const bands =
        0.5 +
        0.5 * Math.sin(t * 46 + fbm(t * 20, 0.5) * 6) *
        Math.sin(t * 13 + 1.7);
      let alpha = 0.25 + bands * 0.6;

      // Cassini-like division
      const div = smoothstep(0.56, 0.6, t) * smoothstep(0.68, 0.64, t);
      alpha *= 1 - div * 0.92;
      // Inner & outer fade
      alpha *= smoothstep(0.0, 0.08, t) * smoothstep(1.0, 0.9, t);

      const col = mixRgb(mixRgb(cA, cB, bands), cC, fbm(t * 30, 3.3) * 0.5);
      for (let y = 0; y < height; y++) {
        const idx = (y * width + x) * 4;
        data[idx] = col[0];
        data[idx + 1] = col[1];
        data[idx + 2] = col[2];
        data[idx + 3] = clamp(alpha, 0, 1) * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = this.toTexture(canvas, true);
    this.simpleCache.set(key, tex);
    return tex;
  }

  // ------------------------------------------------------------------
  // Simple sprites
  // ------------------------------------------------------------------
  public static getGlowTexture(inner: string, mid: string, outer: string): THREE.CanvasTexture {
    const key = `glow_${inner}_${mid}_${outer}`;
    const cached = this.simpleCache.get(key);
    if (cached) return cached;
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, inner);
    g.addColorStop(0.28, mid);
    g.addColorStop(0.68, outer);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    this.simpleCache.set(key, tex);
    return tex;
  }

  public static getStarSprite(): THREE.CanvasTexture {
    const key = 'star_sprite';
    const cached = this.simpleCache.get(key);
    if (cached) return cached;
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.4, 'rgba(190,215,255,0.32)');
    g.addColorStop(0.7, 'rgba(120,160,255,0.08)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    this.simpleCache.set(key, tex);
    return tex;
  }

  public static getDustTexture(seed = 5, size = 256): THREE.CanvasTexture {
    const key = `dust_${seed}_${size}`;
    const cached = this.simpleCache.get(key);
    if (cached) return cached;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(size, size);
    const data = img.data;
    const fbm = createFbm2D(seed, 5, 2.1, 0.5);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const n = fbm(x / size * 4, y / size * 4);
        const a = smoothstep(0.45, 0.85, n);
        data[idx] = 12;
        data[idx + 1] = 10;
        data[idx + 2] = 14;
        data[idx + 3] = a * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    this.simpleCache.set(key, tex);
    return tex;
  }

  public static getSeedForType(type: string): number {
    return seedFromString(type);
  }
}
