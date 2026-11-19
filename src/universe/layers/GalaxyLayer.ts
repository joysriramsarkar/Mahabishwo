/**
 * Scale 3: Milky Way Galaxy (~100,000 light-years).
 * Barred spiral architecture, HDR star points, central bulge glow,
 * dark dust lanes, halo globular clusters, Sagittarius A* accretion disk
 * and Solar System orbit beacon.
 */
import * as THREE from 'three';
import { AppState, SceneLayer } from '../../core/types';
import { DISK_VERTEX, DISK_FRAGMENT } from '../../render/shaders';
import { TextureFactory } from '../../render/TextureFactory';
import { buildStarData, createStarPoints, createGlowSprite, createOrbitLine } from '../helpers';
import { mulberry32, gaussianRandom } from '../../utils/math';

export const SOLAR_GALACTIC_POS = new THREE.Vector3(15.5, 0.25, 20.8);

export class GalaxyLayer implements SceneLayer {
  public group: THREE.Group = new THREE.Group();
  public visible = false;
  public pickTargets: THREE.Object3D[] = [];

  private starPoints: THREE.Points;
  private starMaterial: THREE.ShaderMaterial;
  private diskMesh: THREE.Mesh | null = null;
  private nebulaGroup = new THREE.Group();
  private dustGroup = new THREE.Group();
  private haloGroup = new THREE.Group();
  private blackHoleGroup = new THREE.Group();
  private diskMaterial: THREE.ShaderMaterial;
  private orbitRing: THREE.LineLoop;
  private solarBeacon: THREE.Mesh;

