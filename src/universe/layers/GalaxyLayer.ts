/**
 * Scale 3: Milky Way Galaxy (~100,000 light-years).
 * Barred spiral architecture, HDR star points, central bulge glow,
 * dark dust lanes, halo globular clusters, Sagittarius A* accretion disk
 * and Solar System orbit beacon.
 */
import * as THREE from 'three';
import { AppState, SceneLayer } from '../../core/types';
import { DISK_VERTEX, DISK_FRAGMENT, BH_LENS_VERTEX, BH_LENS_FRAGMENT } from '../../render/shaders';
import { TextureFactory } from '../../render/TextureFactory';
import { buildStarData, createStarPoints, createGlowSprite, createOrbitLine } from '../helpers';
import { mulberry32, gaussianRandom, densityBrightness, densityPointScale } from '../../utils/math';

export const SOLAR_GALACTIC_POS = new THREE.Vector3(15.5, 0.25, 20.8);

export class GalaxyLayer implements SceneLayer {
  public group: THREE.Group = new THREE.Group();
  public visible = false;
  public pickTargets: THREE.Object3D[] = [];

  private camera: THREE.Camera;
  private starPoints: THREE.Points;
  private starMaterial: THREE.ShaderMaterial;
  private diskMesh: THREE.Mesh | null = null;
  private nebulaGroup = new THREE.Group();
  private dustGroup = new THREE.Group();
  private haloGroup = new THREE.Group();
  private blackHoleGroup = new THREE.Group();
  private diskMaterial: THREE.ShaderMaterial;
  private bhLensMesh: THREE.Mesh | null = null;
  private bhLensMaterial: THREE.ShaderMaterial | null = null;
  private orbitRing: THREE.LineLoop;
  private solarBeacon: THREE.Mesh;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
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

