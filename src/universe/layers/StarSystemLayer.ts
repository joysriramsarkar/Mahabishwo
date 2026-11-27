/**
 * Scale 4: Star Systems Layer (~100 AU).
 * Hosts Solar System, Proxima Centauri, TRAPPIST-1 and Kepler-186.
 * Animated photosphere shader, rayed corona billboard, physically-shaded planets,
 * clouds, atmospheres, rings, moons, habitable zone and asteroid belt.
 */
import * as THREE from 'three';
import { AppState, SceneLayer, PlanetData } from '../../core/types';
import {
  STAR_SYSTEMS_CATALOG,
  ORBIT_PERIOD_DAYS,
  ORBIT_ECCENTRICITY,
  ROTATION_PERIOD_DAYS,
  SUN_ROTATION_DAYS,
  PLANET_MOONS,
  MoonData,
  SIM_DAYS_PER_SECOND,
} from '../../data/cosmicData';
import { SUN_VERTEX, SUN_FRAGMENT, PROMINENCE_VERTEX, PROMINENCE_FRAGMENT } from '../../render/shaders';
import { TextureFactory } from '../../render/TextureFactory';
import { RealTextures } from '../../render/RealTextures';
import {
  solveEccentricAnomaly,
  keplerianOrbitPosition,
  TWO_PI,
} from '../../physics/orbitalMechanics';
import {
  buildStarData,
  createStarPoints,
  createShaderGlow,
  createOrbitLine,
  createRingMesh,
  createAtmosphere,
  createGlowSprite,
  disposeObject,
  enablePlanetSurfaceEffects,
  updatePlanetCloudShadowMap,
  enableCloudNightFade,
} from '../helpers';
import { mulberry32, gaussianRandom } from '../../utils/math';

/** One live satellite: rides its pivot, tidally locked, at its real rate. */
export interface ActiveMoon {
  pivot: THREE.Group;
  data: MoonData;
}

export interface ActivePlanetItem {
  data: PlanetData;
  group: THREE.Group;
  /** Carries the axial tilt so the spin axis stays fixed in inertial space (seasons). */
  tiltGroup: THREE.Group;
  mesh: THREE.Mesh;
  cloudsMesh: THREE.Mesh | null;
  moons: ActiveMoon[];
  orbitMaterial: THREE.ShaderMaterial;
  /** Mean anomaly (advances uniformly — Kepler's second law gives variable orbital speed). */
  angle: number;
  /** Mean motion in rad per simulated day: 2π / real orbital period. */
  angularSpeed: number;
  /** Spin rate in rad per simulated day: 2π / real rotation period (sign: retrograde). */
  spinSpeed: number;
  eccentricity: number;
}

/** One Keplerian asteroid/Kuiper-belt band: drawn as points, rotating at its own real rate. */
interface BeltBand {
  points: THREE.Points;
  material: THREE.ShaderMaterial;
  /** Angular velocity in rad per simulated day from Kepler's third law. */
  rate: number;
}

interface ActiveComet {
  planeGroup: THREE.Group;
  bodyGroup: THREE.Group;
  comaGlow: THREE.Sprite;
  ionTail: THREE.Mesh;
  dustTail: THREE.Mesh;
  orbitMaterial: THREE.ShaderMaterial;
  semiMajor: number;
  eccentricity: number;
  meanAnomaly: number;
  angularSpeed: number;
}

/** Sun's spin rate: rad per simulated day. */
const SUN_SPIN_RATE = TWO_PI / SUN_ROTATION_DAYS;

/**
 * Build one satellite system: each moon rides a pivot so it is tidally
 * locked (same hemisphere planetward), orbits prograde at its real period
 * (retrograde when the catalog says so), and sits in the correct plane —
 * the planet's equator for regular satellites, an inclined/ecliptic plane
 * for Earth's Moon and captured Triton.
 */
