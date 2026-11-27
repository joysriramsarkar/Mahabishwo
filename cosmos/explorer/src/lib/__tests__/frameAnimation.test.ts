import { describe, expect, it } from 'vitest';
import { clamp01, easeInOutCubic, interpolateArray, transitionProgress, FRAME_TRANSITION_MS } from '../frameAnimation';

describe('frame animation', () => {
  it('uses the masterplan ~1 second duration', () => {
    expect(FRAME_TRANSITION_MS).toBe(900);
    expect(transitionProgress(0)).toBe(0);
    expect(transitionProgress(450)).toBeCloseTo(0.5);
    expect(transitionProgress(900)).toBe(1);
    expect(transitionProgress(2000)).toBe(1);
    expect(transitionProgress(100, 0)).toBe(1);
  });
  it('clamps and eases with zero endpoint velocity', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(1)).toBe(1);
  });
  it('interpolates start, midpoint and exact completion without drift', () => {
    const from = new Float32Array([0, 10, -10]);
    const to = new Float32Array([10, 30, 10]);
    const out = new Float32Array(3);
    expect(Array.from(interpolateArray(from, to, 0, out))).toEqual([0, 10, -10]);
    expect(Array.from(interpolateArray(from, to, 0.5, out))).toEqual([5, 20, 0]);
    expect(Array.from(interpolateArray(from, to, 1, out))).toEqual(Array.from(to));
  });
});
