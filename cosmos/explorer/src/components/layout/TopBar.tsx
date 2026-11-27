import type { ReactNode } from 'react';
import { Search, Settings, LayoutPanelLeft, Info } from 'lucide-react';
import { useExplorer } from '@/state/explorer';

export function TopBar({ searchSlot }: { searchSlot?: ReactNode }) {
  const panels = useExplorer((s) => s.panels);
  const togglePanel = useExplorer((s) => s.togglePanel);
  const scope = useExplorer((s) => s.scope);
  const setScope = useExplorer((s) => s.setScope);
  const frame = useExplorer((s) => s.frame);
  const setFrame = useExplorer((s) => s.setFrame);
  const h0Set = useExplorer((s) => s.h0Set);
  const setH0Set = useExplorer((s) => s.setH0Set);

  return (
    <header
      className="relative z-20 flex items-center gap-3 border-b border-border-subtle bg-panel px-4"
      style={{ height: 'var(--topbar-h)' }}
      role="banner"
    >
      <div className="flex items-center gap-2">
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

      {/* Dual-Scope switch (s15.1 rule 7) */}
      <div className="flex items-center gap-1" role="group" aria-label="Scope নির্বাচন">
        <button type="button" aria-pressed={scope === 'extragalactic'} onClick={() => setScope('extragalactic')}
          className={'rounded-sm border px-2 py-1 text-[11px] ' + (scope === 'extragalactic' ? 'border-accent/50 bg-accent/15 text-accent' : 'border-border-subtle text-ink-subtle')}>
          Extragalactic
        </button>
        <button type="button" aria-pressed={scope === 'local'} onClick={() => setScope('local')}
          className={'rounded-sm border px-2 py-1 text-[11px] ' + (scope === 'local' ? 'border-accent/50 bg-accent/15 text-accent' : 'border-border-subtle text-ink-subtle')}>
          Local
        </button>
      </div>

      {/* Frame toggle: Observed (light-cone) vs Comoving-now, ~1s CSS transition on viewport */}
      <div className="flex items-center gap-1" role="group" aria-label="ফ্রেম নির্বাচন">
        <button type="button" aria-pressed={frame === 'lightcone'} onClick={() => setFrame('lightcone')}
          className={'rounded-sm border px-2 py-1 text-[11px] ' + (frame === 'lightcone' ? 'border-accent/50 bg-accent/15 text-accent' : 'border-border-subtle text-ink-subtle')}>
          ◉ Observed
        </button>
        <button type="button" aria-pressed={frame === 'comoving'} onClick={() => setFrame('comoving')}
          className={'rounded-sm border px-2 py-1 text-[11px] ' + (frame === 'comoving' ? 'border-accent/50 bg-accent/15 text-accent' : 'border-border-subtle text-ink-subtle')}>
          ○ Comoving-now
        </button>
      </div>

      <label className="flex items-center gap-1 text-[11px] text-ink-subtle">
        H₀
        <select aria-label="ParameterSet H0" value={h0Set}
          onChange={(e) => setH0Set(e.target.value as typeof h0Set)}
          className="rounded-sm border border-border-subtle bg-base/60 px-1 py-1 text-[11px]">
          <option value="Planck18">67.7 Planck18</option>
          <option value="SH0ES">73.0 SH0ES</option>
          <option value="CCHP">69.8 CCHP</option>
        </select>
      </label>

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
        <IconButton label="Model Lab (সেটিংস)" onToggle={() => useExplorer.getState().setMode('modellab')}>
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
