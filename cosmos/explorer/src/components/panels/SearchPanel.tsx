import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchResults } from '@/data/queries';
import type { CosmicObject } from '@/types/cosmos';
import { useExplorer } from '@/state/explorer';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { positionForFrame } from '@/lib/frameTransform';
import { EvidenceBadge } from '@/components/ui/Badge';
import { Search } from 'lucide-react';

export function SearchPanel() {
  const [q, setQ] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const { data, isPending } = useSearchResults(q);
  const select = useExplorer((s) => s.select);
  const setCamera = useExplorer((s) => s.setCamera);
  const frame = useExplorer((s) => s.frame);
  const isMobile = useMediaQuery('(max-width: 899px)');
  const open = q.length > 0;

  const choose = (id: string, object: CosmicObject) => {
    select(id);
    const position = positionForFrame(object, frame);
    setCamera({ position: [position.x + 40, position.y + 30, position.z + 40], target: [position.x, position.y, position.z] });
    setQ('');
    setActiveIndex(-1);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setQ(''); setActiveIndex(-1); return; }
    if (!data?.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((i) => (i + delta + data.length) % data.length);
    }
    if (e.key === 'Enter' && activeIndex >= 0 && data[activeIndex]) {
      e.preventDefault();
      const o = data[activeIndex];
      choose(o.id, o);
    }
  };

  const results = open ? (
    <div
      id="cosmos-search-results"
      role="listbox"
      aria-label="অনুসন্ধান ফলাফল"
      className={isMobile
        ? 'fixed inset-x-3 top-[30dvh] z-[60] max-h-[60dvh] overflow-y-auto rounded-md border border-border-subtle bg-panel shadow-2xl'
        : 'absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-md border border-border-subtle bg-panel shadow-2xl'}
    >
      {isPending && <div className="p-3 text-xs text-ink-muted">খোঁজা হচ্ছে…</div>}
      {data && data.length === 0 && <div className="p-3 text-xs text-ink-muted">কোনো ফলাফল নেই।</div>}
      {data?.map((o) => (
        <button key={o.id} id={`search-option-${o.id}`} type="button" role="option"
          aria-selected={data?.[activeIndex]?.id === o.id}
          onMouseEnter={() => setActiveIndex(data?.findIndex((x) => x.id === o.id) ?? -1)}
          onClick={() => choose(o.id, o)}
          className="flex min-h-11 w-full items-center gap-3 border-b border-border-subtle px-3 py-2 text-left text-sm last:border-0 hover:bg-elevated">
          <div className="flex-1">
            <div className="font-medium text-ink">{o.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-ink-muted">{o.type} · {o.evidence}</div>
          </div>
          <EvidenceBadge kind={o.evidence} />
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="relative">
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
      <input
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? 'cosmos-search-results' : undefined}
        value={q}
        onChange={(e) => { setQ(e.target.value); setActiveIndex(-1); }}
        onKeyDown={onKeyDown}
        aria-activedescendant={activeIndex >= 0 && data?.[activeIndex] ? `search-option-${data[activeIndex].id}` : undefined}
        placeholder="গ্যালাক্সি, গুচ্ছ, redshift, বা RA/Dec…"
        aria-label="অনুসন্ধান"
        className="min-h-11 w-full rounded-md border border-border-subtle bg-base/60 pl-9 pr-3 py-1.5 text-sm placeholder:text-ink-muted focus:border-accent focus:outline-none"
      />
      {isMobile && results ? createPortal(results, document.body) : results}
    </div>
  );
}
