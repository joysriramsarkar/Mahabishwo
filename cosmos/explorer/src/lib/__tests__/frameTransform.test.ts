import { describe, expect, it } from 'vitest';
import { frameScaleFactor, objectForFrame, positionForFrame } from '../frameTransform';
import type { CosmicObject } from '@/types/cosmos';

const base: CosmicObject = {
  id: 'g1', name: 'G1', aliases: [], type: 'galaxy', evidence: 'simulated',
  boundaryKind: 'physical', positionMpc: { x: 30, y: 40, z: 0 },
  redshift: { value: 1, unit: 'z' }, vLosKms: 300, radiusMpc: 2,
  sources: [{ dataset: 'SIM', release: 'test', accessedAt: '2026-11-27' }],
};

describe('frame transform contract', () => {
  it('comoving-now preserves the documented source coordinate', () => {
    expect(positionForFrame(base, 'comoving')).toEqual({ x: 30, y: 40, z: 0 });
    expect(frameScaleFactor(base, 'comoving')).toBe(1);
  });
  it('proper uses emission-epoch scale; lightcone uses known-velocity RSD', () => {
    expect(positionForFrame(base, 'proper')).toEqual({ x: 15, y: 20, z: 0 });
    const observed = positionForFrame(base, 'lightcone');
    const chi = Math.hypot(base.positionMpc.x, base.positionMpc.y, base.positionMpc.z);
    const observedChi = Math.hypot(observed.x, observed.y, observed.z);
    expect(observedChi).toBeGreaterThan(chi); // positive v_los -> larger observed radius
    expect(observed.x / observed.y).toBeCloseTo(30 / 40); // radial-only distortion
  });
  it('never mutates the source comoving coordinate or physical radius under RSD', () => {
    const rendered = objectForFrame(base, 'lightcone');
    expect(rendered.radiusMpc).toBe(2);
    expect(base.positionMpc).toEqual({ x: 30, y: 40, z: 0 });
    expect(base.radiusMpc).toBe(2);
    const proper = objectForFrame(base, 'proper');
    expect(proper.radiusMpc).toBe(1);
  });
  it('missing redshift or velocity is explicit identity, not fabricated motion', () => {
    const noZ = { ...base, redshift: undefined };
    expect(positionForFrame(noZ, 'lightcone')).toEqual(noZ.positionMpc);
    const noV = { ...base, vLosKms: undefined };
    expect(positionForFrame(noV, 'lightcone')).toEqual(noV.positionMpc);
    const badZ = { ...base, redshift: { value: Number.NaN, unit: 'z' } };
    expect(positionForFrame(badZ, 'proper')).toEqual(badZ.positionMpc);
  });
  it('negative velocity moves inward without changing direction', () => {
    const incoming = { ...base, vLosKms: -300 };
    const p = positionForFrame(incoming, 'lightcone');
    expect(Math.hypot(p.x, p.y, p.z)).toBeLessThan(50);
    expect(p.x / p.y).toBeCloseTo(30 / 40);
  });
  it('z=0 is identity for comoving/proper; lightcone only shifts with known velocity', () => {
    const today = { ...base, redshift: { value: 0, unit: 'z' } };
    expect(positionForFrame(today, 'comoving')).toEqual(today.positionMpc);
    expect(positionForFrame(today, 'proper')).toEqual(today.positionMpc);
    expect(positionForFrame(today, 'lightcone')).not.toEqual(today.positionMpc);
    expect(positionForFrame({ ...today, vLosKms: 0 }, 'lightcone')).toEqual(today.positionMpc);
  });
});
