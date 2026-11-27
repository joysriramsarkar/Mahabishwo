/**
 * Scale 3: Individual Galaxies (~60,000–152,000 light-years).
 * Supports diving into Milky Way (barred spiral + Sgr A* + Solar System),
 * Andromeda M31 (unbarred giant spiral + twin nucleus + M32/M110 satellites),
 * Triangulum M33, and the Magellanic Clouds, complete with stellar lifecycle
 * populations and live expanding Supernova events.
 */
import * as THREE from 'three';
import { AppState, SceneLayer } from '../../core/types';
import { DISK_VERTEX, DISK_FRAGMENT, BH_LENS_VERTEX, BH_LENS_FRAGMENT } from '../../render/shaders';
import { TextureFactory } from '../../render/TextureFactory';
import {
  buildStarData,
  createStarPoints,
  createGlowSprite,
  createOrbitLine,
  disposeObject,
} from '../helpers';
import { mulberry32, gaussianRandom, densityBrightness, densityPointScale } from '../../utils/math';

export const SOLAR_GALACTIC_POS = new THREE.Vector3(15.5, 0.25, 20.8);
export const M32_REL_POS = new THREE.Vector3(22, 8.5, -16);
export const M110_REL_POS = new THREE.Vector3(-28, -11, 19);

interface SupernovaKnot {
  pos: THREE.Vector3;
}

export class GalaxyLayer implements SceneLayer {
  public group: THREE.Group = new THREE.Group();
  public visible = false;
  public activeGalaxyId = 'milkyway';
  public pickTargets: THREE.Object3D[] = [];

  private camera: THREE.Camera;
  private starPoints: THREE.Points | null = null;
  private starMaterial: THREE.ShaderMaterial | null = null;
  private diskMesh: THREE.Mesh | null = null;
  private nebulaGroup = new THREE.Group();
  private dustGroup = new THREE.Group();
  private haloGroup = new THREE.Group();
  private lifecycleGroup = new THREE.Group();
  private lifecycleMat: THREE.ShaderMaterial | null = null;
  private blackHoleGroup = new THREE.Group();
  private diskMaterial: THREE.ShaderMaterial | null = null;
  private bhLensMesh: THREE.Mesh | null = null;
  private bhLensMaterial: THREE.ShaderMaterial | null = null;
  private orbitRing: THREE.LineLoop | null = null;
  private solarBeacon: THREE.Mesh | null = null;

