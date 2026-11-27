import { Globe2, Map, PieChart, Layers, Box, Clock, GitCompare, BarChart3, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/format';
import type { ReactNode } from 'react';
import { useExplorer, type ViewMode } from '@/state/explorer';

/** 9 view modes (masterplan s15.2), keyboard 1-9 wired in useKeyboard. */
const ITEMS: { id: ViewMode; label: string; Icon: typeof Globe2 }[] = [
  { id: '3d', label: '১ · Cosmic Web / Light-cone 3D', Icon: Globe2 },
  { id: 'sky', label: '২ · Sky Atlas', Icon: Map },
  { id: 'wedge', label: '৩ · Light-cone Wedge', Icon: PieChart },
  { id: 'slice', label: '৪ · Slice / Density Map', Icon: Layers },
  { id: 'comoving', label: '৫ · Comoving Volume', Icon: Box },
  { id: 'timelab', label: '৬ · Time Lab', Icon: Clock },
  { id: 'compare', label: '৭ · Observation Comparison', Icon: GitCompare },
  { id: 'statistics', label: '৮ · Statistics Inspector', Icon: BarChart3 },
  { id: 'modellab', label: '৯ · Model Lab', Icon: FlaskConical },
];

export function NavRail() {
  const mode = useExplorer((s) => s.mode);
  const setMode = useExplorer((s) => s.setMode);
  return (
    <nav
      aria-label="প্রধান নেভিগেশন"
      className="relative z-10 flex flex-col items-center gap-1 border-r border-border-subtle bg-panel py-3"
    >
      {ITEMS.map(({ id, label, Icon }) => (
        <RailButton key={id} label={label} active={mode === id} onClick={() => setMode(id)}>
          <Icon size={18} />
        </RailButton>
      ))}
    </nav>
  );
}

function RailButton({ children, label, active, onClick }: {
  children: ReactNode; label: string; active?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'group relative grid h-11 w-11 place-items-center rounded-md border transition-colors',
        active
          ? 'border-accent/40 bg-accent/10 text-accent'
          : 'border-transparent text-ink-subtle hover:border-border-subtle hover:bg-elevated hover:text-ink',
      )}
      title={label}
    >
      {children}
      <span className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded bg-elevated px-2 py-1 text-xs text-ink group-hover:block">
        {label}
      </span>
    </button>
  );
}
