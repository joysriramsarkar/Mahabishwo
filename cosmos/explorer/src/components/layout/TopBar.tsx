import type { ReactNode } from 'react';
import { Menu, Search } from 'lucide-react';
import { useExplorer } from '@/state/explorer';
import { ExplorerControls } from './ExplorerControls';

export function TopBar({ searchSlot, compact = false, onOpenControls }: {
  searchSlot?: ReactNode; compact?: boolean; onOpenControls?: () => void;
}) {
  const scope = useExplorer((s) => s.scope);
  return (
    <header
      className={compact
        ? 'relative z-20 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-subtle bg-panel px-3 py-2 md:px-4'
        : 'relative z-20 flex items-center gap-3 border-b border-border-subtle bg-panel px-3 md:px-4'}
      style={{ height: compact ? 'auto' : 'var(--topbar-h)', minHeight: 'var(--topbar-h)' }}
      role="banner"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="text-sm font-semibold tracking-wide">COSMOS · দিগন্ত</span>
        {scope === 'extragalactic' ? (
          <span
            className="rounded-sm border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-accent"
            title="Extragalactic Scope: আকাশগঙ্গা শুধু observer marker — ভেতরের অংশ আঁকা হয় না (s15.1 নিয়ম 7)"
          >
            আকাশগঙ্গা: বাদ
          </span>
        ) : (
          <span className="rounded-sm border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-accent">
            Local Scope: পূর্ণ MW + L0
          </span>
        )}
      </div>

      {compact ? (
        <>
          <div className="order-3 w-full min-w-0 flex-1">{searchSlot ?? <PlaceholderSearch />}</div>
          <button type="button" aria-label="নিয়ন্ত্রণ খুলুন" onClick={onOpenControls}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-border-subtle text-ink-subtle">
            <Menu size={18} />
          </button>
        </>
      ) : (
        <>
          <ExplorerControls />
          <div className="mx-4 min-w-0 flex-1">{searchSlot ?? <PlaceholderSearch />}</div>
        </>
      )}
    </header>
  );
}

function PlaceholderSearch() {
  return (
    <div className="relative max-w-xl">
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
      <input type="search" placeholder="গ্যালাক্সি, গুচ্ছ, redshift, বা RA/Dec…" aria-label="অনুসন্ধান"
        className="w-full rounded-md border border-border-subtle bg-base/60 pl-9 pr-3 py-1.5 text-sm placeholder:text-ink-muted focus:border-accent focus:outline-none" />
    </div>
  );
}