  // Live Supernova burst state
  private snGroup = new THREE.Group();
  private snFlash: THREE.Sprite | null = null;
  private snRing: THREE.Mesh | null = null;
  private snRingMat: THREE.MeshBasicMaterial | null = null;
  private snKnots: SupernovaKnot[] = [];
  private snTimer = 0;
  private snCycleSeconds = 7.5;
  private snActiveIdx = 0;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.build({ galaxyId: 'milkyway' });
  }

  public build(options?: { galaxyId?: string } | Record<string, unknown>): void {
    const galaxyId =
      options && 'galaxyId' in options && typeof options.galaxyId === 'string'
        ? options.galaxyId
        : 'milkyway';

    disposeObject(this.group);
    this.group.clear();
    this.nebulaGroup = new THREE.Group();
    this.dustGroup = new THREE.Group();
    this.haloGroup = new THREE.Group();
    this.lifecycleGroup = new THREE.Group();
    this.blackHoleGroup = new THREE.Group();
    this.snGroup = new THREE.Group();
    this.pickTargets = [];
    this.snKnots = [];
    this.starPoints = null;
    this.starMaterial = null;
    this.diskMesh = null;
    this.diskMaterial = null;
    this.bhLensMesh = null;
    this.bhLensMaterial = null;
    this.orbitRing = null;
    this.solarBeacon = null;
    this.lifecycleMat = null;
    this.snFlash = null;
    this.snRing = null;
    this.snRingMat = null;

    this.activeGalaxyId = galaxyId;
    const rand = mulberry32(42108 + galaxyId.length * 137);

    const isMW = galaxyId === 'milkyway';
    const isM31 = galaxyId === 'andromeda';
    const isM33 = galaxyId === 'triangulum';
    const isIrregular = galaxyId === 'lmc' || galaxyId === 'smc';

    const diskExtent = isM31 ? 64 : isM33 ? 42 : isIrregular ? 28 : 54;
    const totalStars = isIrregular ? 14000 : isM31 ? 28000 : 26000;

    const cCore = new THREE.Color(isM31 ? '#fef0d5' : '#fff5e6');
    const cBar = new THREE.Color(isM31 ? '#f5d0fe' : '#fed7aa');
    const cArmPrimary = new THREE.Color(
      isM31 ? '#c084fc' : isM33 ? '#38bdf8' : isIrregular ? '#f472b6' : '#93c5fd'
    );
    const cHotWhite = new THREE.Color('#f8fafc');
    const cMinorPink = new THREE.Color(isM31 ? '#93c5fd' : '#f472b6');
    const tmp = new THREE.Color();

    const barAngle = isMW ? 0.45 : isM31 ? 0.15 : 0.3;
    const arms = isM31
      ? [
          { offset: 0.2, major: true },
          { offset: 0.2 + Math.PI, major: true },
          { offset: 0.2 + Math.PI * 0.48, major: false },
          { offset: 0.2 + Math.PI * 1.48, major: false },
        ]
      : [
          { offset: barAngle, major: true },
          { offset: barAngle + Math.PI, major: true },
          { offset: barAngle + Math.PI * 0.52, major: false },
          { offset: barAngle + Math.PI * 1.52, major: false },
        ];

    const data = buildStarData(totalStars, () => {
      const p = rand();
      let x = 0, y = 0, z = 0;
      let size = 0.32 + rand() * 0.38;

      if (isIrregular) {
        const knot = rand() < 0.38;
        const kx = knot ? (galaxyId === 'lmc' ? 4.5 : -3.2) : 0;
        const kz = knot ? (galaxyId === 'lmc' ? -3.0 : 2.5) : 0;
        x = kx + gaussianRandom(rand) * diskExtent * 0.34;
        y = gaussianRandom(rand) * diskExtent * 0.16;
        z = kz + gaussianRandom(rand) * diskExtent * 0.3;
        tmp.copy(knot ? cHotWhite : cArmPrimary).lerp(cBar, rand() * 0.45);
        size = 0.34 + rand() * 0.52;
      } else if (p < (isM31 ? 0.22 : 0.16)) {
        // Bulge
        const bulgeScale = isM31 ? 6.4 : isM33 ? 3.2 : 4.8;
        const r = Math.abs(gaussianRandom(rand)) * bulgeScale;
        const theta = rand() * Math.PI * 2;
        const phi = Math.acos(2 * rand() - 1);
        x = r * Math.sin(phi) * Math.cos(theta) * (isMW ? 1.35 : 1.15);
        y = r * Math.cos(phi) * 0.58;
        z = r * Math.sin(phi) * Math.sin(theta) * 1.08;
        tmp.copy(cCore).lerp(cBar, Math.min(1, r / 8));
        size = 0.42 + rand() * 0.52;
      } else if (isMW && p < 0.28) {
        // Milky Way central bar
        const along = (rand() - 0.5) * 20;
        const across = gaussianRandom(rand) * 1.95;
        const cosB = Math.cos(barAngle);
        const sinB = Math.sin(barAngle);
        x = along * cosB - across * sinB;
        z = along * sinB + across * cosB;
        y = gaussianRandom(rand) * (1.4 * Math.exp(-Math.abs(along) / 14) + 0.4);
        tmp.copy(cBar).lerp(cCore, Math.max(0, 1 - Math.abs(along) / 11));
        size = 0.36 + rand() * 0.42;
      } else if (isMW && p < 0.33) {
        // Orion Spur
        const t = rand();
        const r = 21 + t * 11;
        const ang = 0.65 + t * 0.58;
        x = Math.cos(ang) * r + gaussianRandom(rand) * 1.3;
        z = Math.sin(ang) * r + gaussianRandom(rand) * 1.3;
        y = gaussianRandom(rand) * 0.48;
        tmp.copy(cHotWhite).lerp(cArmPrimary, rand() * 0.6);
      } else {
        // Spiral arms / M31 concentric dust-ringed spiral
        const pick = rand();
        const arm = pick < 0.33 ? arms[0] : pick < 0.66 ? arms[1] : pick < 0.83 ? arms[2] : arms[3];
        const r = (isM31 ? 8.5 : 6.5) + Math.pow(rand(), 0.78) * (diskExtent - 7);
        const windingRate = isM31 ? 0.32 : isM33 ? 0.2 : 0.24;
        const winding = windingRate * Math.pow(r, 0.76);
        const scatter = (arm.major ? 2.2 : 3.1) * (0.45 + r / diskExtent);
        const angle = arm.offset + winding + (gaussianRandom(rand) * scatter) / Math.max(8, r);
        x = Math.cos(angle) * r + gaussianRandom(rand) * 1.0;
        z = Math.sin(angle) * r + gaussianRandom(rand) * 1.0;
        y = gaussianRandom(rand) * (0.46 + 1.45 * Math.exp(-r / 14));

        const tRad = Math.min(1, r / diskExtent);
        if (arm.major) {
          tmp.copy(cBar).lerp(cArmPrimary, Math.min(1, tRad * 1.25));
          if (rand() < 0.28) tmp.lerp(cHotWhite, 0.72);
        } else {
          tmp.copy(cBar).lerp(cMinorPink, tRad * 0.68);
          if (rand() < 0.35) tmp.lerp(cArmPrimary, 0.55);
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

    if (!isIrregular) {
      // 1b. Photographic integrated-light disk with carved dust lanes
      const diskTex = GalaxyLayer.makeDiskTexture(
        arms,
        barAngle,
        isM31 ? '192,132,252' : isM33 ? '56,189,248' : '147,197,253'
      );
      const diskSpan = diskExtent * 2.18;
      const diskMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(diskSpan, diskSpan),
        new THREE.MeshBasicMaterial({
          map: diskTex,
          transparent: true,
          opacity: isM31 ? 0.52 : 0.48,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      diskMesh.rotation.x = -Math.PI / 2;
      diskMesh.position.y = -0.25;
      diskMesh.renderOrder = -1;
      this.diskMesh = diskMesh;
      this.group.add(diskMesh);
    }

    // 2. 3D Oblate Galactic Bulge (plus Andromeda twin nucleus asymmetry)
    const bulgeSize = isM31 ? 6.6 : isIrregular ? 3.2 : 5.2;
    const bulgeInner = new THREE.Mesh(
      new THREE.SphereGeometry(bulgeSize, 32, 24),
      new THREE.MeshBasicMaterial({
        color: isM31 ? '#fde68a' : '#fff3db',
        transparent: true,
        opacity: isIrregular ? 0.14 : 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    bulgeInner.scale.set(isMW ? 1.38 : 1.18, 0.56, 1.05);
    bulgeInner.rotation.y = -barAngle;
    this.group.add(bulgeInner);

    if (isM31) {
      // Andromeda's iconic twin nuclear disk (P1/P2 eccentric stellar disk)
      const p1Glow = createGlowSprite('#fef08a', 4.6, 0.55, '#ffffff');
      p1Glow.position.set(1.6, 0.1, 0.8);
      this.group.add(p1Glow);
    }

    const bulgeOuter = new THREE.Mesh(
      new THREE.SphereGeometry(bulgeSize * 1.85, 32, 24),
      new THREE.MeshBasicMaterial({
        color: isM31 ? '#d8b4fe' : '#fdba74',
        transparent: true,
        opacity: isIrregular ? 0.06 : 0.09,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    bulgeOuter.scale.set(1.42, 0.48, 1.02);
    bulgeOuter.rotation.y = -barAngle;
    this.group.add(bulgeOuter);

    const bulgeGlow = createGlowSprite(isM31 ? '#e9d5ff' : '#fed7aa', bulgeSize * 2.8, 0.26, '#fff7ed');
    this.group.add(bulgeGlow);

    // 2b. Glowing H-II star-forming nebulae lying IN the galactic disk plane
    const nebPinkTex = TextureFactory.getGlowTexture('rgba(253,213,234,0.9)', '#ec4899', 'rgba(0,0,0,0)');
    const nebBlueTex = TextureFactory.getGlowTexture('rgba(207,242,254,0.9)', '#38bdf8', 'rgba(0,0,0,0)');
    for (let i = 0; i < (isIrregular ? 18 : 30); i++) {
      let nx = 0, ny = 0, nz = 0;
      if (isIrregular) {
        nx = (rand() - 0.5) * diskExtent * 0.7;
        nz = (rand() - 0.5) * diskExtent * 0.7;
        ny = (rand() - 0.5) * 1.4;
      } else {
        const r = 10 + rand() * (diskExtent - 14);
        const arm = arms[i % arms.length];
        const ang = arm.offset + (isM31 ? 0.32 : 0.24) * Math.pow(r, 0.76) + (rand() - 0.5) * 0.14;
        nx = Math.cos(ang) * r;
        nz = Math.sin(ang) * r;
        ny = (rand() - 0.5) * 0.55;
      }
      this.snKnots.push({ pos: new THREE.Vector3(nx, ny, nz) });

      const isPink = rand() < 0.65;
      const mat = new THREE.MeshBasicMaterial({
        map: isPink ? nebPinkTex : nebBlueTex,
        transparent: true,
        opacity: 0.24 + rand() * 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const s = 2.6 + rand() * 3.4;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.68), mat);
      plane.position.set(nx, ny, nz);
      plane.rotation.x = -Math.PI / 2 + (rand() - 0.5) * 0.16;
      plane.rotation.z = rand() * Math.PI;
      this.nebulaGroup.add(plane);
    }
    this.group.add(this.nebulaGroup);

    // 2c. Stellar Lifecycle Highlights (O/B Supergiants, Red Giants, White Dwarfs / Neutron Stars)
    const lifecycleData = buildStarData(160, (idx) => {
      const knot = this.snKnots[idx % this.snKnots.length]?.pos ?? new THREE.Vector3(12, 0, 12);
      const px = knot.x + gaussianRandom(rand) * 3.8;
      const py = knot.y + gaussianRandom(rand) * 0.6;
      const pz = knot.z + gaussianRandom(rand) * 3.8;
      const kind = idx % 3;
      // 0: Red Supergiant, 1: Blue O/B Supergiant, 2: White Dwarf / Neutron Pulsar
      const col = new THREE.Color(kind === 0 ? '#fb7185' : kind === 1 ? '#60a5fa' : '#e0f2fe');
      return {
        pos: [px, py, pz],
        color: col,
        size: kind === 2 ? 0.95 : 1.35 + rand() * 0.55,
        seed: rand(),
      };
    });
    const lc = createStarPoints(lifecycleData, 1.35);
    this.lifecycleMat = lc.material;
    this.lifecycleGroup.add(lc.points);
    this.group.add(this.lifecycleGroup);

    // 2d. Periodic Live Supernova Flash + Expanding Ionized Shockwave Ring
    this.snFlash = createGlowSprite('#bae6fd', 4.5, 0.0, '#ffffff');
    this.snGroup.add(this.snFlash);
    this.snRingMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.snRing = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.0, 48), this.snRingMat);
    this.snRing.rotation.x = -Math.PI / 2;
    this.snGroup.add(this.snRing);
    if (this.snKnots.length > 0) {
      this.snGroup.position.copy(this.snKnots[0].pos);
    }
    this.group.add(this.snGroup);

    // 3. Dark dust lanes lying IN the galactic plane
    if (!isIrregular) {
      const dustTex = TextureFactory.getDustTexture(19);
      for (let i = 0; i < 36; i++) {
        const r = 7.5 + rand() * (diskExtent - 14);
        const arm = arms[i % arms.length];
        const ang = arm.offset + (isM31 ? 0.32 : 0.24) * Math.pow(r, 0.76) - 0.12;
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
    }

    // 4. Globular clusters in halo + Andromeda's M32 & M110 dwarf satellites
    const haloCount = isM31 ? 22 : 14;
    for (let i = 0; i < haloCount; i++) {
      const r = 20 + rand() * (diskExtent * 0.65);
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
    if (isM31) {
      const m32Glow = createGlowSprite('#fde68a', 6.5, 0.55, '#ffffff');
      m32Glow.position.copy(M32_REL_POS);
      this.haloGroup.add(m32Glow);
      const m110Glow = createGlowSprite('#e2e8f0', 8.2, 0.42, '#f8fafc');
      m110Glow.position.copy(M110_REL_POS);
      this.haloGroup.add(m110Glow);
    }
    this.group.add(this.haloGroup);

    // 5. Central Supermassive Black Hole (Sagittarius A* or M31-P3 140M M_sun)
    if (!isIrregular && !isM33) {
      const bhScale = isM31 ? 1.35 : 1.0;
      const horizon = new THREE.Mesh(
        new THREE.SphereGeometry(1.15 * bhScale, 48, 48),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
      );
      this.blackHoleGroup.add(horizon);

      const diskGeo = new THREE.RingGeometry(1.3 * bhScale, 3.6 * bhScale, 128, 1);
      const posAttr = diskGeo.attributes.position;
      const uvAttr = diskGeo.attributes.uv;
      const v = new THREE.Vector3();
      for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i);
        uvAttr.setXY(i, (v.length() - 1.3 * bhScale) / (2.3 * bhScale), 0.5);
      }
      this.diskMaterial = new THREE.ShaderMaterial({
        vertexShader: DISK_VERTEX,
        fragmentShader: DISK_FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 1 },
          uColorHot: { value: new THREE.Color('#fff4cc') },
          uColorCool: { value: new THREE.Color(isM31 ? '#9333ea' : '#ea580c') },
        },
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const disk = new THREE.Mesh(diskGeo, this.diskMaterial);
      disk.rotation.x = Math.PI / 2 - 0.18;
      this.blackHoleGroup.add(disk);

      this.bhLensMaterial = new THREE.ShaderMaterial({
        vertexShader: BH_LENS_VERTEX,
        fragmentShader: BH_LENS_FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 1 },
          uColorHot: { value: new THREE.Color('#fff4cc') },
          uColorCool: { value: new THREE.Color(isM31 ? '#a855f7' : '#f97316') },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this.bhLensMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.8 * bhScale, 7.8 * bhScale), this.bhLensMaterial);
      this.bhLensMesh.frustumCulled = false;
      this.blackHoleGroup.add(this.bhLensMesh);

      const photonGlow = createGlowSprite(isM31 ? '#c084fc' : '#fbbf24', 3.4 * bhScale, 0.38, '#fef08a');
      this.blackHoleGroup.add(photonGlow);
      this.group.add(this.blackHoleGroup);
    }

    // 6. Milky Way Solar System orbit & pulsing marker + tap pickTargets
    const pickMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    });

    if (isMW) {
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

      const solarPick = new THREE.Mesh(new THREE.SphereGeometry(3.4, 12, 12), pickMat);
      solarPick.position.copy(SOLAR_GALACTIC_POS);
      solarPick.userData = { pickType: 'solar', id: 'solar' };
      this.group.add(solarPick);
      this.pickTargets.push(solarPick);
    }

    if (!isIrregular && !isM33) {
      const bhPick = new THREE.Mesh(new THREE.SphereGeometry(3.8, 12, 12), pickMat);
      bhPick.position.set(0, 0, 0);
      bhPick.userData = { pickType: 'blackhole', id: isM31 ? 'm31_bh' : 'sgr_a' };
      this.group.add(bhPick);
      this.pickTargets.push(bhPick);
    }
  }

  /** Soft photographic spiral glow (1024px) with carved inner-arm dust lanes. */
  private static makeDiskTexture(
    arms: Array<{ offset: number; major: boolean }>,
    barAngle: number,
    armRgb = '147,197,253'
  ): THREE.CanvasTexture {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const rand = mulberry32(777);
    const cx = size / 2;
    const cy = size / 2;
    const px = size / 118;

    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 17 * px);
    core.addColorStop(0, 'rgba(255,243,218,0.62)');
    core.addColorStop(0.35, 'rgba(254,215,170,0.26)');
    core.addColorStop(1, 'rgba(254,215,170,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 9500; i++) {
      const arm = arms[i % arms.length];
      const r = 5.5 + Math.pow(rand(), 0.74) * 47;
      const winding = 0.24 * Math.pow(r, 0.76);
      const scatter = (arm.major ? 2.1 : 3.0) * (0.42 + r / 48);
      const ang = arm.offset + winding + (gaussianRandom(rand) * scatter) / Math.max(8, r);
      const x = cx + Math.cos(ang) * r * px;
      const y = cy + Math.sin(ang) * r * px * 0.98;
      const t = Math.min(1, r / 50);
      let col = armRgb;
      if (t < 0.36) col = '254,215,170';
      else if (rand() < 0.16) col = '244,114,182';
      const a = 0.024 + rand() * 0.044;
      ctx.fillStyle = `rgba(${col},${a})`;
      ctx.beginPath();
      ctx.arc(x, y, (0.9 + rand() * 2.1) * (size / 512), 0, Math.PI * 2);
      ctx.fill();
    }

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

  public getSupernovaWorldPosition(): THREE.Vector3 {
    return this.snGroup.position.clone();
  }

  public update(dt: number, state: AppState): void {
    if (!this.visible) return;
    if (state.isPlaying) {
      this.group.rotation.y -= dt * 0.06 * Math.min(state.rotationSpeed, 6);
      if (this.solarBeacon) {
        const pulse = 1 + Math.sin(state.elapsedTime * 3.0) * 0.16;
        this.solarBeacon.scale.set(pulse, pulse, 1);
      }

      // Live expanding Supernova burst cycle
      this.snTimer += dt;
      if (this.snTimer >= this.snCycleSeconds && this.snKnots.length > 0) {
        this.snTimer = 0;
        this.snActiveIdx = (this.snActiveIdx + 5) % this.snKnots.length;
        this.snGroup.position.copy(this.snKnots[this.snActiveIdx].pos);
      }
      const phase = this.snTimer / this.snCycleSeconds;
      if (this.snFlash && this.snRing && this.snRingMat) {
        const flashIntensity = phase < 0.18 ? phase / 0.18 : Math.max(0, 1 - (phase - 0.18) / 0.55);
        const s = 1.6 + flashIntensity * 4.8;
        this.snFlash.scale.set(s, s, 1);
        (this.snFlash.material as THREE.SpriteMaterial).opacity = flashIntensity * 0.95;

        const ringR = 0.6 + phase * 5.2;
        this.snRing.scale.setScalar(ringR);
        this.snRingMat.opacity = Math.max(0, (1 - phase) * 0.72);
      }
    }

    const ptScale =
      0.16 * window.innerHeight * Math.min(window.devicePixelRatio || 1, 2) * densityPointScale(state.density);
    if (this.starMaterial) {
      this.starMaterial.uniforms.uTime.value = state.elapsedTime;
      this.starMaterial.uniforms.uScale.value = ptScale;
      this.starMaterial.uniforms.uBrightness.value = densityBrightness(state.density);
    }
    if (this.lifecycleMat) {
      this.lifecycleMat.uniforms.uTime.value = state.elapsedTime;
      this.lifecycleMat.uniforms.uScale.value = ptScale;
      this.lifecycleMat.uniforms.uBrightness.value = densityBrightness(state.density) * 1.45;
    }

    if (this.diskMaterial) {
      this.diskMaterial.uniforms.uTime.value = state.elapsedTime;
    }
    if (this.bhLensMesh && this.bhLensMaterial) {
      this.bhLensMaterial.uniforms.uTime.value = state.elapsedTime;
      this.bhLensMesh.quaternion
        .copy(this.group.quaternion)
        .invert()
        .multiply(this.camera.quaternion);
    }

    if (this.starPoints) this.starPoints.visible = state.layers.stars;
    if (this.diskMesh) this.diskMesh.visible = state.layers.stars;
    this.lifecycleGroup.visible = state.layers.stars;
    this.snGroup.visible = state.layers.nebulae;
    this.nebulaGroup.visible = state.layers.nebulae;
    this.dustGroup.visible = state.layers.dustLanes;
    this.haloGroup.visible = state.layers.halo;
    if (this.orbitRing) this.orbitRing.visible = state.layers.orbits;
  }

  public dispose(): void {
    disposeObject(this.group);
    this.group.clear();
  }
}
