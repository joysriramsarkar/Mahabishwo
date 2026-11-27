/**
 * Physics-Informed Neural Gravity Inference Engine (ONNX Runtime Web — WebGPU / WASM)
 *
 * Evaluates a trained PyTorch MLP (`public/models/galaxy_gravity.onnx`) over
 * thousands of stars in a single batched pass to compute 3D gravitational
 * accelerations [ax, ay, az] during the Milky Way & Andromeda galaxy collision.
 *
 * Includes adaptive WebGPU vs WASM SIMD benchmark selection: WebGPU is used when
 * GPU readback latency is interactive (< 35 ms), otherwise it automatically
 * selects the fast WASM SIMD backend (~25–35 ms/batch) so rendering stays fluid.
 *
 * Input tensor  : float32 [starCount, 11] -> [x, y, z, x1, y1, z1, x2, y2, z2, m1, m2]
 * Output tensor : float32 [starCount, 3]  -> [ax, ay, az]
 */
import type * as OrtNamespace from 'onnxruntime-web/webgpu';

export type GravityBackend = 'uninitialized' | 'loading' | 'webgpu' | 'wasm' | 'analytical';

export interface GravityStats {
  backend: GravityBackend;
  lastInferenceMs: number;
  modelLoaded: boolean;
  errorMessage: string | null;
}

// Physical constants matching scripts/train_gravity.py (for analytical fallback & diagnostics)
const G_CONST = 1.0;
const SOFTENING_SQ = 2.0 * 2.0;
const DM_HALO_STRENGTH = 14.0;
const DM_CORE_RADIUS_SQ = 25.0;
const GLOBAL_HALO_STRENGTH = 0.35;
const GLOBAL_CORE_SQ = 12.0;

let ortMod: typeof OrtNamespace | null = null;
let session: OrtNamespace.InferenceSession | null = null;
let initPromise: Promise<GravityBackend> | null = null;
let activeBackend: GravityBackend = 'uninitialized';
let lastInferenceMs = 0;
let lastError: string | null = null;

function resolveAssetUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedRel = relativePath.replace(/^\/+/, '');
  if (typeof window !== 'undefined' && window.location?.href) {
    return new URL(`${normalizedBase}${normalizedRel}`, window.location.href).href;
  }
  return `${normalizedBase}${normalizedRel}`;
}

