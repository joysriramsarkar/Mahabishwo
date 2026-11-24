/**
 * Scale 2: Galaxy Cluster / Local Group.
 * Member galaxies rendered with real 3D tilted spiral / barred-spiral /
 * irregular morphologies, soft stellar disks, plus the distant Virgo &
 * Fornax clusters on the horizon.
 */
import * as THREE from 'three';
import { AppState, SceneLayer } from '../../core/types';
import { GALAXIES, GALAXY_CLUSTERS } from '../../data/cosmicData';
import { buildStarData, createStarPoints, createGlowSprite } from '../helpers';
import { mulberry32, gaussianRandom } from '../../utils/math';

const GALAXY_TILTS: Record<string, [number, number, number]> = {
  milkyway: [0.18, 0.0, -0.12],
  andromeda: [0.72, 0.45, -0.38],
  triangulum: [-0.42, 0.65, 0.28],
  lmc: [0.55, -0.35, 0.2],
  smc: [-0.35, 0.4, -0.45],
};

function makeMiniSpiralTexture(colorHex: string, barred: boolean): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = mulberry32(barred ? 901 : 902);
  const cx = size / 2;
  const cy = size / 2;
  const col = new THREE.Color(colorHex);
  const rC = Math.round(col.r * 255);
  const gC = Math.round(col.g * 255);
  const bC = Math.round(col.b * 255);

  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.24);
  core.addColorStop(0, 'rgba(255,246,230,0.92)');
  core.addColorStop(0.45, `rgba(${rC},${gC},${bC},0.42)`);
  core.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  const armCount = barred ? 2 : 3;
  for (let i = 0; i < 2200; i++) {
    const arm = i % armCount;
    const t = Math.pow(rand(), 0.72);
    const r = (0.06 + t * 0.42) * size;
    const ang = (arm / armCount) * Math.PI * 2 + t * 3.8 + gaussianRandom(rand) * 0.24;
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r;
    const alpha = (1 - t * 0.65) * (0.04 + rand() * 0.06);
    ctx.fillStyle = t < 0.25 ? `rgba(255,235,205,${alpha})` : `rgba(${rC},${gC},${bC},${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.9 + rand() * 2.1, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export class LocalGroupLayer implements SceneLayer {
  public group: THREE.Group = new THREE.Group();
  public visible = false;
  public pickTargets: THREE.Object3D[] = [];

  private haloGroup = new THREE.Group();
  private starMaterials: THREE.ShaderMaterial[] = [];
  private glows: THREE.Sprite[] = [];
  private glowBaseSizes: number[] = [];

  constructor() {
    const rand = mulberry32(31337);

    GALAXIES.forEach((g) => {
      const pos = new THREE.Vector3(...g.position);
      const size = 6 + g.diameterKly * 0.055;
      const isSpiral = g.type === 'spiral' || g.type === 'barred-spiral';
      const tilt = GALAXY_TILTS[g.id] || [0.3, 0.2, 0];

      const gGroup = new THREE.Group();
      gGroup.position.copy(pos);
      gGroup.rotation.set(tilt[0], tilt[1], tilt[2]);
      this.haloGroup.add(gGroup);

      // Soft outer halo & bright nucleus
      const halo = createGlowSprite(g.color, size * (isSpiral ? 0.9 : 0.75), 0.24);
      gGroup.add(halo);
      this.glows.push(halo);
      this.glowBaseSizes.push(size * (isSpiral ? 0.9 : 0.75));

      const coreSize = size * (isSpiral ? 0.34 : 0.26);
      const core = createGlowSprite('#fff4e0', coreSize, 0.65, g.color);
      gGroup.add(core);
      this.glows.push(core);
      this.glowBaseSizes.push(coreSize);

      // Tilted 3D disk plane for spirals
      if (isSpiral) {
        const diskTex = makeMiniSpiralTexture(g.color, g.type === 'barred-spiral');
        const disk = new THREE.Mesh(
          new THREE.PlaneGeometry(size * 1.35, size * 1.35),
          new THREE.MeshBasicMaterial({
            map: diskTex,
            transparent: true,
            opacity: 0.58,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
          })
        );
        disk.rotation.x = -Math.PI / 2;
        gGroup.add(disk);
      }

      // Click/tap pick sphere
      const pick = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(6, size * 0.62), 12, 12),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
      );
      pick.userData = { pickType: 'galaxy', galaxyId: g.id };
      gGroup.add(pick);
      this.pickTargets.push(pick);

      // Morphologically accurate star cloud (spiral arms vs irregular starburst knots)
      const count = isSpiral ? 1300 : 650;
      const baseColor = new THREE.Color(g.color);
      const warmCore = new THREE.Color('#fde6c4');
      const white = new THREE.Color('#ffffff');

      const data = buildStarData(count, () => {
        let sx = 0, sy = 0, sz = 0;
        const c = new THREE.Color();

        if (isSpiral) {
          const p = rand();
          if (p < 0.22) {
            const r = Math.abs(gaussianRandom(rand)) * size * 0.14;
            const th = rand() * Math.PI * 2;
            const ph = Math.acos(2 * rand() - 1);
            sx = r * Math.sin(ph) * Math.cos(th);
            sy = r * Math.cos(ph) * 0.45;
            sz = r * Math.sin(ph) * Math.sin(th);
            c.copy(warmCore).lerp(white, rand() * 0.35);
          } else {
            const armCount = g.type === 'barred-spiral' ? 2 : 3;
            const arm = Math.floor(rand() * armCount);
            const t = Math.pow(rand(), 0.78);
            const r = (0.08 + t * 0.62) * size;
            const ang = (arm / armCount) * Math.PI * 2 + t * 3.8 + gaussianRandom(rand) * 0.32;
            sx = Math.cos(ang) * r;
            sz = Math.sin(ang) * r;
            sy = gaussianRandom(rand) * size * 0.032;
            c.copy(warmCore).lerp(baseColor, Math.min(1, t * 1.4));
            if (rand() < 0.22) c.lerp(white, 0.6);
          }
        } else {
          // Irregular / dwarf galaxy with clumpy starburst knots
          const knot = rand() < 0.35 ? 1 : 0;
          const kx = knot ? size * 0.18 : 0;
          const kz = knot ? -size * 0.1 : 0;
          sx = kx + gaussianRandom(rand) * size * 0.26;
          sy = gaussianRandom(rand) * size * 0.16;
          sz = kz + gaussianRandom(rand) * size * 0.24;
          c.copy(baseColor).lerp(white, rand() * 0.45);
        }

        return {
          pos: [sx, sy, sz],
          color: c,
          size: 0.28 + rand() * 0.48,
          seed: rand(),
        };
      });
      const { points, material } = createStarPoints(data, 0.78);
      this.starMaterials.push(material);
      gGroup.add(points);
    });

    // Distant galaxy clusters (Virgo & Fornax) rendered as rich galaxy swarms + soft halos
    GALAXY_CLUSTERS.filter((c) => c.id !== 'local_group').forEach((cl) => {
      const cPos = new THREE.Vector3(...cl.position);
      const clSize = cl.id === 'virgo_cluster' ? 24 : 18;
      const halo = createGlowSprite(cl.color, clSize, 0.16);
      halo.position.copy(cPos);
      this.haloGroup.add(halo);
      this.glows.push(halo);
      this.glowBaseSizes.push(clSize);

      const swarmCount = cl.id === 'virgo_cluster' ? 900 : 500;
      const clCol = new THREE.Color(cl.color);
      const white = new THREE.Color('#fff5e6');
      const data = buildStarData(swarmCount, () => {
        const r = Math.abs(gaussianRandom(rand)) * (clSize * 0.42);
        const th = rand() * Math.PI * 2;
        const ph = Math.acos(2 * rand() - 1);
        return {
          pos: [
            cPos.x + r * Math.sin(ph) * Math.cos(th),
            cPos.y + r * Math.cos(ph) * 0.72,
            cPos.z + r * Math.sin(ph) * Math.sin(th),
          ],
          color: clCol.clone().lerp(white, rand() * 0.55),
          size: 0.35 + rand() * 0.65,
          seed: rand(),
        };
      });
      const { points, material } = createStarPoints(data, 0.72);
      this.starMaterials.push(material);
      this.haloGroup.add(points);
    });

    this.group.add(this.haloGroup);
  }

  public build(): void {
    // Static layer.
  }

  public update(dt: number, state: AppState): void {
    if (!this.visible) return;
    this.group.rotation.y += dt * 0.01 * Math.min(state.rotationSpeed, 6);
    const scale = 0.16 * window.innerHeight * Math.min(window.devicePixelRatio || 1, 2);
    for (const mat of this.starMaterials) {
      mat.uniforms.uTime.value = state.elapsedTime;
      mat.uniforms.uScale.value = scale;
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
    this.starMaterials = [];
  }
}
