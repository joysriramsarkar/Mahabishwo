/**
 * Interactive Milky Way + Andromeda (Milkomeda) Galaxy Collision Simulation
 *
 * Uses a Physics-Informed MLP trained in PyTorch (`public/models/galaxy_gravity.onnx`)
 * running via ONNX Runtime Web (WebGPU with WASM fallback) + 2nd-order symplectic
 * Velocity-Verlet (Leapfrog) integration to evolve 6,000–16,000 stars at 60 FPS.
 */
import * as THREE from 'three';
import { AppState, CollisionPreset, DensityLevel, SceneLayer } from '../../core/types';
import { STAR_VERTEX, STAR_FRAGMENT } from '../../render/shaders';
import { createGlowSprite } from '../helpers';
import { mulberry32, gaussianRandom, densityBrightness, densityPointScale } from '../../utils/math';
import {
  initGravityModel,
  predictAcceleration,
  computeAnalyticalAcceleration,
  getGravityStats,
  type GravityBackend,
} from '../../physics/neuralGravity';

export interface CollisionTelemetry {
  backend: GravityBackend;
  physicsMode: 'neural' | 'analytical';
  inferenceMs: number;
  starCount: number;
  elapsedGyr: number;
  coreSeparationKly: number;
  relativeSpeedKms: number;
  neuralCosineSim: number;
  preset: CollisionPreset;
  massRatio: number;
}

const DENSITY_STAR_COUNT: Record<DensityLevel, number> = {
  low: 6000,
  medium: 10000,
  high: 16000,
};

// Core mutual gravity constants (consistent with scripts/train_gravity.py)
const CORE_G = 1.0;
const CORE_SOFTENING_SQ = 4.0 * 4.0;
const CORE_DM_STRENGTH = 14.0;
const CORE_DM_RADIUS_SQ = 25.0;

export class GalaxyCollisionLayer implements SceneLayer {
  public group: THREE.Group = new THREE.Group();
  public visible = false;

  public core1Marker = new THREE.Group();
  public core2Marker = new THREE.Group();

  private starPoints: THREE.Points | null = null;
  private starMaterial: THREE.ShaderMaterial | null = null;
  private posAttr: THREE.BufferAttribute | null = null;

  private starCount = DENSITY_STAR_COUNT.medium;
  private activeDensity: DensityLevel = 'medium';
  private activePreset: CollisionPreset = 'prograde';
  private mass1 = 420;
  private mass2 = 580;

  // Physics arrays
  private positions = new Float32Array(0);
  private velocities = new Float32Array(0);
  private accelerations = new Float32Array(0);
  private nextAccelerations = new Float32Array(0);
  private onnxInputs = new Float32Array(0);
  private diagSampleIn = new Float32Array(256 * 11);
  private diagSampleOut = new Float32Array(256 * 3);

  // Two galactic cores (Milky Way = 1, Andromeda = 2)
  private core1Pos = new THREE.Vector3(-20, 2.5, -10);
  private core1Vel = new THREE.Vector3(1.55, -0.15, 0.95);
  private core2Pos = new THREE.Vector3(20, -2.5, 10);
  private core2Vel = new THREE.Vector3(-1.12, 0.11, -0.68);
  private core1Acc = new THREE.Vector3();
  private core2Acc = new THREE.Vector3();

  private elapsedGyr = 0;
  private stepCounter = 0;
  private neuralCosineSim = 0.993;
  private isStepping = false;
  private pendingDt = 0;
  private modelInitStarted = false;
  private activeMode: 'neural' | 'analytical' = 'neural';

  constructor() {
    this.buildVisualMarkers();
    this.resetSimulation('prograde', 'medium', 1.38);
  }

  public ensureModelInitialized(): void {
    if (this.modelInitStarted) return;
    this.modelInitStarted = true;
    void initGravityModel();
  }

  private buildVisualMarkers(): void {
    this.core1Marker.clear();
    this.core2Marker.clear();

    // Milky Way nucleus (blazing golden bulge + sky-blue disk halo)
    const mwInner = createGlowSprite('#ffffff', 4.2, 0.95, '#fffbeb');
    const mwCore = createGlowSprite('#fde68a', 11.5, 0.85, '#fff7ed');
    const mwHalo = createGlowSprite('#60a5fa', 22.0, 0.28);
    this.core1Marker.add(mwHalo, mwCore, mwInner);
    this.group.add(this.core1Marker);

    // Andromeda M31 nucleus (luminous cream-violet bulge + outer halo)
    const m31Inner = createGlowSprite('#ffffff', 5.0, 0.95, '#fdf4ff');
    const m31Core = createGlowSprite('#f5d0fe', 13.5, 0.85, '#fff7ed');
    const m31Halo = createGlowSprite('#c084fc', 26.0, 0.3);
    this.core2Marker.add(m31Halo, m31Core, m31Inner);
    this.group.add(this.core2Marker);
  }

