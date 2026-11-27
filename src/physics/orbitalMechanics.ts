/**
 * Pure Orbital & Keplerian Physics Helpers.
 *
 * Shared across 3D StarSystemLayer simulation integration, live vis-viva
 * telemetry in InfoPanel, and automated physics verification tests.
 */

export const TWO_PI = Math.PI * 2;
export const EARTH_MEAN_ORBIT_SPEED_KMS = 29.78;

/**
 * Solve Kepler's equation `M = E - e * sin(E)` for eccentric anomaly `E`
 * using Newton-Raphson iterations with edge-safe clamping for high e.
 */
export function solveEccentricAnomaly(meanAnomaly: number, eccentricity: number): number {
  const e = Math.min(Math.max(eccentricity, 0), 0.99);
  // Normalize M into [-PI, PI] for rapid convergence even at large eccentricity
  let mNorm = ((meanAnomaly + Math.PI) % TWO_PI);
  if (mNorm < 0) mNorm += TWO_PI;
  mNorm -= Math.PI;

  let E = e < 0.8 ? mNorm : mNorm + Math.sign(mNorm || 1) * e * 0.85;
  for (let i = 0; i < 6; i++) {
    const f = E - e * Math.sin(E) - mNorm;
    const fp = 1 - e * Math.cos(E);
    E -= f / Math.max(1e-6, fp);
  }
  return E;
}

/**
 * Convert semi-major axis, eccentricity and eccentric anomaly E into 2D orbital
 * plane coordinates (focus at origin, prograde counter-clockwise from north).
 */
export function keplerianOrbitPosition(
  semiMajor: number,
  eccentricity: number,
  eccentricAnomaly: number
): { x: number; z: number } {
  const b = semiMajor * Math.sqrt(Math.max(0, 1 - eccentricity * eccentricity));
  return {
    x: Math.cos(eccentricAnomaly) * semiMajor - semiMajor * eccentricity,
    z: -Math.sin(eccentricAnomaly) * b,
  };
}

/**
 * Compute instantaneous orbital speed in km/s via the vis-viva equation:
 *   v = v_earth * sqrt(M_star * (2 / r - 1 / a))
 */
export function computeVisVivaSpeedKms(
  distanceAU: number,
  semiMajorAU: number,
  starMassSolar: number = 1.0
): number {
  if (distanceAU <= 0 || semiMajorAU <= 0 || starMassSolar <= 0) return 0;
  const term = starMassSolar * (2 / distanceAU - 1 / semiMajorAU);
  if (term <= 0) return 0;
  return EARTH_MEAN_ORBIT_SPEED_KMS * Math.sqrt(term);
}