function buildMoonSystem(
  planetId: string,
  systemId: string,
  planetRadius: number,
  tiltGroup: THREE.Group,
  planetGroup: THREE.Group,
  moons: MoonData[]
): ActiveMoon[] {
  const active: ActiveMoon[] = [];
  moons.forEach((m) => {
    const pivot = new THREE.Group();
    (m.equatorial ? tiltGroup : planetGroup).add(pivot);
    pivot.rotation.z = m.inclination ?? 0;

    const tex = TextureFactory.getPlanetTextures('moon', 256, 128);
    const mat = new THREE.MeshStandardMaterial({
      map: tex.map,
      bumpMap: tex.bumpMap ?? null,
      bumpScale: 0.03,
      roughness: 0.95,
      color: m.color ?? '#c8c4bc',
    });
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(planetRadius * m.radiusRatio, 32, 32),
      mat
    );
    mesh.position.set(planetRadius * m.distanceVR, 0, 0);
    // Tapping a satellite flies you to its host planet.
    mesh.userData = { pickType: 'planet', planetId, systemId };
    pivot.add(mesh);
    active.push({ pivot, data: m });
  });
  return active;
}

export class StarSystemLayer implements SceneLayer {
  public group: THREE.Group = new THREE.Group();
  public visible = false;

  public activeSystemId = 'solar';
  public planets: ActivePlanetItem[] = [];

