/**
 * Scale 2: Galaxy Cluster / Local Group.
 * Member galaxies rendered as glowing stellar systems with faint halos,
 * plus the distant Virgo Cluster on the horizon.
 */
import * as THREE from 'three';
import { AppState, SceneLayer } from '../../core/types';
import { GALAXIES, GALAXY_CLUSTERS } from '../../data/cosmicData';
import { buildStarData, createStarPoints, createGlowSprite } from '../helpers';
import { mulberry32 } from '../../utils/math';

export class LocalGroupLayer implements SceneLayer {
  public group: THREE.Group = new THREE.Group();
  public visible = false;
  public pickTargets: THREE.Object3D[] = [];

  private haloGroup = new THREE.Group();
  private starMaterial: THREE.ShaderMaterial | null = null;
  private glows: THREE.Sprite[] = [];
  private glowBaseSizes: number[] = [];

  constructor() {
    const rand = mulberry32(31337);

    GALAXIES.forEach((g) => {
      const pos = new THREE.Vector3(...g.position);
      const size = 6 + g.diameterKly * 0.055;

      const halo = createGlowSprite(g.color, size, 0.35);
      halo.position.copy(pos);
      this.haloGroup.add(halo);
      this.glows.push(halo);
      this.glowBaseSizes.push(size);

      const coreSize = size * 0.3;
      const core = createGlowSprite('#ffffff', coreSize, 0.6, g.color);
      core.position.copy(pos);
      this.haloGroup.add(core);
      this.glows.push(core);
      this.glowBaseSizes.push(size * 0.3);

      const pick = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(6, size * 0.62), 12, 12),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
      );
      pick.position.copy(pos);
      pick.userData = { pickType: 'galaxy', galaxyId: g.id };
      this.haloGroup.add(pick);
      this.pickTargets.push(pick);

      // Faint member-star cloud
      const count = 700;
      const data = buildStarData(count, () => {
        const dir = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1);
        if (dir.lengthSq() < 1e-4) dir.set(0, 1, 0);
        dir.normalize();
        const r = Math.pow(rand(), 0.5) * size * 0.7;
        const color = new THREE.Color(g.color).lerp(new THREE.Color('#ffffff'), rand() * 0.4);
        return {
          pos: [pos.x + dir.x * r, pos.y + dir.y * r * 0.55, pos.z + dir.z * r],
          color,
          size: 0.3 + rand() * 0.5,
          seed: rand(),
        };
      });
      const { points, material } = createStarPoints(data, 0.7);
      if (!this.starMaterial) this.starMaterial = material;
      this.haloGroup.add(points);
    });

    // Distant Virgo Cluster
    const virgo = GALAXY_CLUSTERS.find((c) => c.id === 'virgo_cluster');
    if (virgo) {
      const v = createGlowSprite(virgo.color, 16, 0.18);
      v.position.set(...virgo.position);
      this.haloGroup.add(v);
      this.glows.push(v);
      this.glowBaseSizes.push(34);
    }

    this.group.add(this.haloGroup);
  }

  public build(): void {
    // Static layer.
  }

  public update(dt: number, state: AppState): void {
    if (!this.visible) return;
    this.group.rotation.y += dt * 0.01 * state.rotationSpeed;
    if (this.starMaterial) {
      this.starMaterial.uniforms.uTime.value = state.elapsedTime;
      this.starMaterial.uniforms.uScale.value =
        0.16 * window.innerHeight * Math.min(window.devicePixelRatio || 1, 2);
    }
    const pulse = 1 + Math.sin(state.elapsedTime * 0.7) * 0.05;
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
