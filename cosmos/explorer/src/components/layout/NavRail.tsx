import { Globe2, Map, PieChart, Layers, Box, Clock, GitCompare, BarChart3, FlaskConical, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/format';
import type { ReactNode } from 'react';
import { useExplorer, type ViewMode } from '@/state/explorer';

/** 9 view modes (masterplan s15.2), keyboard 1-9. */
export const NAV_ITEMS: { id: ViewMode; label: string; Icon: typeof Globe2 }[] = [
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

export function NavRail({ mobile = false, onOpenViews }: {
  mobile?: boolean; onOpenViews?: () => void;
}) {
  const mode = useExplorer((s) => s.mode);
  const setMode = useExplorer((s) => s.setMode);
  if (mobile) {
    return (
      <nav aria-label="মোবাইল প্রধান নেভিগেশন"
        className="z-20 grid grid-cols-5 border-t border-border-subtle bg-panel"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {NAV_ITEMS.slice(0, 3).map(({ id, label, Icon }) => (
          <MobileButton key={id} label={label} active={mode === id} onClick={() => setMode(id)}><Icon size={19} /></MobileButton>
        ))}
        <MobileButton label="সব ভিউ" active={false} onClick={onOpenViews ?? (() => {})}><Grid3X3 size={19} /></MobileButton>
        <MobileButton label="নিয়ন্ত্রণ" active={false} onClick={() => useExplorer.getState().openMobileSheet('controls')}><Layers size={19} /></MobileButton>
      </nav>
    );
  }
  return (
    <nav aria-label="প্রধান নেভিগেশন" className="relative z-10 flex flex-col items-center gap-1 border-r border-border-subtle bg-panel py-3">
      {NAV_ITEMS.map(({ id, label, Icon }) => (
        <RailButton key={id} label={label} active={mode === id} onClick={() => setMode(id)}><Icon size={18} /></RailButton>
      ))}
    </nav>
  );
}

function RailButton({ children, label, active, onClick }: {
  children: ReactNode; label: string; active?: boolean; onClick: () => void;
}) {
  return (
    <button type="button" aria-label={label} aria-current={active ? 'page' : undefined} aria-pressed={active} onClick={onClick}
      className={cn('group relative grid h-11 w-11 place-items-center rounded-md border transition-colors',
        active ? 'border-accent/40 bg-accent/10 text-accent'
          : 'border-transparent text-ink-subtle hover:border-border-subtle hover:bg-elevated hover:text-ink')}
      title={label}>
      {children}
      <span className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded bg-elevated px-2 py-1 text-xs text-ink group-hover:block">{label}</span>
    </button>
  );
}

function MobileButton({ children, label, active, onClick }: {
  children: ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button type="button" aria-label={label} aria-pressed={active} onClick={onClick}
      className={cn('flex min-h-14 flex-col items-center justify-center gap-1 text-[9px]',
        active ? 'bg-accent/10 text-accent' : 'text-ink-subtle')}>
      {children}<span className="max-w-full truncate px-1">{label.split(' · ')[0]}</span>
    </button>
  );
}
