import { describe, it, expect } from 'vitest';
import { computeAnalyticalAcceleration } from '../src/physics/neuralGravity';

describe('Galaxy Collision Analytical Gravity Kernel (Newton + NFW Halo)', () => {
  it('pulls stars strictly radially inward toward a massive core without singularities', () => {
    // One star at (10, 0, 0), core1 at (0, 0, 0) m1=500, core2 far away at (1000,0,0) m2=0
    const inputs = new Float32Array([
      10, 0, 0,
      0, 0, 0,
      1000, 0, 0,
      500, 0,
    ]);
    const out = new Float32Array(3);
    computeAnalyticalAcceleration(inputs, 1, out, false);

    expect(out[0]).toBeLessThan(-1);
    expect(Math.abs(out[1])).toBeLessThan(1e-6);
    expect(Math.abs(out[2])).toBeLessThan(1e-6);
  });

  it('remains strictly finite at zero distance from a galactic core thanks to softening', () => {
    const inputs = new Float32Array([
      0, 0, 0,
      0, 0, 0,
      20, 0, 0,
      600, 800,
    ]);
    const out = new Float32Array(3);
    computeAnalyticalAcceleration(inputs, 1, out, false);

    expect(Number.isFinite(out[0])).toBe(true);
    expect(Number.isFinite(out[1])).toBe(true);
    expect(Number.isFinite(out[2])).toBe(true);
    expect(out[0]).toBeGreaterThan(0); // pulled toward core2 at +20
  });

  it('exhibits inverse-distance decay and linear mass scaling for two equal-distance stars', () => {
    // Near star (r=5) vs far star (r=25) around single mass
    const nearInputs = new Float32Array([5, 0, 0, 0, 0, 0, 0, 0, 0, 400, 0]);
    const farInputs = new Float32Array([25, 0, 0, 0, 0, 0, 0, 0, 0, 400, 0]);
    const heavyNearInputs = new Float32Array([5, 0, 0, 0, 0, 0, 0, 0, 0, 800, 0]);

    const aNear = computeAnalyticalAcceleration(nearInputs, 1, new Float32Array(3), false);
    const aFar = computeAnalyticalAcceleration(farInputs, 1, new Float32Array(3), false);
    const aHeavy = computeAnalyticalAcceleration(heavyNearInputs, 1, new Float32Array(3), false);

    expect(Math.abs(aNear[0])).toBeGreaterThan(Math.abs(aFar[0]) * 10);
    expect(Math.abs(aHeavy[0])).toBeGreaterThan(Math.abs(aNear[0]) * 1.8);
  });
});
