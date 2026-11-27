import { describe, it, expect } from 'vitest';
import { comovingDistanceMpc, redshiftAtDistance, PARAM_SETS } from '../cosmology';
import { computeCaveats, galacticLatitudeDeg, whyIsThisHere } from '../caveats';
import { histogram, correlationFunction, chiSquare } from '../statistics';
import { MOCK_ALL_OBJECTS } from '@/data/mock';
import type { CosmicObject } from '@/types/cosmos';

describe('cosmology conversions', () => {
  it('chi(0)=0 and chi is monotonic; Planck vs SH0ES differ ~8%', () => {
    const p = PARAM_SETS.Planck18!;
    expect(comovingDistanceMpc(0, p)).toBe(0);
    expect(comovingDistanceMpc(1, p)).toBeGreaterThan(comovingDistanceMpc(0.5, p));
    const ratio = comovingDistanceMpc(0.5, p) / comovingDistanceMpc(0.5, PARAM_SETS.SH0ES!);
    expect(ratio).toBeGreaterThan(1.05);
    expect(ratio).toBeLessThan(1.1);
  });
  it('redshiftAtDistance inverts comovingDistance', () => {
    const p = PARAM_SETS.Planck18!;
    const chi = comovingDistanceMpc(0.5, p);
    expect(redshiftAtDistance(chi, p)).toBeCloseTo(0.5, 1);
  });
});

describe('caveat system (s15.3 five triggers)', () => {
  const base: CosmicObject = {
    id: 'x', name: 'X', aliases: [], type: 'cluster', evidence: 'observed',
    boundaryKind: 'physical', positionMpc: { x: 0, y: 0, z: 0 },
    ra: 187.7, dec: 12.3,
    distanceMpc: { value: 16.5, unit: 'Mpc' }, sources: [],
  };
  it('distance triggers H0 caveat', () => {
    const cs = computeCaveats({ selected: base });
    expect(cs.some((c) => c.id === 'h0-range')).toBe(true);
  });
  it('z>10 galaxy triggers JWST caveat', () => {
    const g = { ...base, type: 'galaxy' as const, redshift: { value: 12, unit: 'z' } };
    expect(computeCaveats({ selected: g }).some((c) => c.id === 'jwst-z10')).toBe(true);
  });
  it('missing line-of-sight velocity is reported, not fabricated', () => {
    const noVelocity = { ...base, vLosKms: undefined };
    expect(computeCaveats({ selected: noVelocity }).some((c) => c.id === 'unknown-rsd')).toBe(true);
  });
  it('two distant objects trigger not-coeval caveat', () => {
    const a = { ...base, id: 'a' };
    const b = { ...base, id: 'b', distanceMpc: { value: 900, unit: 'Mpc' } };
    expect(computeCaveats({ pinned: [a, b] }).some((c) => c.id === 'not-coeval')).toBe(true);
  });
  it('galactic latitude: pole ~90, plane ~0', () => {
    expect(Math.abs(galacticLatitudeDeg(192.8595, 27.1284))).toBeGreaterThan(85);
    expect(Math.abs(galacticLatitudeDeg(266.405, -28.936))).toBeLessThan(5);
  });
  it('whyIsThisHere explains SIM data honestly', () => {
    const sim = MOCK_ALL_OBJECTS.find((o) => o.evidence === 'simulated')!;
    expect(whyIsThisHere(sim).join(' ')).toContain('SIM');
    expect(sim.name).toContain('DEMO');
  });
});

describe('statistics', () => {
  it('histogram counts sum to n', () => {
    const bins = histogram([1, 2, 3, 4, 5], 5);
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(5);
  });
  it('correlation function runs on demo objects', () => {
    const xi = correlationFunction(MOCK_ALL_OBJECTS.slice(0, 120));
    expect(Array.isArray(xi)).toBe(true);
  });
  it('chiSquare of identical histograms is 0', () => {
    const h = histogram([1, 2, 3], 3);
    expect(chiSquare(h, h)).toBe(0);
  });
});

describe('demo data honesty (s15.1 rules 6/10)', () => {
  it('generated galaxies are SIM, never observed', () => {
    const gals = MOCK_ALL_OBJECTS.filter((o) => o.id.startsWith('gal-'));
    expect(gals.length).toBe(2400);
    expect(gals.every((g) => g.evidence === 'simulated')).toBe(true);
    expect(gals.every((g) => g.redshift !== undefined && g.ra !== undefined)).toBe(true);
    expect(gals.every((g) => Number.isFinite(g.vLosKms))).toBe(true);
  });
});
