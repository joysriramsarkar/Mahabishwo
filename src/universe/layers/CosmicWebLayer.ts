/**
 * Scale 1: Cosmic Web — supercluster nodes, dense 3D filamentary galaxy web,
 * and cosmic voids (carved around the Boötes Void).
 */
import * as THREE from 'three';
import { AppState, SceneLayer } from '../../core/types';
import { SUPERCLUSTERS } from '../../data/cosmicData';
import { buildStarData, createStarPoints, createGlowSprite } from '../helpers';
import { mulberry32, gaussianRandom } from '../../utils/math';

export class CosmicWebLayer implements SceneLayer {
  public group: THREE.Group = new THREE.Group();
  public visible = false;
  public pickTargets: THREE.Object3D[] = [];

  private glows: THREE.Sprite[] = [];
  private glowBaseSizes: number[] = [];
  private filamentGroup = new THREE.Group();
  private particleMaterial: THREE.ShaderMaterial | null = null;

  constructor() {
    const rand = mulberry32(60606);

    const voidSc = SUPERCLUSTERS.find((s) => s.id === 'bootes_void');
    const voidCenter = voidSc ? new THREE.Vector3(...voidSc.position) : new THREE.Vector3(60, 120, -180);
    const voidRadius = 82;

    // --- Supercluster nodes ---
    interface WebNode {
      pos: THREE.Vector3;
      color: THREE.Color;
      major: boolean;
    }
    const webNodes: WebNode[] = [];

    SUPERCLUSTERS.forEach((sc) => {
      const pos = new THREE.Vector3(...sc.position);
      const isVoid = sc.id === 'bootes_void';
      const size = isVoid ? 12 : 15 + sc.radiusMly * 0.045;

      const halo = createGlowSprite(sc.color, size, isVoid ? 0.14 : 0.34);
      halo.position.copy(pos);
      this.group.add(halo);
      this.glows.push(halo);
      this.glowBaseSizes.push(size);

      if (!isVoid) {
        const coreSize = size * 0.28;
        const core = createGlowSprite('#ffffff', coreSize, 0.65, sc.color);
        core.position.copy(pos);
        this.group.add(core);
        this.glows.push(core);
        this.glowBaseSizes.push(coreSize);

        webNodes.push({ pos, color: new THREE.Color(sc.color), major: true });
      }

      const pick = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(11, size * 0.55), 12, 12),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
      );
      pick.position.copy(pos);
      pick.userData = { pickType: 'supercluster', nodeId: sc.id };
      this.group.add(pick);
      this.pickTargets.push(pick);
    });

    // --- Secondary galaxy cluster nodes forming a 3D cosmic web around voids ---
    const clusterPalette = ['#60a5fa', '#a78bfa', '#f472b6', '#fbbf24', '#38bdf8'];
    for (let i = 0; i < 34; i++) {
      let candidate = new THREE.Vector3();
      for (let attempt = 0; attempt < 12; attempt++) {
        const r = 55 + rand() * 210;
        const th = rand() * Math.PI * 2;
        const ph = Math.acos(2 * rand() - 1);
        candidate.set(
          r * Math.sin(ph) * Math.cos(th),
          r * Math.cos(ph) * 0.78,
          r * Math.sin(ph) * Math.sin(th)
        );
        if (candidate.distanceTo(voidCenter) > voidRadius) break;
      }
      if (candidate.distanceTo(voidCenter) <= voidRadius) {
        // Push outward to the rim of Boötes Void (forming a void wall)
        candidate.sub(voidCenter).normalize().multiplyScalar(voidRadius + 10).add(voidCenter);
      }

      const hex = clusterPalette[i % clusterPalette.length];
      const col = new THREE.Color(hex);
      webNodes.push({ pos: candidate, color: col, major: false });

      const subGlow = createGlowSprite(hex, 6 + rand() * 6, 0.22);
      subGlow.position.copy(candidate);
      this.filamentGroup.add(subGlow);
      this.glows.push(subGlow);
      this.glowBaseSizes.push(subGlow.scale.x);
    }

    // --- Branching 3D cosmic filaments + galaxy cluster chains ---
    const filamentParticles: Array<{ pos: THREE.Vector3; color: THREE.Color; size: number }> = [];
    const connected = new Set<string>();

    webNodes.forEach((nodeA, i) => {
      const kNearest = nodeA.major ? 4 : 3;
      const dists = webNodes
        .map((n, j) => ({ j, d: nodeA.pos.distanceTo(n.pos) }))
        .filter((e) => e.j !== i && e.d < 250)
        .sort((a, b) => a.d - b.d)
        .slice(0, kNearest);

      dists.forEach(({ j, d }) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (connected.has(key)) return;
        connected.add(key);

        const nodeB = webNodes[j];
        const mid = nodeA.pos.clone().add(nodeB.pos).multiplyScalar(0.5);
        // Organic curvature + push away from Boötes Void
        mid.x += gaussianRandom(rand) * d * 0.09;
        mid.y += gaussianRandom(rand) * d * 0.09;
        mid.z += gaussianRandom(rand) * d * 0.09;
        if (mid.distanceTo(voidCenter) < voidRadius) {
          mid.sub(voidCenter).normalize().multiplyScalar(voidRadius + 12).add(voidCenter);
        }

        const curve = new THREE.QuadraticBezierCurve3(nodeA.pos, mid, nodeB.pos);
        const pts = curve.getPoints(32);

        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const colors = new Float32Array(pts.length * 3);
        const tmp = new THREE.Color();
        for (let k = 0; k < pts.length; k++) {
          tmp.copy(nodeA.color).lerp(nodeB.color, k / (pts.length - 1));
          colors[k * 3] = tmp.r;
          colors[k * 3 + 1] = tmp.g;
          colors[k * 3 + 2] = tmp.b;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const isMajorLink = nodeA.major || nodeB.major;
        const mat = new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: isMajorLink ? 0.42 : 0.24,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const line = new THREE.Line(geo, mat);
        line.frustumCulled = false;
        this.filamentGroup.add(line);

        // Dense galaxy clusters hugging the filament spine
        const pCount = isMajorLink ? 85 : 45;
        for (let k = 0; k < pCount; k++) {
          const t = rand();
          const p = curve.getPoint(t);
          const spread = 2.4 + Math.sin(t * Math.PI) * 3.8;
          p.x += gaussianRandom(rand) * spread;
          p.y += gaussianRandom(rand) * spread;
          p.z += gaussianRandom(rand) * spread;
          if (p.distanceTo(voidCenter) < voidRadius * 0.9) continue;
          const col = nodeA.color.clone().lerp(nodeB.color, t);
          if (rand() < 0.25) col.lerp(new THREE.Color('#ffffff'), 0.5);
          filamentParticles.push({
            pos: p,
            color: col,
            size: 0.35 + rand() * 0.72,
          });
        }
      });
    });

    // Dense galaxy swarms inside major supercluster nodes
    webNodes.forEach((n) => {
      const nodeCount = n.major ? 260 : 50;
      const spread = n.major ? 14 : 6;
      for (let k = 0; k < nodeCount; k++) {
        const p = new THREE.Vector3(
          n.pos.x + gaussianRandom(rand) * spread,
          n.pos.y + gaussianRandom(rand) * spread * 0.75,
          n.pos.z + gaussianRandom(rand) * spread
        );
        const col = n.color.clone().lerp(new THREE.Color('#fff5e6'), rand() * 0.55);
        filamentParticles.push({ pos: p, color: col, size: 0.4 + rand() * 0.8 });
      }
    });

    if (filamentParticles.length > 0) {
      const data = buildStarData(filamentParticles.length, (i) => ({
        pos: [filamentParticles[i].pos.x, filamentParticles[i].pos.y, filamentParticles[i].pos.z],
        color: filamentParticles[i].color,
        size: filamentParticles[i].size,
        seed: rand(),
      }));
      const { points, material } = createStarPoints(data, 0.85);
      this.particleMaterial = material;
      this.filamentGroup.add(points);
    }

    this.group.add(this.filamentGroup);
  }

  public build(): void {
    // Static layer.
  }

  public update(dt: number, state: AppState): void {
    if (!this.visible) return;
    this.group.rotation.y += dt * 0.008 * state.rotationSpeed;
    this.filamentGroup.visible = state.layers.cosmicWeb;
    if (this.particleMaterial) {
      this.particleMaterial.uniforms.uTime.value = state.elapsedTime;
      this.particleMaterial.uniforms.uScale.value =
        0.16 * window.innerHeight * Math.min(window.devicePixelRatio || 1, 2);
    }
    const pulse = 1 + Math.sin(state.elapsedTime * 0.8) * 0.06;
    this.glows.forEach((g, i) => {
      const base = this.glowBaseSizes[i] || 1;
      g.scale.set(base * pulse, base * pulse, 1);
    });
  }

  public dispose(): void {
    this.group.clear();
    this.glows = [];
    this.glowBaseSizes = [];
  }
}
