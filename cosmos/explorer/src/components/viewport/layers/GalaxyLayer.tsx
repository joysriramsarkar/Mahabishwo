import { useMemo, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import type { CosmicObject } from '@/types/cosmos';
import { useAnimatedPositions } from '../useAnimatedPositions';

interface Props {
  objects: CosmicObject[];
  opacity: number;
  onPick: (obj: CosmicObject | null) => void;
  onHover: (obj: CosmicObject | null) => void;
  size?: number;
  transitionKey?: string;
  reducedMotion?: boolean;
}

const VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  uniform float uOpacity;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (400.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  uniform float uOpacity;
  void main() {
    vec2 p = gl_PointCoord - vec2(0.5);
    float d = length(p);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.35, d) * uOpacity;
    gl_FragColor = vec4(vColor, a);
  }
`;

export function GalaxyLayer({ objects, opacity, onPick, onHover, size = 1.2,
  transitionKey = 'initial', reducedMotion = false }: Props) {
  const [positions, colors, sizes] = useMemo(() => {
    const n = objects.length;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const sz = new Float32Array(n);
    const alt = new THREE.Color('#FFD9A0');
    const evidenceColors: Record<CosmicObject['evidence'], string> = {
      observed: '#56D4E8', reconstructed: '#A78BFA', simulated: '#7DD3FC',
      mock: '#F0B35A', unknown: '#F0B35A',
    };
    for (let i = 0; i < n; i++) {
      const o = objects[i]!;
      pos[i * 3 + 0] = o.positionMpc.x;
      pos[i * 3 + 1] = o.positionMpc.y;
      pos[i * 3 + 2] = o.positionMpc.z;
      const t = ((i * 37) % 100) / 100;
      const c = new THREE.Color(evidenceColors[o.evidence]).lerp(alt, t * 0.15);
      col[i * 3 + 0] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      sz[i] = size * (0.7 + ((i * 13) % 10) / 30);
    }
    return [pos, col, sz];
  }, [objects, size]);

  const signature = useMemo(() => {
    let hash = 2166136261;
    for (const o of objects) {
      for (let i = 0; i < o.id.length; i++) {
        hash ^= o.id.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      hash ^= 124;
      hash = Math.imul(hash, 16777619);
    }
    return `${objects.length}:${hash >>> 0}`;
  }, [objects]);
  const geoRef = useAnimatedPositions(positions, signature, transitionKey, reducedMotion);

  const uniforms = useRef({ uOpacity: { value: opacity } });
  useFrame(() => { uniforms.current.uOpacity.value = opacity; });

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const idx = e.index ?? null;
      onPick(idx != null ? objects[idx] ?? null : null);
    },
    [objects, onPick]
  );

  const handleMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      const idx = e.index ?? null;
      onHover(idx != null ? objects[idx] ?? null : null);
    },
    [objects, onHover]
  );

  if (objects.length === 0) return null;

  return (
    <points
      onClick={handleClick}
      onPointerMove={handleMove}
      raycast={THREE.Points.prototype.raycast}
    >
      <bufferGeometry ref={geoRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aColor"
          args={[colors, 3]}
        />
        <bufferAttribute
          attach="attributes-aSize"
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms.current}
        vertexShader={VERT}
        fragmentShader={FRAG}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
