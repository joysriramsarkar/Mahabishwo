/**
 * Continuous multi-scale camera controller.
 *
 * One seamless logarithmic zoom: radius 950 → 2 across the whole universe.
 * The fractional zoom level (state.zoomLevel, 0..6) is derived from radius,
 * so wheeling the mouse flies you continuously from the observable universe
 * down to a planetary surface — no discrete jumps.
 *
 * Wheel zoom is directed at the cursor: zooming in flies toward the point
 * under the mouse, so you can zoom into *anywhere* (a galaxy arm, a planet,
 * a supercluster node), not just the center.
 */
import * as THREE from 'three';
import gsap from 'gsap';
import { AppState, ScaleLevel, SphericalCameraState, SCALE_CONFIGS } from './types';
import { clamp, damp } from '../utils/math';

/** Camera radius at each integer scale level. */
export const SCALE_RADII = [430, 280, 175, 110, 44, 10, 5.6];
export const GLOBAL_MIN_RADIUS = 2.0;
export const GLOBAL_MAX_RADIUS = 950;

/** Map a camera radius to a fractional zoom level 0..6. */
export function radiusToZoomLevel(radius: number): number {
  const r = clamp(radius, SCALE_RADII[6], GLOBAL_MAX_RADIUS);
  for (let i = 0; i < 6; i++) {
    const hi = SCALE_RADII[i];
    const lo = SCALE_RADII[i + 1];
    if (r <= hi && r >= lo) {
      const t = (Math.log(hi) - Math.log(r)) / (Math.log(hi) - Math.log(lo));
      return i + clamp(t, 0, 1);
    }
  }
  return r > SCALE_RADII[0] ? 0 : 6;
}

