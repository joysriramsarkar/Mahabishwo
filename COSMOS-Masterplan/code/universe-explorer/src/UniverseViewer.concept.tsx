
// ধারণাগত frontend component
// packages: react, three, @react-three/fiber, @react-three/drei

import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

type Galaxy = {
  id: string;
  // Observer-centric comoving Cartesian coordinate, Mpc
  position: [number, number, number];
  redshift: number;
};

function GalaxyCloud({ galaxies }: { galaxies: Galaxy[] }) {
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(galaxies.length * 3);
    const colors = new Float32Array(galaxies.length * 3);

    galaxies.forEach((galaxy, i) => {
      // শুধু viewport-এর জন্য scale; scientific unit বদলায় না
      const displayScale = 0.001;

      positions[i * 3 + 0] = galaxy.position[0] * displayScale;
      positions[i * 3 + 1] = galaxy.position[1] * displayScale;
      positions[i * 3 + 2] = galaxy.position[2] * displayScale;

      // False color: redshift বাড়লে hue পরিবর্তন
      const t = Math.min(galaxy.redshift / 6.0, 1.0);
      const color = new THREE.Color().setHSL(
        0.62 - 0.62 * t,
        0.85,
        0.58
      );

      colors[i * 3 + 0] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    });

    return { positions, colors };
  }, [galaxies]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>

      <pointsMaterial
        size={0.015}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.85}
      />
    </points>
  );
}

export function UniverseViewer({ galaxies }: { galaxies: Galaxy[] }) {
  const [zMax, setZMax] = useState(2.0);

  const visible = useMemo(
    () => galaxies.filter((g) => g.redshift <= zMax),
    [galaxies, zMax]
  );

  return (
    <section style={{ height: "100%", display: "grid",
                      gridTemplateRows: "auto 1fr" }}>
      <div style={{ padding: 12 }}>
        <label>
          Redshift limit: {zMax.toFixed(2)}{" "}
          <input
            type="range"
            min="0.01"
            max="10"
            step="0.01"
            value={zMax}
            onChange={(e) => setZMax(Number(e.target.value))}
          />
        </label>
        <span style={{ marginLeft: 16 }}>
          Objects: {visible.length.toLocaleString()}
        </span>
        <span style={{ marginLeft: 16 }}>
          Mode: SIMULATED · false color · symbols exaggerated
        </span>
      </div>

      <Canvas camera={{ position: [0, 0, 4], fov: 55 }}>
        <color attach="background" args={["#02030a"]} />
        <GalaxyCloud galaxies={visible} />
        <OrbitControls enableDamping />
      </Canvas>
    </section>
  );
}

