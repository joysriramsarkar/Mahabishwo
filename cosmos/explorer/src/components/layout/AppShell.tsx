import type { ReactNode } from 'react';
import { cn } from '@/lib/format';
import { useExplorer } from '@/state/explorer';
import { TopBar } from './TopBar';
import { NavRail } from './NavRail';
import { StatusBar } from './StatusBar';
import { LayerPanel } from '@/components/panels/LayerPanel';
import { InfoPanel } from '@/components/panels/InfoPanel';
import { TimeController } from '@/components/panels/TimeController';
import { Viewport } from '@/components/viewport/Viewport';
import { TooltipProvider } from '@/components/ui/Tooltip';

export function AppShell({ searchSlot }: { searchSlot?: ReactNode }) {
  const panels = useExplorer((s) => s.panels);

  return (
    <TooltipProvider>
      <div className="grid h-full w-full bg-base text-ink">
        <TopBar searchSlot={searchSlot} />
        <div className="relative grid h-[calc(100dvh-var(--topbar-h)-var(--statusbar-h))] grid-cols-[var(--navrail-w)_1fr] overflow-hidden">
          <NavRail />
          <div
            className={cn(
              'relative grid overflow-hidden',
              panels.layers && panels.info
                ? 'grid-cols-[var(--panel-w)_1fr_var(--info-w)]'
                : panels.layers
                ? 'grid-cols-[var(--panel-w)_1fr]'
                : panels.info
                ? 'grid-cols-[1fr_var(--info-w)]'
                : 'grid-cols-[1fr]'
            )}
          >
            {panels.layers && <LayerPanel />}
            <div className="relative overflow-hidden">
              <Viewport />
              <TimeController />
            </div>
            {panels.info && <InfoPanel />}
          </div>
        </div>
        <StatusBar />
      </div>
    </TooltipProvider>
  );
}
