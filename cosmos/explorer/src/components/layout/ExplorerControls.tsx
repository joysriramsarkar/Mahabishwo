import { Info, LayoutPanelLeft, Settings } from 'lucide-react';
import { useExplorer } from '@/state/explorer';
import { cn } from '@/lib/format';

/** Shared desktop/mobile scientific controls (scope, frame, H0, panels). */
export function ExplorerControls({ showPanels = true }: { showPanels?: boolean }) {
  const panels = useExplorer((s) => s.panels);
  const togglePanel = useExplorer((s) => s.togglePanel);
  const scope = useExplorer((s) => s.scope);
  const setScope = useExplorer((s) => s.setScope);
  const frame = useExplorer((s) => s.frame);
  const setFrame = useExplorer((s) => s.setFrame);
  const h0Set = useExplorer((s) => s.h0Set);
  const setH0Set = useExplorer((s) => s.setH0Set);
  const setMode = useExplorer((s) => s.setMode);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1" role="group" aria-label="Scope নির্বাচন">
        <ControlButton active={scope === 'extragalactic'} onClick={() => setScope('extragalactic')}>Extragalactic</ControlButton>
        <ControlButton active={scope === 'local'} onClick={() => setScope('local')}>Local</ControlButton>
      </div>
      <div className="flex items-center gap-1" role="group" aria-label="ফ্রেম নির্বাচন">
        <ControlButton active={frame === 'lightcone'} onClick={() => setFrame('lightcone')}>◉ Observed / RSD</ControlButton>
        <ControlButton active={frame === 'comoving'} onClick={() => setFrame('comoving')}>○ Comoving-now</ControlButton>
      </div>
      <label className="flex min-h-11 items-center gap-1 text-[11px] text-ink-subtle">
        H₀
        <select aria-label="ParameterSet H0" value={h0Set}
          onChange={(e) => setH0Set(e.target.value as typeof h0Set)}
          className="min-h-11 rounded-sm border border-border-subtle bg-base/60 px-2 text-[11px]">
          <option value="Planck18">67.7 Planck18</option>
          <option value="SH0ES">73.0 SH0ES</option>
          <option value="CCHP">69.8 CCHP</option>
        </select>
      </label>
      {showPanels && (
        <div className="hidden items-center gap-1 lg:flex">
          <PanelButton label="স্তর প্যানেল" pressed={panels.layers} onClick={() => togglePanel('layers')}><LayoutPanelLeft size={16} /></PanelButton>
          <PanelButton label="তথ্য প্যানেল" pressed={panels.info} onClick={() => togglePanel('info')}><Info size={16} /></PanelButton>
          <PanelButton label="Model Lab" onClick={() => setMode('modellab')}><Settings size={16} /></PanelButton>
        </div>
      )}
    </div>
  );
}

function ControlButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cn('min-h-11 rounded-sm border px-3 text-[11px] transition-colors',
        active ? 'border-accent/50 bg-accent/15 text-accent' : 'border-border-subtle text-ink-subtle')}>
      {children}
    </button>
  );
}

function PanelButton({ label, pressed, onClick, children }: {
  label: string; pressed?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button type="button" aria-label={label} aria-pressed={pressed} onClick={onClick}
      className={cn('grid h-11 w-11 place-items-center rounded-md border transition-colors',
        pressed ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border-subtle text-ink-subtle')}>
      {children}
    </button>
  );
}
