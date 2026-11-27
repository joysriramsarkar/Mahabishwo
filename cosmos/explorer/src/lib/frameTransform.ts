import type { CoordinateFrame, CosmicObject, Vec3 } from '@/types/cosmos';

/**
 * Frame-transform contract (masterplan s15.1 rule 1).
 *
 * `CosmicObject.positionMpc` is ALWAYS the source comoving heliocentric
 * coordinate. This function returns a render-only position and never mutates
 * the source object.
 *
 * - comoving: today's comoving reconstruction (identity).
 * - proper:   proper radial distance at emission, r_proper = chi/(1+z).
 * - lightcone: observed/redshift-space prototype. A known line-of-sight
 *              peculiar velocity produces the first-order RSD radial shift
 *              dr ~= (1+z) v_los / H(z). If v_los is unavailable, the object
 *              remains at its comoving position: no velocity is invented.
 *
 * The 3D light-cone is not a full shell/selection-function reconstruction;
 * production uses observed z, peculiar velocities and shell membership.
 */
export function frameScaleFactor(object: CosmicObject, frame: CoordinateFrame): number {
  const z = object.redshift?.value;
  if (z === undefined || !Number.isFinite(z) || z < 0) return 1;
  if (frame === 'comoving') return 1;
  if (frame === 'proper') return 1 / (1 + z);

  // Observed light-cone: first-order redshift-space distortion.
  const v = object.vLosKms;
  if (v === undefined || !Number.isFinite(v)) return 1;
  const H0 = 67.66; // Planck18 reference; Model Lab's H0 knob is separate
  const Om = 0.30966, Ode = 0.68885;
  const E = Math.sqrt(Om * (1 + z) ** 3 + Ode); // flat LCDM, radiation negligible here
  const chi = Math.hypot(object.positionMpc.x, object.positionMpc.y, object.positionMpc.z);
  if (chi === 0) return 1;
  const dChi = ((1 + z) * v) / (H0 * E); // Mpc
  return (chi + dChi) / chi;
}

export function positionForFrame(object: CosmicObject, frame: CoordinateFrame): Vec3 {
  const s = frameScaleFactor(object, frame);
  return {
    x: object.positionMpc.x * s,
    y: object.positionMpc.y * s,
    z: object.positionMpc.z * s,
  };
}

export function objectForFrame(object: CosmicObject, frame: CoordinateFrame): CosmicObject {
  const s = frameScaleFactor(object, frame);
  return {
    ...object,
    positionMpc: positionForFrame(object, frame),
    // Physical size is not changed by RSD; only the proper frame rescales it.
    radiusMpc: object.radiusMpc === undefined || frame !== 'proper'
      ? object.radiusMpc : object.radiusMpc * s,
  };
}
