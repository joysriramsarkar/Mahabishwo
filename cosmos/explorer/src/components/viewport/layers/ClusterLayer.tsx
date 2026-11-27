import type { CosmicObject } from '@/types/cosmos';
import { Html } from '@react-three/drei';
import { useExplorer } from '@/state/explorer';
import { EvidenceBadge } from '@/components/ui/Badge';
import { AnimatedGroup } from '../useAnimatedTransform';

interface Props {
  objects: CosmicObject[];
  opacity: number;
  type: 'cluster' | 'supercluster';
  transitionKey?: string;
  reducedMotion?: boolean;
}

export function ClusterLayer({ objects, opacity, type, transitionKey = 'initial', reducedMotion = false }: Props) {
  const setCamera = useExplorer((s) => s.setCamera);
  const select = useExplorer((s) => s.select);
  const selectedId = useExplorer((s) => s.selectedId);
  const filtered = objects.filter((o) => o.type === type);

  return (
    <group>
      {filtered.map((o) => {
        const r = Math.max(0.1, o.radiusMpc ?? 2);
        const color = type === 'supercluster' ? '#A78BFA' : '#56D4E8';
        const p = o.positionMpc;
        return (
          <AnimatedGroup
            key={o.id}
            position={[p.x, p.y, p.z]}
            scale={r}
            transitionKey={transitionKey}
            reducedMotion={reducedMotion}
            onClick={(e) => { e.stopPropagation(); select(o.id); }}
            onPointerOver={(e) => { e.stopPropagation(); useExplorer.getState().hover(o.id); }}
            onPointerOut={() => useExplorer.getState().hover(null)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setCamera({ position: [p.x + 20, p.y + 15, p.z + 20], target: [p.x, p.y, p.z] });
            }}
          >
            <mesh>
              <sphereGeometry args={[1, 24, 24]} />
              <meshBasicMaterial color={color} transparent opacity={0.12 * opacity} wireframe />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.35, 16, 16]} />
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
          </AnimatedGroup>
        );
      })}
    </group>
  );
}
