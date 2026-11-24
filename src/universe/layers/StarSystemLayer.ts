/**
 * Scale 4: Star Systems Layer (~100 AU).
 * Hosts Solar System, Proxima Centauri, TRAPPIST-1 and Kepler-186.
 * Animated photosphere shader, rayed corona billboard, physically-shaded planets,
 * clouds, atmospheres, rings, moons, habitable zone and asteroid belt.
 */
import * as THREE from 'three';
import { AppState, SceneLayer, PlanetData } from '../../core/types';
import { STAR_SYSTEMS_CATALOG, ORBIT_PERIOD_DAYS } from '../../data/cosmicData';
import { SUN_VERTEX, SUN_FRAGMENT, PROMINENCE_VERTEX, PROMINENCE_FRAGMENT } from '../../render/shaders';
import { TextureFactory } from '../../render/TextureFactory';
import { RealTextures } from '../../render/RealTextures';
import {
  buildStarData,
  createStarPoints,
  createShaderGlow,
  createOrbitLine,
  createRingMesh,
  createAtmosphere,
  disposeObject,
  enablePlanetSurfaceEffects,
  updatePlanetCloudShadowMap,
  enableCloudNightFade,
} from '../helpers';
import { mulberry32, gaussianRandom } from '../../utils/math';

export interface ActivePlanetItem {
  data: PlanetData;
  group: THREE.Group;
  mesh: THREE.Mesh;
  cloudsMesh: THREE.Mesh | null;
  moonPivot: THREE.Group | null;
  orbitMaterial: THREE.ShaderMaterial;
  angle: number;
  /** Physically-derived angular velocity (rad/s) from the real orbital period. */
  angularSpeed: number;
}

