/**
 * WebGL Engine — renderer, scene, camera, lighting and HDR post pipeline.
 */
import * as THREE from 'three';
import { PostPipeline } from '../render/PostPipeline';
import { QualityLevel } from './types';

export class Engine {
  public canvas: HTMLCanvasElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public pipeline: PostPipeline;

  public ambientLight: THREE.AmbientLight;
  public sunLight: THREE.PointLight;
  public fillLight: THREE.DirectionalLight;

  private basePixelRatio: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false, // MSAA handled by the composer
      alpha: false,
      logarithmicDepthBuffer: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
      stencil: false,
    });

    this.basePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.basePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x01020a, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Tone mapping is applied in the post pipeline (ACES).
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = false;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.01,
      20000
    );
    this.camera.position.set(0, 180, 420);

    // Global lighting
    this.ambientLight = new THREE.AmbientLight(0x33415e, 0.85);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.PointLight(0xfff3d6, 2.4, 0, 0);
    this.sunLight.position.set(0, 0, 0);
    this.scene.add(this.sunLight);

    this.fillLight = new THREE.DirectionalLight(0x7ea8ff, 0.35);
    this.fillLight.position.set(-120, 90, -140);
    this.scene.add(this.fillLight);

    this.pipeline = new PostPipeline(this.renderer, this.scene, this.camera);
  }

  public setQuality(quality: QualityLevel): void {
    const pr =
      quality === 'high' ? Math.min(window.devicePixelRatio || 1, 2) :
      quality === 'medium' ? Math.min(window.devicePixelRatio || 1, 1.5) :
      Math.min(window.devicePixelRatio || 1, 1);
    this.renderer.setPixelRatio(pr);
    this.pipeline.setSize(window.innerWidth, window.innerHeight);
  }

  public resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.pipeline.setSize(w, h);
  }

  public render(deltaTime?: number): void {
    this.pipeline.render(deltaTime);
  }

  /**
   * Save the current frame as a PNG. The renderer already uses
   * `preserveDrawingBuffer`, so a fresh render is all that is required before
   * reading the canvas back.
   */
  public captureScreenshot(onDone?: (ok: boolean) => void): void {
    try {
      this.render(0);
      this.canvas.toBlob((blob) => {
        if (!blob) {
          onDone?.(false);
          return;
        }
        const stamp = new Date()
          .toISOString()
          .replace(/[:.]/g, '-')
          .replace('T', '_')
          .slice(0, 19);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mahabishwo-${stamp}.png`;
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1500);
        onDone?.(true);
      }, 'image/png');
    } catch (error) {
      console.error('Screenshot failed:', error);
      onDone?.(false);
    }
  }
}
