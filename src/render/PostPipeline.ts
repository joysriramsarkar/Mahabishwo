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

export class PostPipeline {
  public composer: EffectComposer;
  public bloom: BloomEffect;
  public vignette: VignetteEffect;
  public chromatic: ChromaticAberrationEffect;
  public toneMapping: ToneMappingEffect;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
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