  public build(options?: Record<string, unknown>): void {
    const preset = (options?.preset as CollisionPreset) || this.activePreset;
    const density = (options?.density as DensityLevel) || this.activeDensity;
    const ratio = typeof options?.massRatio === 'number' ? options.massRatio : 1.38;
    this.resetSimulation(preset, density, ratio);
  }

  public setMassRatio(ratio: number): void {
    const clamped = Math.max(0.5, Math.min(2.2, ratio));
    this.mass1 = 420;
    this.mass2 = Math.round(420 * clamped);
  }

  public resetSimulation(
    preset: CollisionPreset = this.activePreset,
    density: DensityLevel = this.activeDensity,
    massRatio = 1.38
  ): void {
    this.activePreset = preset;
    this.activeDensity = density;
    this.starCount = DENSITY_STAR_COUNT[density];
    this.setMassRatio(massRatio);
    this.elapsedGyr = 0;
    this.stepCounter = 0;
    this.pendingDt = 0;
    this.isStepping = false;

    const mTotal = this.mass1 + this.mass2;
    const f1 = this.mass2 / mTotal;
    const f2 = this.mass1 / mTotal;

    // Configure initial relative encounter geometry (center of mass at origin)
    if (preset === 'headon') {
      const sep = new THREE.Vector3(38, 1.5, 8);
      const relVel = new THREE.Vector3(-4.1, -0.1, -0.35);
      this.core1Pos.copy(sep).multiplyScalar(-f1);
      this.core2Pos.copy(sep).multiplyScalar(f2);
      this.core1Vel.copy(relVel).multiplyScalar(-f1);
      this.core2Vel.copy(relVel).multiplyScalar(f2);
    } else if (preset === 'bridge') {
      const sep = new THREE.Vector3(44, 5.0, 24);
      const relVel = new THREE.Vector3(-2.6, -0.35, -2.55);
      this.core1Pos.copy(sep).multiplyScalar(-f1);
      this.core2Pos.copy(sep).multiplyScalar(f2);
      this.core1Vel.copy(relVel).multiplyScalar(-f1);
      this.core2Vel.copy(relVel).multiplyScalar(f2);
    } else {
      // Prograde oblique Milky Way + Andromeda merger (Milkomeda)
      const sep = new THREE.Vector3(40, 5.0, 20);
      const relVel = new THREE.Vector3(-2.75, -0.32, -1.75);
      this.core1Pos.copy(sep).multiplyScalar(-f1);
      this.core2Pos.copy(sep).multiplyScalar(f2);
      this.core1Vel.copy(relVel).multiplyScalar(-f1);
      this.core2Vel.copy(relVel).multiplyScalar(f2);
    }

    this.core1Marker.position.copy(this.core1Pos);
    this.core2Marker.position.copy(this.core2Pos);

    // Allocate typed arrays for N stars
    const n = this.starCount;
    this.positions = new Float32Array(n * 3);
    this.velocities = new Float32Array(n * 3);
    this.accelerations = new Float32Array(n * 3);
    this.nextAccelerations = new Float32Array(n * 3);
    this.onnxInputs = new Float32Array(n * 11);

    const colors = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    const seeds = new Float32Array(n);

    const rand = mulberry32(202611 + (preset === 'headon' ? 11 : preset === 'bridge' ? 23 : 0));
    const nMW = Math.floor(n * 0.44); // Milky Way share
    const nM31 = n - nMW;             // Andromeda (slightly larger)

    const mwRot = new THREE.Euler(0.24, 0.12, -0.18);
    const m31Rot = new THREE.Euler(0.72, -0.36, 0.32);

    this.populateGalaxyDisk(0, nMW, this.core1Pos, this.core1Vel, this.mass1, mwRot, true, rand, colors, sizes, seeds);
    this.populateGalaxyDisk(nMW, nM31, this.core2Pos, this.core2Vel, this.mass2, m31Rot, false, rand, colors, sizes, seeds);

    // Compute initial accelerations a_0 so Leapfrog kick-drift-kick starts symmetrically
    this.packOnnxInputs();
    computeAnalyticalAcceleration(this.onnxInputs, n, this.accelerations);
    this.computeCoreAccelerations(this.core1Acc, this.core2Acc);

    // Rebuild Three.js Points mesh
    if (this.starPoints) {
      this.group.remove(this.starPoints);
      this.starPoints.geometry.dispose();
    }
    if (this.starMaterial) {
      this.starMaterial.dispose();
    }

    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.positions, 3);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

