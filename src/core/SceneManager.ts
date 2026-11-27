/**
 * Scene Manager — Continuous Seamless Zoom Edition
 *
 * All scale layers coexist. A fractional zoom level t (0..6) is derived from
 * the camera radius every frame; neighbouring layers cross-fade and scale
 * through each other (anchored on the object you are zooming into), so
 * scrolling the wheel flies you continuously from the observable universe
 * down to a planet's surface. No discrete jumps, no teleporting.
 */
import * as THREE from 'three';
import { Engine } from './Engine';
import { AppState, CollisionPreset, ScaleLevel, PlanetData } from './types';
import { eventBus } from './EventBus';
import { CameraController } from './CameraController';
import { ObservableUniverseLayer } from '../universe/layers/ObservableUniverseLayer';
import { CosmicWebLayer } from '../universe/layers/CosmicWebLayer';
import { LocalGroupLayer } from '../universe/layers/LocalGroupLayer';
import { GalaxyLayer, SOLAR_GALACTIC_POS } from '../universe/layers/GalaxyLayer';
import { GalaxyCollisionLayer } from '../universe/layers/GalaxyCollisionLayer';
import { StarSystemLayer } from '../universe/layers/StarSystemLayer';
import { PlanetLayer } from '../universe/layers/PlanetLayer';
import { buildStarData, createStarPoints, updateNightTerminators, updateSunDirections } from '../universe/helpers';
import { getSuperclusterMemberNodes } from '../universe/superclusters';
import { GALAXY_SKY_VERTEX, GALAXY_SKY_FRAGMENT } from '../render/shaders';
import { STAR_SYSTEMS_CATALOG, GALAXIES, SUPERCLUSTERS } from '../data/cosmicData';
import { RealTextures } from '../render/RealTextures';
import { mulberry32, gaussianRandom, clamp, densityBrightness, densityPointScale } from '../utils/math';

interface FadeEntry {
  mat: THREE.Material & { opacity: number; transparent: boolean; depthWrite: boolean };
  baseOpacity: number;
  baseTransparent: boolean;
  baseDepthWrite: boolean;
  shaderUniform: 'uOpacity' | 'uFade' | null;
  shaderBase: number;
}

interface LayerSlot {
  level: number;
  layer: { group: THREE.Group; visible: boolean; update: (dt: number, s: AppState) => void };
  fades: FadeEntry[];
}

const INCOMING_START_SCALE: Record<number, number> = {
  1: 0.16,
  2: 0.24,
  3: 0.22,
  4: 0.3,
  5: 0.34,
};

