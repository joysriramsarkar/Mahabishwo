import type { ReactNode } from 'react';
import { Search, Settings, LayoutPanelLeft, Info } from 'lucide-react';
import { useExplorer } from '@/state/explorer';

export function TopBar({ searchSlot }: { searchSlot?: ReactNode }) {
  const panels = useExplorer((s) => s.panels);
  const togglePanel = useExplorer((s) => s.togglePanel);

  return (
    <header
      className="relative z-20 flex items-center gap-3 border-b border-border-subtle bg-panel px-4"
      style={{ height: 'var(--topbar-h)' }}
      role="banner"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tracking-wide">দৃশ্যমান মহাবিশ্ব</span>
        <span
          className="rounded-sm border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-accent"
          title="আকাশগঙ্গা ও তার অভ্যন্তরীণ বস্তু এই workspace থেকে বাদ দেওয়া হয়েছে"
        >
          আকাশগঙ্গা: বাদ
        </span>
      </div>

      <div className="mx-4 flex-1">{searchSlot ?? <PlaceholderSearch />}</div>

      <div className="flex items-center gap-1">
        <IconButton
          label="স্তর প্যানেল"
          pressed={panels.layers}
          onToggle={() => togglePanel('layers')}
        >
          <LayoutPanelLeft size={16} />
        </IconButton>
        <IconButton
          label="তথ্য প্যানেল"
          pressed={panels.info}
          onToggle={() => togglePanel('info')}
        >
          <Info size={16} />
        </IconButton>
        <IconButton label="সেটিংস" onToggle={() => {}}>
          <Settings size={16} />
        </IconButton>
      </div>
    </header>
  );
}

function PlaceholderSearch() {
  return (
    <div className="relative max-w-xl">
      <Search
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
      />
      <input
        type="search"
        placeholder="গ্যালাক্সি, গুচ্ছ, redshift, বা RA/Dec…"
        aria-label="অনুসন্ধান"
        className="w-full rounded-md border border-border-subtle bg-base/60 pl-9 pr-3 py-1.5 text-sm placeholder:text-ink-muted focus:border-accent focus:outline-none"
      />
    </div>
  );
}

function IconButton({
  children, label, pressed, onToggle,
}: { children: ReactNode; label: string; pressed?: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onToggle}
      className={
        'grid h-8 w-8 place-items-center rounded-md border transition-colors ' +
        (pressed
          ? 'border-accent/40 bg-accent/10 text-accent'
          : 'border-transparent text-ink-subtle hover:border-border-subtle hover:bg-elevated hover:text-ink')
      }
    >
      {children}
    </button>
  );
}
