/** Pure interpolation helpers for the ~900 ms frame transition (s15.1). */
export const FRAME_TRANSITION_MS = 900;

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Smoothstep: zero velocity at both ends, no abrupt visual jump. */
export function easeInOutCubic(value: number): number {
  const t = clamp01(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function transitionProgress(elapsedMs: number, durationMs = FRAME_TRANSITION_MS): number {
  if (durationMs <= 0) return 1;
  return clamp01(elapsedMs / durationMs);
}

export function interpolateArray(
  from: ArrayLike<number>,
  to: ArrayLike<number>,
  progress: number,
  out?: ArrayLike<number> & { [index: number]: number },
): ArrayLike<number> {
  const t = easeInOutCubic(progress);
  const target = out ?? new Float32Array(from.length);
  for (let i = 0; i < from.length; i++) {
    target[i] = Number(from[i]) + (Number(to[i]) - Number(from[i])) * t;
  }
  return target;
}
