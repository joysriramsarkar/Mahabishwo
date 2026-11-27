import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useExplorer } from '@/state/explorer';

interface Props {
  onCameraChanged: (c: { position: [number, number, number]; target: [number, number, number] }) => void;
  onStartClock: () => void;
}

/** Ties OrbitControls to the store; throttles camera writes. */
export function SceneSetup({ onCameraChanged }: Props) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const lastWrite = useRef(0);
  const cameraStore = useExplorer((s) => s.camera);

  // Reset when store camera changes externally (e.g. "Focus" actions).
  useEffect(() => {
    if (!controls.current) return;
    camera.position.set(...cameraStore.position);
    controls.current.target.set(...cameraStore.target);
    controls.current.update();
  }, [cameraStore]);

  useFrame(() => {
    if (!controls.current) return;
    const now = performance.now();
    if (now - lastWrite.current < 100) return;
    lastWrite.current = now;
    onCameraChanged({
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [
        controls.current.target.x,
        controls.current.target.y,
        controls.current.target.z,
      ],
    });
  });

  return (
    <OrbitControls
      ref={controls}
      enableDamping
      dampingFactor={0.08}
      minDistance={12}
      maxDistance={8000}
      zoomSpeed={0.8}
      rotateSpeed={0.6}
    />
  );
}
