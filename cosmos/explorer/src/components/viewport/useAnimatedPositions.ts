import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { interpolateArray, transitionProgress, FRAME_TRANSITION_MS } from '@/lib/frameAnimation';

/**
 * CPU interpolation for the current catalogue scale. Target positions are
 * transformed render coordinates; the source CosmicObject stays comoving.
 * Frame toggles animate. Filtering/order changes snap, because interpolating
 * unrelated array indices would be scientifically meaningless.
 */
export function useAnimatedPositions(
  target: Float32Array,
  signature: string,
  transitionKey: string,
  reducedMotion: boolean,
) {
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const current = useRef(new Float32Array(target.length));
  const from = useRef(new Float32Array(target.length));
  const to = useRef(target);
  const startedAt = useRef(0);
  const active = useRef(false);
  const lastSignature = useRef('');
  const lastTransitionKey = useRef(transitionKey);

  useLayoutEffect(() => {
    const geometry = geoRef.current;
    if (!geometry) return;
    const attribute = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!attribute || attribute.array.length !== target.length) return;
    if (current.current.length !== target.length) {
      current.current = new Float32Array(target.length);
      from.current = new Float32Array(target.length);
    }

    const structureChanged = lastSignature.current !== signature;
    const frameChanged = lastTransitionKey.current !== transitionKey;
    lastSignature.current = signature;
    lastTransitionKey.current = transitionKey;
    if (structureChanged || reducedMotion || !frameChanged) {
      current.current.set(target);
      attribute.array.set(current.current);
      attribute.needsUpdate = true;
      active.current = false;
      return;
    }

    // Interrupted toggle: start from the currently visible midpoint.
    from.current.set(current.current);
    to.current = target;
    startedAt.current = performance.now();
    active.current = true;
  }, [target, signature, transitionKey, reducedMotion]);

  useFrame(() => {
    if (!active.current) return;
    const geometry = geoRef.current;
    const attribute = geometry?.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!attribute) return;
    const p = transitionProgress(performance.now() - startedAt.current, FRAME_TRANSITION_MS);
    interpolateArray(from.current, to.current, p, current.current);
    attribute.array.set(current.current);
    attribute.needsUpdate = true;
    if (p >= 1) active.current = false;
  });

  return geoRef;
}
