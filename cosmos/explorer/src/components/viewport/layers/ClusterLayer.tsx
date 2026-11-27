import type { CosmicObject } from '@/types/cosmos';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useExplorer } from '@/state/explorer';
import { EvidenceBadge } from '@/components/ui/Badge';

interface Props {
  objects: CosmicObject[];
  opacity: number;
  type: 'cluster' | 'supercluster';
}

export function ClusterLayer({ objects, opacity, type }: Props) {
  const setCamera = useExplorer((s) => s.setCamera);
  const select = useExplorer((s) => s.select);
  const selectedId = useExplorer((s) => s.selectedId);
  const filtered = objects.filter((o) => o.type === type);

  return (
    <group>
      {filtered.map((o) => {
        const r = Math.max(1, o.radiusMpc ?? 2);
        const color = type === 'supercluster' ? '#A78BFA' : '#56D4E8';
        return (
          <group
            key={o.id}
            position={[o.positionMpc.x, o.positionMpc.y, o.positionMpc.z]}
            onClick={(e) => { e.stopPropagation(); select(o.id); }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setCamera({ position: [o.positionMpc.x + 20, o.positionMpc.y + 15, o.positionMpc.z + 20], target: [o.positionMpc.x, o.positionMpc.y, o.positionMpc.z] });
            }}
          >
            <mesh>
              <sphereGeometry args={[r, 24, 24]} />
              <meshBasicMaterial color={color} transparent opacity={0.12 * opacity} wireframe />
            </mesh>
            <mesh>
              <sphereGeometry args={[r * 0.35, 16, 16]} />
              <meshBasicMaterial color={color} transparent opacity={0.55 * opacity} />
            </mesh>
            {selectedId === o.id && (
              <Html center distanceFactor={400} className="pointer-events-none">
                <div className="rounded border border-border-subtle bg-panel/90 px-2 py-1 text-[10px] text-ink">
                  {o.name}
                  <div className="mt-1"><EvidenceBadge kind={o.evidence} /></div>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
