import { Canvas } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, Preload } from '@react-three/drei';
import { Suspense, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { useExplorer } from '@/state/explorer';
import { useAllObjects } from '@/data/queries';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { objectForFrame } from '@/lib/frameTransform';
import { lodBudget, selectLOD } from '@/lib/lod';
import { GalaxyLayer } from './layers/GalaxyLayer';
import { ClusterLayer } from './layers/ClusterLayer';
import { FilamentLayer } from './layers/FilamentLayer';
import { VoidLayer } from './layers/VoidLayer';
import { CMBSphere } from './layers/CMBSphere';
import { SceneSetup } from './SceneSetup';
import type { CosmicObject } from '@/types/cosmos';

export function Viewport3D() {
  const layers = useExplorer((s) => s.layers);
  const filters = useExplorer((s) => s.filters);
  const select = useExplorer((s) => s.select);
  const hover = useExplorer((s) => s.hover);
  const setCamera = useExplorer((s) => s.setCamera);
  const cameraDistance = useExplorer((s) => {
    const [x, y, z] = s.camera.position;
    const [tx, ty, tz] = s.camera.target;
    return Math.hypot(x - tx, y - ty, z - tz);
  });
  const { data, isPending } = useAllObjects();
  const tileObjects = useExplorer((s) => s.tileObjects);
  const reducedMotion = useReducedMotion();

  const frame = useExplorer((s) => s.frame);
  const epochZ = useExplorer((s) => s.epochZ);

  // Source positionMpc remains comoving. objectForFrame returns render-only
  // coordinates; the layers interpolate between them over ~900 ms.
  const objects = useMemo(() => {
    const all = [...(data ?? []), ...tileObjects];
    // epochZ=0 means "today" (full light-cone); otherwise z-cut (Time Lab).
    return all
      .filter((o) => epochZ === 0 || (o.redshift?.value ?? 0) <= epochZ)
      .map((o) => objectForFrame(o, frame));
  }, [data, tileObjects, frame, epochZ]);

  const visible = useMemo(() => {
    return objects.filter((o) => {
      if (filters.types.length && !filters.types.includes(o.type)) return false;
      if (filters.evidence.length && !filters.evidence.includes(o.evidence)) return false;
      if (filters.maxRedshift !== undefined) {
        const z = o.redshift?.value;
        // Unknown redshift cannot be proven inside the requested shell.
        if (z === undefined || z > filters.maxRedshift) return false;
      }
      return true;
    });
  }, [objects, filters]);

  const galaxyCandidates = useMemo(
    () => visible.filter((o) => o.type === 'galaxy'), [visible]);
  const rankedGalaxies = useMemo(
    () => galaxyCandidates.length > 250_000
      ? selectLOD(galaxyCandidates, 250_000) : galaxyCandidates,
    [galaxyCandidates]);
  const pickable = useMemo(() => {
    const budget = lodBudget(galaxyCandidates.length, cameraDistance);
    return budget >= galaxyCandidates.length ? galaxyCandidates : rankedGalaxies.slice(0, budget);
  }, [galaxyCandidates, rankedGalaxies, cameraDistance]);

  const handlePick = useCallback(
    (obj: CosmicObject | null) => {
      select(obj?.id ?? null);
    },
    [select]
  );

  const handleHover = useCallback(
    (obj: CosmicObject | null) => hover(obj?.id ?? null),
    [hover]
  );

  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [600, 320, 900], fov: 45, near: 0.1, far: 50_000 }}
        onPointerMissed={() => handlePick(null)}
        onCreated={({ raycaster }) => {
          raycaster.params.Points.threshold = window.matchMedia('(pointer: coarse)').matches ? 5 : 2;
        }}
      >
        <color attach="background" args={['#05070D']} />
        <fog attach="fog" args={['#05070D', 2500, 5000]} />
        <SceneSetup
          onCameraChanged={(c) => setCamera(c)}
          onStartClock={() => {}}
          reducedMotion={reducedMotion}
        />
        <AdaptiveDpr pixelated />
        <Suspense fallback={null}>
          {layers['observable-boundary'].visible && (
            <mesh>
              <sphereGeometry args={[4200, 32, 32]} />
              <meshBasicMaterial color="#0E2A44" wireframe transparent opacity={layers['observable-boundary'].opacity} />
            </mesh>
          )}

          {layers['cosmic-web'].visible && (
            <FilamentLayer objects={visible} opacity={layers['cosmic-web'].opacity}
              transitionKey={frame} reducedMotion={reducedMotion} />
          )}

          {layers.superclusters.visible && (
            <ClusterLayer
              objects={visible}
              opacity={layers.superclusters.opacity}
              type="supercluster"
              transitionKey={frame}
              reducedMotion={reducedMotion}
            />
          )}
          {layers['clusters-groups'].visible && (
            <ClusterLayer
              objects={visible}
              opacity={layers['clusters-groups'].opacity}
              type="cluster"
              transitionKey={frame}
              reducedMotion={reducedMotion}
            />
          )}

          {layers.voids.visible && (
            <VoidLayer objects={visible} opacity={layers.voids.opacity}
              transitionKey={frame} reducedMotion={reducedMotion} />
          )}

          {layers.galaxies.visible && (
            <GalaxyLayer
              objects={pickable}
              opacity={layers.galaxies.opacity}
              onPick={handlePick}
              onHover={handleHover}
              transitionKey={frame}
              reducedMotion={reducedMotion}
            />
          )}

          {layers.cmb.visible && <CMBSphere radius={4200} />}
          <Preload all />
        </Suspense>
      </Canvas>

      {isPending && (
        <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-md border border-border-subtle bg-elevated/70 px-3 py-1 text-xs text-ink-subtle animate-pulse">
          ডেটা লোড হচ্ছে…
        </div>
      )}

      <LegendOverlay />
    </div>
  );
}

function LegendOverlay() {
  const mode = useExplorer((s) => s.mode);
  const frame = useExplorer((s) => s.frame);
  return (
    <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-border-subtle bg-panel/70 px-3 py-2 text-[11px] text-ink-subtle backdrop-blur">
      <div className="mb-1 font-medium text-ink">বর্তমান দৃশ্য</div>
      <div>{frame === 'lightcone'
        ? 'Observed (light-cone): known vₗₒₛ-এ RSD; velocity নেই — অজানা, তাই অবস্থান অপরিবর্তিত'
        : 'Comoving-now পুনর্গঠন — টেলিস্কোপের প্রত্যক্ষ দৃশ্য নয়'}</div>
      <div className="mt-1 text-ink-muted">মোড: {mode === '3d' ? '3D' : mode} · ফ্রেম: {frame}</div>
    </div>
  );
}
