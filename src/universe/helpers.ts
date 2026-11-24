/**
 * Shared builders for universe layers: star points, glows, orbits,
 * rings, atmospheres, billboards and disposal.
 */
import * as THREE from 'three';
import {
  STAR_VERTEX,
  STAR_FRAGMENT,
  ATMOSPHERE_VERTEX,
  ATMOSPHERE_FRAGMENT,
  RING_VERTEX,
  RING_FRAGMENT,
  GLOW_VERTEX,
  GLOW_FRAGMENT,
  NEBULA_VERTEX,
  NEBULA_FRAGMENT,
  ORBIT_VERTEX,
  ORBIT_FRAGMENT,
} from '../render/shaders';
import { TextureFactory } from '../render/TextureFactory';
import { clamp } from '../utils/math';

export interface StarPointData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  seeds: Float32Array;
}

export function createStarPoints(
  data: StarPointData,
  brightness = 1
): { points: THREE.Points; material: THREE.ShaderMaterial } {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(data.seeds, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader: STAR_VERTEX,
    fragmentShader: STAR_FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 450 },
      uBrightness: { value: brightness },
      uOpacity: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  return { points, material };
}

/** Canvas-based additive glow sprite (cheap, auto-billboard). */
export function createGlowSprite(
  color: string,
  size: number,
  opacity = 0.9,
  coreColor?: string
): THREE.Sprite {
  const tex = TextureFactory.getGlowTexture(
    coreColor || 'rgba(255,255,255,0.95)',
    color,
    'rgba(0,0,0,0)'
  );
  const mat = new THREE.SpriteMaterial({
    map: tex,
    color: new THREE.Color('#ffffff'),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  return sprite;
}

/** Shader-driven billboard glow with optional animated rays (sun coronas). */
export function createShaderGlow(
  color: string,
  size: number,
  intensity: number,
  rays = false,
  seed = 1
): { mesh: THREE.Mesh; material: THREE.ShaderMaterial } {
  const geo = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.ShaderMaterial({
    vertexShader: GLOW_VERTEX,
    fragmentShader: GLOW_FRAGMENT,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uOpacity: { value: 1 },
      uTime: { value: 0 },
      uSeed: { value: seed },
      uRays: { value: rays ? 1 : 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.scale.set(size, size, 1);
  mesh.frustumCulled = false;
  return { mesh, material };
}

/** Shader-driven nebula billboard. */
export function createNebula(
  colorA: string,
  colorB: string,
  colorC: string,
  size: number,
  opacity: number,
  seed: number,
  scale = 3
): { mesh: THREE.Mesh; material: THREE.ShaderMaterial } {
  const geo = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.ShaderMaterial({
    vertexShader: NEBULA_VERTEX,
    fragmentShader: NEBULA_FRAGMENT,
    uniforms: {
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uColorC: { value: new THREE.Color(colorC) },
      uTime: { value: 0 },
      uSeed: { value: seed },
      uOpacity: { value: opacity },
      uFade: { value: 1 },
      uScale: { value: scale },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.scale.set(size, size, 1);
  mesh.frustumCulled = false;
  return { mesh, material };
}

function createOrbitPoints(
  radius: number,
  segments: number,
  eccentricity: number
): { pts: THREE.Vector3[]; angles: Float32Array } {
  const pts: THREE.Vector3[] = [];
  const angles = new Float32Array(segments);
  const e = clamp(eccentricity, 0, 0.85);
  const b = radius * Math.sqrt(1 - e * e);
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    // Focus (the host star) sits at the origin: perihelion at +X, aphelion at -X.
    // The -sin term makes the motion prograde: counterclockwise viewed from
    // ecliptic north (+Y), matching the real solar system's angular momentum.
    pts.push(new THREE.Vector3(Math.cos(a) * radius - radius * e, 0, -Math.sin(a) * b));
    angles[i] = a;
  }
  return { pts, angles };
}

export function createOrbitLine(
  radius: number,
  color: string,
  opacity: number,
  segments = 192,
  headAngle = 0,
  eccentricity = 0
): THREE.LineLoop {
  const { pts, angles } = createOrbitPoints(radius, segments, eccentricity);
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  geo.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: ORBIT_VERTEX,
    fragmentShader: ORBIT_FRAGMENT,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uHeadAngle: { value: headAngle },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const line = new THREE.LineLoop(geo, mat);
  line.frustumCulled = false;
  return line;
}

export function createRingMesh(
  inner: number,
  outer: number,
  tint: string,
  planetRadius: number,
  texture?: THREE.Texture
): { mesh: THREE.Mesh; material: THREE.ShaderMaterial } {
  const geo = new THREE.RingGeometry(inner, outer, 160, 1);
  const posAttr = geo.attributes.position;
  const uvAttr = geo.attributes.uv;
  const v = new THREE.Vector3();
  for (let i = 0; i < posAttr.count; i++) {
    v.fromBufferAttribute(posAttr, i);
    const t = (v.length() - inner) / (outer - inner);
    uvAttr.setXY(i, t, 0.5);
  }
  const material = new THREE.ShaderMaterial({
    vertexShader: RING_VERTEX,
    fragmentShader: RING_FRAGMENT,
    uniforms: {
      uMap: { value: texture || TextureFactory.getRingTexture() },
      uSunDir: { value: new THREE.Vector3(0, 0, 1) },
      uTint: { value: new THREE.Color(tint) },
      uOpacity: { value: 1 },
      uPlanetRadius: { value: planetRadius },
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  // Local-space sun direction: the planet sits at the ring's local origin,
  // so the shadow test in the shader stays exact under any transform.
  trackSunDirection(material, 'uSunDir', mesh, true);
  return { mesh, material };
}

export function createAtmosphere(
  radius: number,
  color: string,
  intensity: number,
  power = 3.2
): { mesh: THREE.Mesh; material: THREE.ShaderMaterial } {
  const geo = new THREE.SphereGeometry(radius, 48, 48);
  const material = new THREE.ShaderMaterial({
    vertexShader: ATMOSPHERE_VERTEX,
    fragmentShader: ATMOSPHERE_FRAGMENT,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uPower: { value: power },
      uHDR: { value: 1.1 },
      uOpacity: { value: 1 },
      uSunDir: { value: new THREE.Vector3(0, 0, 1) },
    },
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  // Sun-aware scattering needs the world-space sun direction every frame.
  trackSunDirection(material, 'uSunDir', mesh);
  return { mesh, material };
}

// ------------------------------------------------------------------
// Generic world-space sun-direction tracking for ShaderMaterials.
// Registers a material + target object; updateSunDirections() recomputes
// (sun - target) each frame. Dead targets (layer rebuilt) self-remove.
// ------------------------------------------------------------------
interface SunTrackedEntry {
  target: THREE.Object3D;
  refs: Array<{ ref: { value: THREE.Vector3 }; local: boolean }>;
}

const sunDirectionRegistry = new Map<THREE.Material, SunTrackedEntry>();

function registerSunRef(
  material: THREE.Material,
  target: THREE.Object3D,
  ref: { value: THREE.Vector3 },
  local: boolean
): void {
  let entry = sunDirectionRegistry.get(material);
  if (!entry) {
    entry = { target, refs: [] };
    sunDirectionRegistry.set(material, entry);
  }
  entry.target = target;
  entry.refs.push({ ref, local });
}

export function trackSunDirection(
  material: THREE.Material,
  uniformName: string,
  target: THREE.Object3D,
  local = false
): void {
  const mats = material as THREE.ShaderMaterial;
  if (!mats.uniforms || !mats.uniforms[uniformName]) return;
  const ref = { value: new THREE.Vector3(0, 0, 1) };
  mats.uniforms[uniformName] = ref as THREE.IUniform;
  registerSunRef(material, target, ref, local);
}

const _sunTrackPos = new THREE.Vector3();
const _sunTrackDir = new THREE.Vector3();
const _sunTrackLocal = new THREE.Vector3();
export function updateSunDirections(sunWorldPos: THREE.Vector3): void {
  sunDirectionRegistry.forEach((entry, mat) => {
    if (!entry.target.parent) {
      sunDirectionRegistry.delete(mat);
      return;
    }
    entry.target.getWorldPosition(_sunTrackPos);
    _sunTrackDir.copy(sunWorldPos).sub(_sunTrackPos);
    if (_sunTrackDir.lengthSq() < 1e-8) _sunTrackDir.set(0, 0, 1);
    _sunTrackDir.normalize();
    for (const { ref, local } of entry.refs) {
      if (local) {
        // Sun direction expressed in the target's local space
        // (e.g. ring shader whose planet sits at the local origin).
        _sunTrackLocal.copy(sunWorldPos);
        entry.target.worldToLocal(_sunTrackLocal);
        if (_sunTrackLocal.lengthSq() < 1e-8) _sunTrackLocal.set(0, 0, 1);
        ref.value.copy(_sunTrackLocal.normalize());
      } else {
        ref.value.copy(_sunTrackDir);
      }
    }
  });
}

// ------------------------------------------------------------------
// Day/night fade for cloud layers.
// Standard lighting already shades clouds, but ambient/fill light leaves
// the night side washed gray. This patch scales the cloud diffuse by the
// sun-facing factor (soft terminator), keeping a faint minimum so the
// night side doesn't clip unnaturally.
// ------------------------------------------------------------------
export function enableCloudNightFade(
  material: THREE.MeshStandardMaterial,
  target: THREE.Object3D
): void {
  const ref = { value: new THREE.Vector3(0, 0, 1) };
  registerSunRef(material, target, ref, false);

  material.onBeforeCompile = (shader) => {
    (shader.uniforms as Record<string, THREE.IUniform>).uCloudSunDir = ref;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vCloudWorldNormal;'
      )
      .replace(
        '#include <fog_vertex>',
        '#include <fog_vertex>\nvCloudWorldNormal = normalize(mat3(modelMatrix) * objectNormal);'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec3 uCloudSunDir;\nvarying vec3 vCloudWorldNormal;'
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          float cloudNdl = dot(normalize(vCloudWorldNormal), normalize(uCloudSunDir));
          float cloudDay = smoothstep(-0.28, 0.42, cloudNdl);
          diffuseColor.rgb *= (0.10 + 0.90 * cloudDay);
        }`
      );
  };
  material.customProgramCacheKey = () => 'cloud-night-v1';
  material.needsUpdate = true;
}

/** Recursively dispose geometries, materials and textures. */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) {
      material.forEach((m) => disposeMaterial(m));
    } else if (material) {
      disposeMaterial(material);
    }
  });
}

function disposeMaterial(material: THREE.Material): void {
  // NOTE: textures are intentionally NOT disposed — they live in the
  // TextureFactory / RealTextures caches and are shared across rebuilds.
  // Disposing them would break re-upload on system/planet switches.
  material.dispose();
}

/** Fill a Float32Array of star data from a generator callback. */
export function buildStarData(
  count: number,
  generate: (i: number) => { pos: [number, number, number]; color: THREE.Color; size: number; seed: number }
): StarPointData {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const d = generate(i);
    positions[i * 3] = d.pos[0];
    positions[i * 3 + 1] = d.pos[1];
    positions[i * 3 + 2] = d.pos[2];
    colors[i * 3] = d.color.r;
    colors[i * 3 + 1] = d.color.g;
    colors[i * 3 + 2] = d.color.b;
    sizes[i] = d.size;
    seeds[i] = d.seed;
  }
  return { positions, colors, sizes, seeds };
}

// ------------------------------------------------------------------
// Unified planet surface effects (onBeforeCompile):
//   1. Day/night terminator gating for emissive city lights.
//   2. Ray-projected moving cloud shadows cast onto the terrain/ocean.
// Consolidated into one hook so they never overwrite each other.
// ------------------------------------------------------------------
let _dummyBlackTex: THREE.DataTexture | null = null;
function getDummyBlackTexture(): THREE.DataTexture {
  if (!_dummyBlackTex) {
    _dummyBlackTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
    _dummyBlackTex.needsUpdate = true;
  }
  return _dummyBlackTex;
}

export interface PlanetSurfaceEffectsOptions {
  nightLights?: boolean;
  cloudMap?: THREE.Texture | null;
  cloudMesh?: THREE.Object3D | null;
  cloudRadiusRatio?: number;
  microDetail?: boolean;
}

interface PlanetSurfaceEntry {
  target: THREE.Object3D;
  cloudMesh: THREE.Object3D | null;
  sunWorld: { value: THREE.Vector3 };
  sunLocal: { value: THREE.Vector3 };
  cloudShadowMap: { value: THREE.Texture };
  hasCloudShadow: { value: number };
  cloudDeltaYaw: { value: number };
  cloudShellRatio: { value: number };
  nightLightsEnabled: { value: number };
  microDetailEnabled: { value: number };
}

const planetSurfaceRegistry = new Map<THREE.MeshStandardMaterial, PlanetSurfaceEntry>();

export function enablePlanetSurfaceEffects(
  material: THREE.MeshStandardMaterial,
  target: THREE.Object3D,
  options: PlanetSurfaceEffectsOptions = {}
): void {
  const existing = planetSurfaceRegistry.get(material);
  if (existing) {
    if (options.nightLights !== undefined) {
      existing.nightLightsEnabled.value = options.nightLights ? 1 : 0;
    }
    if (options.cloudMap) {
      existing.cloudShadowMap.value = options.cloudMap;
      existing.hasCloudShadow.value = 1;
    }
    if (options.cloudMesh !== undefined) {
      existing.cloudMesh = options.cloudMesh;
    }
    if (options.cloudRadiusRatio !== undefined) {
      existing.cloudShellRatio.value = options.cloudRadiusRatio;
    }
    if (options.microDetail !== undefined) {
      existing.microDetailEnabled.value = options.microDetail ? 1 : 0;
    }
    return;
  }

  const entry: PlanetSurfaceEntry = {
    target,
    cloudMesh: options.cloudMesh ?? null,
    sunWorld: { value: new THREE.Vector3(0, 0, 1) },
    sunLocal: { value: new THREE.Vector3(0, 0, 1) },
    cloudShadowMap: { value: options.cloudMap ?? getDummyBlackTexture() },
    hasCloudShadow: { value: options.cloudMap ? 1 : 0 },
    cloudDeltaYaw: { value: 0 },
    cloudShellRatio: { value: options.cloudRadiusRatio ?? 1.018 },
    nightLightsEnabled: { value: options.nightLights ? 1 : 0 },
    microDetailEnabled: { value: options.microDetail ? 1 : 0 },
  };
  planetSurfaceRegistry.set(material, entry);

  material.onBeforeCompile = (shader) => {
    const u = shader.uniforms as Record<string, THREE.IUniform>;
    u.uPlanetSunWorld = entry.sunWorld;
    u.uPlanetSunLocal = entry.sunLocal;
    u.uCloudShadowMap = entry.cloudShadowMap;
    u.uHasCloudShadow = entry.hasCloudShadow;
    u.uCloudDeltaYaw = entry.cloudDeltaYaw;
    u.uCloudShellRatio = entry.cloudShellRatio;
    u.uNightLightsEnabled = entry.nightLightsEnabled;
    u.uMicroDetailEnabled = entry.microDetailEnabled;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vPlanetWorldNormal;\nvarying vec3 vPlanetLocalPos;'
      )
      .replace(
        '#include <fog_vertex>',
        '#include <fog_vertex>\nvPlanetWorldNormal = normalize(mat3(modelMatrix) * objectNormal);\nvPlanetLocalPos = position;'
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uPlanetSunWorld;
        uniform vec3 uPlanetSunLocal;
        uniform sampler2D uCloudShadowMap;
        uniform float uHasCloudShadow;
        uniform float uCloudDeltaYaw;
        uniform float uCloudShellRatio;
        uniform float uNightLightsEnabled;
        uniform float uMicroDetailEnabled;
        varying vec3 vPlanetWorldNormal;
        varying vec3 vPlanetLocalPos;

        float planetMicroHash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        float planetMicroNoise(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(planetMicroHash(i + vec3(0.0,0.0,0.0)), planetMicroHash(i + vec3(1.0,0.0,0.0)), f.x),
                mix(planetMicroHash(i + vec3(0.0,1.0,0.0)), planetMicroHash(i + vec3(1.0,1.0,0.0)), f.x), f.y),
            mix(mix(planetMicroHash(i + vec3(0.0,0.0,1.0)), planetMicroHash(i + vec3(1.0,0.0,1.0)), f.x),
                mix(planetMicroHash(i + vec3(0.0,1.0,1.0)), planetMicroHash(i + vec3(1.0,1.0,1.0)), f.x), f.y),
            f.z
          );
        }`
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        if (uMicroDetailEnabled > 0.5) {
          vec3 mp = normalize(vPlanetLocalPos);
          float m1 = planetMicroNoise(mp * 36.0);
          float m2 = planetMicroNoise(mp * 92.0);
          float micro = 0.93 + 0.14 * (m1 * 0.6 + m2 * 0.4);
          diffuseColor.rgb *= micro;
        }`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        if (uNightLightsEnabled > 0.5) {
          float nightNdl = dot(normalize(vPlanetWorldNormal), normalize(uPlanetSunWorld));
          float nightFactor = 1.0 - smoothstep(-0.14, 0.24, nightNdl);
          totalEmissiveRadiance *= nightFactor;
        }`
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        if (uHasCloudShadow > 0.5) {
          vec3 pUnit = normalize(vPlanetLocalPos);
          vec3 lLocal = normalize(uPlanetSunLocal);
          float b = dot(pUnit, lLocal);
          if (b > -0.08) {
            float k = uCloudShellRatio;
            float disc = b * b + (k * k - 1.0);
            float tHit = -b + sqrt(max(0.0, disc));
            vec3 qUnit = normalize(pUnit + lLocal * tHit);
            float phi = atan(qUnit.z, -qUnit.x) - uCloudDeltaYaw;
            float uC = fract(phi / 6.28318530718);
            float vC = 1.0 - acos(clamp(qUnit.y, -1.0, 1.0)) / 3.14159265359;
            vec4 cSample = texture2D(uCloudShadowMap, vec2(uC, vC));
            float cDensity = clamp(min(cSample.a, dot(cSample.rgb, vec3(0.3333))), 0.0, 1.0);
            float dayFade = smoothstep(-0.08, 0.16, b);
            float cloudShadow = 1.0 - cDensity * 0.54 * dayFade;
            reflectedLight.directDiffuse *= cloudShadow;
            reflectedLight.directSpecular *= cloudShadow;
          }
        }`
      );
  };
  material.customProgramCacheKey = () => 'planet-surface-v3';
  material.needsUpdate = true;
}

export function updatePlanetCloudShadowMap(
  material: THREE.MeshStandardMaterial,
  cloudTex: THREE.Texture
): void {
  const entry = planetSurfaceRegistry.get(material);
  if (!entry) return;
  entry.cloudShadowMap.value = cloudTex;
  entry.hasCloudShadow.value = 1;
}

export function enableNightTerminator(
  material: THREE.MeshStandardMaterial,
  target: THREE.Object3D
): void {
  enablePlanetSurfaceEffects(material, target, { nightLights: true });
}

/** Recompute sun direction & cloud shadow delta yaw for every planet material. */
const _nightSunTmp = new THREE.Vector3();
const _nightTargetTmp = new THREE.Vector3();
const _localSunTmp = new THREE.Vector3();
export function updateNightTerminators(sunWorldPos: THREE.Vector3): void {
  planetSurfaceRegistry.forEach((entry, mat) => {
    if (!entry.target.parent) {
      planetSurfaceRegistry.delete(mat);
      return;
    }
    entry.target.getWorldPosition(_nightTargetTmp);
    _nightSunTmp.copy(sunWorldPos).sub(_nightTargetTmp);
    if (_nightSunTmp.lengthSq() < 1e-8) _nightSunTmp.set(0, 0, 1);
    entry.sunWorld.value.copy(_nightSunTmp.normalize());

    _localSunTmp.copy(sunWorldPos);
    entry.target.worldToLocal(_localSunTmp);
    if (_localSunTmp.lengthSq() < 1e-8) _localSunTmp.set(0, 0, 1);
    entry.sunLocal.value.copy(_localSunTmp.normalize());

    if (entry.cloudMesh && entry.cloudMesh.parent) {
      entry.cloudDeltaYaw.value = entry.cloudMesh.rotation.y - entry.target.rotation.y;
    }
  });
}
