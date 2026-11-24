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
  float t = uTime * 0.032;

  // Multi-scale convective granulation + magnetic domain warping
  vec3 warp = vec3(
    fbm3(p * uScale * 0.7 + vec3(0.0, t * 0.6, 0.0)),
    fbm3(p * uScale * 0.7 + vec3(7.3, -t * 0.5, 2.1)),
    fbm3(p * uScale * 0.7 + vec3(-3.9, 1.4, t * 0.6))
  );
  float cells = fbm3(p * uScale + warp * 1.15 + vec3(0.0, t, 0.0));
  float fine = fbm3(p * uScale * 3.4 - vec3(t * 1.9, 0.0, t * 0.8));
  float ridge = 1.0 - abs(fine * 2.0 - 1.0);
  float granule = cells * 0.68 + ridge * 0.32;

  // Magnetic sunspot groups (dark umbra + warm penumbra + bright faculae ring)
  float spotField = fbm3(p * 2.6 + vec3(0.0, t * 0.18, 0.0));
  float spotMask = smoothstep(0.68, 0.79, spotField);
  float umbra = smoothstep(0.75, 0.83, spotField);
  float faculae = smoothstep(0.60, 0.68, spotField) * (1.0 - spotMask);

  vec3 col = mix(uCool, uMid, smoothstep(0.24, 0.60, granule));
  col = mix(col, uHot, smoothstep(0.58, 0.90, granule));
  col += uHot * pow(smoothstep(0.72, 1.0, granule), 2.2) * 0.45;
  col += uHot * faculae * 0.38;

  // Cool down sunspot umbra / penumbra
  col = mix(col, uCool * 0.36, spotMask * 0.75);
  col = mix(col, uCool * 0.14, umbra * 0.92);

  // Realistic solar limb darkening + warm chromosphere edge tint
  float mu = clamp(dot(normalize(vViewNormal), normalize(vViewPos)), 0.0, 1.0);
  float limb = 0.24 + 0.76 * pow(mu, 0.58);
  vec3 chromo = mix(uCool * 1.15, vec3(1.0), smoothstep(0.0, 0.35, mu));
  col *= limb * chromo * uHDR;

  gl_FragColor = vec4(col, uOpacity);
}
`;

// ------------------------------------------------------------------
// Atmosphere rim glow (render on a slightly larger sphere, BackSide)
// Includes Rayleigh limb + sunset terminator + Mie forward scattering
// ------------------------------------------------------------------
export const ATMOSPHERE_VERTEX = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewPos;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vec4 mv = viewMatrix * wp;
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
uniform vec3 uSunDir;
varying vec3 vNormal;
varying vec3 vViewPos;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewPos);
  float f = pow(clamp(1.0 - abs(dot(N, V)), 0.0, 1.0), uPower);

  vec3 L = normalize(uSunDir);
  float sunAmt = dot(normalize(vWorldNormal), L);
  float dayMix = smoothstep(-0.28, 0.45, sunAmt);
  float termBand = smoothstep(-0.38, 0.02, sunAmt) * (1.0 - smoothstep(0.02, 0.52, sunAmt));

  // Mie forward scattering: looking toward the sun past the planet limb
  // lights up a razor-bright atmospheric crescent arc.
  vec3 viewRayWorld = normalize(vWorldPos - cameraPosition);
  float cosSunView = clamp(dot(viewRayWorld, L), 0.0, 1.0);
  float mie = pow(cosSunView, 6.0) * 1.15 + pow(cosSunView, 16.0) * 0.9;
  float forwardMask = smoothstep(-0.5, 0.15, sunAmt);

  vec3 baseAtmo = uColor * f * uIntensity * uHDR;
  vec3 sunsetTint = mix(uColor, vec3(1.0, 0.55, 0.26), 0.65);

  vec3 col = baseAtmo * (0.04 + 0.96 * dayMix);
  col += sunsetTint * (termBand * f * 0.48 * uIntensity);
  col += mix(uColor, vec3(1.0, 0.92, 0.84), 0.45) * (mie * forwardMask * f * uIntensity * 0.95);

  float alpha = f * uOpacity * clamp(0.06 + 0.94 * dayMix + mie * forwardMask * 0.55, 0.0, 1.0);
  gl_FragColor = vec4(col * uOpacity, alpha);
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
  vec3 p = normalize(vObjPos);
  float t = uTime * 0.015;

  // Planck-style multi-scale anisotropy + cosmic filament web
  float broad = fbm3(p * 4.2 + vec3(0.0, t * 0.15, 0.0));
  float acoustic = fbm3(p * 11.5 + vec3(broad * 1.9, -broad * 1.3, 0.0));
  float filRaw = fbm3(p * 18.0 + acoustic * 2.4);
  float filament = pow(1.0 - abs(filRaw * 2.0 - 1.0), 3.0);
  float fine = fbm3(p * 34.0 - broad * 1.6);

  // Planck cold spots (deep blue-indigo) -> neutral teal-slate -> warm amber/crimson peaks
  vec3 deepCold = vec3(0.012, 0.032, 0.13);
  vec3 cool = vec3(0.04, 0.13, 0.34);
  vec3 neutral = vec3(0.11, 0.24, 0.38);
  vec3 warm = vec3(0.68, 0.24, 0.06);
  vec3 hotPeak = vec3(0.95, 0.56, 0.18);

  vec3 col = mix(deepCold, cool, smoothstep(0.24, 0.56, broad));
  col = mix(col, neutral, smoothstep(0.45, 0.72, acoustic) * 0.7);
  col = mix(col, warm, smoothstep(0.58, 0.88, acoustic * 0.65 + filRaw * 0.35));
  col += hotPeak * filament * (0.28 + 0.35 * smoothstep(0.45, 0.85, broad));
  col *= 0.80 + 0.35 * fine;

  float mu = clamp(dot(normalize(vViewNormal), normalize(vViewPos)), 0.0, 1.0);
  col *= (0.60 + 0.62 * pow(mu, 0.48)) * uBrightness;

  gl_FragColor = vec4(col, uOpacity);
}
`;

