/**
 * Scale 5 & 6: Planet Close-Up & Surface Inspection Layer.
 * High-resolution procedural planet sphere with bump & roughness maps,
 * emissive city lights, counter-rotating clouds, Rayleigh atmosphere rim,
 * orbiting moon and sunlit planetary rings.
 */
import * as THREE from 'three';
import { AppState, SceneLayer, PlanetData } from '../../core/types';
import { TextureFactory } from '../../render/TextureFactory';
import { RealTextures } from '../../render/RealTextures';
import {
  createAtmosphere,
  createRingMesh,
  disposeObject,
  enablePlanetSurfaceEffects,
  updatePlanetCloudShadowMap,
  enableCloudNightFade,
} from '../helpers';

export class PlanetLayer implements SceneLayer {
  public group: THREE.Group = new THREE.Group();
  public visible = false;

  public activePlanet: PlanetData | null = null;
  private planetMesh: THREE.Mesh | null = null;
  private cloudsMesh: THREE.Mesh | null = null;
  private moonMesh: THREE.Mesh | null = null;
  private moonGroup = new THREE.Group();
  private moonAngle = 0;

  constructor() {
    this.group.add(this.moonGroup);
  }

  public setPlanet(planet: PlanetData): void {
    this.activePlanet = planet;
    this.build();
  }

  public build(): void {
    disposeObject(this.group);
    this.group.clear();
    this.moonGroup.clear();
    this.planetMesh = null;
    this.cloudsMesh = null;
    this.moonMesh = null;
    this.group.add(this.moonGroup);

    if (!this.activePlanet) return;
    const p = this.activePlanet;
    // Fixed visual radius for every world so zoom levels & surface
    // approach behave identically for Mercury and Jupiter alike.
    const R = 3.2;

    // 1. Planet sphere
    const tex = TextureFactory.getPlanetTextures(p.textureType, 1536, 768);
    const isGasOrIce =
      p.textureType === 'jupiter' ||
      p.textureType === 'saturn' ||
      p.textureType === 'uranus' ||
      p.textureType === 'neptune' ||
      p.textureType === 'venus';
    const mat = new THREE.MeshStandardMaterial({
      map: tex.map,
      bumpMap: isGasOrIce ? null : (tex.bumpMap ?? null),
      bumpScale: isGasOrIce ? 0 : 0.015,
      roughnessMap: tex.roughnessMap ?? null,
      roughness: isGasOrIce ? 0.72 : 0.86,
      metalness: 0.02,
      emissive: tex.nightMap ? new THREE.Color('#ffd97d') : new THREE.Color('#000000'),
      emissiveMap: tex.nightMap ?? null,
      emissiveIntensity: tex.nightMap ? 0.75 : 0,
    });
    this.planetMesh = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 128), mat);
    this.planetMesh.rotation.z = p.tilt || 0;
    this.group.add(this.planetMesh);
    // Upgrade to the real photographic planetary map when downloaded
    RealTextures.applyToMaterial(p.textureType, mat);

    // 2. Clouds layer
    if (p.hasClouds && tex.cloudMap) {
      const cMat = new THREE.MeshStandardMaterial({
        map: tex.cloudMap,
        transparent: true,
        opacity: p.id === 'earth' ? 0.88 : 0.62,
        roughness: 0.92,
        depthWrite: false,
      });
      this.cloudsMesh = new THREE.Mesh(new THREE.SphereGeometry(R * 1.018, 128, 128), cMat);
      this.cloudsMesh.rotation.z = p.tilt || 0;
      this.group.add(this.cloudsMesh);
      // Night-side clouds fade out instead of glowing gray from ambient light.
      enableCloudNightFade(cMat, this.cloudsMesh);
      if (p.textureType === 'earth') {
        RealTextures.applyClouds('earth', cMat, (cloudTex) => {
          updatePlanetCloudShadowMap(mat, cloudTex);
        });
      }
    }

    // Unified surface effects: night-side city lights terminator, moving cloud shadows, and crisp micro-relief
    enablePlanetSurfaceEffects(mat, this.planetMesh, {
      nightLights: !!tex.nightMap,
      cloudMap: p.hasClouds ? tex.cloudMap ?? null : null,
      cloudMesh: this.cloudsMesh,
      cloudRadiusRatio: 1.018,
      microDetail: !isGasOrIce,
    });

    // 3. Atmosphere Fresnel rim (dual-shell)
    if (p.atmosphereColor) {
      const innerAtmo = createAtmosphere(
        R * 1.05,
        p.atmosphereColor,
        p.id === 'earth' ? 0.95 : 0.65,
        3.2
      );
      this.group.add(innerAtmo.mesh);

      const outerAtmo = createAtmosphere(
        R * 1.12,
        p.atmosphereColor,
        p.id === 'earth' ? 0.45 : 0.25,
        5.0
      );
      this.group.add(outerAtmo.mesh);
    }

    // 4. Orbiting moon
    if (p.hasMoon) {
      const moonTex = TextureFactory.getPlanetTextures('moon', 1024, 512);
      const moonMat = new THREE.MeshStandardMaterial({
        map: moonTex.map,
        bumpMap: moonTex.bumpMap ?? null,
        bumpScale: 0.06,
        roughness: 0.94,
      });
      RealTextures.applyToMaterial('moon', moonMat);
      this.moonMesh = new THREE.Mesh(new THREE.SphereGeometry(R * 0.27, 48, 48), moonMat);
      this.moonMesh.position.set(R * 2.8, 0, 0);
      this.moonGroup.add(this.moonMesh);
    }

    // 5. Rings (HD)
    if (p.hasRings || p.hasThinRing) {
      const inner = p.hasRings ? R * 1.35 : R * 1.45;
      const outer = p.hasRings ? R * 2.55 : R * 1.85;
      const ring = createRingMesh(
        inner,
        outer,
        p.hasRings ? '#f5e6c4' : '#93c5fd',
        R,
        TextureFactory.getRingTexture(p.hasRings ? 7 : 13, 1024, 16)
      );
      ring.mesh.rotation.x = Math.PI / 2;
      ring.mesh.rotation.y = p.tilt || 0.42;
      this.group.add(ring.mesh);
      RealTextures.applyToRingMaterial(p.hasRings ? 'saturn' : 'uranus', ring.material);
    }
  }

  public update(dt: number, state: AppState): void {
    if (!this.visible || !this.activePlanet) return;
    if (state.isPlaying && state.rotationSpeed > 0) {
      if (this.planetMesh) {
        this.planetMesh.rotation.y += dt * this.activePlanet.rotSpeed * 0.45 * state.rotationSpeed;
      }
      if (this.cloudsMesh) {
        this.cloudsMesh.rotation.y += dt * this.activePlanet.rotSpeed * 0.58 * state.rotationSpeed;
      }
      if (this.moonMesh) {
        this.moonAngle += dt * 0.32 * state.rotationSpeed;
        const dist = 3.2 * 2.8;
        this.moonMesh.position.set(Math.cos(this.moonAngle) * dist, 0, Math.sin(this.moonAngle) * dist);
        this.moonMesh.rotation.y += dt * 0.16 * state.rotationSpeed;
      }
    }
  }

  public dispose(): void {
    disposeObject(this.group);
    this.group.clear();
  }
}
