/**
 * Flat-LCDM distance conversions for the Explorer (reference numerics).
 * Production values come from the API (/v1/cosmology/convert, astropy);
 * this local version keeps the UI functional offline and drives Model Lab.
 * Parameters: Planck18 baseline (H0 knob for ensemble comparison, U15).
 */
export const C_KMS = 299792.458;

export interface CosmoParams { H0: number; Om: number; Ode: number }

export const PARAM_SETS: Record<string, CosmoParams & { label: string }> = {
  Planck18: { label: 'Planck18', H0: 67.66, Om: 0.30966, Ode: 0.68885 },
  SH0ES: { label: 'SH0ES', H0: 73.04, Om: 0.30966, Ode: 0.68885 },
  CCHP: { label: 'CCHP (TRGB)', H0: 69.8, Om: 0.30966, Ode: 0.68885 },
};

export function E(z: number, p: CosmoParams): number {
  return Math.sqrt(p.Om * (1 + z) ** 3 + p.Ode);
}

/** Comoving distance [Mpc] by Simpson integration. */
export function comovingDistanceMpc(z: number, p: CosmoParams): number {
  if (z <= 0) return 0;
  const n = 400;
  const h = z / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2;
    sum += (w / E(i * h, p));
  }
  return (C_KMS / p.H0) * (h / 3) * sum;
}

export function luminosityDistanceMpc(z: number, p: CosmoParams): number {
  return comovingDistanceMpc(z, p) * (1 + z);
}

/** Inverse: redshift whose comoving distance is closest to chi [Mpc]. */
export function redshiftAtDistance(chiMpc: number, p: CosmoParams): number {
  if (chiMpc <= 0) return 0;
  let lo = 0, hi = 20;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (comovingDistanceMpc(mid, p) < chiMpc) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Lookback time [Gyr] (Simpson over z..inf truncated with substitution). */
export function lookbackGyr(z: number, p: CosmoParams): number {
  if (z <= 0) return 0;
  const H0invGyr = 977.8 / p.H0;
  const n = 400;
  // integrate t_look = int_0^z dz / ((1+z) E(z))  in units of 1/H0
  const h = z / n;
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const zz = i * h;
    const w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2;
    sum += w / ((1 + zz) * E(zz, p));
  }
  return H0invGyr * (h / 3) * sum;
}

/** Distance rescaling between two H0 sets at fixed z (low-z exact in chi). */
export function distanceRangeForH0(
  distanceMpc: number,
): { low: number; high: number; pct: number } {
  const ratio = PARAM_SETS.SH0ES!.H0 / PARAM_SETS.Planck18!.H0; // 1.0795
  return { low: distanceMpc / ratio, high: distanceMpc, pct: 7 };
}
