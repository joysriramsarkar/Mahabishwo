import { useEffect, type ReactNode } from 'react';
import { Clock3, Info, Layers } from 'lucide-react';
import { useExplorer } from '@/state/explorer';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { TopBar } from './TopBar';
import { NavRail, NAV_ITEMS } from './NavRail';
import { StatusBar } from './StatusBar';
import { BottomSheet } from './BottomSheet';
import { ExplorerControls } from './ExplorerControls';
import { LayerPanel } from '@/components/panels/LayerPanel';
import { InfoPanel } from '@/components/panels/InfoPanel';
import { TimeController } from '@/components/panels/TimeController';
import { Viewport } from '@/components/viewport/Viewport';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { cn, formatMpc } from '@/lib/format';

export function AppShell({ searchSlot }: { searchSlot?: ReactNode }) {
  const panels = useExplorer((s) => s.panels);
  const isMobile = useMediaQuery('(max-width: 899px)');
  const mobileSheet = useExplorer((s) => s.mobileSheet);
  const openMobileSheet = useExplorer((s) => s.openMobileSheet);
  const closeMobileSheet = useExplorer((s) => s.closeMobileSheet);
  const selectedId = useExplorer((s) => s.selectedId);

  // A mobile selection opens the inspector; dismissing the sheet keeps the
  // selection. Resizing to desktop closes ephemeral mobile UI.
  useEffect(() => {
    if (isMobile && selectedId) openMobileSheet('info');
  }, [isMobile, selectedId, openMobileSheet]);
  useEffect(() => {
    if (!isMobile && mobileSheet) closeMobileSheet();
  }, [isMobile, mobileSheet, closeMobileSheet]);

  return (
    <TooltipProvider>
      <div className="h-full w-full bg-base text-ink">
        {isMobile ? (
          <MobileShell searchSlot={searchSlot} />
        ) : (
          <DesktopShell searchSlot={searchSlot} panels={panels} />
        )}
        <MobileSheets sheet={mobileSheet} onClose={closeMobileSheet} />
      </div>
    </TooltipProvider>
  );
}

function DesktopShell({ searchSlot, panels }: {
  searchSlot?: ReactNode;
  panels: { layers: boolean; info: boolean };
}) {
  return (
    <div className="grid h-full w-full">
      <TopBar searchSlot={searchSlot} />
      <div className="relative grid h-[calc(100dvh-var(--topbar-h)-var(--statusbar-h))] grid-cols-[var(--navrail-w)_1fr] overflow-hidden">
        <NavRail />
        <div className={cn('relative grid overflow-hidden',
          panels.layers && panels.info ? 'grid-cols-[var(--panel-w)_1fr_var(--info-w)]'
            : panels.layers ? 'grid-cols-[var(--panel-w)_1fr]'
            : panels.info ? 'grid-cols-[1fr_var(--info-w)]' : 'grid-cols-[1fr]')}>
          {panels.layers && <LayerPanel />}
          <div className="relative min-h-0 overflow-hidden">
            <Viewport />
            <TimeController />
          </div>
          {panels.info && <InfoPanel />}
        </div>
      </div>
      <StatusBar />
    </div>
  );
}

function MobileShell({ searchSlot }: { searchSlot?: ReactNode }) {
  const openMobileSheet = useExplorer((s) => s.openMobileSheet);
  const scaleMpc = useExplorer((s) => s.scaleMpc);
  const epochZ = useExplorer((s) => s.epochZ);
  const caveatCount = useExplorer((s) => s.caveatCount);
  const selectedId = useExplorer((s) => s.selectedId);
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <TopBar compact searchSlot={searchSlot} onOpenControls={() => openMobileSheet('controls')} />
      <main className="relative min-h-0 flex-1 overflow-hidden">
        <Viewport />
        <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-panel/80 px-3 py-1 text-[10px] text-ink-muted backdrop-blur">
          <span>{formatMpc(scaleMpc)}</span><span>z={epochZ.toFixed(2)}</span>
          <span aria-label={`${caveatCount} caveats`}>⚠ {caveatCount}</span>
          <div className="ml-auto flex gap-1">
            <MiniButton label="সময়" onClick={() => openMobileSheet('time')}><Clock3 size={14} /></MiniButton>
            <MiniButton label="স্তর" onClick={() => openMobileSheet('layers')}><Layers size={14} /></MiniButton>
            <MiniButton label="তথ্য" onClick={() => openMobileSheet('info')} active={!!selectedId}><Info size={14} /></MiniButton>
          </div>
        </div>
      </main>
      <NavRail mobile onOpenViews={() => openMobileSheet('views')} />
    </div>
  );
}

function MiniButton({ label, onClick, active, children }: {
  label: string; onClick: () => void; active?: boolean; children: ReactNode;
}) {
  return (
    <button type="button" aria-label={label} onClick={onClick}
      className={cn('grid h-11 min-w-11 place-items-center rounded border px-2',
        active ? 'border-accent/50 text-accent' : 'border-border-subtle')}>
      {children}
    </button>
  );
}

function MobileSheets({ sheet, onClose }: {
  sheet: ReturnType<typeof useExplorer.getState>['mobileSheet'];
  onClose: () => void;
}) {
  const setMode = useExplorer((s) => s.setMode);
  return (
    <>
      <BottomSheet open={sheet === 'controls'} onOpenChange={(o) => !o && onClose()} title="Explorer নিয়ন্ত্রণ" defaultSnap="half">
        <div className="space-y-4 p-4">
          <p className="text-[12px] text-ink-subtle">Scope, frame ও ParameterSet পরিবর্তন করুন। Observed ⇄ Comoving-now টগলে বস্তুগুলো ~৯০০ ms-এ সরে যায় (reduced-motion-এ তাৎক্ষণিক)।</p>
          <ExplorerControls showPanels={false} />
        </div>
      </BottomSheet>
      <BottomSheet open={sheet === 'layers'} onOpenChange={(o) => !o && onClose()} title="স্তর ও ফিল্টার" defaultSnap="full">
        <LayerPanel embedded />
      </BottomSheet>
      <BottomSheet open={sheet === 'info'} onOpenChange={(o) => !o && onClose()} title="নির্বাচিত বস্তুর তথ্য" defaultSnap="full">
        <InfoPanel embedded />
      </BottomSheet>
      <BottomSheet open={sheet === 'time'} onOpenChange={(o) => !o && onClose()} title="সময় নিয়ন্ত্রণ" defaultSnap="peek">
        <TimeController presentation="sheet" />
      </BottomSheet>
      <BottomSheet open={sheet === 'views'} onOpenChange={(o) => !o && onClose()} title="সব ভিউ মোড" defaultSnap="full">
        <div className="grid gap-2 p-4">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button key={id} type="button" onClick={() => { setMode(id); onClose(); }}
              className="flex min-h-14 items-center gap-3 rounded-md border border-border-subtle px-4 text-left text-sm hover:border-accent/50">
              <Icon size={18} /><span>{label}</span>
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
