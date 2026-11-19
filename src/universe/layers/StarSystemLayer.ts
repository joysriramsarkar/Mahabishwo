/**
 * Scale 4: Star Systems Layer (~100 AU).
 * Hosts Solar System, Proxima Centauri, TRAPPIST-1 and Kepler-186.
 * Animated photosphere shader, rayed corona billboard, physically-shaded planets,
 * clouds, atmospheres, rings, moons, habitable zone and asteroid belt.
 */
import * as THREE from 'three';
import { AppState, SceneLayer, PlanetData } from '../../core/types';
import { STAR_SYSTEMS_CATALOG } from '../../data/cosmicData';
import { SUN_VERTEX, SUN_FRAGMENT } from '../../render/shaders';
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
} from '../helpers';
import { mulberry32, gaussianRandom } from '../../utils/math';

export interface ActivePlanetItem {
  data: PlanetData;
  group: THREE.Group;
  mesh: THREE.Mesh;
  cloudsMesh: THREE.Mesh | null;
  moonPivot: THREE.Group | null;
  angle: number;
}

export class StarSystemLayer implements SceneLayer {
  public group: THREE.Group = new THREE.Group();
  public visible = false;

  public activeSystemId = 'solar';
  public planets: ActivePlanetItem[] = [];

  private camera: THREE.Camera;
  private starMesh: THREE.Mesh | null = null;
  private starMaterial: THREE.ShaderMaterial | null = null;
  private coronaMesh: THREE.Mesh | null = null;
  private coronaMaterial: THREE.ShaderMaterial | null = null;
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

    // Corona billboard with rays
    const corona = createShaderGlow(sys.star.glowColor, sys.star.radius * 4.4, 0.55, true, 3.1);
    this.coronaMesh = corona.mesh;
    this.coronaMaterial = corona.material;
    this.group.add(this.coronaMesh);

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

      const orbitLine = createOrbitLine(
        pData.orbitRadius,
        isHabitable ? '#38bdf8' : '#64748b',
        isHabitable ? 0.55 : 0.25
      );
      this.orbitLinesGroup.add(orbitLine);

      const startAngle = idx * 1.15 + 0.6;
      const planetGroup = new THREE.Group();
      planetGroup.position.set(
        Math.cos(startAngle) * pData.orbitRadius,
        0,
        Math.sin(startAngle) * pData.orbitRadius
      );
      this.group.add(planetGroup);

      const tex = TextureFactory.getPlanetTextures(pData.textureType, 1024, 512);
      const pMat = new THREE.MeshStandardMaterial({
        map: tex.map,
        bumpMap: tex.bumpMap ?? null,
        bumpScale: 0.04,
        roughnessMap: tex.roughnessMap ?? null,
        roughness: 0.85,
        metalness: 0.04,
        emissive: tex.nightMap ? new THREE.Color('#ffe08a') : new THREE.Color('#000000'),
        emissiveMap: tex.nightMap ?? null,
        emissiveIntensity: tex.nightMap ? 0.55 : 0,
      });

      const pMesh = new THREE.Mesh(new THREE.SphereGeometry(pData.radius, 48, 48), pMat);
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
        cloudsMesh = new THREE.Mesh(new THREE.SphereGeometry(pData.radius * 1.022, 48, 48), cMat);
        cloudsMesh.rotation.z = pData.tilt || 0;
        planetGroup.add(cloudsMesh);
        if (pData.textureType === 'earth') RealTextures.applyClouds('earth', cMat);
      }

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
          new THREE.Vector3(-1, 0.2, 0),
          TextureFactory.getRingTexture(pData.hasRings ? 7 : 13)
        );
        ring.mesh.rotation.x = Math.PI / 2;
        ring.mesh.rotation.y = pData.tilt || 0.4;
        planetGroup.add(ring.mesh);
      }

      this.planets.push({
        data: pData,
        group: planetGroup,
        mesh: pMesh,
        cloudsMesh,
        moonPivot,
        angle: startAngle,
      });
    });
  }

  public getPickTargets(): THREE.Object3D[] {
    const targets: THREE.Object3D[] = this.planets.map((p) => p.mesh);
    if (this.starMesh) targets.push(this.starMesh);
    return targets;
  }

  public update(dt: number, state: AppState): void {
    if (!this.visible) return;

    if (this.starMaterial) {
      this.starMaterial.uniforms.uTime.value = state.elapsedTime;
    }
    if (this.starMesh && state.isPlaying) {
      this.starMesh.rotation.y += dt * 0.08 * state.rotationSpeed;
    }
    if (this.coronaMesh && this.coronaMaterial) {
      this.coronaMesh.quaternion.copy(this.camera.quaternion);
      this.coronaMaterial.uniforms.uTime.value = state.elapsedTime;
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
        p.angle += dt * p.data.speed * 0.38 * state.rotationSpeed;
        p.group.position.set(
          Math.cos(p.angle) * p.data.orbitRadius,
          0,
          Math.sin(p.angle) * p.data.orbitRadius
        );
        p.mesh.rotation.y += dt * p.data.rotSpeed * state.rotationSpeed;
        if (p.cloudsMesh) {
          p.cloudsMesh.rotation.y += dt * p.data.rotSpeed * 1.24 * state.rotationSpeed;
        }
        if (p.moonPivot) {
          p.moonPivot.rotation.y += dt * 0.65 * state.rotationSpeed;
        }
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
