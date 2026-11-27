import { useLayoutEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { easeInOutCubic, transitionProgress, FRAME_TRANSITION_MS } from '@/lib/frameAnimation';

/** Animate one keyed object's group position and uniform scale on frame changes. */
export function useAnimatedTransform(
  target: [number, number, number],
  targetScale: number,
  transitionKey: string,
  reducedMotion: boolean,
) {
  const ref = useRef<THREE.Group>(null);
  const from = useRef(new THREE.Vector3(...target));
  const to = useRef(new THREE.Vector3(...target));
  const fromScale = useRef(targetScale);
  const toScale = useRef(targetScale);
  const startedAt = useRef(0);
  const active = useRef(false);
  const initialized = useRef(false);
  const lastTransitionKey = useRef(transitionKey);

  useLayoutEffect(() => {
    const group = ref.current;
    if (!group) return;
    to.current.set(...target);
    toScale.current = targetScale;
    const frameChanged = lastTransitionKey.current !== transitionKey;
    lastTransitionKey.current = transitionKey;
    if (!initialized.current || reducedMotion || !frameChanged) {
      group.position.copy(to.current);
      group.scale.setScalar(toScale.current);
      from.current.copy(group.position);
      fromScale.current = toScale.current;
      initialized.current = true;
      active.current = false;
      return;
    }
    // Capture the visible midpoint if the user interrupts a transition.
    from.current.copy(group.position);
    fromScale.current = group.scale.x;
    startedAt.current = performance.now();
    active.current = true;
  }, [target[0], target[1], target[2], targetScale, transitionKey, reducedMotion]);

  useFrame(() => {
    if (!active.current || !ref.current) return;
    const raw = transitionProgress(performance.now() - startedAt.current, FRAME_TRANSITION_MS);
    const t = easeInOutCubic(raw);
    ref.current.position.lerpVectors(from.current, to.current, t);
    ref.current.scale.setScalar(fromScale.current + (toScale.current - fromScale.current) * t);
    if (raw >= 1) active.current = false;
  });

  return ref;
}

export function AnimatedGroup({
  position, scale = 1, transitionKey, reducedMotion = false, children, ...props
}: {
  position: [number, number, number]; scale?: number; transitionKey: string;
  reducedMotion?: boolean; children: ReactNode;
} & Omit<ComponentProps<'group'>, 'position' | 'scale' | 'ref'>) {
  const ref = useAnimatedTransform(position, scale, transitionKey, reducedMotion);
  return <group ref={ref} {...props}>{children}</group>;
}