function smooth(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export class SceneManager {
  public engine: Engine;
  public state: AppState;

  public observableUniverse: ObservableUniverseLayer;
  public cosmicWeb: CosmicWebLayer;
  public localGroup: LocalGroupLayer;
  public galaxy: GalaxyLayer;
  public galaxyCollision: GalaxyCollisionLayer;
  public starSystem: StarSystemLayer;
  public planet: PlanetLayer;

  private slots: LayerSlot[] = [];
  private backgroundStars: THREE.Points | null = null;
  private backgroundMat: THREE.ShaderMaterial | null = null;
  private galaxySkyMesh: THREE.Mesh | null = null;
  private galaxySkyMat: THREE.ShaderMaterial | null = null;
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private cameraCtrl: CameraController | null = null;

  private reportedScale: ScaleLevel = ScaleLevel.OBSERVABLE_UNIVERSE;
  private lightingScale: ScaleLevel = ScaleLevel.OBSERVABLE_UNIVERSE;
  private prevZoomT = 0;
  private enteredLocalGroup = false;
  private enteredMilkyWay = false;
  private enteredStarSystem = false;
  private enteredPlanet = false;
  private anchorTmp = new THREE.Vector3();
  private worldTmp = new THREE.Vector3();

  constructor(engine: Engine, state: AppState) {
    this.engine = engine;
    this.state = state;

    this.observableUniverse = new ObservableUniverseLayer();
    this.cosmicWeb = new CosmicWebLayer();
    this.localGroup = new LocalGroupLayer();
    this.galaxy = new GalaxyLayer(engine.camera);
    this.galaxyCollision = new GalaxyCollisionLayer();
    this.starSystem = new StarSystemLayer(engine.camera);
    this.planet = new PlanetLayer();
  }

  public bindCameraController(ctrl: CameraController): void {
    this.cameraCtrl = ctrl;
  }

  public async initialize(onProgress?: (pct: number, label: string) => void): Promise<void> {
    onProgress?.(20, 'নক্ষত্রক্ষেত্র তৈরি হচ্ছে...');
    RealTextures.preloadCore();
    this.buildGlobalBackgroundStars();

    onProgress?.(45, 'মহাজাগতিক স্তর যুক্ত হচ্ছে...');
    const layers = [
      this.observableUniverse,
      this.cosmicWeb,
      this.localGroup,
      this.galaxy,
      this.starSystem,
      this.planet,
    ];
    layers.forEach((l) => this.engine.scene.add(l.group));
    this.galaxyCollision.group.visible = false;
    this.engine.scene.add(this.galaxyCollision.group);

    onProgress?.(80, 'গ্রহ ও ছায়াপথ প্রস্তুত হচ্ছে...');
    const earth = STAR_SYSTEMS_CATALOG.solar.planets.find((p) => p.id === 'earth');
    if (earth) this.planet.setPlanet(earth);

    this.slots = layers.map((layer, i) => ({
      level: i,
      layer,
      fades: this.captureFades(layer.group),
    }));

    this.state.currentScale = ScaleLevel.OBSERVABLE_UNIVERSE;
    this.reportedScale = ScaleLevel.OBSERVABLE_UNIVERSE;
    this.updateLightingForScale(ScaleLevel.OBSERVABLE_UNIVERSE);
    onProgress?.(100, 'প্রস্তুত!');
  }

  // ----------------------------------------------------------------
  // Fade registry
  // ----------------------------------------------------------------
  private captureFades(group: THREE.Group): FadeEntry[] {
    const entries: FadeEntry[] = [];
    const seen = new Set<THREE.Material>();
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (!material) return;
      const mats = Array.isArray(material) ? material : [material];
      mats.forEach((m) => {
        if (seen.has(m)) return;
        seen.add(m);
        const mat = m as FadeEntry['mat'];
        let shaderUniform: FadeEntry['shaderUniform'] = null;
        let shaderBase = 1;
        const uniforms = (m as THREE.ShaderMaterial).uniforms;
        if (uniforms) {
          if (uniforms.uFade) {
            shaderUniform = 'uFade';
            shaderBase = uniforms.uFade.value as number;
          } else if (uniforms.uOpacity) {
            shaderUniform = 'uOpacity';
            shaderBase = uniforms.uOpacity.value as number;
          }
        }
        entries.push({
          mat,
          baseOpacity: typeof mat.opacity === 'number' ? mat.opacity : 1,
          baseTransparent: !!mat.transparent,
          baseDepthWrite: mat.depthWrite !== false,
          shaderUniform,
          shaderBase,
        });
      });
    });
    return entries;
  }

  private refreshSlotFades(): void {
    this.slots = this.slots.map((slot) => ({
      ...slot,
      fades: this.captureFades(slot.layer.group),
    }));
  }

  private applyAlpha(slot: LayerSlot, alpha: number): void {
    slot.fades.forEach((e) => {
      if (e.shaderUniform) {
        const uniforms = (e.mat as THREE.ShaderMaterial).uniforms;
        if (uniforms && uniforms[e.shaderUniform]) {
          uniforms[e.shaderUniform].value = e.shaderBase * alpha;
        }
        // Shader materials also need color scaling for opaque surfaces (sun)
        e.mat.opacity = e.baseOpacity;
        e.mat.transparent = e.baseTransparent || alpha < 0.999;
      } else {
        e.mat.opacity = e.baseOpacity * alpha;
        e.mat.transparent = e.baseTransparent || alpha < 0.999;
        e.mat.depthWrite = alpha > 0.6 ? e.baseDepthWrite : false;
      }
      e.mat.needsUpdate = false;
    });
  }

  // ----------------------------------------------------------------
  // Anchors — the point inside layer i that layer i+1 grows out of
  // ----------------------------------------------------------------
  private getChildAnchor(level: number, out: THREE.Vector3): THREE.Vector3 {
    switch (level) {
      case 3: // Galaxy -> Solar System position (account for galaxy rotation)
        out.copy(SOLAR_GALACTIC_POS).applyEuler(this.galaxy.group.rotation);
        return out;
      case 4: {
        // Star System -> active planet position (planets orbit!)
        const item = this.starSystem.planets.find(
          (p) => p.data.id === this.state.activePlanetId
        );
        if (item) {
          out.copy(item.group.position);
          return out;
        }
        out.set(0, 0, 0);
        return out;
      }
      default:
        out.set(0, 0, 0);
        return out;
    }
  }

  // ----------------------------------------------------------------
  // Continuous blending with context-aware portal gating
  // ----------------------------------------------------------------
  private updateContinuousZoom(dt: number): void {
    if (this.state.collisionMode) {
      this.slots.forEach((slot) => {
        slot.layer.visible = false;
        slot.layer.group.visible = false;
      });
      this.galaxyCollision.visible = true;
      this.galaxyCollision.group.visible = true;
      this.galaxyCollision.update(dt, this.state);
      this.state.cameraMinRadius = 6.0;

      if (this.backgroundMat) {
        const density = this.state.density;
        this.backgroundMat.uniforms.uTime.value = this.state.elapsedTime;
        this.backgroundMat.uniforms.uScale.value =
          0.16 * window.innerHeight * Math.min(window.devicePixelRatio || 1, 2) * densityPointScale(density);
        if (this.backgroundMat.uniforms.uBrightness) {
          this.backgroundMat.uniforms.uBrightness.value = densityBrightness(density);
        }
        if (this.backgroundMat.uniforms.uOpacity) {
          this.backgroundMat.uniforms.uOpacity.value = 0.88;
        }
        if (this.backgroundStars) this.backgroundStars.visible = this.state.layers.stars;
      }
      if (this.galaxySkyMat && this.galaxySkyMesh) {
        this.galaxySkyMat.uniforms.uOpacity.value = 0.35;
        this.galaxySkyMesh.visible = this.state.layers.stars;
      }
      this.engine.scene.fog = null;
      return;
    }

    this.galaxyCollision.visible = false;
    this.galaxyCollision.group.visible = false;

    const t = clamp(this.state.zoomLevel, 0, 6);
    const isTransitioning = this.cameraCtrl?.getIsTransitioning() ?? false;
    const target = this.cameraCtrl?.coords.desiredTarget;

    if (!isTransitioning) {
      if (t < 1.05) this.enteredLocalGroup = false;
      if (t < 2.05) this.enteredMilkyWay = false;
      if (t < 3.05) {
        this.enteredStarSystem = false;
      }
      if (t < 4.12) {
        if (this.enteredPlanet) this.cameraCtrl?.releaseTracking();
        this.enteredPlanet = false;
      }

      if (target) {
        if (!this.enteredLocalGroup && t >= 1.2 && target.length() < 42) {
          this.enteredLocalGroup = true;
        }
        if (this.enteredLocalGroup && !this.enteredMilkyWay && t >= 2.2 && target.length() < 10) {
          this.enteredMilkyWay = true;
        }
        if (this.enteredMilkyWay && !this.enteredStarSystem && t >= 3.2 && this.state.activeGalaxyId === 'milkyway') {
          this.getChildAnchor(3, this.anchorTmp);
          if (target.distanceTo(this.anchorTmp) < 12) {
            this.enteredStarSystem = true;
          }
        }
        if (this.enteredStarSystem && t >= 4.22) {
          let bestItem = this.starSystem.planets[0] || null;
          let bestDist = Infinity;
          this.starSystem.planets.forEach((p) => {
            p.group.getWorldPosition(this.worldTmp);
            const d = this.worldTmp.distanceTo(target);
            if (d < bestDist) {
              bestDist = d;
              bestItem = p;
            }
          });

          if (!this.enteredPlanet) {
            const captureDist = bestItem ? Math.max(4.5, bestItem.data.radius * 3.0) : 0;
            if (bestItem && bestDist <= captureDist) {
              this.enteredPlanet = true;
              this.selectActivePlanet(bestItem.data);
              this.cameraCtrl?.trackObject(bestItem.group, true);
            }
          } else if (this.cameraCtrl && !this.cameraCtrl.getTrackedObject()) {
            // User panned or zoomed out from the tracked planet -> check if near another planet or release
            const activeItem = this.starSystem.planets.find(
              (p) => p.data.id === this.state.activePlanetId
            );
            activeItem?.group.getWorldPosition(this.worldTmp);
            const activeDist = activeItem ? this.worldTmp.distanceTo(target) : Infinity;
            const releaseDist = activeItem ? Math.max(6.0, activeItem.data.radius * 3.5) : 0;
            if (activeDist > releaseDist) {
              const captureDist = bestItem ? Math.max(4.5, bestItem.data.radius * 3.0) : 0;
              if (bestItem && bestDist <= captureDist) {
                this.selectActivePlanet(bestItem.data);
                this.cameraCtrl.trackObject(bestItem.group, true);
              } else {
                this.enteredPlanet = false;
              }
            }
          }
        }
      }
    }

    const effectiveMaxScale = !this.enteredLocalGroup
      ? 1
      : !this.enteredMilkyWay
        ? 2
        : !this.enteredStarSystem
          ? 3
          : !this.enteredPlanet
            ? 4
            : 6;
    const tEff = Math.min(t, effectiveMaxScale);

    // StarSystemLayer stays at world origin, so no galactic-anchor recentering is
    // needed here (shifting the target by SOLAR_GALACTIC_POS would move the camera
    // away from the host star and leave the system looking empty).

    // Dynamic camera floor: prevent clipping into planets, host star, or Sgr A*
    let minR = 2.0;
    if (this.enteredPlanet && tEff > 4.3) {
      const floorBlend = smooth((tEff - 4.3) / 0.5);
      minR = THREE.MathUtils.lerp(2.0, 4.35, floorBlend);
    } else if (this.enteredStarSystem && !this.enteredPlanet && tEff >= 3.55 && target) {
      const sys = STAR_SYSTEMS_CATALOG[this.state.activeSystemId || 'solar'];
      const starR = sys?.star.radius ?? 4.8;
      if (target.length() < starR + 5.0) {
        minR = Math.max(4.0, starR + 1.4);
      }
    } else if (this.enteredMilkyWay && !this.enteredStarSystem && tEff >= 2.75 && target) {
      if (target.length() < 7.0) {
        minR = 2.6;
      }
    }
    this.state.cameraMinRadius = minR;

    // Close-up orbit fade and low-res planet handoff inside StarSystem
    const closeUpOrbitFade =
      this.enteredPlanet && tEff > 4.35 ? 1 - smooth((tEff - 4.35) / 0.55) : 1;
    const hideActiveInSystem = this.enteredPlanet && tEff >= 4.5;
    this.starSystem.planets.forEach((p) => {
      p.group.visible = !(hideActiveInSystem && p.data.id === this.state.activePlanetId);
    });

    this.slots.forEach((slot) => {
      const i = slot.level;
      let alpha = 0;
      let scale = 1;
      this.anchorTmp.set(0, 0, 0);
      let posX = 0, posY = 0, posZ = 0;

      if (i === 5) {
        if (this.enteredPlanet && tEff > 4.22) {
          alpha = smooth((tEff - 4.22) / 0.28);
          const qScale = smooth((tEff - 4.22) / 0.78);
          const activeItem = this.starSystem.planets.find(
            (p) => p.data.id === this.state.activePlanetId
          );
          const pRadius = activeItem?.data.radius ?? 1.35;
          scale = THREE.MathUtils.lerp(pRadius / 3.2, 1.0, qScale);
          if (activeItem) {
            posX = activeItem.group.position.x;
            posY = activeItem.group.position.y;
            posZ = activeItem.group.position.z;
          }
        }
      } else if (i === 4) {
        const d = tEff - 4;
        if (d >= -0.8 && d < 0) {
          const q = smooth((d + 0.8) / 0.8);
          alpha = q;
          scale = THREE.MathUtils.lerp(INCOMING_START_SCALE[4], 1, q);
        } else if (d >= 0) {
          // Keep StarSystem centered at (0,0,0) so Sun & sibling worlds stay in real orbital space
          alpha = closeUpOrbitFade;
          scale = 1;
        }
      } else {
        const d = tEff - i;
        if (d >= -0.8 && d < 0) {
          const q = smooth((d + 0.8) / 0.8);
          alpha = q;
          scale = THREE.MathUtils.lerp(INCOMING_START_SCALE[i] ?? 0.25, 1, q);
        } else if (d >= 0 && d <= 0.85) {
          const q = smooth(d / 0.85);
          alpha = 1 - q;
          scale = 1 + q * 2.1;
          const anchor = this.getChildAnchor(i, new THREE.Vector3());
          const k = 1 - q - scale;
          posX = anchor.x * k;
          posY = anchor.y * k;
          posZ = anchor.z * k;
        }
      }

      const visible = alpha > 0.015;
      slot.layer.visible = visible;
      slot.layer.group.visible = visible;
      if (!visible) return;

      slot.layer.group.scale.setScalar(scale);
      slot.layer.group.position.set(posX, posY, posZ);
      this.applyAlpha(slot, clamp(alpha, 0, 1));
      slot.layer.update(dt, this.state);
    });

    // Background starfield & Milky Way band dim slightly on planetary close-up
    if (this.backgroundMat) {
      const density = this.state.density;
      this.backgroundMat.uniforms.uTime.value = this.state.elapsedTime;
      this.backgroundMat.uniforms.uScale.value =
        0.16 * window.innerHeight * Math.min(window.devicePixelRatio || 1, 2) * densityPointScale(density);
      if (this.backgroundMat.uniforms.uBrightness) {
        this.backgroundMat.uniforms.uBrightness.value = densityBrightness(density);
      }
      if (this.backgroundMat.uniforms.uOpacity) {
        this.backgroundMat.uniforms.uOpacity.value = tEff > 4.6 ? 0.55 : 0.95;
      }
      if (this.backgroundStars) this.backgroundStars.visible = this.state.layers.stars;
    }
    if (this.galaxySkyMat && this.galaxySkyMesh) {
      const skyOp = tEff > 4.6 ? 0.52 : tEff > 2.8 ? 0.68 : 0.35;
      this.galaxySkyMat.uniforms.uOpacity.value = skyOp;
      this.galaxySkyMesh.visible = this.state.layers.stars;
    }

    // Crisp space contrast — atmosphere rims handle planetary horizons without washing out night sides
    this.engine.scene.fog = null;

    // Nearest scale bookkeeping (bounded by active portal)
    const rounded = clamp(Math.round(tEff), 0, 6) as ScaleLevel;
    this.state.currentScale = rounded;
    if (rounded !== this.lightingScale) {
      this.lightingScale = rounded;
      this.updateLightingForScale(rounded);
    }
    if (rounded !== this.reportedScale) {
      const from = this.reportedScale;
      this.reportedScale = rounded;
      eventBus.emit({ type: 'SCALE_CHANGE', from, to: rounded });
    }
    this.prevZoomT = t;
  }

  private selectActivePlanet(pData: PlanetData): void {
    this.state.godsEye = false;
    if (pData.id === this.state.activePlanetId && this.planet.activePlanet?.id === pData.id) {
      return;
    }
    this.state.activePlanetId = pData.id;
    this.planet.setPlanet(pData);
    this.refreshSlotFades();
    eventBus.emit({
      type: 'SCALE_CHANGE',
      from: ScaleLevel.PLANET,
      to: ScaleLevel.PLANET,
    });
  }

  private buildGlobalBackgroundStars(): void {
    const rand = mulberry32(10101);
    const count = 7500;
    const spectral = ['#9bb8ff', '#cad8ff', '#f8f7ff', '#fff4ea', '#ffd2a1', '#ffcc6f'];
    // Tilt galactic star band ~32 deg (matching GALAXY_SKY_FRAGMENT)
    const tilt = 0.56;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);

    const data = buildStarData(count, (i) => {
      const r = 1600 + rand() * 3000;
      const inBand = i < count * 0.42;
      let gx: number, gy: number, gz: number;

      if (inBand) {
        const theta = rand() * Math.PI * 2;
        // Concentrate stars toward the galactic equator with slight core bias
        const lat = gaussianRandom(rand) * 0.14;
        const cosLat = Math.cos(lat);
        gx = Math.cos(theta) * cosLat;
        gy = Math.sin(lat);
        gz = Math.sin(theta) * cosLat;
      } else {
        const theta = rand() * Math.PI * 2;
        const phi = Math.acos(2 * rand() - 1);
        gx = Math.sin(phi) * Math.cos(theta);
        gy = Math.cos(phi);
        gz = Math.sin(phi) * Math.sin(theta);
      }

      // Rotate by inverse tilt so band matches shader's g = tilt * d
      const x = gx;
      const y = gy * cosT + gz * sinT;
      const z = -gy * sinT + gz * cosT;

      const hex = spectral[Math.floor(rand() * spectral.length)];
      const col = new THREE.Color(hex).multiplyScalar((inBand ? 0.45 : 0.38) + rand() * 0.45);
      return {
        pos: [x * r, y * r, z * r],
        color: col,
        size: inBand ? 0.42 + rand() * 0.95 : 0.5 + rand() * 1.15,
        seed: rand(),
      };
    });
    const { points, material } = createStarPoints(data, 0.72);
    this.backgroundStars = points;
    this.backgroundMat = material;
    this.engine.scene.add(points);

    // Subtle deep-space Milky Way band sky sphere
    const skyGeo = new THREE.SphereGeometry(4800, 48, 48);
    this.galaxySkyMat = new THREE.ShaderMaterial({
      vertexShader: GALAXY_SKY_VERTEX,
      fragmentShader: GALAXY_SKY_FRAGMENT,
      uniforms: { uOpacity: { value: 0.55 } },
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.galaxySkyMesh = new THREE.Mesh(skyGeo, this.galaxySkyMat);
    this.galaxySkyMesh.frustumCulled = false;
    this.galaxySkyMesh.renderOrder = -10;
    this.engine.scene.add(this.galaxySkyMesh);
  }

  /** Kept for compatibility — continuous blending now owns visibility. */
  public setScaleVisibility(scale: ScaleLevel): void {
    this.state.currentScale = scale;
    this.reportedScale = scale;
    this.lightingScale = scale;
    this.updateLightingForScale(scale);
  }

  private updateLightingForScale(scale: ScaleLevel): void {
    if (scale === ScaleLevel.STAR_SYSTEM) {
      this.engine.sunLight.position.set(0, 0, 0);
      this.engine.sunLight.intensity = 3.0;
      this.engine.ambientLight.intensity = 0.28;
      this.engine.fillLight.intensity = 0.14;
    } else if (scale === ScaleLevel.PLANET || scale === ScaleLevel.SURFACE) {
      // Sun remains at (0,0,0) so planets at their real orbital coordinates have natural day/night terminators
      this.engine.sunLight.position.set(0, 0, 0);
      this.engine.sunLight.intensity = 3.1;
      this.engine.ambientLight.intensity = 0.16;
      this.engine.fillLight.intensity = 0.08;
    } else {
      this.engine.sunLight.position.set(0, 0, 0);
      this.engine.sunLight.intensity = 1.4;
      this.engine.ambientLight.intensity = 0.85;
      this.engine.fillLight.intensity = 0.35;
    }
  }

  public triggerWarpFlash(): void {
    const el = document.getElementById('transition-flash');
    if (!el) return;
    el.style.opacity = '0.35';
    window.setTimeout(() => {
      el.style.opacity = '0';
    }, 200);
  }

  public transitionToScale(
    newScale: ScaleLevel,
    options: {
      systemId?: string;
      planetId?: string;
      galaxyId?: string;
      clusterId?: string;
      /** Internal: keep the selected supercluster when focusing it. */
      preserveSelection?: boolean;
    } = {}
  ): void {
    this.state.collisionMode = false;
    this.galaxyCollision.visible = false;
    this.galaxyCollision.group.visible = false;

    // No instant visibility toggle anymore — the continuous zoom blends.
    // This method only prepares data (which system / planet is active).
    if (!options.preserveSelection) {
      this.state.activeSuperclusterId = null;
      this.state.activeMemberClusterId = null;
    }
    let rebuilt = false;
    if (options.galaxyId) {
      this.state.activeGalaxyId = options.galaxyId;
      if (this.galaxy.activeGalaxyId !== options.galaxyId) {
        this.galaxy.build({ galaxyId: options.galaxyId });
        rebuilt = true;
      }
    }
    if (options.clusterId) this.state.activeClusterId = options.clusterId;

    if (options.systemId) {
      this.state.activeSystemId = options.systemId;
      if (!options.galaxyId && this.state.activeGalaxyId !== 'milkyway') {
        this.state.activeGalaxyId = 'milkyway';
        if (this.galaxy.activeGalaxyId !== 'milkyway') {
          this.galaxy.build({ galaxyId: 'milkyway' });
          rebuilt = true;
        }
      }
      if (this.starSystem.activeSystemId !== options.systemId) {
        this.starSystem.build({ systemId: options.systemId });
        rebuilt = true;
      }
    }

    if (options.planetId) {
      this.state.activePlanetId = options.planetId;
      const sys = STAR_SYSTEMS_CATALOG[this.state.activeSystemId || 'solar'];
      const pData = sys?.planets.find((p) => p.id === options.planetId);
      if (pData && this.planet.activePlanet?.id !== pData.id) {
        this.planet.setPlanet(pData);
        rebuilt = true;
      }
    }

    if (rebuilt) this.refreshSlotFades();
    this.state.currentScale = newScale;
    if (newScale < ScaleLevel.PLANET) this.state.godsEye = false;

    // Sync portal gates with explicit scale navigation
    this.enteredLocalGroup = newScale >= ScaleLevel.GALAXY_CLUSTER;
    this.enteredMilkyWay = newScale >= ScaleLevel.GALAXY;
    this.enteredStarSystem = newScale >= ScaleLevel.STAR_SYSTEM;
    this.enteredPlanet = newScale >= ScaleLevel.PLANET;
    if (!this.enteredPlanet) {
      this.cameraCtrl?.releaseTracking();
    }

    // Same-scale data change (e.g. switching planet) -> refresh UI now.
    // Cross-scale changes are reported by the zoom detector as you fly.
    if (newScale === this.reportedScale) {
      eventBus.emit({ type: 'SCALE_CHANGE', from: newScale, to: newScale });
    }
  }

  /** Fly smoothly to any planet at its live orbital position and lock tracking onto it. */
  public flyToPlanet(systemId: string, planetId: string, duration = 1.35): void {
    this.state.godsEye = false;
    this.transitionToScale(ScaleLevel.PLANET, { systemId, planetId });
    if (!this.cameraCtrl) return;
    const item = this.starSystem.planets.find((p) => p.data.id === planetId);
    const targetRadius = item?.data.hasRings ? 10.5 : 8.8;
    if (item) {
      const pos = new THREE.Vector3();
      item.group.getWorldPosition(pos);
      // Approach from the sunward side with an oblique offset so the planet is
      // clearly lit (and its terminator visible) instead of showing a black
      // night hemisphere. The God's Eye preset remains the fully-lit portrait.
      const sunwardTheta = Math.atan2(pos.x, pos.z) + Math.PI;
      this.cameraCtrl.animateTo(
        sunwardTheta + 0.55,
        1.18,
        targetRadius,
        pos,
        duration,
        () => {
          this.cameraCtrl?.trackObject(item.group, false);
        },
        item.group
      );
    } else {
      this.cameraCtrl.animateTo(0.85, 1.18, targetRadius, [0, 0, 0], duration);
    }
  }

  /**
   * God's Eye view — the whole planet as one fully-lit disk.
   * The camera is placed on the sunward side of the planet (between it and
   * its star, slightly above the orbital plane), so you see the complete
   * illuminated hemisphere like the classic "blue marble" portrait, with
   * the satellite system around it. Tracking keeps the view glued to the
   * planet as it continues its Kepler orbit.
   */
  public flyToGodsEye(systemId: string, planetId: string, duration = 1.6): void {
    this.state.godsEye = true;
    this.transitionToScale(ScaleLevel.PLANET, { systemId, planetId });
    if (!this.cameraCtrl) return;
    const item = this.starSystem.planets.find((p) => p.data.id === planetId);
    if (!item) return;
    const pos = new THREE.Vector3();
    item.group.getWorldPosition(pos);
    // Camera between the planet and its star sees the full lit face.
    const sunwardTheta = Math.atan2(pos.x, pos.z) + Math.PI;
    // Ringed worlds need a step back so the full ring span fits the frame.
    const targetRadius = item.data.hasRings || item.data.hasThinRing ? 14.0 : 11.0;
    this.cameraCtrl.animateTo(
      sunwardTheta,
      1.32,
      targetRadius,
      pos,
      duration,
      () => {
        this.cameraCtrl?.trackObject(item.group, false);
      },
      item.group
    );
  }

  /** Enter the interactive ONNX Neural Gravity Milky Way + Andromeda collision mode. */
  public enterCollisionMode(preset?: CollisionPreset, rebuild = false): void {
    const nextPreset = preset ?? this.state.collisionPreset;
    const presetChanged = nextPreset !== this.state.collisionPreset;
    this.state.collisionPreset = nextPreset;
    this.state.collisionMode = true;
    this.state.activePreset = 'collision';
    this.state.activeSuperclusterId = null;
    this.state.activeMemberClusterId = null;
    this.state.godsEye = false;
    this.state.currentScale = ScaleLevel.GALAXY_CLUSTER;

    this.galaxyCollision.ensureModelInitialized();
    if (presetChanged || rebuild) {
      this.galaxyCollision.resetSimulation(nextPreset, this.state.density, this.state.collisionMassRatio);
    }

    this.updateLightingForScale(ScaleLevel.GALAXY_CLUSTER);
    this.cameraCtrl?.releaseTracking();
    this.cameraCtrl?.animateTo(0.58, 0.92, 82, [0, 0, 0], 1.35);
    eventBus.emit({
      type: 'SCALE_CHANGE',
      from: ScaleLevel.GALAXY_CLUSTER,
      to: ScaleLevel.GALAXY_CLUSTER,
    });
  }

  /** Exit galaxy collision mode and return to the Local Group continuous zoom. */
  public exitCollisionMode(): void {
    this.state.collisionMode = false;
    this.galaxyCollision.visible = false;
    this.galaxyCollision.group.visible = false;
    this.transitionToScale(ScaleLevel.GALAXY_CLUSTER);
    this.cameraCtrl?.goToScale(ScaleLevel.GALAXY_CLUSTER);
  }

  /** Select a named supercluster and frame its whole galaxy concentration. */
  public focusSupercluster(superclusterId: string): void {
    const sc = SUPERCLUSTERS.find((s) => s.id === superclusterId);
    if (!sc) return;

    this.state.activeSuperclusterId = sc.id;
    this.state.activeMemberClusterId = null;
    this.state.activePreset = 'cosmic-web';
    this.transitionToScale(ScaleLevel.COSMIC_WEB, { preserveSelection: true });

    const target = new THREE.Vector3(...sc.position).applyEuler(this.cosmicWeb.group.rotation);
    // Stay inside the cosmic-web scale so the supercluster and its member pins
    // remain visible; crossing into galaxy scale would replace the layer.
    this.cameraCtrl?.animateTo(0.55, 0.96, 230, target);
    eventBus.emit({ type: 'OBJECT_SELECT', objectId: sc.id, scale: ScaleLevel.COSMIC_WEB });
  }

  /** Select one member cluster and fly to its core. */
  public focusSuperclusterMember(superclusterId: string, memberId: string): void {
    const sc = SUPERCLUSTERS.find((s) => s.id === superclusterId);
    const node = sc
      ? getSuperclusterMemberNodes(sc).find((n) => n.member.id === memberId)
      : null;
    if (!sc || !node) return;

    this.state.activeSuperclusterId = sc.id;
    this.state.activeMemberClusterId = node.member.id;
    this.state.activePreset = 'cosmic-web';
    this.transitionToScale(ScaleLevel.COSMIC_WEB, { preserveSelection: true });

    const target = node.world.clone().applyEuler(this.cosmicWeb.group.rotation);
    this.cameraCtrl?.animateTo(0.55, 0.96, 230, target);
    eventBus.emit({
      type: 'OBJECT_SELECT',
      objectId: node.member.id,
      scale: ScaleLevel.COSMIC_WEB,
    });
  }

  /** Raycast tap against interactive objects in the current scale. */
  public pickAt(
    clientX: number,
    clientY: number
  ): {
    type: string;
    id: string;
    systemId?: string;
    superclusterId?: string;
    position?: THREE.Vector3;
  } | null {
    if (this.state.collisionMode) {
      return null;
    }

    const scale = this.state.currentScale;
    let targets: THREE.Object3D[] = [];

    if (scale === ScaleLevel.OBSERVABLE_UNIVERSE) targets = this.observableUniverse.pickTargets;
    else if (scale === ScaleLevel.COSMIC_WEB) targets = this.cosmicWeb.pickTargets;
    else if (scale === ScaleLevel.GALAXY_CLUSTER) targets = this.localGroup.pickTargets;
    else if (scale === ScaleLevel.GALAXY) targets = this.galaxy.pickTargets;
    else if (scale === ScaleLevel.STAR_SYSTEM) targets = this.starSystem.getPickTargets();
    else return null;

    if (targets.length === 0) return null;

    this.ndc.set(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(this.ndc, this.engine.camera);
    const hits = this.raycaster.intersectObjects(targets, false);
    if (hits.length === 0) return null;

    const obj = hits[0].object;
    const ud = obj.userData || {};
    const worldPos = new THREE.Vector3();
    obj.getWorldPosition(worldPos);
    return {
      type: ud.pickType || 'object',
      id: ud.planetId || ud.galaxyId || ud.nodeId || ud.id || '',
      systemId: ud.systemId,
      superclusterId: ud.superclusterId,
      position: worldPos,
    };
  }

  public update(dt: number, _state: AppState): void {
    // Orbital/rotational physics of the star system runs EVERY frame, even
    // when its layer is invisible (e.g. at planet close-up), so the planet
    // you are watching keeps moving along its Kepler orbit and tracking
    // stays exact at any time-scale.
    this.starSystem.integrateMotion(dt, this.state);
    this.updateContinuousZoom(dt);
    // Keep gated night-light materials, cloud shadows, and sun-aware atmospheres pointed
    // at the sun (world space) AFTER layer/planet positions update for this frame.
    updateNightTerminators(this.engine.sunLight.position);
    updateSunDirections(this.engine.sunLight.position);
  }
}

export { GALAXIES };