async function probeWebGPUAdapter(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown | null> } }).gpu;
  if (!gpu || typeof gpu.requestAdapter !== 'function') return false;
  try {
    const adapter = await gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

async function warmupAndMeasure(
  ort: typeof OrtNamespace,
  targetSession: OrtNamespace.InferenceSession,
  batchCount: number
): Promise<number> {
  const dummy = new Float32Array(batchCount * 11).fill(1.5);
  // Warmup pass (compiles shaders / caches graph)
  const in1 = new ort.Tensor('float32', dummy, [batchCount, 11]);
  const res1 = await targetSession.run({ inputs: in1 });
  await res1.accelerations.getData();
  in1.dispose();
  res1.accelerations.dispose();

  // Steady-state timing pass
  const t0 = performance.now();
  const in2 = new ort.Tensor('float32', dummy, [batchCount, 11]);
  const res2 = await targetSession.run({ inputs: in2 });
  await res2.accelerations.getData();
  in2.dispose();
  res2.accelerations.dispose();
  return performance.now() - t0;
}

/**
 * Initialize the ONNX Runtime Web inference session (`webgpu` when fast and
 * non-stalling, otherwise `wasm` SIMD, with safe `analytical` fallback).
 */
export async function initGravityModel(): Promise<GravityBackend> {
  if (session && (activeBackend === 'webgpu' || activeBackend === 'wasm')) {
    return activeBackend;
  }
  if (initPromise) return initPromise;

  activeBackend = 'loading';
  lastError = null;

  initPromise = (async () => {
    try {
      const ort = await import('onnxruntime-web/webgpu');
      ortMod = ort;

      ort.env.wasm.wasmPaths = resolveAssetUrl('ort/');
      ort.env.logLevel = 'error';
      if (typeof self !== 'undefined' && !self.crossOriginIsolated) {
        ort.env.wasm.numThreads = 1;
      }

      const modelUrl = resolveAssetUrl('models/galaxy_gravity.onnx');
      const hasWebGPU = await probeWebGPUAdapter();

      if (hasWebGPU) {
        try {
          const gpuSession = await ort.InferenceSession.create(modelUrl, {
            executionProviders: ['webgpu'],
            graphOptimizationLevel: 'all',
          });
          const gpuMs = await Promise.race([
            warmupAndMeasure(ort, gpuSession, 2048),
            new Promise<number>((resolve) => setTimeout(() => resolve(9999), 2800)),
          ]);
          if (gpuMs < 35) {
            session = gpuSession;
            activeBackend = 'webgpu';
            return activeBackend;
          }
          await gpuSession.release().catch(() => {});
          console.info(
            `[GravityNet] WebGPU readback (${gpuMs.toFixed(1)} ms) slower than interactive threshold; using ONNX WASM SIMD.`
          );
        } catch (gpuErr) {
          console.warn('WebGPU ONNX probe failed, switching to WASM SIMD:', gpuErr);
        }
      }

      const wasmSession = await ort.InferenceSession.create(modelUrl, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
      await warmupAndMeasure(ort, wasmSession, 512);
      session = wasmSession;
      activeBackend = 'wasm';
      return activeBackend;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn('ONNX Runtime unavailable, using analytical N-body force law:', err);
      session = null;
      activeBackend = 'analytical';
      return activeBackend;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Analytical Newtonian + NFW Dark Matter Halo acceleration matching the
 * ground-truth equations in `scripts/train_gravity.py`.
 * Used both as a safe fallback and for optional live neural error diagnostics.
 */
export function computeAnalyticalAcceleration(
  inputArray: Float32Array,
  starCount: number,
  outArray: Float32Array,
  recordTiming = true
): Float32Array {
  const t0 = recordTiming ? performance.now() : 0;
  for (let i = 0; i < starCount; i++) {
    const off = i * 11;
    const x = inputArray[off];
    const y = inputArray[off + 1];
    const z = inputArray[off + 2];

    const x1 = inputArray[off + 3];
    const y1 = inputArray[off + 4];
    const z1 = inputArray[off + 5];

    const x2 = inputArray[off + 6];
    const y2 = inputArray[off + 7];
    const z2 = inputArray[off + 8];

    const m1 = inputArray[off + 9];
    const m2 = inputArray[off + 10];

    const r1x = x1 - x;
    const r1y = y1 - y;
    const r1z = z1 - z;
    const d1Sq = r1x * r1x + r1y * r1y + r1z * r1z + SOFTENING_SQ;
    const d1 = Math.sqrt(d1Sq);
    const f1 = (G_CONST * m1) / (d1Sq * d1) + (DM_HALO_STRENGTH * (m1 / 500.0)) / (d1Sq + DM_CORE_RADIUS_SQ);

    const r2x = x2 - x;
    const r2y = y2 - y;
    const r2z = z2 - z;
    const d2Sq = r2x * r2x + r2y * r2y + r2z * r2z + SOFTENING_SQ;
    const d2 = Math.sqrt(d2Sq);
    const f2 = (G_CONST * m2) / (d2Sq * d2) + (DM_HALO_STRENGTH * (m2 / 500.0)) / (d2Sq + DM_CORE_RADIUS_SQ);

    const dcSq = x * x + y * y + z * z + GLOBAL_CORE_SQ;
    const fg = GLOBAL_HALO_STRENGTH / dcSq;

    const outOff = i * 3;
    outArray[outOff] = r1x * f1 + r2x * f2 - x * fg;
    outArray[outOff + 1] = r1y * f1 + r2y * f2 - y * fg;
    outArray[outOff + 2] = r1z * f1 + r2z * f2 - z * fg;
  }
  if (recordTiming) {
    lastInferenceMs = performance.now() - t0;
  }
  return outArray;
}

/**
 * Predict 3D gravitational accelerations for `starCount` stars in a single batched pass.
 * Writes directly into `outArray` (if provided) to avoid per-frame allocations.
 */
export async function predictAcceleration(
  inputArray: Float32Array,
  starCount: number,
  outArray?: Float32Array,
  forceAnalytical = false
): Promise<Float32Array> {
  const targetOut =
    outArray && outArray.length >= starCount * 3
      ? outArray
      : new Float32Array(starCount * 3);

  if (forceAnalytical || !session || !ortMod || activeBackend === 'analytical') {
    return computeAnalyticalAcceleration(inputArray, starCount, targetOut);
  }

  const t0 = performance.now();
  const inputTensor = new ortMod.Tensor('float32', inputArray, [starCount, 11]);
  let outTensor: OrtNamespace.Tensor | undefined;

  try {
    const results = await session.run({ inputs: inputTensor });
    outTensor = results.accelerations;
    const data = (await outTensor.getData()) as Float32Array;
    targetOut.set(data.subarray(0, starCount * 3));
    lastInferenceMs = performance.now() - t0;
    return targetOut;
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    console.warn('ONNX inference failed, switching to analytical fallback:', err);
    activeBackend = 'analytical';
    return computeAnalyticalAcceleration(inputArray, starCount, targetOut);
  } finally {
    inputTensor.dispose();
    outTensor?.dispose();
  }
}

export function getGravityStats(): GravityStats {
  return {
    backend: activeBackend,
    lastInferenceMs,
    modelLoaded: session !== null,
    errorMessage: lastError,
  };
}