    // 1b. Photographic integrated-light disk (1024px with carved dust lanes)
    const diskTex = GalaxyLayer.makeDiskTexture(arms, barAngle);
    const diskMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(118, 118),
      new THREE.MeshBasicMaterial({
        map: diskTex,
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    diskMesh.rotation.x = -Math.PI / 2;
    diskMesh.position.y = -0.25;
    diskMesh.renderOrder = -1;
    this.diskMesh = diskMesh;
    this.group.add(diskMesh);

    // 2. 3D Oblate Galactic Bulge (nested warm stellar core shells + soft halo)
    const bulgeInner = new THREE.Mesh(
      new THREE.SphereGeometry(5.2, 32, 24),
      new THREE.MeshBasicMaterial({
        color: '#fff3db',
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    bulgeInner.scale.set(1.38, 0.56, 1.05);
    bulgeInner.rotation.y = -barAngle;
    this.group.add(bulgeInner);

    const bulgeOuter = new THREE.Mesh(
      new THREE.SphereGeometry(9.6, 32, 24),
      new THREE.MeshBasicMaterial({
        color: '#fdba74',
        transparent: true,
        opacity: 0.09,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    bulgeOuter.scale.set(1.45, 0.48, 1.02);
    bulgeOuter.rotation.y = -barAngle;
    this.group.add(bulgeOuter);

    const bulgeGlow = createGlowSprite('#fed7aa', 15, 0.26, '#fff7ed');
    this.group.add(bulgeGlow);

    // 2b. Glowing H-II star-forming nebulae lying IN the galactic disk plane
    const nebPinkTex = TextureFactory.getGlowTexture('rgba(253,213,234,0.9)', '#ec4899', 'rgba(0,0,0,0)');
    const nebBlueTex = TextureFactory.getGlowTexture('rgba(207,242,254,0.9)', '#38bdf8', 'rgba(0,0,0,0)');
    for (let i = 0; i < 30; i++) {
      const r = 10 + rand() * 36;
      const arm = arms[i % arms.length];
      const ang = arm.offset + 0.24 * Math.pow(r, 0.76) + (rand() - 0.5) * 0.14;
      const isPink = rand() < 0.65;
      const mat = new THREE.MeshBasicMaterial({
        map: isPink ? nebPinkTex : nebBlueTex,
        transparent: true,
        opacity: 0.22 + rand() * 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const s = 2.6 + rand() * 3.4;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.68), mat);
      plane.position.set(Math.cos(ang) * r, (rand() - 0.5) * 0.55, Math.sin(ang) * r);
      plane.rotation.x = -Math.PI / 2 + (rand() - 0.5) * 0.16;
      plane.rotation.z = -ang + (rand() - 0.5) * 0.4;
      this.nebulaGroup.add(plane);
    }
    this.group.add(this.nebulaGroup);

    // 3. Dark dust lanes lying IN the galactic plane (not camera-facing billboards)
    const dustTex = TextureFactory.getDustTexture(19);
    for (let i = 0; i < 36; i++) {
      const r = 7.5 + rand() * 36;
      const arm = arms[i % arms.length];
      const ang = arm.offset + 0.24 * Math.pow(r, 0.76) - 0.12;
      const mat = new THREE.MeshBasicMaterial({
        map: dustTex,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const s = 5.5 + rand() * 7.5;
      const lane = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.42), mat);
      lane.position.set(Math.cos(ang) * r, (rand() - 0.5) * 0.45, Math.sin(ang) * r);
      lane.rotation.x = -Math.PI / 2 + (rand() - 0.5) * 0.1;
      lane.rotation.z = -ang + 0.28;
      this.dustGroup.add(lane);
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

    // Gravitational lensing halo + photon sphere ring (camera-facing)
    this.bhLensMaterial = new THREE.ShaderMaterial({
      vertexShader: BH_LENS_VERTEX,
      fragmentShader: BH_LENS_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 1 },
        uColorHot: { value: new THREE.Color('#fff4cc') },
        uColorCool: { value: new THREE.Color('#f97316') },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.bhLensMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 7.8), this.bhLensMaterial);
    this.bhLensMesh.frustumCulled = false;
    this.blackHoleGroup.add(this.bhLensMesh);

    const photonGlow = createGlowSprite('#fbbf24', 3.4, 0.38, '#fef08a');
    this.blackHoleGroup.add(photonGlow);
    this.group.add(this.blackHoleGroup);

    // 6. Solar System orbit & pulsing marker
    const solarRadius = Math.hypot(SOLAR_GALACTIC_POS.x, SOLAR_GALACTIC_POS.z);
    const solarAngle = Math.atan2(SOLAR_GALACTIC_POS.z, SOLAR_GALACTIC_POS.x);
    this.orbitRing = createOrbitLine(solarRadius, '#fef08a', 0.42, 220, solarAngle);
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

  /** Soft photographic spiral glow (1024px) with carved inner-arm dust lanes. */
  private static makeDiskTexture(
    arms: Array<{ offset: number; major: boolean }>,
    barAngle: number
  ): THREE.CanvasTexture {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const rand = mulberry32(777);
    const cx = size / 2;
    const cy = size / 2;
    const px = size / 118; // world unit -> px

    // Warm core glow
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 17 * px);
    core.addColorStop(0, 'rgba(255,243,218,0.62)');
    core.addColorStop(0.35, 'rgba(254,215,170,0.26)');
    core.addColorStop(1, 'rgba(254,215,170,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, size, size);

    // Spiral arm star clouds
    for (let i = 0; i < 9500; i++) {
      const arm = arms[i % arms.length];
      const r = 5.5 + Math.pow(rand(), 0.74) * 47;
      const winding = 0.24 * Math.pow(r, 0.76);
      const scatter = (arm.major ? 2.1 : 3.0) * (0.42 + r / 48);
      const ang = arm.offset + winding + (gaussianRandom(rand) * scatter) / Math.max(8, r);
      const x = cx + Math.cos(ang) * r * px;
      const y = cy + Math.sin(ang) * r * px * 0.98;
      const t = Math.min(1, r / 50);
      let col = '147,197,253';
      if (t < 0.36) col = '254,215,170';
      else if (rand() < 0.16) col = '244,114,182';
      const a = 0.024 + rand() * 0.044;
      ctx.fillStyle = `rgba(${col},${a})`;
      ctx.beginPath();
      ctx.arc(x, y, (0.9 + rand() * 2.1) * (size / 512), 0, Math.PI * 2);
      ctx.fill();
    }

    // Carve inner-edge dust lanes using destination-out so dark lanes break up the glow
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 1600; i++) {
      const arm = arms[i % arms.length];
      const r = 7 + rand() * 38;
      const winding = 0.24 * Math.pow(r, 0.76);
      const ang = arm.offset + winding - 0.095 + gaussianRandom(rand) * 0.045;
      const x = cx + Math.cos(ang) * r * px;
      const y = cy + Math.sin(ang) * r * px * 0.98;
      ctx.fillStyle = `rgba(0,0,0,${0.08 + rand() * 0.16})`;
      ctx.beginPath();
      ctx.arc(x, y, (1.4 + rand() * 2.6) * (size / 512), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Bar light
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(barAngle);
    const barGrad = ctx.createLinearGradient(-11 * px, 0, 11 * px, 0);
    barGrad.addColorStop(0, 'rgba(254,215,170,0)');
    barGrad.addColorStop(0.5, 'rgba(254,215,170,0.2)');
    barGrad.addColorStop(1, 'rgba(254,215,170,0)');
    ctx.fillStyle = barGrad;
    ctx.fillRect(-11 * px, -1.9 * px, 22 * px, 3.8 * px);
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
      // Milky Way spins clockwise viewed from the north galactic pole (real).
      // The whole-disk rate is a presentation cadence, capped so extreme
      // time-scales (needed for Neptune) don't turn it into a blur.
      this.group.rotation.y -= dt * 0.06 * Math.min(state.rotationSpeed, 6);
      const pulse = 1 + Math.sin(state.elapsedTime * 3.0) * 0.16;
      this.solarBeacon.scale.set(pulse, pulse, 1);
    }

    this.starMaterial.uniforms.uTime.value = state.elapsedTime;
    this.starMaterial.uniforms.uScale.value =
      0.16 * window.innerHeight * Math.min(window.devicePixelRatio || 1, 2) * densityPointScale(state.density);
    this.starMaterial.uniforms.uBrightness.value = densityBrightness(state.density);

    this.diskMaterial.uniforms.uTime.value = state.elapsedTime;
    if (this.bhLensMesh && this.bhLensMaterial) {
      this.bhLensMaterial.uniforms.uTime.value = state.elapsedTime;
      this.bhLensMesh.quaternion
        .copy(this.group.quaternion)
        .invert()
        .multiply(this.camera.quaternion);
    }

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
