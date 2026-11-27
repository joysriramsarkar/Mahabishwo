import { useEffect } from 'react';
import { useExplorer, VIEW_MODES } from '@/state/explorer';
import { useMediaQuery } from './useMediaQuery';
import { useReducedMotion } from './useReducedMotion';

export function useGlobalKeyboard() {
  const isMobile = useMediaQuery('(max-width: 899px)');
  const reducedMotion = useReducedMotion();
  const { resetView, toggleTimePlaying, select, togglePanel, setMode,
    openMobileSheet, closeMobileSheet } = useExplorer.getState();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && /input|textarea|select/i.test(target.tagName)) return;
      if (e.key === 'Escape' && isMobile) {
        // Radix may already have set mobileSheet=null in its document-level
        // keydown handler before this window handler runs. Escape on mobile
        // always dismisses UI first and never clears the inspected object.
        closeMobileSheet();
        return;
      }
      const num = Number(e.key);
      if (num >= 1 && num <= 9) { setMode(VIEW_MODES[num - 1]!); return; }
      if (e.key === 'h' || e.key === 'H' || e.key === 'Home') resetView();
      if (e.key === ' ' && !reducedMotion) { e.preventDefault(); toggleTimePlaying(); }
      if (e.key === 'Escape') select(null);
      if (e.key === 'l' || e.key === 'L') {
        if (isMobile) openMobileSheet('layers'); else togglePanel('layers');
      }
      if (e.key === 'i' || e.key === 'I') {
        if (isMobile) openMobileSheet('info'); else togglePanel('info');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isMobile, reducedMotion, resetView, toggleTimePlaying, select, togglePanel,
    setMode, openMobileSheet, closeMobileSheet]);
}
