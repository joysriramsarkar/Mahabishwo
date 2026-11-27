import { useMemo } from 'react';
import * as THREE from 'three';
import type { CosmicObject } from '@/types/cosmos';

/** Placeholder: draw a straight line between each supercluster pair whose
 * separation is < 40 Mpc. Real data would provide explicit filament paths. */
export function FilamentLayer({
  objects, opacity = 0.4,
}: { objects: CosmicObject[]; opacity?: number }) {
  const geometry = useMemo(() => {
    const supers = objects.filter((o) => o.type === 'supercluster');
    const pts: number[] = [];
    for (let i = 0; i < supers.length; i++) {
      for (let j = i + 1; j < supers.length; j++) {
        const a = supers[i]!, b = supers[j]!;
        const d = Math.hypot(
          a.positionMpc.x - b.positionMpc.x,
          a.positionMpc.y - b.positionMpc.y,
          a.positionMpc.z - b.positionMpc.z
        );
        if (d < 80) {
          pts.push(a.positionMpc.x, a.positionMpc.y, a.positionMpc.z);
          pts.push(b.positionMpc.x, b.positionMpc.y, b.positionMpc.z);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [objects]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#F0B35A" transparent opacity={opacity * 0.5} />
    </lineSegments>
  );
}
