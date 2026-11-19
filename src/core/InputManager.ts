/**
 * Unified pointer / wheel / touch input for orbit, zoom and pan.
 * Emits a tap callback for object picking (click without drag).
 */
import { AppState } from './types';
import { CameraController } from './CameraController';

interface PointerPoint {
  x: number;
  y: number;
}

export class InputManager {
  public onTap: ((clientX: number, clientY: number) => void) | null = null;

  private canvas: HTMLCanvasElement;
  private cameraCtrl: CameraController;
  private state: AppState;

  private pointers: Map<number, PointerPoint> = new Map();
  private lastPinchDist = 0;
  private lastX = 0;
  private lastY = 0;
  private dragDistance = 0;
  private isDown = false;

  constructor(canvas: HTMLCanvasElement, cameraCtrl: CameraController, state: AppState) {
    this.canvas = canvas;
    this.cameraCtrl = cameraCtrl;
    this.state = state;

    canvas.style.touchAction = 'none';

    canvas.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private handlePointerDown = (e: PointerEvent): void => {
    this.canvas.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.isDown = true;
    this.dragDistance = 0;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.lastPinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const delta = dist - this.lastPinchDist;
      this.lastPinchDist = dist;
      this.cameraCtrl.applyZoomDelta(-delta * 3.2, (a.x + b.x) / 2, (a.y + b.y) / 2);
      // Two-finger drag pans
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      this.cameraCtrl.applyPanDelta(cx - this.lastX, cy - this.lastY);
      this.lastX = cx;
      this.lastY = cy;
      this.dragDistance += Math.abs(delta);
      return;
    }

    if (!this.isDown) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.dragDistance += Math.abs(dx) + Math.abs(dy);

    const pan = e.buttons === 2 || e.shiftKey;
    if (pan) {
      this.cameraCtrl.applyPanDelta(dx, dy);
    } else {
      this.cameraCtrl.applyOrbitDelta(dx * 0.0052, dy * 0.0052);
    }
  };

  private handlePointerUp = (e: PointerEvent): void => {
    const wasDown = this.isDown;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 0) {
      this.isDown = false;
      if (wasDown && this.dragDistance < 6 && this.onTap) {
        this.onTap(e.clientX, e.clientY);
      }
    }
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const delta = e.deltaY * (e.deltaMode === 1 ? 18 : 1);
    // Zoom toward the cursor — fly into whatever you point at
    this.cameraCtrl.applyZoomDelta(delta * 0.9, e.clientX, e.clientY);
  };
}
