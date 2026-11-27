import { useEffect } from 'react';
import { useExplorer } from '@/state/explorer';

import { VIEW_MODES } from '@/state/explorer';

export function useGlobalKeyboard() {
  const { resetView, toggleTimePlaying, select, togglePanel, setMode } = useExplorer.getState();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && /input|textarea|select/i.test(target.tagName)) return;
      // 9 view modes on keys 1-9 (masterplan s15.2)
      const num = Number(e.key);
      if (num >= 1 && num <= 9) { setMode(VIEW_MODES[num - 1]!); return; }
      if (e.key === 'h' || e.key === 'H' || e.key === 'Home') { resetView(); }
      if (e.key === ' ') { e.preventDefault(); toggleTimePlaying(); }
      if (e.key === 'Escape') { select(null); }
      if (e.key === 'l' || e.key === 'L') { togglePanel('layers'); }
      if (e.key === 'i' || e.key === 'I') { togglePanel('info'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [resetView, toggleTimePlaying, select, togglePanel, setMode]);
}
