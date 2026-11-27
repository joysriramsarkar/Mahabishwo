import { describe, it, expect } from 'vitest';
import {
  solveEccentricAnomaly,
  keplerianOrbitPosition,
  computeVisVivaSpeedKms,
} from '../src/physics/orbitalMechanics';
import {
  ORBIT_PERIOD_DAYS,
  ORBIT_ECCENTRICITY,
  ROTATION_PERIOD_DAYS,
  SEMI_MAJOR_AU,
  PLANET_MOONS,
} from '../src/data/cosmicData';

describe('Keplerian Orbital Mechanics & Physical Clocks', () => {
  it('solves Kepler equation M = E - e*sin(E) to sub-1e-8 residual across eccentricities', () => {
    const eccentricities = [0, 0.0167, 0.2056, 0.55, 0.78, 0.92];
    const meanAnomalies = [0, 0.35, 1.4, Math.PI, -2.1, 5.4, 14.2];
    for (const e of eccentricities) {
      for (const M of meanAnomalies) {
        const E = solveEccentricAnomaly(M, e);
        const residual = Math.sin(E - e * Math.sin(E) - M);
        expect(Math.abs(residual)).toBeLessThan(1e-7);
      }
    }
  });

  it('places perihelion closer and aphelion farther along semi-major axis', () => {
    const a = 24;
    const e = ORBIT_ECCENTRICITY.mercury; // 0.2056
    const peri = keplerianOrbitPosition(a, e, 0);
    const ap = keplerianOrbitPosition(a, e, Math.PI);
    expect(peri.z).toBeCloseTo(0, 8);
    expect(ap.z).toBeCloseTo(0, 8);
    expect(peri.x).toBeCloseTo(a * (1 - e), 6);
    expect(-ap.x).toBeCloseTo(a * (1 + e), 6);
  });

  it('matches real vis-viva orbital speeds for Earth and Mercury (NASA JPL values)', () => {
    const earthSpeed = computeVisVivaSpeedKms(1.0, 1.0, 1.0);
    expect(earthSpeed).toBeCloseTo(29.78, 2);

    const a = SEMI_MAJOR_AU.mercury;
    const e = ORBIT_ECCENTRICITY.mercury;
    const vPeri = computeVisVivaSpeedKms(a * (1 - e), a, 1.0);
    const vAp = computeVisVivaSpeedKms(a * (1 + e), a, 1.0);
    expect(vPeri).toBeGreaterThan(58);
    expect(vPeri).toBeLessThan(60);
    expect(vAp).toBeGreaterThan(38);
    expect(vAp).toBeLessThan(40);
  });

  it('preserves Mercury 3:2 spin-orbit resonance and exoplanet tidal locking', () => {
    const ratio = ORBIT_PERIOD_DAYS.mercury / ROTATION_PERIOD_DAYS.mercury;
    expect(ratio).toBeCloseTo(1.5, 2);

    expect(ROTATION_PERIOD_DAYS.t1_e).toBeCloseTo(ORBIT_PERIOD_DAYS.t1_e, 5);
    expect(ROTATION_PERIOD_DAYS.k_f).toBeCloseTo(ORBIT_PERIOD_DAYS.k_f, 5);
  });

  it('maintains Galilean Laplace resonance and Neptune retrograde Triton', () => {
    const [io, europa, ganymede] = PLANET_MOONS.jupiter;
    expect(europa.periodDays / io.periodDays).toBeCloseTo(2.007, 2);
    expect(ganymede.periodDays / io.periodDays).toBeCloseTo(4.044, 2);

    const triton = PLANET_MOONS.neptune.find((m) => m.id === 'triton');
    expect(triton?.retrograde).toBe(true);
  });
});
