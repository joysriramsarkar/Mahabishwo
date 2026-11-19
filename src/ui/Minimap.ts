/**
 * Cosmic Radar Minimap (2D Canvas).
 * Displays concentric scale rings, active scale ring and live camera azimuth needle.
 */
import { AppState, SCALE_CONFIGS } from '../core/types';
import { CameraController } from '../core/CameraController';

export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: AppState;
  private cameraCtrl: CameraController;

  constructor(state: AppState, cameraCtrl: CameraController) {
    this.canvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.width = 160;
    this.canvas.height = 160;
    this.state = state;
    this.cameraCtrl = cameraCtrl;
  }

  public update(): void {
    if (this.canvas.classList.contains('hidden')) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    // Concentric scale rings
    for (let i = 0; i < 6; i++) {
      const r = 12 + i * 11;
      const isCurrent = this.state.currentScale === i || (i === 5 && this.state.currentScale === 6);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = isCurrent ? 'rgba(96, 165, 250, 0.9)' : 'rgba(148, 163, 184, 0.2)';
      ctx.lineWidth = isCurrent ? 2 : 1;
      ctx.stroke();
    }

    // Crosshairs
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 68, cy);
    ctx.lineTo(cx + 68, cy);
    ctx.moveTo(cx, cy - 68);
    ctx.lineTo(cx, cy + 68);
    ctx.stroke();

    // Camera azimuth cone & dot
    const theta = this.cameraCtrl.coords.theta;
    const cfg = SCALE_CONFIGS[this.state.currentScale];
    const normR = Math.min(1, Math.max(0.15, this.cameraCtrl.coords.radius / cfg.maxZoom));
    const px = cx + Math.sin(theta) * normR * 58;
    const py = cy + Math.cos(theta) * normR * 58;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();

    // Center marker
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fde047';
    ctx.fill();

    // Label
    ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
    ctx.font = '600 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cfg.shortBn, cx, h - 8);
  }
}
