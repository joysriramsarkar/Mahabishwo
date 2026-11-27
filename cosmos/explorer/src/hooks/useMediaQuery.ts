import { useSyncExternalStore } from 'react';

/** SSR-safe, synchronous-on-first-client-render media query hook. */
export function useMediaQuery(query: string): boolean {
  const subscribe = (onChange: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {};
    const mq = window.matchMedia(query);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange); // older Safari
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  };
  const getSnapshot = () =>
    typeof window !== 'undefined' && !!window.matchMedia?.(query).matches;
  const getServerSnapshot = () => false;
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
