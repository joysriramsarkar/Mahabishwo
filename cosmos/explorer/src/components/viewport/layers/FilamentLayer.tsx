import { useMemo } from 'react';
import * as THREE from 'three';
import type { CosmicObject } from '@/types/cosmos';
import { useAnimatedPositions } from '../useAnimatedPositions';

/** Prototype filaments: straight paths between nearby superclusters (<80 Mpc).
 * Production uses explicit reconstructed filament paths; none are invented. */
export function FilamentLayer({
  objects, opacity = 0.4, transitionKey = 'initial', reducedMotion = false,
}: { objects: CosmicObject[]; opacity?: number; transitionKey?: string; reducedMotion?: boolean }) {
  const { positions, signature } = useMemo(() => {
    const supers = objects.filter((o) => o.type === 'supercluster');
    const pts: number[] = [];
    const ids: string[] = [];
    for (let i = 0; i < supers.length; i++) {
      for (let j = i + 1; j < supers.length; j++) {
        const a = supers[i]!, b = supers[j]!;
        const d = Math.hypot(
          a.positionMpc.x - b.positionMpc.x,
          a.positionMpc.y - b.positionMpc.y,
          a.positionMpc.z - b.positionMpc.z,
        );
        if (d < 80) {
          pts.push(a.positionMpc.x, a.positionMpc.y, a.positionMpc.z,
                   b.positionMpc.x, b.positionMpc.y, b.positionMpc.z);
          ids.push(`${a.id}:${b.id}`);
        }
      }
    }
    return { positions: new Float32Array(pts), signature: ids.join('|') };
  }, [objects]);
  const geoRef = useAnimatedPositions(positions, signature, transitionKey, reducedMotion);

  if (positions.length === 0) return null;
  return (
    <lineSegments frustumCulled={false}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#F0B35A" transparent opacity={opacity * 0.5} />
    </lineSegments>
  );
}
