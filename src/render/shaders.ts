/**
 * GLSL shader library for My Universe.
 * All shaders are written for Three.js ShaderMaterial (WebGL2 / GLSL ES 1.0).
 * HDR output values (>1.0) are intentional — the bloom pass turns them into glow.
 */

// ------------------------------------------------------------------
// Shared noise helpers
// ------------------------------------------------------------------
export const NOISE_GLSL = /* glsl */ `
float hash13(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i + vec3(0.0, 0.0, 0.0)), hash13(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}

float fbm3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise3(p);
    p = p * 2.03 + vec3(11.3, 7.1, 5.7);
    a *= 0.5;
  }
  return v;
}

float fbm3oct(vec3 p, int octaves) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    v += a * noise3(p);
    p = p * 2.03 + vec3(11.3, 7.1, 5.7);
    a *= 0.5;
  }
  return v;
}
`;

// ------------------------------------------------------------------
// Star points — soft HDR sprites with twinkle
// ------------------------------------------------------------------
export const STAR_VERTEX = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
attribute float aSeed;
uniform float uTime;
uniform float uScale;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float tw = 0.72 + 0.28 * sin(uTime * (0.45 + aSeed * 1.9) + aSeed * 41.0);
  vAlpha = tw;
  gl_PointSize = aSize * uScale * (0.85 + 0.3 * tw) / max(0.001, -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

export const STAR_FRAGMENT = /* glsl */ `
precision highp float;
uniform float uBrightness;
uniform float uOpacity;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d = length(uv);
  if (d > 0.5) discard;
  float core = smoothstep(0.5, 0.0, d);
  float halo = pow(core, 3.0);
  float a = pow(core, 1.7);
  vec3 col = vColor * uBrightness * (0.55 + 0.85 * halo) * uOpacity;
  gl_FragColor = vec4(col, a * vAlpha * uOpacity);
}
`;

// ------------------------------------------------------------------
// Star / Sun photosphere — granulation, limb darkening, HDR
// ------------------------------------------------------------------
export const SUN_VERTEX = /* glsl */ `
varying vec3 vObjPos;
varying vec3 vViewNormal;
varying vec3 vViewPos;

void main() {
  vObjPos = normalize(position);
  vViewNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

export const SUN_FRAGMENT = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec3 uHot;
uniform vec3 uMid;
uniform vec3 uCool;
uniform float uScale;
uniform float uHDR;
uniform float uOpacity;
varying vec3 vObjPos;
varying vec3 vViewNormal;
varying vec3 vViewPos;

${NOISE_GLSL}

void main() {
  vec3 p = vObjPos;
  float t = uTime * 0.035;
  float n1 = fbm3(p * uScale + vec3(0.0, t, 0.0));
  float n2 = fbm3(p * uScale * 2.9 - vec3(t * 1.8, 0.0, t * 0.7));
  float granule = n1 * 0.7 + n2 * 0.3;

  vec3 col = mix(uCool, uMid, smoothstep(0.26, 0.62, granule));
  col = mix(col, uHot, smoothstep(0.62, 0.92, granule));
  col += vec3(1.0, 0.93, 0.78) * pow(smoothstep(0.74, 1.0, granule), 2.0) * 0.55;

  float mu = clamp(dot(normalize(vViewNormal), normalize(vViewPos)), 0.0, 1.0);
  float limb = 0.3 + 0.7 * pow(mu, 0.55);
  col *= limb * uHDR;

  gl_FragColor = vec4(col, uOpacity);
}
`;

// ------------------------------------------------------------------
// Atmosphere rim glow (render on a slightly larger sphere, BackSide)
// ------------------------------------------------------------------
export const ATMOSPHERE_VERTEX = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewPos;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

export const ATMOSPHERE_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uPower;
uniform float uHDR;
uniform float uOpacity;
varying vec3 vNormal;
varying vec3 vViewPos;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewPos);
  float f = pow(clamp(1.0 - abs(dot(N, V)), 0.0, 1.0), uPower);
  gl_FragColor = vec4(uColor * f * uIntensity * uHDR * uOpacity, f * uOpacity);
}
`;

// ------------------------------------------------------------------
// Nebula / gas cloud billboard
// ------------------------------------------------------------------
export const NEBULA_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const NEBULA_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uTime;
uniform float uSeed;
uniform float uOpacity;
uniform float uFade;
uniform float uScale;
varying vec2 vUv;

${NOISE_GLSL}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;

  vec3 q = vec3(vUv * uScale + uSeed, uSeed * 1.7);
  float warp = fbm3(q + vec3(0.0, 0.0, uTime * 0.02));
  float n = fbm3(q * 1.7 + warp * 1.35 + vec3(uTime * 0.012, 0.0, 0.0));
  float density = smoothstep(0.32, 0.88, n) * smoothstep(1.0, 0.22, r);

  vec3 col = mix(uColorA, uColorB, smoothstep(0.28, 0.72, n));
  col = mix(col, uColorC, smoothstep(0.62, 0.96, n));

  float a = density * uOpacity * uFade;
  gl_FragColor = vec4(col * (0.55 + 1.4 * density), a);
}
`;

