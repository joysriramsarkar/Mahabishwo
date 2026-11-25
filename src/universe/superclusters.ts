/**
 * Supercluster visual builder.
 *
 * Each named supercluster is turned into a real 3D structure instead of a
 * single glow sprite: member-cluster cores joined by curved filaments, a dense
 * swarm of galaxies around every core, and a wide diffuse halo. The result is
 * one merged Points cloud plus a handful of additive sprites, so rendering
 * cost stays low even in the God's Eye view.
 */
import * as THREE from 'three';
import type { MemberClusterData, SuperclusterData } from '../core/types';
import { buildStarData, createStarPoints, createGlowSprite } from './helpers';
import { mulberry32, gaussianRandom, seedFromString } from '../utils/math';

export interface SuperclusterGlow {
  sprite: THREE.Sprite;
  baseSize: number;
}

export interface SuperclusterClouds {
  group: THREE.Group;
  material: THREE.ShaderMaterial | null;
  glows: SuperclusterGlow[];
}

export interface SuperclusterCloudOptions {
  /** Overall size multiplier (1 = God's Eye scale). */
  scale?: number;
  /** Deterministic seed offset. */
  seed?: number;
  /** Galaxy density multiplier (1 = default). */
  galaxyDensity?: number;
}

const WHITE = new THREE.Color('#fff6e8');

function clampSigma(value: number, limit = 2.4): number {
  return Math.max(-limit, Math.min(limit, value));
}

/** Visual radius of a supercluster in scene units at the given zoom scale. */
export function superclusterVisualRadius(sc: SuperclusterData, scale = 1): number {
  return (11 + sc.radiusMly * 0.06) * scale;
}

export interface SuperclusterMemberNode {
  superclusterId: string;
  member: MemberClusterData;
  /** Position relative to the supercluster centre. */
  local: THREE.Vector3;
  /** Position relative to the parent layer group. */
  world: THREE.Vector3;
}

/**
 * Deterministic member-cluster positions shared by the renderer, the label
 * layer, the pick targets and the info panel. This is what keeps a clickable
 * "Virgo Cluster" pin exactly on its rendered core.
 */
export function getSuperclusterMemberNodes(
  sc: SuperclusterData,
  scale = 1
): SuperclusterMemberNode[] {
  const radius = superclusterVisualRadius(sc, scale);
  const center = new THREE.Vector3(...sc.position);
  return sc.members.map((member) => {
    const local = new THREE.Vector3(...member.offset).multiplyScalar(radius);
    return {
      superclusterId: sc.id,
      member,
      local,
      world: center.clone().add(local),
    };
  });
}