  constructor() {
    const rand = mulberry32(42108);

    // 1. Spiral arms, bar & bulge stars
    const totalStars = 26000;
    const cCore = new THREE.Color('#fff5e6');
    const cBar = new THREE.Color('#fed7aa');
    const cArmBlue = new THREE.Color('#93c5fd');
    const cHotWhite = new THREE.Color('#f8fafc');
    const cMinorPink = new THREE.Color('#f472b6');
    const tmp = new THREE.Color();

    const barAngle = 0.45;
    const arms = [
      { offset: barAngle, major: true },
      { offset: barAngle + Math.PI, major: true },
      { offset: barAngle + Math.PI * 0.52, major: false },
      { offset: barAngle + Math.PI * 1.52, major: false },
    ];

    const data = buildStarData(totalStars, () => {
      const p = rand();
      let x = 0, y = 0, z = 0;
      let size = 0.32 + rand() * 0.38;

      if (p < 0.16) {
        // Bulge
        const r = Math.abs(gaussianRandom(rand)) * 4.8;
        const theta = rand() * Math.PI * 2;
        const phi = Math.acos(2 * rand() - 1);
        x = r * Math.sin(phi) * Math.cos(theta) * 1.35;
        y = r * Math.cos(phi) * 0.58;
        z = r * Math.sin(phi) * Math.sin(theta) * 1.1;
        tmp.copy(cCore).lerp(cBar, Math.min(1, r / 7));
        size = 0.42 + rand() * 0.5;
      } else if (p < 0.28) {
        // Central bar
        const along = (rand() - 0.5) * 20;
        const across = gaussianRandom(rand) * 1.95;
        const cosB = Math.cos(barAngle);
        const sinB = Math.sin(barAngle);
        x = along * cosB - across * sinB;
        z = along * sinB + across * cosB;
        y = gaussianRandom(rand) * (1.4 * Math.exp(-Math.abs(along) / 14) + 0.4);
        tmp.copy(cBar).lerp(cCore, Math.max(0, 1 - Math.abs(along) / 11));
        size = 0.36 + rand() * 0.42;
      } else if (p < 0.33) {
        // Orion Spur
        const t = rand();
        const r = 21 + t * 11;
        const ang = 0.65 + t * 0.58;
        x = Math.cos(ang) * r + gaussianRandom(rand) * 1.3;
        z = Math.sin(ang) * r + gaussianRandom(rand) * 1.3;
        y = gaussianRandom(rand) * 0.48;
        tmp.copy(cHotWhite).lerp(cArmBlue, rand() * 0.6);
      } else {
        // Spiral arms
        const pick = rand();
        const arm = pick < 0.33 ? arms[0] : pick < 0.66 ? arms[1] : pick < 0.83 ? arms[2] : arms[3];
        const r = 7.5 + Math.pow(rand(), 0.78) * 46;
        const winding = 0.24 * Math.pow(r, 0.76);
        const scatter = (arm.major ? 2.4 : 3.2) * (0.45 + r / 48);
        const angle = arm.offset + winding + (gaussianRandom(rand) * scatter) / Math.max(8, r);
        x = Math.cos(angle) * r + gaussianRandom(rand) * 1.0;
        z = Math.sin(angle) * r + gaussianRandom(rand) * 1.0;
        y = gaussianRandom(rand) * (0.48 + 1.5 * Math.exp(-r / 13));

        const tRad = Math.min(1, r / 50);
        if (arm.major) {
          tmp.copy(cBar).lerp(cArmBlue, Math.min(1, tRad * 1.25));
          if (rand() < 0.28) tmp.lerp(cHotWhite, 0.72);
        } else {
          tmp.copy(cBar).lerp(cMinorPink, tRad * 0.65);
          if (rand() < 0.35) tmp.lerp(cArmBlue, 0.55);
        }
      }

      const bright = 0.65 + rand() * 0.55;
      return {
        pos: [x, y, z],
        color: tmp.clone().multiplyScalar(bright),
        size,
        seed: rand(),
      };
    });

    const { points, material } = createStarPoints(data, 0.8);
    this.starPoints = points;
    this.starMaterial = material;
    this.group.add(points);

    // 1b. Photographic integrated-light disk (soft glow under the star points)
    const diskTex = GalaxyLayer.makeDiskTexture(arms, barAngle);
    const diskMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(118, 118),
      new THREE.MeshBasicMaterial({
        map: diskTex,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    diskMesh.rotation.x = -Math.PI / 2;
    diskMesh.position.y = -0.35;
    diskMesh.renderOrder = -1;
    this.diskMesh = diskMesh;
    this.group.add(diskMesh);

    // 2. Central bulge glow
    const bulgeGlow = createGlowSprite('#fed7aa', 15, 0.3, '#fff7ed');
    this.group.add(bulgeGlow);

    // 2b. Glowing H-II star-forming nebulae along the spiral arms
    for (let i = 0; i < 22; i++) {
      const r = 10 + rand() * 36;
      const arm = arms[i % arms.length];
      const ang = arm.offset + 0.24 * Math.pow(r, 0.76) + (rand() - 0.5) * 0.14;
      const isPink = rand() < 0.65;
      const sp = createGlowSprite(
        isPink ? '#ec4899' : '#38bdf8',
        2.4 + rand() * 3.0,
        0.12 + rand() * 0.08,
        isPink ? '#fbcfe8' : '#bae6fd'
      );
      sp.position.set(Math.cos(ang) * r, (rand() - 0.5) * 0.7, Math.sin(ang) * r);
      this.nebulaGroup.add(sp);
    }
    this.group.add(this.nebulaGroup);

    // 3. Dark dust lanes along inner spiral arms
    const dustTex = TextureFactory.getDustTexture(19);
    for (let i = 0; i < 26; i++) {
      const r = 8 + rand() * 34;
      const arm = arms[i % arms.length];
      const ang = arm.offset + 0.24 * Math.pow(r, 0.76) - 0.12;
      const mat = new THREE.SpriteMaterial({
        map: dustTex,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      });
      const sp = new THREE.Sprite(mat);
      sp.position.set(Math.cos(ang) * r, (rand() - 0.5) * 0.8, Math.sin(ang) * r);
      const s = 5 + rand() * 7;
      sp.scale.set(s, s * 0.45, 1);
      this.dustGroup.add(sp);
    }
    this.group.add(this.dustGroup);

    // 4. Globular clusters in halo
    for (let i = 0; i < 14; i++) {
      const r = 20 + rand() * 36;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const sp = createGlowSprite('#fef3c7', 1.2 + rand() * 1.2, 0.35);
      sp.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi) * 0.85,
        r * Math.sin(phi) * Math.sin(theta)
      );
      this.haloGroup.add(sp);
    }
    this.group.add(this.haloGroup);

    // 5. Sagittarius A* Supermassive Black Hole
    const horizon = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    this.blackHoleGroup.add(horizon);

    const diskGeo = new THREE.RingGeometry(1.3, 3.6, 128, 1);
    const posAttr = diskGeo.attributes.position;
    const uvAttr = diskGeo.attributes.uv;
    const v = new THREE.Vector3();
    for (let i = 0; i < posAttr.count; i++) {
      v.fromBufferAttribute(posAttr, i);
      uvAttr.setXY(i, (v.length() - 1.3) / (3.6 - 1.3), 0.5);
    }
    this.diskMaterial = new THREE.ShaderMaterial({
      vertexShader: DISK_VERTEX,
      fragmentShader: DISK_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 1 },
        uColorHot: { value: new THREE.Color('#fff4cc') },
        uColorCool: { value: new THREE.Color('#ea580c') },
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const disk = new THREE.Mesh(diskGeo, this.diskMaterial);
    disk.rotation.x = Math.PI / 2 - 0.18;
    this.blackHoleGroup.add(disk);

    const photonGlow = createGlowSprite('#fbbf24', 3.4, 0.5, '#fef08a');
    this.blackHoleGroup.add(photonGlow);
    this.group.add(this.blackHoleGroup);

    // 6. Solar System orbit & pulsing marker
    const solarRadius = Math.hypot(SOLAR_GALACTIC_POS.x, SOLAR_GALACTIC_POS.z);
    this.orbitRing = createOrbitLine(solarRadius, '#fef08a', 0.42);
    this.orbitRing.position.y = 0.2;
    this.group.add(this.orbitRing);

    this.solarBeacon = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.35, 36),
      new THREE.MeshBasicMaterial({
        color: 0xfde047,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.solarBeacon.position.copy(SOLAR_GALACTIC_POS);
    this.solarBeacon.rotation.x = Math.PI / 2;
    this.group.add(this.solarBeacon);

    // Tap targets: Solar System beacon & central black hole
    const pickMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    });
    const solarPick = new THREE.Mesh(new THREE.SphereGeometry(3.4, 12, 12), pickMat);
    solarPick.position.copy(SOLAR_GALACTIC_POS);
    solarPick.userData = { pickType: 'solar', id: 'solar' };
    this.group.add(solarPick);
    this.pickTargets.push(solarPick);

    const bhPick = new THREE.Mesh(new THREE.SphereGeometry(3.6, 12, 12), pickMat);
    bhPick.position.set(0, 0, 0);
    bhPick.userData = { pickType: 'blackhole', id: 'sgr_a' };
    this.group.add(bhPick);
    this.pickTargets.push(bhPick);
  }