  private camera: THREE.Camera;
  private starMesh: THREE.Mesh | null = null;
  private starMaterial: THREE.ShaderMaterial | null = null;
  private chromoMesh: THREE.Mesh | null = null;
  private coronaMesh: THREE.Mesh | null = null;
  private coronaMaterial: THREE.ShaderMaterial | null = null;
  private prominenceMesh: THREE.LineSegments | null = null;
  private prominenceMaterial: THREE.ShaderMaterial | null = null;
  private orbitLinesGroup = new THREE.Group();
  private hzMesh: THREE.Mesh | null = null;
  private beltBands: BeltBand[] = [];
  private oortPoints: THREE.Points | null = null;
  private oortMaterial: THREE.ShaderMaterial | null = null;
  public comets: ActiveComet[] = [];

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.group.add(this.orbitLinesGroup);
    this.build({ systemId: 'solar' });
  }

  public build(options?: { systemId?: string } | Record<string, unknown>): void {
    const systemId =
      options && 'systemId' in options && typeof options.systemId === 'string'
        ? options.systemId
        : 'solar';

    // Clean previous system
    disposeObject(this.group);
    this.group.clear();
    this.orbitLinesGroup.clear();
    this.planets = [];
    this.hzMesh = null;
    this.beltBands = [];
    this.oortPoints = null;
    this.oortMaterial = null;
    this.comets = [];
    this.group.add(this.orbitLinesGroup);

    this.activeSystemId = systemId;
    const sys = STAR_SYSTEMS_CATALOG[systemId] || STAR_SYSTEMS_CATALOG.solar;
    const rand = mulberry32(8822 + systemId.length * 91);

    // Real orbital periods (days). Unknown worlds fall back to Kepler's
    // third law scaled from Earth's orbit radius (1 AU = 19.8 units).
    const periods = sys.planets.map(
      (p) => ORBIT_PERIOD_DAYS[p.id] ?? 365.25 * Math.pow(p.orbitRadius / 19.8, 1.5)
    );

    // 1. Host Star — procedural photosphere shader
    const isRed = sys.star.textureType === 'sun_red';
    const isBlue = sys.star.textureType === 'sun_blue';
    const hot = isBlue ? '#f0f9ff' : isRed ? '#fecdd3' : '#fffbeb';
    const mid = isBlue ? '#38bdf8' : isRed ? '#ef4444' : '#fbbf24';
    const cool = isBlue ? '#1d4ed8' : isRed ? '#7f1d1d' : '#b45309';

    const starGeo = new THREE.SphereGeometry(sys.star.radius, 64, 64);
    this.starMaterial = new THREE.ShaderMaterial({
      vertexShader: SUN_VERTEX,
      fragmentShader: SUN_FRAGMENT,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uHot: { value: new THREE.Color(hot) },
        uMid: { value: new THREE.Color(mid) },
        uCool: { value: new THREE.Color(cool) },
        uScale: { value: 4.5 },
        uHDR: { value: 1.2 },
        uOpacity: { value: 1 },
      },
    });
    this.starMesh = new THREE.Mesh(starGeo, this.starMaterial);
    this.starMesh.userData = { pickType: 'star', systemId };
    this.group.add(this.starMesh);

    // Chromosphere inner halo + rayed corona billboard
    const chromo = createShaderGlow(mid, sys.star.radius * 2.75, 0.78, false, 1.4);
    this.chromoMesh = chromo.mesh;
    this.group.add(this.chromoMesh);

    const corona = createShaderGlow(sys.star.glowColor, sys.star.radius * 4.6, 0.52, true, 3.1);
    this.coronaMesh = corona.mesh;
    this.coronaMaterial = corona.material;
    this.group.add(this.coronaMesh);

    // Solar prominences — arching plasma loops above the photosphere
    const prominenceCount = 24;
    const segmentsPerArch = 16;
    const promPositions: number[] = [];
    for (let a = 0; a < prominenceCount; a++) {
      const angle = (a / prominenceCount) * Math.PI * 2;
      for (let s = 0; s < segmentsPerArch - 1; s++) {
        const t1 = s / (segmentsPerArch - 1);
        const t2 = (s + 1) / (segmentsPerArch - 1);
        const p1 = t1 <= 0.5 ? t1 * 2 : (1 - t1) * 2;
        const p2 = t2 <= 0.5 ? t2 * 2 : (1 - t2) * 2;
        promPositions.push(angle / (Math.PI * 2), p1, a / prominenceCount);
        promPositions.push(angle / (Math.PI * 2), p2, a / prominenceCount);
      }
    }
    const promGeo = new THREE.BufferGeometry();
    promGeo.setAttribute('position', new THREE.Float32BufferAttribute(promPositions, 3));
    this.prominenceMaterial = new THREE.ShaderMaterial({
      vertexShader: PROMINENCE_VERTEX,
      fragmentShader: PROMINENCE_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uRadius: { value: sys.star.radius },
        uColor: { value: new THREE.Color('#ff6b35') },
        uOpacity: { value: 1 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.prominenceMesh = new THREE.LineSegments(promGeo, this.prominenceMaterial!);
    this.prominenceMesh.frustumCulled = false;
    this.group.add(this.prominenceMesh);

    // 2. Habitable Zone ring
    if (sys.habitableZone) {
      const hzGeo = new THREE.RingGeometry(sys.habitableZone.inner, sys.habitableZone.outer, 128);
      const hzMat = new THREE.MeshBasicMaterial({
        color: 0x22c55e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
      });
      this.hzMesh = new THREE.Mesh(hzGeo, hzMat);
      this.hzMesh.rotation.x = Math.PI / 2;
      this.orbitLinesGroup.add(this.hzMesh);
    }

    // 3. Asteroid belt (Solar System) — three radial bands, each rotating at
    // its own Kepler rate (~2.3 / 2.7 / 3.1 AU → 3.4 / 4.4 / 5.5 yr), so the
    // belt visibly shears: inner rocks outrun outer ones, as in reality.
    if (systemId === 'solar') {
      const bands = [
        { from: 30.2, to: 31.9, count: 1100, periodDays: 1257 },
        { from: 31.9, to: 33.6, count: 1100, periodDays: 1622 },
        { from: 33.6, to: 35.0, count: 1000, periodDays: 1994 },
      ];
      bands.forEach((band) => {
        const data = buildStarData(band.count, () => {
          const r = band.from + rand() * (band.to - band.from);
          const a = rand() * Math.PI * 2;
          const shade = 0.35 + rand() * 0.3;
          return {
            pos: [
              Math.cos(a) * r + gaussianRandom(rand) * 0.45,
              gaussianRandom(rand) * 0.35,
              Math.sin(a) * r + gaussianRandom(rand) * 0.45,
            ],
            color: new THREE.Color(shade * 0.85, shade * 0.82, shade * 0.78),
            size: 0.22 + rand() * 0.35,
            seed: rand(),
          };
        });
        const { points, material } = createStarPoints(data, 0.6);
        this.group.add(points);
        this.beltBands.push({ points, material, rate: TWO_PI / band.periodDays });
      });

      // 3b. Kuiper Belt beyond Neptune (icy trans-Neptunian belt, ~30-50 AU analog)
      const kuiperBands = [
        { from: 66.0, to: 74.0, count: 950, periodDays: 88000 },
        { from: 74.0, to: 82.0, count: 850, periodDays: 118000 },
      ];
      kuiperBands.forEach((band) => {
        const data = buildStarData(band.count, () => {
          const r = band.from + rand() * (band.to - band.from);
          const a = rand() * Math.PI * 2;
          const shade = 0.4 + rand() * 0.35;
          return {
            pos: [
              Math.cos(a) * r + gaussianRandom(rand) * 0.9,
              gaussianRandom(rand) * 1.1,
              Math.sin(a) * r + gaussianRandom(rand) * 0.9,
            ],
            color: new THREE.Color(shade * 0.68, shade * 0.86, shade),
            size: 0.26 + rand() * 0.42,
            seed: rand(),
          };
        });
        const { points, material } = createStarPoints(data, 0.65);
        this.group.add(points);
        this.beltBands.push({ points, material, rate: TWO_PI / band.periodDays });
      });

      // 3c. Outer Oort Cloud spherical halo of icy planetesimals
      const oortData = buildStarData(1300, () => {
        const r = 104 + rand() * 34;
        const th = rand() * Math.PI * 2;
        const ph = Math.acos(2 * rand() - 1);
        return {
          pos: [
            r * Math.sin(ph) * Math.cos(th),
            r * Math.cos(ph),
            r * Math.sin(ph) * Math.sin(th),
          ],
          color: new THREE.Color('#93c5fd').multiplyScalar(0.35 + rand() * 0.3),
          size: 0.28 + rand() * 0.36,
          seed: rand(),
        };
      });
      const oort = createStarPoints(oortData, 0.55);
      this.oortPoints = oort.points;
      this.oortMaterial = oort.material;
      this.group.add(oort.points);

      // 3d. Eccentric Comet (1P/Halley analog) with dynamic anti-sunward tails
      const cometSemiMajor = 38.0;
      const cometEcc = 0.78;
      const cometPlane = new THREE.Group();
      cometPlane.rotation.set(0.28, 0.42, -0.18);
      this.group.add(cometPlane);

      const cometOrbitPlane = new THREE.Group();
      cometOrbitPlane.rotation.copy(cometPlane.rotation);
      const cometOrbitLine = createOrbitLine(cometSemiMajor, '#38bdf8', 0.44, 220, 0.5, cometEcc);
      cometOrbitPlane.add(cometOrbitLine);
      this.orbitLinesGroup.add(cometOrbitPlane);

      // Keep comet body inside cometPlane (attached to this.group) so toggling orbits never hides the comet
      const cometBody = new THREE.Group();
      cometPlane.add(cometBody);

      const nucleus = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 16, 16),
        new THREE.MeshBasicMaterial({ color: '#f8fafc' })
      );
      cometBody.add(nucleus);

      const comaGlow = createGlowSprite('#7dd3fc', 2.4, 0.85, '#ffffff');
      cometBody.add(comaGlow);

      const ionGeo = new THREE.ConeGeometry(0.45, 7.5, 16, 1, true);
      ionGeo.translate(0, 3.75, 0);
      ionGeo.rotateX(Math.PI / 2);
      const ionTail = new THREE.Mesh(
        ionGeo,
        new THREE.MeshBasicMaterial({
          color: '#38bdf8',
          transparent: true,
          opacity: 0.38,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      cometBody.add(ionTail);

      const dustGeo = new THREE.ConeGeometry(0.75, 5.2, 16, 1, true);
      dustGeo.translate(0, 2.6, 0);
      dustGeo.rotateX(Math.PI / 2);
      const dustTail = new THREE.Mesh(
        dustGeo,
        new THREE.MeshBasicMaterial({
          color: '#fde68a',
          transparent: true,
          opacity: 0.24,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      cometBody.add(dustTail);

      this.comets.push({
        planeGroup: cometPlane,
        bodyGroup: cometBody,
        comaGlow,
        ionTail,
        dustTail,
        orbitMaterial: cometOrbitLine.material as THREE.ShaderMaterial,
        semiMajor: cometSemiMajor,
        eccentricity: cometEcc,
        meanAnomaly: 0.45,
        angularSpeed: TWO_PI / 2800,
      });
    }

    // 4. Planets — one unified physical clock drives every motion
    sys.planets.forEach((pData, idx) => {
      const isHabitable =
        pData.id === 'earth' ||
        pData.id === 'proxima_b' ||
        pData.id === 't1_e' ||
        pData.id === 'k_f';

      const startM = idx * 1.15 + 0.6;
      const ecc = ORBIT_ECCENTRICITY[pData.id] ?? 0;
      const orbitLine = createOrbitLine(
        pData.orbitRadius,
        isHabitable ? '#38bdf8' : '#64748b',
        isHabitable ? 0.55 : 0.25,
        192,
        startM,
        ecc
      );
      this.orbitLinesGroup.add(orbitLine);

      // Place the planet at its true eccentric position; the −sin term keeps
      // the orbit prograde (counterclockwise seen from ecliptic north).
      const startE = solveEccentricAnomaly(startM, ecc);
      const startPos = keplerianOrbitPosition(pData.orbitRadius, ecc, startE);
      const planetGroup = new THREE.Group();
      planetGroup.position.set(startPos.x, 0, startPos.z);
      this.group.add(planetGroup);

      // Axial tilt on a dedicated parent group: the spin axis then stays
      // pointing at a fixed inertial direction while the planet orbits —
      // the geometric cause of the seasons.
      const tiltGroup = new THREE.Group();
      tiltGroup.rotation.z = pData.tilt || 0;
      planetGroup.add(tiltGroup);

      const tex = TextureFactory.getPlanetTextures(pData.textureType, 1024, 512);
      const isGasOrIce =
        pData.textureType === 'jupiter' ||
        pData.textureType === 'saturn' ||
        pData.textureType === 'uranus' ||
        pData.textureType === 'neptune' ||
        pData.textureType === 'venus';
      const pMat = new THREE.MeshStandardMaterial({
        map: tex.map,
        bumpMap: isGasOrIce ? null : (tex.bumpMap ?? null),
        bumpScale: isGasOrIce ? 0 : 0.008,
        roughnessMap: tex.roughnessMap ?? null,
        roughness: isGasOrIce ? 0.72 : 0.86,
        metalness: 0.02,
        emissive: tex.nightMap ? new THREE.Color('#ffe08a') : new THREE.Color('#000000'),
        emissiveMap: tex.nightMap ?? null,
        emissiveIntensity: tex.nightMap ? 0.65 : 0,
      });

      // The mesh spins around the tilted axis (its own local Y).
      const pMesh = new THREE.Mesh(new THREE.SphereGeometry(pData.radius, 96, 96), pMat);
      pMesh.userData = { pickType: 'planet', planetId: pData.id, systemId };
      tiltGroup.add(pMesh);
      // Upgrade to real NASA/USGS photographic map when downloaded
      RealTextures.applyToMaterial(pData.textureType, pMat);

      // Clouds drift just above the surface, inside the same tilted frame
      let cloudsMesh: THREE.Mesh | null = null;
      if (pData.hasClouds && tex.cloudMap) {
        const cMat = new THREE.MeshStandardMaterial({
          map: tex.cloudMap,
          transparent: true,
          opacity: pData.id === 'earth' ? 0.86 : 0.6,
          roughness: 0.9,
          depthWrite: false,
        });
        cloudsMesh = new THREE.Mesh(new THREE.SphereGeometry(pData.radius * 1.022, 96, 96), cMat);
        tiltGroup.add(cloudsMesh);
        enableCloudNightFade(cMat, cloudsMesh);
        if (pData.textureType === 'earth') {
          RealTextures.applyClouds('earth', cMat, (cloudTex) => {
            updatePlanetCloudShadowMap(pMat, cloudTex);
          });
        }
      }

      // Unified surface effects: night terminator lights + moving ray-projected cloud shadows
      enablePlanetSurfaceEffects(pMat, pMesh, {
        nightLights: !!tex.nightMap,
        cloudMap: pData.hasClouds ? tex.cloudMap ?? null : null,
        cloudMesh: cloudsMesh,
        cloudRadiusRatio: 1.022,
        microDetail: !isGasOrIce,
      });

      // Atmosphere rim
      if (pData.atmosphereColor) {
        const atmo = createAtmosphere(
          pData.radius * 1.08,
          pData.atmosphereColor,
          pData.id === 'earth' ? 0.85 : 0.55,
          3.4
        );
        planetGroup.add(atmo.mesh);
      }

      // Satellite system — every catalogued moon at its real period, in the
      // correct plane, tidally locked (see buildMoonSystem for the physics).
      const moons = buildMoonSystem(
        pData.id,
        systemId,
        pData.radius,
        tiltGroup,
        planetGroup,
        PLANET_MOONS[pData.id] ?? []
      );
      // Earth's Moon gets the real photographic surface upgrade.
      if (pData.id === 'earth' && moons.length > 0) {
        const moonMesh = moons[0].pivot.children[0] as THREE.Mesh;
        RealTextures.applyToMaterial('moon', moonMesh.material as THREE.MeshStandardMaterial);
      }

      // Rings lie in the planet's equatorial plane — inside the tilted frame.
      if (pData.hasRings || pData.hasThinRing) {
        const inner = pData.hasRings ? pData.radius * 1.35 : pData.radius * 1.45;
        const outer = pData.hasRings ? pData.radius * 2.55 : pData.radius * 1.85;
        const ring = createRingMesh(
          inner,
          outer,
          pData.hasRings ? '#f5e6c4' : '#93c5fd',
          pData.radius,
          TextureFactory.getRingTexture(pData.hasRings ? 7 : 13)
        );
        ring.mesh.rotation.x = Math.PI / 2;
        tiltGroup.add(ring.mesh);
        RealTextures.applyToRingMaterial(pData.hasRings ? 'saturn' : 'uranus', ring.material);
      }

      this.planets.push({
        data: pData,
        group: planetGroup,
        tiltGroup,
        mesh: pMesh,
        cloudsMesh,
        moons,
        orbitMaterial: orbitLine.material as THREE.ShaderMaterial,
        angle: startM,
        // Mean motion: rad per simulated day, from the real orbital period.
        angularSpeed: TWO_PI / periods[idx],
        // Spin: rad per simulated day, from the real sidereal rotation period.
        spinSpeed: TWO_PI / (ROTATION_PERIOD_DAYS[pData.id] ?? 1),
        eccentricity: ecc,
      });
    });
  }

  public getPickTargets(): THREE.Object3D[] {
    const targets: THREE.Object3D[] = this.planets.map((p) => p.mesh);
    this.planets.forEach((p) => {
      p.moons.forEach((m) => {
        const mesh = m.pivot.children[0];
        if (mesh) targets.push(mesh);
      });
    });
    if (this.starMesh) targets.push(this.starMesh);
    return targets;
  }

  /** Get a planet's current world position (for fly-to anywhere). */
  public getPlanetWorldPosition(planetId: string): THREE.Vector3 | null {
    const item = this.planets.find((p) => p.data.id === planetId);
    if (!item) return null;
    const worldPos = new THREE.Vector3();
    item.group.getWorldPosition(worldPos);
    return worldPos;
  }

  /**
   * Orbital/rotational integration — MUST run every frame, even when the
   * layer is invisible (e.g. while at planet close-up), so the planet you
   * are watching keeps orbiting its star and the tracking camera follows.
   */
  public integrateMotion(dt: number, state: AppState): void {
    if (!state.isPlaying || state.rotationSpeed <= 0) return;
    // One unified physical clock: 1 second = 1 Earth day at speed 1×.
    const dtDays = dt * state.rotationSpeed * SIM_DAYS_PER_SECOND;

    // Sun rotates on its axis with the real 25.4-day Carrington period.
    if (this.starMesh) {
      this.starMesh.rotation.y += dtDays * SUN_SPIN_RATE;
    }

    // Asteroid belt: each band rotates at its own Kepler rate.
    this.beltBands.forEach((band) => {
      band.points.rotation.y += dtDays * band.rate;
    });

    this.planets.forEach((p) => {
      // Mean anomaly grows uniformly; solving Kepler's equation makes the
      // planet sweep faster near perihelion and slower near aphelion.
      p.angle += dtDays * p.angularSpeed;
      const E = solveEccentricAnomaly(p.angle, p.eccentricity);
      const pos = keplerianOrbitPosition(p.data.orbitRadius, p.eccentricity, E);
      p.group.position.set(pos.x, 0, pos.z);
      // Axial spin from the real sidereal rotation period (Venus crawls,
      // Jupiter races; Mercury's 58.6 d vs 88 d year = 3:2 resonance).
      p.mesh.rotation.y += dtDays * p.spinSpeed;
      if (p.cloudsMesh) {
        // Clouds ride the spin plus a gentle zonal drift.
        p.cloudsMesh.rotation.y += dtDays * p.spinSpeed * 1.12;
      }
      // Satellites: real periods, retrograde for Triton, tidal lock inherent.
      p.moons.forEach((m) => {
        const rate = TWO_PI / m.data.periodDays;
        m.pivot.rotation.y += dtDays * (m.data.retrograde ? -rate : rate);
      });
      p.orbitMaterial.uniforms.uHeadAngle.value = E;
    });

    this.comets.forEach((c) => {
      c.meanAnomaly += dtDays * c.angularSpeed;
      const E = solveEccentricAnomaly(c.meanAnomaly, c.eccentricity);
      const a = c.semiMajor;
      const b = a * Math.sqrt(1 - c.eccentricity * c.eccentricity);
      const x = Math.cos(E) * a - a * c.eccentricity;
      const z = -Math.sin(E) * b;
      c.bodyGroup.position.set(x, 0, z);
      c.orbitMaterial.uniforms.uHeadAngle.value = E;

      // Orient tails radially outward from the Sun in planeGroup coordinates
      const rDist = Math.max(4, Math.hypot(x, z));
      const solarFactor = THREE.MathUtils.clamp(28 / rDist, 0.35, 1.9);
      const antiSunYaw = Math.atan2(x, z);
      c.ionTail.rotation.y = antiSunYaw;
      c.dustTail.rotation.y = antiSunYaw + 0.14;
      c.ionTail.scale.set(1, 1, solarFactor);
      c.dustTail.scale.set(1, 1, solarFactor * 0.85);
      const comaScale = 1.6 + solarFactor * 1.1;
      c.comaGlow.scale.set(comaScale, comaScale, 1);
    });
  }

  /** Visual/cosmetic updates only — cheap, gated on layer visibility. */
  public update(dt: number, state: AppState): void {
    if (!this.visible) return;

    if (this.starMaterial) {
      this.starMaterial.uniforms.uTime.value = state.elapsedTime;
    }
    if (this.chromoMesh) {
      this.chromoMesh.quaternion.copy(this.camera.quaternion);
    }
    if (this.coronaMesh && this.coronaMaterial) {
      this.coronaMesh.quaternion.copy(this.camera.quaternion);
      this.coronaMaterial.uniforms.uTime.value = state.elapsedTime;
    }
    if (this.prominenceMesh && this.prominenceMaterial) {
      this.prominenceMaterial.uniforms.uTime.value = state.elapsedTime;
    }
    const ptScale = 0.16 * window.innerHeight * Math.min(window.devicePixelRatio || 1, 2);
    this.beltBands.forEach((band) => {
      band.material.uniforms.uTime.value = state.elapsedTime;
      band.material.uniforms.uScale.value = ptScale;
    });
    if (this.oortPoints && this.oortMaterial) {
      this.oortPoints.visible = state.layers.stars;
      this.oortMaterial.uniforms.uTime.value = state.elapsedTime;
      this.oortMaterial.uniforms.uScale.value = ptScale;
    }

    this.orbitLinesGroup.visible = state.layers.orbits;
    this.comets.forEach((c) => {
      c.orbitMaterial.uniforms.uOpacity.value = state.layers.orbits ? 0.44 : 0.0;
    });
    if (this.hzMesh) {
      this.hzMesh.visible = state.layers.orbits && state.layers.habitableZones;
    }
  }

  public dispose(): void {
    disposeObject(this.group);
    this.group.clear();
  }
}
