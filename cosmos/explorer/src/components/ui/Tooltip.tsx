import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

export const TooltipProvider = RadixTooltip.Provider;

export function Tooltip({ children, content }: { children: ReactNode; content: ReactNode }) {
  return (
    <RadixTooltip.Root delayDuration={200}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          sideOffset={6}
          className="z-50 max-w-xs rounded-md border border-border-subtle bg-elevated px-2 py-1 text-xs text-ink shadow-xl"
        >
          {content}
          <RadixTooltip.Arrow className="fill-[var(--bg-elevated)]" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