    this.starMaterial = new THREE.ShaderMaterial({
      vertexShader: STAR_VERTEX,
      fragmentShader: STAR_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: 450 },
        uBrightness: { value: 0.95 },
        uOpacity: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.starPoints = new THREE.Points(geo, this.starMaterial);
    this.starPoints.frustumCulled = false;
    this.group.add(this.starPoints);
  }

  private populateGalaxyDisk(
    offsetIdx: number,
    count: number,
    corePos: THREE.Vector3,
    coreVel: THREE.Vector3,
    coreMass: number,
    diskEuler: THREE.Euler,
    isMilkyWay: boolean,
    rand: () => number,
    colors: Float32Array,
    sizes: Float32Array,
    seeds: Float32Array
  ): void {
    const qDisk = new THREE.Quaternion().setFromEuler(diskEuler);
    const localPos = new THREE.Vector3();
    const localVel = new THREE.Vector3();

    const cCore = new THREE.Color(isMilkyWay ? '#fff4d6' : '#fae8ff');
    const cArm = new THREE.Color(isMilkyWay ? '#7dd3fc' : '#c084fc');
    const cKnot = new THREE.Color(isMilkyWay ? '#f472b6' : '#818cf8');
    const cWhite = new THREE.Color('#ffffff');
    const tmpCol = new THREE.Color();

    const diskMaxR = isMilkyWay ? 16.5 : 19.5;
    const armCount = isMilkyWay ? 2 : 3;

    for (let i = 0; i < count; i++) {
      const idx = offsetIdx + i;
      const i3 = idx * 3;
      const p = rand();

      let lx = 0, ly = 0, lz = 0;
      let rDisk = 0;

      if (p < 0.2) {
        // Central spheroidal bulge
        rDisk = Math.max(1.0, Math.abs(gaussianRandom(rand)) * 2.8);
        const th = rand() * Math.PI * 2;
        const ph = Math.acos(2 * rand() - 1);
        lx = rDisk * Math.sin(ph) * Math.cos(th);
        ly = rDisk * Math.cos(ph) * 0.55;
        lz = rDisk * Math.sin(ph) * Math.sin(th);
        tmpCol.copy(cCore).lerp(cWhite, rand() * 0.35);
        sizes[idx] = 0.54 + rand() * 0.62;
      } else {
        // Logarithmic spiral arms
        const arm = i % armCount;
        const t = Math.pow(rand(), 0.72);
        rDisk = 2.2 + t * (diskMaxR - 2.2);
        const winding = 0.28 * Math.pow(rDisk, 0.78);
        const scatter = (0.95 + rDisk * 0.08) * gaussianRandom(rand);
        const ang = (arm / armCount) * Math.PI * 2 + winding + scatter / Math.max(4.0, rDisk);
        lx = Math.cos(ang) * rDisk;
        lz = Math.sin(ang) * rDisk;
        ly = gaussianRandom(rand) * (0.28 + 0.45 * Math.exp(-rDisk / 7.5));

        tmpCol.copy(cCore).lerp(cArm, Math.min(1, t * 1.25));
        if (rand() < 0.2) tmpCol.lerp(cKnot, 0.65);
        if (rand() < 0.18) tmpCol.lerp(cWhite, 0.7);
        sizes[idx] = 0.45 + rand() * 0.56;
      }

      localPos.set(lx, ly, lz);

      // Compute exact radial circular orbital velocity for flat DM-halo + core potential
      const rSq = localPos.lengthSq() + 4.0;
      const rMag = Math.sqrt(rSq);
      const radialAccel =
        (CORE_G * coreMass * localPos.length()) / (rSq * rMag) +
        (CORE_DM_STRENGTH * (coreMass / 500.0) * localPos.length()) / (rSq + CORE_DM_RADIUS_SQ);
      const planarR = Math.max(0.6, Math.hypot(lx, lz));
      const vCirc = Math.sqrt(Math.max(0.05, radialAccel * planarR));

      // Counter-clockwise orbital tangent in disk plane + small velocity dispersion
      const tx = -lz / planarR;
      const tz = lx / planarR;
      const disp = 0.18;
      localVel.set(
        tx * vCirc + gaussianRandom(rand) * disp,
        gaussianRandom(rand) * disp * 0.5,
        tz * vCirc + gaussianRandom(rand) * disp
      );

      // Rotate into world encounter orientation and shift to galaxy core
      localPos.applyQuaternion(qDisk).add(corePos);
      localVel.applyQuaternion(qDisk).add(coreVel);

      this.positions[i3] = localPos.x;
      this.positions[i3 + 1] = localPos.y;
      this.positions[i3 + 2] = localPos.z;

      this.velocities[i3] = localVel.x;
      this.velocities[i3 + 1] = localVel.y;
      this.velocities[i3 + 2] = localVel.z;

      const bright = 0.7 + rand() * 0.55;
      colors[i3] = tmpCol.r * bright;
      colors[i3 + 1] = tmpCol.g * bright;
      colors[i3 + 2] = tmpCol.b * bright;
      seeds[idx] = rand();
    }
  }