// ------------------------------------------------------------------
// Planetary ring — radial bands, Cassini-like gaps, sun lighting,
// and the planet's own shadow cast across the rings.
// uSunDir is the LOCAL-space direction to the sun (updated per frame);
// the planet sits at the local origin, so the shadow test is exact.
// ------------------------------------------------------------------
export const RING_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vLocalPos;
varying vec3 vLocalNormal;

void main() {
  vUv = uv;
  vLocalPos = position;
  vLocalNormal = normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const RING_FRAGMENT = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform vec3 uSunDir;
uniform vec3 uTint;
uniform float uOpacity;
uniform float uPlanetRadius;
varying vec2 vUv;
varying vec3 vLocalPos;
varying vec3 vLocalNormal;

void main() {
  vec4 tex = texture2D(uMap, vUv);
  vec3 L = normalize(uSunDir);
  vec3 n = normalize(vLocalNormal);

  // Diffuse from the sun-facing side, faint transmitted light otherwise.
  float ndl = dot(n, L) * 0.5 + 0.5;
  ndl = ndl * ndl * (3.0 - 2.0 * ndl);
  float dif = 0.10 + 1.05 * ndl;

  // Planet shadow: cylinder test on the anti-sun side, soft penumbra.
  float behind = dot(vLocalPos, L);
  vec3 perpVec = vLocalPos - L * behind;
  float perpDist = length(perpVec);
  float shadow = 1.0;
  if (behind < 0.0) {
    shadow = mix(0.05, 1.0, smoothstep(uPlanetRadius * 0.94, uPlanetRadius * 1.08, perpDist));
  }

  vec3 col = tex.rgb * uTint * dif * shadow;
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
// Black hole gravitational lensing & photon sphere ring (billboard)
// Renders the bent-light Einstein arc + razor-sharp photon ring
// wrapping around the shadow of the event horizon.
// ------------------------------------------------------------------
export const BH_LENS_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const BH_LENS_FRAGMENT = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uOpacity;
uniform vec3 uColorHot;
uniform vec3 uColorCool;
varying vec2 vUv;

${NOISE_GLSL}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0 || r < 0.26) discard;

  float ang = atan(p.y, p.x);

  // Photon sphere ring just outside the shadow (r ~ 0.31)
  float photonRing = exp(-pow((r - 0.315) / 0.022, 2.0)) * 2.1;

  // Lensed upper/lower Einstein arcs from the far side of the accretion disk
  float vertBias = 0.45 + 0.55 * abs(p.y / max(0.001, r));
  float einsteinHalo = exp(-pow((r - 0.40) / 0.09, 2.0)) * vertBias * 0.95;

  // Relativistic Doppler asymmetry (approaching side brighter & bluer)
  float doppler = 0.65 + 0.50 * cos(ang + 0.45);
  float shimmer = 0.84 + 0.26 * fbm3(vec3(cos(ang) * 2.4, sin(ang) * 2.4, uTime * 0.35));

  vec3 col = mix(uColorCool, uColorHot, clamp(photonRing * 0.65 + 0.25, 0.0, 1.0));
  col += vec3(0.45, 0.72, 1.0) * max(0.0, cos(ang + 0.45)) * photonRing * 0.35;

  float lum = (photonRing + einsteinHalo) * doppler * shimmer;
  float edgeFade = smoothstep(1.0, 0.62, r) * smoothstep(0.26, 0.30, r);
  float alpha = clamp(lum * 0.58 * edgeFade, 0.0, 1.0) * uOpacity;

  gl_FragColor = vec4(col * lum * edgeFade * 1.15, alpha);
}
`;

// ------------------------------------------------------------------
// Deep-space Milky Way galactic band (sky sphere, BackSide)
// Adds subtle integrated starlight, warm core glow, and dark dust rift
// across the galactic plane so space feels genuinely astronomical.
// ------------------------------------------------------------------
export const GALAXY_SKY_VERTEX = /* glsl */ `
varying vec3 vDir;