export function buildSuperclusterClouds(
  superclusters: SuperclusterData[],
  options: SuperclusterCloudOptions = {}
): SuperclusterClouds {
  const scale = options.scale ?? 1;
  const density = options.galaxyDensity ?? 1;
  const baseSeed = options.seed ?? 7301;

  const root = new THREE.Group();
  const glows: SuperclusterGlow[] = [];
  const particles: Array<{ pos: THREE.Vector3; color: THREE.Color; size: number }> = [];
  let material: THREE.ShaderMaterial | null = null;

  superclusters.forEach((sc) => {
    // The Boötes Void is a cavity, not a galaxy concentration.
    if (sc.id.includes('void')) return;

    const rand = mulberry32(baseSeed + seedFromString(sc.id));
    const radius = superclusterVisualRadius(sc, scale);
    const flatten = 0.74;
    const baseColor = new THREE.Color(sc.color);
    const cloud = new THREE.Group();
    cloud.position.set(...sc.position);
    root.add(cloud);

    const nodes = getSuperclusterMemberNodes(sc, scale);
    if (nodes.length === 0) return;
    const cores = nodes.map((node) => node.local);

    // Wide, soft halo that makes the supercluster readable from far away.
    const halo = createGlowSprite(sc.color, radius * 1.9, 0.55);
    halo.material.color.setScalar(1.45);
    cloud.add(halo);
    glows.push({ sprite: halo, baseSize: halo.scale.x });

    // Main core (e.g. Virgo for Laniakea, Abell 3558 for Shapley).
    const core = createGlowSprite('#ffffff', radius * 0.42, 0.9, sc.color);
    core.material.color.setScalar(1.9);
    cloud.add(core);
    glows.push({ sprite: core, baseSize: core.scale.x });

    /**
     * Member-cluster cores. Real superclusters are not single blobs: they are
     * chains and sheets of Abell clusters, so each named member gets its own
     * node at the position shared with its clickable label.
     */
    nodes.forEach((node, index) => {
      if (index === 0) return;
      const subCore = createGlowSprite(
        sc.color,
        radius * (0.14 + rand() * 0.08),
        0.7,
        '#ffffff'
      );
      subCore.material.color.setScalar(1.6);
      subCore.position.copy(node.local);
      cloud.add(subCore);
      glows.push({ sprite: subCore, baseSize: subCore.scale.x });
    });

    // Curved filaments joining the member cores, with galaxies strung along.
    for (let i = 1; i < cores.length; i++) {
      const a = cores[0];
      const b = cores[i];
      const mid = a.clone().add(b).multiplyScalar(0.5);
      mid.x += (rand() - 0.5) * radius * 0.16;
      mid.y += (rand() - 0.5) * radius * 0.22;
      mid.z += (rand() - 0.5) * radius * 0.16;

      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const points = curve.getPoints(30);
      const colors = new Float32Array(points.length * 3);
      const tmp = new THREE.Color();
      for (let k = 0; k < points.length; k++) {
        tmp.copy(baseColor).lerp(WHITE, 0.25 + (k / points.length) * 0.35);
        colors[k * 3] = tmp.r;
        colors[k * 3 + 1] = tmp.g;
        colors[k * 3 + 2] = tmp.b;
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const line = new THREE.Line(geometry, lineMaterial);
      line.frustumCulled = false;
      cloud.add(line);

      const strandCount = Math.round((18 + sc.radiusMly * 0.12) * density);
      for (let k = 0; k < strandCount; k++) {
        const t = rand();
        const p = curve.getPoint(t);
        const spread = radius * (0.025 + Math.sin(t * Math.PI) * 0.045);
        p.x += gaussianRandom(rand) * spread;
        p.y += gaussianRandom(rand) * spread * flatten;
        p.z += gaussianRandom(rand) * spread;
        const color = baseColor.clone().lerp(WHITE, 0.2 + rand() * 0.65);
        particles.push({ pos: p, color, size: 1.1 + rand() * 1.8 });
      }
    }

    // Dense galaxy swarm around every member core.
    const perCore = Math.max(
      45,
      Math.round(((110 + sc.radiusMly * 1.05) / cores.length) * density)
    );
    cores.forEach((center) => {
      for (let k = 0; k < perCore; k++) {
        const spread = radius * (0.065 + rand() * 0.045);
        const p = new THREE.Vector3(
          center.x + clampSigma(gaussianRandom(rand)) * spread,
          center.y + clampSigma(gaussianRandom(rand)) * spread * flatten,
          center.z + clampSigma(gaussianRandom(rand)) * spread
        );
        const color = baseColor.clone().lerp(WHITE, rand() * 0.7);
        particles.push({ pos: p, color, size: 0.9 + rand() * 1.6 });
      }
    });

    // Diffuse intracluster light / outlying galaxies filling the whole volume.
    const diffuseCount = Math.round((90 + sc.radiusMly * 0.7) * density);
    for (let k = 0; k < diffuseCount; k++) {
      const sigma = radius * (0.24 + rand() * 0.18);
      const p = new THREE.Vector3(
        clampSigma(gaussianRandom(rand), 2.1) * sigma,
        clampSigma(gaussianRandom(rand), 2.1) * sigma * flatten,
        clampSigma(gaussianRandom(rand), 2.1) * sigma
      );
      const color = baseColor.clone().lerp(WHITE, 0.1 + rand() * 0.5);
      particles.push({ pos: p, color, size: 0.7 + rand() * 1.2 });
    }
  });

  if (particles.length > 0) {
    const data = buildStarData(particles.length, (i) => ({
      pos: [particles[i].pos.x, particles[i].pos.y, particles[i].pos.z],
      color: particles[i].color,
      size: particles[i].size,
      seed: (i * 0.61803398875) % 1,
    }));
    const built = createStarPoints(data, 0.95);
    material = built.material;
    root.add(built.points);
  }

  // The CMB sphere and deep field are transparent too. Drawing the
  // superclusters last guarantees they are never swallowed by the backdrop.
  root.traverse((object) => {
    object.renderOrder = 4;
  });

  return { group: root, material, glows };
}