  private packOnnxInputs(): void {
    const n = this.starCount;
    const x1 = this.core1Pos.x, y1 = this.core1Pos.y, z1 = this.core1Pos.z;
    const x2 = this.core2Pos.x, y2 = this.core2Pos.y, z2 = this.core2Pos.z;
    const m1 = this.mass1;
    const m2 = this.mass2;

    for (let i = 0; i < n; i++) {
      const pOff = i * 3;
      const inOff = i * 11;
      this.onnxInputs[inOff] = this.positions[pOff];
      this.onnxInputs[inOff + 1] = this.positions[pOff + 1];
      this.onnxInputs[inOff + 2] = this.positions[pOff + 2];
      this.onnxInputs[inOff + 3] = x1;
      this.onnxInputs[inOff + 4] = y1;
      this.onnxInputs[inOff + 5] = z1;
      this.onnxInputs[inOff + 6] = x2;
      this.onnxInputs[inOff + 7] = y2;
      this.onnxInputs[inOff + 8] = z2;
      this.onnxInputs[inOff + 9] = m1;
      this.onnxInputs[inOff + 10] = m2;
    }
  }

  private computeCoreAccelerations(outA1: THREE.Vector3, outA2: THREE.Vector3): void {
    const diff = new THREE.Vector3().subVectors(this.core2Pos, this.core1Pos);
    const rSq = diff.lengthSq() + CORE_SOFTENING_SQ;
    const r = Math.sqrt(rSq);

    // Mutual core + DM halo attraction
    const factor = CORE_G / (rSq * r) + (CORE_DM_STRENGTH / 500.0) / (rSq + CORE_DM_RADIUS_SQ);
    outA1.copy(diff).multiplyScalar(factor * this.mass2);
    outA2.copy(diff).multiplyScalar(-factor * this.mass1);

    // Chandrasekhar dynamical friction during dark-matter halo overlap -> drives authentic coalescence
    const relVel = new THREE.Vector3().subVectors(this.core2Vel, this.core1Vel);
    const overlap = Math.exp(-rSq / (22.0 * 22.0));
    const friction = 0.085 * overlap;
    outA1.addScaledVector(relVel, friction * (this.mass2 / 500));
    outA2.addScaledVector(relVel, -friction * (this.mass1 / 500));
  }

