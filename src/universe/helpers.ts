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
} from '../render/shaders';
import { TextureFactory } from '../render/TextureFactory';

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

export function createOrbitLine(
  radius: number,
  color: string,
  opacity: number,
  segments = 160
): THREE.LineLoop {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
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
  sunDir: THREE.Vector3,
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
      uSunDir: { value: sunDir.clone().normalize() },
      uTint: { value: new THREE.Color(tint) },
      uOpacity: { value: 1 },
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
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
    },
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  return { mesh, material };
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
