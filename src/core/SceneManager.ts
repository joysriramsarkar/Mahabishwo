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
import { AppState, ScaleLevel } from './types';
import { eventBus } from './EventBus';
import { CameraController } from './CameraController';
import { ObservableUniverseLayer } from '../universe/layers/ObservableUniverseLayer';
import { CosmicWebLayer } from '../universe/layers/CosmicWebLayer';
import { LocalGroupLayer } from '../universe/layers/LocalGroupLayer';
import { GalaxyLayer, SOLAR_GALACTIC_POS } from '../universe/layers/GalaxyLayer';
import { StarSystemLayer } from '../universe/layers/StarSystemLayer';
import { PlanetLayer } from '../universe/layers/PlanetLayer';
import { buildStarData, createStarPoints } from '../universe/helpers';
import { STAR_SYSTEMS_CATALOG, GALAXIES } from '../data/cosmicData';
import { RealTextures } from '../render/RealTextures';
import { mulberry32, clamp } from '../utils/math';

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
  public starSystem: StarSystemLayer;
  public planet: PlanetLayer;

  private slots: LayerSlot[] = [];
  private backgroundStars: THREE.Points | null = null;
  private backgroundMat: THREE.ShaderMaterial | null = null;
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private cameraCtrl: CameraController | null = null;

  private reportedScale: ScaleLevel = ScaleLevel.OBSERVABLE_UNIVERSE;
  private lightingScale: ScaleLevel = ScaleLevel.OBSERVABLE_UNIVERSE;
  private prevZoomT = 0;
  private anchorTmp = new THREE.Vector3();
  private planetAnchor = new THREE.Vector3();
  private worldTmp = new THREE.Vector3();

  constructor(engine: Engine, state: AppState) {
    this.engine = engine;
    this.state = state;

    this.observableUniverse = new ObservableUniverseLayer();
    this.cosmicWeb = new CosmicWebLayer();
    this.localGroup = new LocalGroupLayer();
    this.galaxy = new GalaxyLayer();
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
  // Continuous blending
  // ----------------------------------------------------------------
  private updateContinuousZoom(dt: number): void {
    const t = clamp(this.state.zoomLevel, 0, 6);

    // Dynamic camera floor: don't fall inside the planet / sun
    this.state.cameraMinRadius = t > 4.55 ? 3.7 : GLOBAL_MIN_HELPER(t);

    // Auto-select the planet nearest to the camera target at the moment
    // of crossing System -> Planet (world positions, once per crossing),
    // so zooming onto Mars opens Mars, zooming onto Jupiter opens Jupiter.
    const crossingIntoPlanet = this.prevZoomT < 4.35 && t >= 4.35;
    if (crossingIntoPlanet && this.cameraCtrl) {
      const target = this.cameraCtrl.coords.desiredTarget;
      let bestId: string | null = null;
      let bestDist = Infinity;
      this.starSystem.planets.forEach((p) => {
        p.group.getWorldPosition(this.worldTmp);
        const d = this.worldTmp.distanceToSquared(target);
        if (d < bestDist) {
          bestDist = d;
          bestId = p.data.id;
        }
      });
      if (bestId && bestId !== this.state.activePlanetId) {
        this.state.activePlanetId = bestId;
        const sys = STAR_SYSTEMS_CATALOG[this.state.activeSystemId || 'solar'];
        const pData = sys?.planets.find((p) => p.id === bestId);
        if (pData) {
          this.planet.setPlanet(pData);
          this.refreshSlotFades();
          eventBus.emit({
            type: 'SCALE_CHANGE',
            from: ScaleLevel.PLANET,
            to: ScaleLevel.PLANET,
          });
        }
      }
    }

    this.slots.forEach((slot) => {
      const i = slot.level;
      let alpha = 0;
      let scale = 1;
      this.anchorTmp.set(0, 0, 0);
      let posX = 0, posY = 0, posZ = 0;

      if (i === 5) {
        // Planet layer also serves Surface (level 6)
        if (t >= 5) {
          alpha = 1;
          scale = 1;
        } else {
          const d = t - 5;
          if (d > -0.8) {
            const q = smooth((d + 0.8) / 0.8);
            alpha = q;
            scale = THREE.MathUtils.lerp(INCOMING_START_SCALE[5], 1, q);
          }
        }
      } else {
        const d = t - i;
        if (d >= -0.8 && d < 0) {
          const q = smooth((d + 0.8) / 0.8);
          alpha = q;
          scale = THREE.MathUtils.lerp(INCOMING_START_SCALE[i] ?? 0.25, 1, q);
        } else if (d >= 0 && d <= 0.85) {
          const q = smooth(d / 0.85);
          alpha = 1 - q;
          scale = 1 + q * 2.1;
          // Anchor of the next level drifts to the center as we pass through
          const anchor = this.getChildAnchor(i, new THREE.Vector3());
          const k = 1 - q - scale;
          posX = anchor.x * k;
          posY = anchor.y * k;
          posZ = anchor.z * k;
        } else if (Math.abs(d) < 0.01) {
          alpha = 1;
          scale = 1;
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

    // Background starfield dims slightly on planetary close-up
    if (this.backgroundMat) {
      this.backgroundMat.uniforms.uTime.value = this.state.elapsedTime;
      this.backgroundMat.uniforms.uScale.value =
        0.16 * window.innerHeight * Math.min(window.devicePixelRatio || 1, 2);
      if (this.backgroundMat.uniforms.uOpacity) {
        this.backgroundMat.uniforms.uOpacity.value = t > 4.6 ? 0.55 : 0.95;
      }
      if (this.backgroundStars) this.backgroundStars.visible = this.state.layers.stars;
    }

    // Nearest scale bookkeeping
    const rounded = clamp(Math.round(t), 0, 6) as ScaleLevel;
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

  private buildGlobalBackgroundStars(): void {
    const rand = mulberry32(10101);
    const count = 5500;
    const spectral = ['#9bb8ff', '#cad8ff', '#f8f7ff', '#fff4ea', '#ffd2a1', '#ffcc6f'];
    const data = buildStarData(count, () => {
      const r = 1400 + rand() * 3200;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const hex = spectral[Math.floor(rand() * spectral.length)];
      const col = new THREE.Color(hex).multiplyScalar(0.4 + rand() * 0.4);
      return {
        pos: [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta),
        ],
        color: col,
        size: 0.5 + rand() * 1.1,
        seed: rand(),
      };
    });
    const { points, material } = createStarPoints(data, 0.7);
    this.backgroundStars = points;
    this.backgroundMat = material;
    this.engine.scene.add(points);
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
      this.engine.sunLight.intensity = 2.8;
      this.engine.ambientLight.intensity = 0.6;
      this.engine.fillLight.intensity = 0.28;
    } else if (scale === ScaleLevel.PLANET || scale === ScaleLevel.SURFACE) {
      this.engine.sunLight.position.set(45, 22, 35);
      this.engine.sunLight.intensity = 2.6;
      this.engine.ambientLight.intensity = 0.25;
      this.engine.fillLight.intensity = 0.2;
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
    options: { systemId?: string; planetId?: string; galaxyId?: string; clusterId?: string } = {}
  ): void {
    // No instant visibility toggle anymore — the continuous zoom blends.
    // This method only prepares data (which system / planet is active).
    if (options.galaxyId) this.state.activeGalaxyId = options.galaxyId;
    if (options.clusterId) this.state.activeClusterId = options.clusterId;

    let rebuilt = false;
    if (options.systemId) {
      this.state.activeSystemId = options.systemId;
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

    // Same-scale data change (e.g. switching planet) -> refresh UI now.
    // Cross-scale changes are reported by the zoom detector as you fly.
    if (newScale === this.reportedScale) {
      eventBus.emit({ type: 'SCALE_CHANGE', from: newScale, to: newScale });
    }
  }

  /** Raycast tap against interactive objects in the current scale. */
  public pickAt(
    clientX: number,
    clientY: number
  ): { type: string; id: string; systemId?: string; position?: THREE.Vector3 } | null {
    const scale = clamp(Math.round(this.state.zoomLevel), 0, 6) as ScaleLevel;
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
      position: worldPos,
    };
  }

  public update(dt: number, state: AppState): void {
    this.updateContinuousZoom(dt);
  }
}

function GLOBAL_MIN_HELPER(t: number): number {
  // Allow close approach to black holes / galactic core, but not inside stars
  return t > 3.55 && t < 4.55 ? 3.2 : 2.0;
}

export { GALAXIES };
