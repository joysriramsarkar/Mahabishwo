/**
 * HDR post-processing pipeline.
 * RenderPass → Bloom → Vignette → Chromatic Aberration → ACES Tone Mapping.
 */
import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  VignetteEffect,
  ChromaticAberrationEffect,
  ToneMappingEffect,
  ToneMappingMode,
} from 'postprocessing';

/**
 * Some GPUs / browser drivers advertise half-float color buffers but render
 * black into them. Probe it with a tiny bright quad; if the readback is dark,
 * fall back to an 8-bit buffer so the scene is never lost.
 */
function supportsHalfFloatTarget(renderer: THREE.WebGLRenderer): boolean {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  if (
    !gl.getExtension('EXT_color_buffer_float') &&
    !gl.getExtension('EXT_color_buffer_half_float')
  ) {
    return false;
  }
  let rt: THREE.WebGLRenderTarget | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.OrthographicCamera | null = null;
  let quad: THREE.Mesh | null = null;
  try {
    rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, depthBuffer: false });
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    scene.add(quad);
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, camera);
    const pixel = new Uint8Array(4);
    renderer.readRenderTargetPixels(rt, 0, 0, 1, 1, pixel);
    renderer.setRenderTarget(previous);
    return pixel[0] > 200;
  } catch {
    return false;
  } finally {
    rt?.dispose();
    if (quad) {
      quad.geometry.dispose();
      (quad.material as THREE.Material).dispose();
    }
    scene = null;
    camera = null;
    quad = null;
  }
}

export class PostPipeline {
  public composer: EffectComposer;
  public bloom: BloomEffect;
  public vignette: VignetteEffect;
  public chromatic: ChromaticAberrationEffect;
  public toneMapping: ToneMappingEffect;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    const frameBufferType = supportsHalfFloatTarget(renderer)
      ? THREE.HalfFloatType
      : THREE.UnsignedByteType;
    this.composer = new EffectComposer(renderer, {
      frameBufferType,
      multisampling: 4,
      depthBuffer: true,
      stencilBuffer: false,
    });

    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = new BloomEffect({
      mipmapBlur: true,
      luminanceThreshold: 1.0,
      luminanceSmoothing: 0.15,
      intensity: 0.65,
      radius: 0.6,
      levels: 7,
    });

    this.vignette = new VignetteEffect({
      offset: 0.32,
      darkness: 0.62,
    });

    this.chromatic = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.00018, 0.00025),
      radialModulation: true,
      modulationOffset: 0.45,
    });

    this.toneMapping = new ToneMappingEffect({
      mode: ToneMappingMode.ACES_FILMIC,
      whitePoint: 2.6,
      middleGrey: 0.5,
    });

    this.composer.addPass(
      new EffectPass(camera, this.bloom, this.vignette, this.chromatic, this.toneMapping)
    );
  }

  public setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
  }

  public setBloom(intensity: number): void {
    this.bloom.intensity = intensity;
  }

  public setVignette(offset: number, darkness: number): void {
    this.vignette.offset = offset;
    this.vignette.darkness = darkness;
  }

  public render(deltaTime?: number): void {
    this.composer.render(deltaTime);
  }

  public dispose(): void {
    this.composer.dispose();
  }
}