/** Map a fractional zoom level to a camera radius. */
export function zoomLevelToRadius(level: number): number {
  const l = clamp(level, 0, 6);
  const i = Math.min(5, Math.floor(l));
  const t = l - i;
  return Math.exp(THREE.MathUtils.lerp(Math.log(SCALE_RADII[i]), Math.log(SCALE_RADII[i + 1]), t));
}

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  public state: AppState;

  public coords: SphericalCameraState = {
    theta: 0.55,
    phi: 0.96,
    radius: 430,
    targetTheta: 0.55,
    targetPhi: 0.96,
    targetRadius: 430,
    target: new THREE.Vector3(0, 0, 0),
    desiredTarget: new THREE.Vector3(0, 0, 0),
  };

  private trackingObject: THREE.Object3D | null = null;
  private isTransitioning = false;
  private panVector = new THREE.Vector3();
  private tmpRight = new THREE.Vector3();
  private tmpUp = new THREE.Vector3();
  private tmpVec = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, state: AppState) {
    this.camera = camera;
    this.state = state;
  }

  public update(dt: number): void {
    if (this.trackingObject) {
      this.coords.desiredTarget.copy(this.trackingObject.position);
    }

    if (this.state.autoRotate && !this.isTransitioning && this.state.isPlaying) {
      this.coords.targetTheta += dt * 0.05 * this.state.rotationSpeed;
    }

    // Collision-aware minimum (set by SceneManager, e.g. planet surface)
    const minR = Math.max(GLOBAL_MIN_RADIUS, this.state.cameraMinRadius || GLOBAL_MIN_RADIUS);
    this.coords.targetRadius = clamp(this.coords.targetRadius, minR, GLOBAL_MAX_RADIUS);

    if (!this.isTransitioning) {
      const speed = 6.5;
      this.coords.theta = damp(this.coords.theta, this.coords.targetTheta, speed, dt);
      this.coords.phi = damp(this.coords.phi, this.coords.targetPhi, speed, dt);
      this.coords.radius = damp(this.coords.radius, this.coords.targetRadius, speed, dt);
      this.coords.target.lerp(this.coords.desiredTarget, 1 - Math.exp(-speed * dt));
    }

    this.coords.radius = Math.max(minR * 0.92, this.coords.radius);
    this.state.zoomLevel = radiusToZoomLevel(this.coords.radius);

    const sinPhi = Math.sin(this.coords.phi);
    this.camera.position.set(
      this.coords.target.x + this.coords.radius * sinPhi * Math.sin(this.coords.theta),
      this.coords.target.y + this.coords.radius * Math.cos(this.coords.phi),
      this.coords.target.z + this.coords.radius * sinPhi * Math.cos(this.coords.theta)
    );
    this.camera.lookAt(this.coords.target);
  }

  public applyOrbitDelta(dTheta: number, dPhi: number): void {
    this.coords.targetTheta -= dTheta;
    this.coords.targetPhi = clamp(this.coords.targetPhi - dPhi, 0.04, Math.PI - 0.04);
  }

  /**
   * Continuous exponential zoom. Positive delta zooms out.
   * When clientX/Y are given and zooming in, the target drifts toward the
   * point under the cursor so you fly into what you point at.
   */
  public applyZoomDelta(delta: number, clientX?: number, clientY?: number): void {
    const minR = Math.max(GLOBAL_MIN_RADIUS, this.state.cameraMinRadius || GLOBAL_MIN_RADIUS);
    const prev = this.coords.targetRadius;
    const next = clamp(prev * Math.exp(delta * 0.0011), minR, GLOBAL_MAX_RADIUS);

    if (clientX !== undefined && clientY !== undefined && next < prev) {
      this.shiftTargetTowardCursor(clientX, clientY, 0.22);
    }
    this.coords.targetRadius = next;
  }

  /** Animate zoom to a fractional/integer level (used by zoom slider & buttons). */
  public zoomToLevel(level: number, duration = 1.1): void {
    const targetRadius = zoomLevelToRadius(level);
    gsap.killTweensOf(this.coords);
    gsap.to(this.coords, {
      targetRadius,
      duration,
      ease: 'power2.inOut',
    });
  }

  private shiftTargetTowardCursor(clientX: number, clientY: number, amount: number): void {
    const ndcX = (clientX / window.innerWidth) * 2 - 1;
    const ndcY = -(clientY / window.innerHeight) * 2 + 1;
    this.tmpVec.set(ndcX, ndcY, 0.5).unproject(this.camera);
    this.tmpVec.sub(this.camera.position).normalize();
    const dist = this.camera.position.distanceTo(this.coords.desiredTarget);
    this.tmpVec.multiplyScalar(dist).add(this.camera.position);
    this.coords.desiredTarget.lerp(this.tmpVec, amount);
    const maxPan = GLOBAL_MAX_RADIUS * 1.2;
    if (this.coords.desiredTarget.length() > maxPan) {
      this.coords.desiredTarget.setLength(maxPan);
    }
  }

  public applyPanDelta(dx: number, dy: number): void {
    const scale = this.coords.targetRadius * 0.0016;
    this.tmpRight.set(Math.cos(this.coords.theta), 0, -Math.sin(this.coords.theta));
    this.tmpUp.set(0, 1, 0);
    this.panVector.set(0, 0, 0);
    this.panVector.addScaledVector(this.tmpRight, -dx * scale);
    this.panVector.addScaledVector(this.tmpUp, dy * scale);
    this.coords.desiredTarget.add(this.panVector);
    const maxR = GLOBAL_MAX_RADIUS * 1.2;
    if (this.coords.desiredTarget.length() > maxR) {
      this.coords.desiredTarget.setLength(maxR);
    }
  }

  public animateTo(
    targetTheta: number,
    targetPhi: number,
    targetRadius: number,
    targetPos: THREE.Vector3 | [number, number, number],
    duration = 1.4,
    onComplete?: () => void
  ): void {
    const targetVec = Array.isArray(targetPos) ? new THREE.Vector3(...targetPos) : targetPos;
    const minR = Math.max(GLOBAL_MIN_RADIUS, this.state.cameraMinRadius || GLOBAL_MIN_RADIUS);
    const clampedRadius = clamp(targetRadius, minR, GLOBAL_MAX_RADIUS);
    this.isTransitioning = true;
    this.trackingObject = null;

    gsap.killTweensOf(this.coords);
    gsap.killTweensOf(this.coords.target);

    gsap.to(this.coords, {
      theta: targetTheta,
      targetTheta,
      phi: targetPhi,
      targetPhi,
      radius: clampedRadius,
      targetRadius: clampedRadius,
      duration,
      ease: 'power3.inOut',
      onComplete: () => {
        this.isTransitioning = false;
        onComplete?.();
      },
    });

    gsap.to(this.coords.target, {
      x: targetVec.x,
      y: targetVec.y,
      z: targetVec.z,
      duration,
      ease: 'power3.inOut',
    });

    this.coords.desiredTarget.copy(targetVec);
  }

  public goToScale(scale: ScaleLevel, duration = 1.5): void {
    const cfg = SCALE_CONFIGS[scale];
    this.animateTo(cfg.defaultTheta, cfg.defaultPhi, cfg.defaultRadius, [0, 0, 0], duration);
  }

  public trackObject(obj: THREE.Object3D | null): void {
    this.trackingObject = obj;
    if (obj) this.coords.desiredTarget.copy(obj.position);
  }

  public releaseTracking(): void {
    this.trackingObject = null;
  }

  public isTracking(): boolean {
    return this.trackingObject !== null;
  }

  public reset(): void {
    this.trackingObject = null;
    const cfg = SCALE_CONFIGS[this.state.currentScale];
    this.animateTo(cfg.defaultTheta, cfg.defaultPhi, cfg.defaultRadius, [0, 0, 0], 1.2);
  }
}
