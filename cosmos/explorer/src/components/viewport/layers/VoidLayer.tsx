import type { CosmicObject } from '@/types/cosmos';
import { AnimatedGroup } from '../useAnimatedTransform';

export function VoidLayer({ objects, opacity, transitionKey = 'initial', reducedMotion = false }: {
  objects: CosmicObject[]; opacity: number; transitionKey?: string; reducedMotion?: boolean;
}) {
  return (
    <group>
      {objects.filter((o) => o.type === 'void').map((o) => {
        const p = o.positionMpc;
        const r = Math.max(0.1, o.radiusMpc ?? 20);
        return (
          <AnimatedGroup key={o.id} position={[p.x, p.y, p.z]} scale={r}
            transitionKey={transitionKey} reducedMotion={reducedMotion}>
            <mesh>
              <sphereGeometry args={[1, 24, 24]} />
              <meshBasicMaterial color="#F0B35A" transparent opacity={0.05 * opacity} wireframe />
            </mesh>
          </AnimatedGroup>
        );
      })}
    </group>
  );
}