  /** Soft photographic spiral glow rendered to a canvas texture. */
  private static makeDiskTexture(
    arms: Array<{ offset: number; major: boolean }>,
    barAngle: number
  ): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const rand = mulberry32(777);
    const cx = size / 2;
    const cy = size / 2;
    const px = size / 118; // world unit -> px

    // Warm core glow
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 15 * px);
    core.addColorStop(0, 'rgba(255,240,214,0.55)');
    core.addColorStop(0.4, 'rgba(254,215,170,0.22)');
    core.addColorStop(1, 'rgba(254,215,170,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, size, size);

    // Spiral arm light
    for (let i = 0; i < 5200; i++) {
      const arm = arms[i % arms.length];
      const r = 6 + Math.pow(rand(), 0.72) * 46;
      const winding = 0.24 * Math.pow(r, 0.76);
      const scatter = (arm.major ? 2.2 : 3.1) * (0.45 + r / 48);
      const ang = arm.offset + winding + (gaussianRandom(rand) * scatter) / Math.max(8, r);
      const x = cx + Math.cos(ang) * r * px;
      const y = cy + Math.sin(ang) * r * px * 0.98;
      const t = Math.min(1, r / 50);
      let col = '147,197,253';
      if (t < 0.35) col = '254,215,170';
      else if (rand() < 0.16) col = '244,114,182';
      const a = 0.028 + rand() * 0.05;
      ctx.fillStyle = `rgba(${col},${a})`;
      ctx.beginPath();
      ctx.arc(x, y, 0.8 + rand() * 1.9, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bar light
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(barAngle);
    const barGrad = ctx.createLinearGradient(-10 * px, 0, 10 * px, 0);
    barGrad.addColorStop(0, 'rgba(254,215,170,0)');
    barGrad.addColorStop(0.5, 'rgba(254,215,170,0.16)');
    barGrad.addColorStop(1, 'rgba(254,215,170,0)');
    ctx.fillStyle = barGrad;
    ctx.fillRect(-10 * px, -1.7 * px, 20 * px, 3.4 * px);
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  public build(): void {
    // Static layer.
  }

  public update(dt: number, state: AppState): void {
    if (!this.visible) return;
    if (state.isPlaying) {
      this.group.rotation.y -= dt * 0.06 * state.rotationSpeed;
      const pulse = 1 + Math.sin(state.elapsedTime * 3.0) * 0.16;
      this.solarBeacon.scale.set(pulse, pulse, 1);
    }

    this.starMaterial.uniforms.uTime.value = state.elapsedTime;
    this.starMaterial.uniforms.uScale.value =
      0.16 * window.innerHeight * Math.min(window.devicePixelRatio || 1, 2);
    this.starMaterial.uniforms.uBrightness.value =
      state.density === 'high' ? 0.95 : state.density === 'low' ? 0.6 : 0.8;

    this.diskMaterial.uniforms.uTime.value = state.elapsedTime;

    this.starPoints.visible = state.layers.stars;
    if (this.diskMesh) this.diskMesh.visible = state.layers.stars;
    this.nebulaGroup.visible = state.layers.nebulae;
    this.dustGroup.visible = state.layers.dustLanes;
    this.haloGroup.visible = state.layers.halo;
    this.orbitRing.visible = state.layers.orbits;
  }

  public dispose(): void {
    this.group.clear();
  }
}