/** Visual seconds for one orbit of the fastest planet in each system. */
const VISUAL_ORBIT_SECONDS = 24;

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
  private asteroidPoints: THREE.Points | null = null;
  private asteroidMat: THREE.ShaderMaterial | null = null;

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
    this.asteroidPoints = null;
    this.asteroidMat = null;
    this.group.add(this.orbitLinesGroup);

    this.activeSystemId = systemId;
    const sys = STAR_SYSTEMS_CATALOG[systemId] || STAR_SYSTEMS_CATALOG.solar;
    const rand = mulberry32(8822 + systemId.length * 91);

    // Physically-correct relative speeds: angular velocity ∝ 1 / real orbital period.
    // Normalise the innermost (fastest) world to a watchable VISUAL_ORBIT_SECONDS.
    const periods = sys.planets.map(
      (p) => ORBIT_PERIOD_DAYS[p.id] ?? 365.25 * Math.pow(p.orbitRadius / 19.8, 1.5)
    );
    const referencePeriod = periods.length ? Math.min(...periods) : 365.25;

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

    // 3. Asteroid belt (Solar System)
    if (systemId === 'solar') {
      const count = 3200;
      const data = buildStarData(count, () => {
        const r = 30.2 + rand() * 4.8;
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
      this.asteroidPoints = points;
      this.asteroidMat = material;
      this.group.add(points);
    }

    // 4. Planets
    sys.planets.forEach((pData, idx) => {
      const isHabitable =
        pData.id === 'earth' ||
        pData.id === 'proxima_b' ||
        pData.id === 't1_e' ||
        pData.id === 'k_f';

      const startAngle = idx * 1.15 + 0.6;
      const orbitLine = createOrbitLine(
        pData.orbitRadius,
        isHabitable ? '#38bdf8' : '#64748b',
        isHabitable ? 0.55 : 0.25,
        192,
        startAngle
      );
      this.orbitLinesGroup.add(orbitLine);

      const planetGroup = new THREE.Group();
      planetGroup.position.set(
        Math.cos(startAngle) * pData.orbitRadius,
        0,
        Math.sin(startAngle) * pData.orbitRadius
      );
      this.group.add(planetGroup);

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

      const pMesh = new THREE.Mesh(new THREE.SphereGeometry(pData.radius, 96, 96), pMat);
      pMesh.rotation.z = pData.tilt || 0;
      pMesh.userData = { pickType: 'planet', planetId: pData.id, systemId };
      planetGroup.add(pMesh);
      // Upgrade to real NASA/USGS photographic map when downloaded
      RealTextures.applyToMaterial(pData.textureType, pMat);

      // Clouds
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
        cloudsMesh.rotation.z = pData.tilt || 0;
        planetGroup.add(cloudsMesh);
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

      // Moon
      let moonPivot: THREE.Group | null = null;
      if (pData.hasMoon) {
        moonPivot = new THREE.Group();
        planetGroup.add(moonPivot);
        const moonTex = TextureFactory.getPlanetTextures('moon', 512, 256);
        const moonMat = new THREE.MeshStandardMaterial({
          map: moonTex.map,
          bumpMap: moonTex.bumpMap ?? null,
          bumpScale: 0.03,
          roughness: 0.92,
        });
        RealTextures.applyToMaterial('moon', moonMat);
        const moonMesh = new THREE.Mesh(
          new THREE.SphereGeometry(pData.radius * 0.27, 32, 32),
          moonMat
        );
        moonMesh.position.set(pData.radius * 2.6, 0, 0);
        moonPivot.add(moonMesh);
      }

      // Planetary rings
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
        ring.mesh.rotation.y = pData.tilt || 0.4;
        planetGroup.add(ring.mesh);
        RealTextures.applyToRingMaterial(pData.hasRings ? 'saturn' : 'uranus', ring.material);
      }

      this.planets.push({
        data: pData,
        group: planetGroup,
        mesh: pMesh,
        cloudsMesh,
        moonPivot,
        orbitMaterial: orbitLine.material as THREE.ShaderMaterial,
        angle: startAngle,
        angularSpeed:
          ((Math.PI * 2) / VISUAL_ORBIT_SECONDS) * (referencePeriod / periods[idx]),
      });
    });
  }

  public getPickTargets(): THREE.Object3D[] {
    const targets: THREE.Object3D[] = this.planets.map((p) => p.mesh);
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

  public update(dt: number, state: AppState): void {
    if (!this.visible) return;

    if (this.starMaterial) {
      this.starMaterial.uniforms.uTime.value = state.elapsedTime;
    }
    if (this.starMesh && state.isPlaying) {
      this.starMesh.rotation.y += dt * 0.08 * state.rotationSpeed;
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
    if (this.asteroidPoints && this.asteroidMat) {
      this.asteroidMat.uniforms.uTime.value = state.elapsedTime;
      this.asteroidMat.uniforms.uScale.value =
        0.16 * window.innerHeight * Math.min(window.devicePixelRatio || 1, 2);
      if (state.isPlaying) {
        this.asteroidPoints.rotation.y += dt * 0.03 * state.rotationSpeed;
      }
    }

    this.planets.forEach((p) => {
      if (state.isPlaying && state.rotationSpeed > 0) {
        p.angle += dt * p.angularSpeed * state.rotationSpeed;
        p.group.position.set(
          Math.cos(p.angle) * p.data.orbitRadius,
          0,
          Math.sin(p.angle) * p.data.orbitRadius
        );
        // Axial spin and cloud drift are deliberately gentle — real rotation
        // would be a blur at this scale; keep them well below orbital motion.
        p.mesh.rotation.y += dt * p.data.rotSpeed * 0.22 * state.rotationSpeed;
        if (p.cloudsMesh) {
          p.cloudsMesh.rotation.y += dt * p.data.rotSpeed * 1.24 * 0.22 * state.rotationSpeed;
        }
        if (p.moonPivot) {
          // Moon: ~27 days vs Earth's ~365 days, but softened for readability.
          p.moonPivot.rotation.y += dt * 0.14 * state.rotationSpeed;
        }
        p.orbitMaterial.uniforms.uHeadAngle.value = p.angle;
      }
    });

    this.orbitLinesGroup.visible = state.layers.orbits;
    if (this.hzMesh) {
      this.hzMesh.visible = state.layers.orbits && state.layers.habitableZones;
    }
  }

  public dispose(): void {
    disposeObject(this.group);
    this.group.clear();
  }
}
