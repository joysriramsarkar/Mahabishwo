import { useMediaQuery } from './useMediaQuery';

/** True on the first client render when the user prefers reduced motion. */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