void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const GALAXY_SKY_FRAGMENT = /* glsl */ `
precision highp float;
uniform float uOpacity;
varying vec3 vDir;

${NOISE_GLSL}

void main() {
  // Tilt the galactic plane ~32 deg so it arcs dramatically across the sky
  vec3 d = normalize(vDir);
  float c = cos(0.56);
  float s = sin(0.56);
  vec3 g = vec3(d.x, d.y * c - d.z * s, d.y * s + d.z * c);

  // Concentration along the galactic equator (g.y ~ 0)
  float band = exp(-pow(g.y / 0.145, 2.0));
  float wideHalo = exp(-pow(g.y / 0.38, 2.0)) * 0.32;

  // Longitudinal core bulge toward galactic center (+X / +Z)
  float coreDir = max(0.0, dot(normalize(vec3(g.x, 0.0, g.z)), normalize(vec3(0.82, 0.0, 0.57))));
  float coreBulge = pow(coreDir, 4.0) * exp(-pow(g.y / 0.19, 2.0));

  // Fine star-cloud mottling + dark Great Rift dust lane along the midplane
  float clouds = fbm3(g * 7.5);
  float fine = fbm3(g * 22.0 + clouds * 1.4);
  float riftNoise = fbm3(g * 11.0 + vec3(4.2, 0.0, 1.7));
  float dustRift = exp(-pow(g.y / 0.042, 2.0)) * smoothstep(0.32, 0.72, riftNoise);

  vec3 armBlue = vec3(0.075, 0.125, 0.24);
  vec3 dustGold = vec3(0.28, 0.19, 0.11);
  vec3 coreWarm = vec3(0.45, 0.30, 0.17);

  float starlight = (band * (0.42 + 0.88 * clouds * fine) + wideHalo * (0.5 + 0.5 * clouds));
  vec3 col = armBlue * starlight + dustGold * band * pow(clouds, 1.6) * 0.55;
  col += coreWarm * coreBulge * (0.65 + 0.5 * fine);

  // Carve dark interstellar dust lanes through the bright band
  col *= (1.0 - dustRift * 0.78);

  gl_FragColor = vec4(col * uOpacity, uOpacity);
}
`;

// ------------------------------------------------------------------
// Fading orbital trail (LineLoop with per-vertex angle attribute)
// Bright leading head at uHeadAngle, fading cleanly behind the planet.
// ------------------------------------------------------------------
export const ORBIT_VERTEX = /* glsl */ `
attribute float aAngle;
varying float vAngle;

void main() {
  vAngle = aAngle;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const ORBIT_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uHeadAngle;
varying float vAngle;

void main() {
  float twoPi = 6.283185307;
  // Angular distance behind the planet along prograde direction (+angle)
  float behind = mod(uHeadAngle - vAngle, twoPi);
  float trail = 1.0 - behind / twoPi;
  float fade = mix(0.14, 1.0, pow(trail, 2.4));
  // Subtle crisp highlight right behind the planet
  float headGlow = smoothstep(0.92, 1.0, trail) * 0.35;
  gl_FragColor = vec4(uColor * (1.0 + headGlow), uOpacity * fade);
}
`;

// ------------------------------------------------------------------
// Solar prominence — arching plasma loops above the photosphere.
// Geometry: a ring of arches, each arch rises from and falls back to
// the star's surface. Animated with time so plasma surges up/down.
// ------------------------------------------------------------------
export const PROMINENCE_VERTEX = /* glsl */ `
varying float vArch;
varying float vHeight;
uniform float uTime;
uniform float uRadius;

void main() {
  // position.x = angle around star (0..1), position.y = arch progress (0..1..0),
  // position.z = arch index (0..1)
  float angle = position.x * 6.283185307;
  float progress = position.y;
  float index = position.z;

  // Each arch rises and falls independently
  float phase = index * 1.3 + uTime * 0.25;
  float lift = sin(phase) * 0.5 + 0.5;
  lift = lift * lift * 1.4; // arch rises higher at peak

  float r = uRadius;
  vec3 basePos = vec3(cos(angle) * r, 0.0, sin(angle) * r);
  float archH = sin(progress * 3.14159265) * r * 0.45 * lift;

  vec3 worldPos = basePos + vec3(0.0, archH, 0.0);
  vArch = progress;
  vHeight = lift;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
}
`;

export const PROMINENCE_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
varying float vArch;
varying float vHeight;

void main() {
  // Bright core along the arch center, fading at edges
  float core = sin(vArch * 3.14159265);
  core = pow(core, 1.5);

  // Plasma shimmer
  float shimmer = 0.7 + 0.4 * sin(vArch * 12.0 + uTime * 2.0);
  float alpha = core * shimmer * vHeight * 0.8 * uOpacity;

  if (alpha < 0.02) discard;

  vec3 col = uColor * (0.4 + 0.6 * core) * (0.7 + 0.5 * vHeight);
  gl_FragColor = vec4(col, alpha);
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
