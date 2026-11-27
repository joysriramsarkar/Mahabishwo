import * as THREE from 'three';
import { useMemo } from 'react';

/** Procedural CMB-like noise; replace with a real CMB texture in production. */
export function CMBSphere({ radius }: { radius: number }) {
  const texture = useMemo(() => {
    const size = 256;
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      const n = 128 + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 60;
      const v = Math.max(0, Math.min(255, n));
      data[i * 4 + 0] = v;
      data[i * 4 + 1] = v * 0.6 + 40;
      data[i * 4 + 2] = v * 0.35 + 20;
      data[i * 4 + 3] = 255;
    }
    const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    t.needsUpdate = true;
    return t;
  }, []);

  return (
    <mesh>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
}
