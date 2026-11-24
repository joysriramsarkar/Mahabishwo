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

  /** Keep tracking offset relative to an orbiting object so wheel/pan works naturally on a moving planet. */
  private trackingObject: THREE.Object3D | null = null;
  private trackingOffset = new THREE.Vector3();
  private trackingWorldPos = new THREE.Vector3();
  private flyFollowObj: THREE.Object3D | null = null;
  private flyStartTarget = new THREE.Vector3();
  private flyProgress = 0;
  private isTransitioning = false;
  private panVector = new THREE.Vector3();
  private tmpRight = new THREE.Vector3();
  private tmpUp = new THREE.Vector3();
  private tmpVec = new THREE.Vector3();
  private tmpAnchor = new THREE.Vector3();
  private tmpDir = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, state: AppState) {
    this.camera = camera;
    this.state = state;
  }

  public update(dt: number): void {
    if (this.isTransitioning && this.flyFollowObj) {
      if (this.flyFollowObj.parent) {
        this.flyFollowObj.getWorldPosition(this.trackingWorldPos);
        this.coords.target.lerpVectors(this.flyStartTarget, this.trackingWorldPos, this.flyProgress);
        this.coords.desiredTarget.copy(this.coords.target);
      }
    } else if (this.trackingObject && !this.isTransitioning) {
      if (!this.trackingObject.parent) {
        this.trackingObject = null;
      } else {
        this.trackingObject.getWorldPosition(this.trackingWorldPos);
        this.coords.desiredTarget.copy(this.trackingWorldPos).add(this.trackingOffset);
      }
    }

    if (this.state.autoRotate && !this.isTransitioning && this.state.isPlaying) {
      this.coords.targetTheta += dt * 0.05 * Math.min(this.state.rotationSpeed, 6);
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
   * Google-Maps style: when clientX/Y are given, the world point under the
   * cursor stays glued to its pixel while the radius changes, so you fly
   * into exactly what you point at — at any depth, on any layer.
   * Manual zoom input releases object tracking; otherwise the per-frame
   * tracking overwrite would silently erase the user's input.
   */
  public applyZoomDelta(delta: number, clientX?: number, clientY?: number): void {
    const minR = Math.max(GLOBAL_MIN_RADIUS, this.state.cameraMinRadius || GLOBAL_MIN_RADIUS);
    const prev = this.coords.targetRadius;
    const next = clamp(prev * Math.exp(delta * 0.0011), minR, GLOBAL_MAX_RADIUS);

    if (Math.abs(next - prev) > 1e-9) {
      if (clientX !== undefined && clientY !== undefined) {
        this.anchorZoomAtCursor(clientX, clientY, prev, next);
      }
      if (this.trackingObject && this.trackingObject.parent) {
        this.trackingObject.getWorldPosition(this.trackingWorldPos);
        this.trackingOffset.copy(this.coords.desiredTarget).sub(this.trackingWorldPos);
        if (this.trackingOffset.length() > 10 || next > 22) {
          this.trackingObject = null;
          this.trackingOffset.set(0, 0, 0);
        }
      }
    }
    this.coords.targetRadius = next;
  }

  /** Animate zoom to a fractional/integer level (used by zoom slider & buttons). */
  public zoomToLevel(level: number, duration = 1.1): void {
    const targetRadius = zoomLevelToRadius(level);
    if (targetRadius > 22) {
      this.trackingObject = null;
      this.trackingOffset.set(0, 0, 0);
    }
    gsap.killTweensOf(this.coords);
    gsap.to(this.coords, {
      targetRadius,
      duration,
      ease: 'power2.inOut',
    });
  }

  /**
   * Keep the cursor's world point fixed on screen across a radius change:
   * newTarget = anchor + (oldTarget - anchor) * (nextRadius / prevRadius).
   * The anchor's screen offset is proportional to |target - anchor| / depth,
   * and both scale by the same ratio, so the pixel doesn't move.
   */
  private anchorZoomAtCursor(clientX: number, clientY: number, prevRadius: number, nextRadius: number): void {
    const ndcX = (clientX / window.innerWidth) * 2 - 1;
    const ndcY = -(clientY / window.innerHeight) * 2 + 1;
    this.tmpVec.set(ndcX, ndcY, 0.5).unproject(this.camera);
    this.tmpVec.sub(this.camera.position).normalize();

    const target = this.coords.desiredTarget;
    const along = this.tmpAnchor.copy(target).sub(this.camera.position).dot(this.tmpVec);
    if (along < 1e-4) return;

    // World point under the cursor at target depth
    const anchor = this.tmpAnchor.copy(this.camera.position).addScaledVector(this.tmpVec, along);
    // Rescale the target offset around it
    this.tmpDir.copy(target).sub(anchor);
    target.copy(anchor).addScaledVector(this.tmpDir, nextRadius / prevRadius);

    const maxPan = GLOBAL_MAX_RADIUS * 1.2;
    if (target.length() > maxPan) {
      target.setLength(maxPan);
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
    if (this.trackingObject && this.trackingObject.parent) {
      this.trackingObject.getWorldPosition(this.trackingWorldPos);
      this.trackingOffset.copy(this.coords.desiredTarget).sub(this.trackingWorldPos);
      if (this.trackingOffset.length() > 10) {
        this.trackingObject = null;
        this.trackingOffset.set(0, 0, 0);
      }
    }
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
    onComplete?: () => void,
    followObj?: THREE.Object3D | null
  ): void {
    const targetVec = Array.isArray(targetPos) ? new THREE.Vector3(...targetPos) : targetPos;
    const minR = Math.max(GLOBAL_MIN_RADIUS, this.state.cameraMinRadius || GLOBAL_MIN_RADIUS);
    const clampedRadius = clamp(targetRadius, minR, GLOBAL_MAX_RADIUS);
    this.isTransitioning = true;
    this.trackingObject = null;
    this.trackingOffset.set(0, 0, 0);
    this.flyFollowObj = followObj ?? null;
    this.flyStartTarget.copy(this.coords.target);
    this.flyProgress = 0;

    gsap.killTweensOf(this);
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
        this.flyFollowObj = null;
        onComplete?.();
      },
    });

    if (this.flyFollowObj) {
      gsap.to(this, {
        flyProgress: 1,
        duration,
        ease: 'power3.inOut',
      });
    } else {
      gsap.to(this.coords.target, {
        x: targetVec.x,
        y: targetVec.y,
        z: targetVec.z,
        duration,
        ease: 'power3.inOut',
      });
      this.coords.desiredTarget.copy(targetVec);
    }
  }

  public goToScale(scale: ScaleLevel, duration = 1.5): void {
    const cfg = SCALE_CONFIGS[scale];
    this.animateTo(cfg.defaultTheta, cfg.defaultPhi, cfg.defaultRadius, [0, 0, 0], duration);
  }

  public trackObject(obj: THREE.Object3D | null, preserveOffset = false): void {
    this.trackingObject = obj;
    if (obj && obj.parent) {
      obj.getWorldPosition(this.trackingWorldPos);
      if (preserveOffset) {
        this.trackingOffset.copy(this.coords.desiredTarget).sub(this.trackingWorldPos);
        if (this.trackingOffset.length() > 10) {
          this.trackingOffset.setLength(10);
        }
      } else {
        this.trackingOffset.set(0, 0, 0);
        this.coords.desiredTarget.copy(this.trackingWorldPos);
      }
    } else {
      this.trackingOffset.set(0, 0, 0);
    }
  }

  public getIsTransitioning(): boolean {
    return this.isTransitioning;
  }

  public getTrackedObject(): THREE.Object3D | null {
    return this.trackingObject;
  }

  public releaseTracking(): void {
    this.trackingObject = null;
    this.trackingOffset.set(0, 0, 0);
    this.flyFollowObj = null;
  }

  public isTracking(): boolean {
    return this.trackingObject !== null;
  }

  public reset(): void {
    this.trackingObject = null;
    this.trackingOffset.set(0, 0, 0);
    this.flyFollowObj = null;
    const cfg = SCALE_CONFIGS[this.state.currentScale];
    this.animateTo(cfg.defaultTheta, cfg.defaultPhi, cfg.defaultRadius, [0, 0, 0], 1.2);
  }
}
