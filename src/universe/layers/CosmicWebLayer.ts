/**
 * Scale 1: Cosmic Web — supercluster nodes, glowing filaments and voids.
 */
import * as THREE from 'three';
import { AppState, SceneLayer } from '../../core/types';
import { SUPERCLUSTERS } from '../../data/cosmicData';
import { buildStarData, createStarPoints, createGlowSprite } from '../helpers';
import { mulberry32 } from '../../utils/math';

export class CosmicWebLayer implements SceneLayer {
  public group: THREE.Group = new THREE.Group();
  public visible = false;
  public pickTargets: THREE.Object3D[] = [];

  private glows: THREE.Sprite[] = [];
  private glowBaseSizes: number[] = [];
  private filamentGroup = new THREE.Group();
  private particleMaterial: THREE.ShaderMaterial | null = null;
  private coreMaterial: THREE.ShaderMaterial | null = null;

  constructor() {
    const rand = mulberry32(60606);

    // --- Supercluster nodes ---
    SUPERCLUSTERS.forEach((sc) => {
      const pos = new THREE.Vector3(...sc.position);
      const size = 14 + sc.radiusMly * 0.045;

      const halo = createGlowSprite(sc.color, size, 0.32);
      pos && halo.position.copy(pos);
      this.group.add(halo);
      this.glows.push(halo);
      this.glowBaseSizes.push(size);

      const coreSize = size * 0.26;
      const core = createGlowSprite('#ffffff', coreSize, 0.6, sc.color);
      core.position.copy(pos);
      this.group.add(core);
      this.glows.push(core);
      this.glowBaseSizes.push(coreSize);

      const pick = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(11, size * 0.55), 12, 12),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
      );
      pick.position.copy(pos);
      pick.userData = { pickType: 'supercluster', nodeId: sc.id };
      this.group.add(pick);
      this.pickTargets.push(pick);
    });

    // --- Filaments: connect each node to its two nearest neighbours ---
    const nodes = SUPERCLUSTERS.map((sc) => new THREE.Vector3(...sc.position));
    const filamentPoints: THREE.Vector3[] = [];
    const filamentColors: number[] = [];

    SUPERCLUSTERS.forEach((sc, i) => {
      const dists = nodes
        .map((n, j) => ({ j, d: nodes[i].distanceTo(n) }))
        .filter((e) => e.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);

      dists.forEach(({ j }) => {
        const a = nodes[i];
        const b = nodes[j];
        const mid = a.clone().add(b).multiplyScalar(0.5);
        mid.y += a.distanceTo(b) * 0.12;
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        const pts = curve.getPoints(40);

        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const colors = new Float32Array(pts.length * 3);
        const cA = new THREE.Color(SUPERCLUSTERS[i].color);
        const cB = new THREE.Color(SUPERCLUSTERS[j].color);
        const tmp = new THREE.Color();
        for (let k = 0; k < pts.length; k++) {
          tmp.copy(cA).lerp(cB, k / (pts.length - 1));
          colors[k * 3] = tmp.r;
          colors[k * 3 + 1] = tmp.g;
          colors[k * 3 + 2] = tmp.b;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const mat = new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.55,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const line = new THREE.Line(geo, mat);
        line.frustumCulled = false;
        this.filamentGroup.add(line);

        // Dust particles along the filament
        for (let k = 0; k < 14; k++) {
          const p = curve.getPoint(rand());
          filamentPoints.push(p);
          const c = tmp.clone();
          filamentColors.push(c.r, c.g, c.b);
        }
      });
    });

    if (filamentPoints.length > 0) {
      const data = buildStarData(filamentPoints.length, (i) => ({
        pos: [filamentPoints[i].x, filamentPoints[i].y, filamentPoints[i].z],
        color: new THREE.Color(filamentColors[i * 3], filamentColors[i * 3 + 1], filamentColors[i * 3 + 2]),
        size: 0.35 + rand() * 0.6,
        seed: rand(),
      }));
      const { points, material } = createStarPoints(data, 0.75);
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
  }
}
