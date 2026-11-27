import type { CosmicObject } from '@/types/cosmos';

export function VoidLayer({ objects, opacity }: { objects: CosmicObject[]; opacity: number }) {
  return (
    <group>
      {objects
        .filter((o) => o.type === 'void')
        .map((o) => (
          <mesh key={o.id} position={[o.positionMpc.x, o.positionMpc.y, o.positionMpc.z]}>
            <sphereGeometry args={[o.radiusMpc ?? 20, 24, 24]} />
            <meshBasicMaterial color="#F0B35A" transparent opacity={0.05 * opacity} wireframe />
          </mesh>
        ))}
    </group>
  );
}