  private async stepLeapfrog(dtSim: number, forceAnalytical: boolean): Promise<void> {
    this.isStepping = true;
    try {
      const n = this.starCount;
      const halfDt = 0.5 * dtSim;

      // 1. First half-kick + drift for stars (Velocity-Verlet)
      for (let i = 0; i < n * 3; i++) {
        const vHalf = this.velocities[i] + this.accelerations[i] * halfDt;
        this.velocities[i] = vHalf;
        this.positions[i] += vHalf * dtSim;
      }

      // 2. Advance galactic cores symmetrically
      this.core1Vel.addScaledVector(this.core1Acc, halfDt);
      this.core2Vel.addScaledVector(this.core2Acc, halfDt);
      this.core1Pos.addScaledVector(this.core1Vel, dtSim);
      this.core2Pos.addScaledVector(this.core2Vel, dtSim);

      this.computeCoreAccelerations(this.core1Acc, this.core2Acc);
      this.core1Vel.addScaledVector(this.core1Acc, halfDt);
      this.core2Vel.addScaledVector(this.core2Acc, halfDt);

      // 3. Evaluate neural gravity (or analytical fallback) at new positions
      this.packOnnxInputs();
      await predictAcceleration(this.onnxInputs, n, this.nextAccelerations, forceAnalytical);

      // 4. Second half-kick & swap acceleration buffers
      for (let i = 0; i < n * 3; i++) {
        const aNew = this.nextAccelerations[i];
        this.velocities[i] += aNew * halfDt;
        this.accelerations[i] = aNew;
      }

      // 5. Update core beacons & Three.js GPU vertex buffer
      this.core1Marker.position.copy(this.core1Pos);
      this.core2Marker.position.copy(this.core2Pos);
      if (this.posAttr) this.posAttr.needsUpdate = true;

      // 6. Periodic live diagnostics (compare neural vs ground truth on 256-star probe)
      this.stepCounter++;
      if (!forceAnalytical && this.stepCounter % 25 === 0 && n >= 256) {
        this.diagSampleIn.set(this.onnxInputs.subarray(0, 256 * 11));
        computeAnalyticalAcceleration(this.diagSampleIn, 256, this.diagSampleOut, false);
        let dotSum = 0;
        for (let i = 0; i < 256; i++) {
          const o = i * 3;
          const px = this.accelerations[o], py = this.accelerations[o + 1], pz = this.accelerations[o + 2];
          const gx = this.diagSampleOut[o], gy = this.diagSampleOut[o + 1], gz = this.diagSampleOut[o + 2];
          const pNorm = Math.hypot(px, py, pz) + 1e-6;
          const gNorm = Math.hypot(gx, gy, gz) + 1e-6;
          dotSum += (px * gx + py * gy + pz * gz) / (pNorm * gNorm);
        }
        this.neuralCosineSim = dotSum / 256;
      }

      this.elapsedGyr += dtSim * 0.58;
    } finally {
      this.isStepping = false;
    }
  }

  public update(dt: number, state: AppState): void {
    if (!this.visible) return;
    this.ensureModelInitialized();
    this.activeMode = state.collisionPhysicsMode;

    // Rebuild if user toggled density or preset or mass ratio changed noticeably
    if (state.density !== this.activeDensity) {
      this.resetSimulation(state.collisionPreset, state.density, state.collisionMassRatio);
    }

    if (this.starMaterial) {
      this.starMaterial.uniforms.uTime.value = state.elapsedTime;
      this.starMaterial.uniforms.uScale.value =
        0.16 * window.innerHeight * Math.min(window.devicePixelRatio || 1, 2) * densityPointScale(state.density);
      this.starMaterial.uniforms.uBrightness.value = densityBrightness(state.density) * 1.35;
    }

    if (this.starPoints) {
      this.starPoints.visible = state.layers.stars;
    }

    if (!state.isPlaying || state.rotationSpeed <= 0) return;

    // Map UI speed slider (0.1..10000) smoothly into physical collision cadence
    const speedNorm = Math.min(4.0, Math.max(0.2, Math.log10(Math.max(1, state.rotationSpeed)) + 1.0));
    const dtSim = Math.min(dt, 0.035) * 1.15 * speedNorm;

    if (this.isStepping) {
      this.pendingDt = Math.min(0.14, this.pendingDt + dtSim);
      return;
    }

    const totalDt = Math.min(0.14, dtSim + this.pendingDt);
    this.pendingDt = 0;
    void this.stepLeapfrog(totalDt, state.collisionPhysicsMode === 'analytical');
  }

  public getTelemetry(): CollisionTelemetry {
    const stats = getGravityStats();
    const sepUnits = this.core1Pos.distanceTo(this.core2Pos);
    const relSpeedUnits = this.core1Vel.distanceTo(this.core2Vel);
    return {
      backend: stats.backend,
      physicsMode: this.activeMode,
      inferenceMs: stats.lastInferenceMs,
      starCount: this.starCount,
      elapsedGyr: this.elapsedGyr,
      coreSeparationKly: sepUnits * 3.8, // 1 scene unit ~ 3.8 kly
      relativeSpeedKms: relSpeedUnits * 185,
      neuralCosineSim: this.neuralCosineSim,
      preset: this.activePreset,
      massRatio: this.mass2 / this.mass1,
    };
  }

  public dispose(): void {
    this.starPoints?.geometry.dispose();
    this.starMaterial?.dispose();
    this.group.clear();
  }
}
