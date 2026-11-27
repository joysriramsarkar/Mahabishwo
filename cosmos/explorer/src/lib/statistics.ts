/**
 * Statistics for the Statistics & Physics Inspector (s15.2 mode 8).
 * Honest scope: these run on whatever objects are loaded; demo (SIM) data
 * yields demo statistics and must be read with its evidence label.
 */
import type { CosmicObject } from '@/types/cosmos';

export interface Bin { lo: number; hi: number; count: number }

export function histogram(values: number[], bins: number): Bin[] {
  if (!values.length) return [];
  const lo = Math.min(...values), hi = Math.max(...values);
  const w = (hi - lo) / bins || 1;
  const out: Bin[] = Array.from({ length: bins }, (_, i) => ({
    lo: lo + i * w, hi: lo + (i + 1) * w, count: 0,
  }));
  for (const v of values) {
    const i = Math.min(bins - 1, Math.floor((v - lo) / w));
    out[i]!.count++;
  }
  return out;
}

export function massFunction(objects: CosmicObject[]): Bin[] {
  const logM = objects
    .filter((o) => o.massMsun)
    .map((o) => Math.log10(o.massMsun!.value));
  return histogram(logM, 10);
}

export function redshiftHistogram(objects: CosmicObject[]): Bin[] {
  const zs = objects.filter((o) => o.redshift).map((o) => o.redshift!.value);
  return histogram(zs, 12);
}

function dist(a: CosmicObject, b: CosmicObject): number {
  const dx = a.positionMpc.x - b.positionMpc.x;
  const dy = a.positionMpc.y - b.positionMpc.y;
  const dz = a.positionMpc.z - b.positionMpc.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Two-point correlation xi(r) via DD/RR - 1 on a subsample (O(n^2) capped).
 * Random catalogue: uniform in the same bounding sphere.
 */
export function correlationFunction(
  objects: CosmicObject[],
  binEdges: number[] = [5, 10, 20, 40, 80, 160],
  maxObjects = 350,
): { rMid: number; xi: number }[] {
  const pts = objects.slice(0, maxObjects);
  if (pts.length < 10) return [];
  const centre = pts[0]!.positionMpc;
  const radius = Math.max(...pts.map((p) => dist(p, pts[0]!)), 1);
  void centre;
  const rng = mulberry(1234);
  const randoms: CosmicObject[] = Array.from({ length: pts.length }, (_, i) => ({
    ...pts[0]!,
    id: `rnd-${i}`,
    positionMpc: {
      x: pts[0]!.positionMpc.x + (rng() * 2 - 1) * radius,
      y: pts[0]!.positionMpc.y + (rng() * 2 - 1) * radius,
      z: pts[0]!.positionMpc.z + (rng() * 2 - 1) * radius,
    },
  }));
  const countPairs = (arr: CosmicObject[], self: boolean): number[] => {
    const counts = new Array(binEdges.length - 1).fill(0) as number[];
    for (let i = 0; i < arr.length; i++) {
      for (let j = self ? i + 1 : 0; j < arr.length; j++) {
        if (self && i === j) continue;
        const d = dist(arr[i]!, arr[j]!);
        for (let b = 0; b < binEdges.length - 1; b++) {
          if (d >= binEdges[b]! && d < binEdges[b + 1]!) { counts[b]!++; break; }
        }
      }
    }
    return counts;
  };
  const dd = countPairs(pts, true);
  const rr = countPairs(randoms, true);
  return binEdges.slice(0, -1).map((lo, i) => ({
    rMid: Math.sqrt(lo * binEdges[i + 1]!),
    xi: rr[i] ? dd[i]! / rr[i]! - 1 : 0,
  }));
}

/** Chi-square between two count histograms (Observation Comparison, mode 7). */
export function chiSquare(a: Bin[], b: Bin[]): number {
  let chi2 = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const expected = (a[i]!.count + b[i]!.count) / 2;
    if (expected > 0) chi2 += ((a[i]!.count - b[i]!.count) ** 2) / expected;
  }
  return chi2;
}

function mulberry(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