// ------------------------------------------------------------------
// CMB / large-scale-structure sphere
// ------------------------------------------------------------------
export const CMB_VERTEX = /* glsl */ `
varying vec3 vObjPos;
varying vec3 vViewNormal;
varying vec3 vViewPos;

void main() {
  vObjPos = normalize(position);
  vViewNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

export const CMB_FRAGMENT = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uBrightness;
uniform float uOpacity;
varying vec3 vObjPos;
varying vec3 vViewNormal;
varying vec3 vViewPos;

${NOISE_GLSL}

void main() {
  vec3 p = vObjPos;
  float n = fbm3(p * 5.0);
  float fil = fbm3(p * 13.0 + n * 2.2);
  float cl = fbm3(p * 26.0 - n);

  vec3 cold = vec3(0.015, 0.045, 0.16);
  vec3 mid = vec3(0.05, 0.12, 0.36);
  vec3 warm = vec3(0.62, 0.17, 0.045);

  vec3 col = mix(cold, mid, smoothstep(0.28, 0.7, n));
  col = mix(col, warm, smoothstep(0.66, 0.94, fil));
  col += vec3(0.9, 0.5, 0.2) * pow(smoothstep(0.72, 1.0, fil), 2.0) * 0.35;
  col *= 0.85 + 0.3 * cl;

  float mu = clamp(dot(normalize(vViewNormal), normalize(vViewPos)), 0.0, 1.0);
  col *= (0.65 + 0.55 * pow(mu, 0.5)) * uBrightness;

  gl_FragColor = vec4(col, uOpacity);
}
`;

// ------------------------------------------------------------------
// Planetary ring — radial bands, Cassini-like gaps, sun lighting
// ------------------------------------------------------------------
export const RING_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldNormal;

void main() {
  vUv = uv;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const RING_FRAGMENT = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform vec3 uSunDir;
uniform vec3 uTint;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vWorldNormal;

void main() {
  vec4 tex = texture2D(uMap, vUv);
  float lit = 0.5 + 0.5 * abs(dot(normalize(vWorldNormal), normalize(uSunDir)));
  vec3 col = tex.rgb * uTint * lit;
  gl_FragColor = vec4(col, tex.a * uOpacity);
}
`;

// ------------------------------------------------------------------
// Billboard glow (coronas, cores, beacons) with optional rays
// ------------------------------------------------------------------
export const GLOW_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const GLOW_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uOpacity;
uniform float uTime;
uniform float uSeed;
uniform float uRays;
varying vec2 vUv;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float angle = atan(p.y, p.x);
  float rays = 1.0;
  if (uRays > 0.5) {
    rays = 0.78 + 0.3 * sin(angle * 16.0 + uSeed + uTime * 0.18)
                 * sin(angle * 7.0 - uTime * 0.11);
  }
  float glow = pow(smoothstep(1.0, 0.0, r), 2.7);
  float core = pow(smoothstep(0.42, 0.0, r), 2.0);
  vec3 col = uColor * (glow * 0.32 + core * 0.9) * uIntensity * rays * uOpacity;
  gl_FragColor = vec4(col, glow * uIntensity * 0.55 * uOpacity);
}
`;

// ------------------------------------------------------------------
// Accretion disk — swirling, doppler-beamed
// ------------------------------------------------------------------
export const DISK_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

export const DISK_FRAGMENT = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uOpacity;
uniform vec3 uColorHot;
uniform vec3 uColorCool;
varying vec2 vUv;
varying vec3 vWorldPos;

${NOISE_GLSL}

void main() {
  float t = vUv.x;
  float ang = atan(vWorldPos.z, vWorldPos.x);
  float swirl = fbm3(vec3(t * 6.5, ang * 2.0 + uTime * (1.6 - t * 0.9), uTime * 0.12));
  float temp = pow(1.0 - t, 1.7);
  vec3 col = mix(uColorCool, uColorHot, temp);
  col *= 0.72 + 0.55 * swirl;

  float doppler = 0.72 + 0.55 * cos(ang - 0.6);
  col *= doppler;
  col += vec3(0.35, 0.65, 1.0) * pow(temp, 3.0) * 0.5 * max(0.0, cos(ang - 0.6));

  float alpha = smoothstep(0.0, 0.1, t) * smoothstep(1.0, 0.7, t) * (0.5 + 0.5 * swirl);
  gl_FragColor = vec4(col * 1.7, alpha * uOpacity);
}
`;

// ------------------------------------------------------------------
// Soft round sprite texture fallback (used by canvas-based glows)
// ------------------------------------------------------------------
export function createRadialCanvas(size: number, stops: Array<[number, string]>): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([offset, color]) => g.addColorStop(offset, color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}
