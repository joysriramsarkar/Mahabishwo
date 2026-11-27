import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/format';

export type SheetSnap = 'peek' | 'half' | 'full';

const HEIGHT: Record<SheetSnap, string> = {
  peek: 'h-[38dvh]',
  half: 'h-[65dvh]',
  full: 'h-[88dvh]',
};

/** Accessible mobile bottom sheet. Radix supplies portal, focus trap/restore,
 * Escape and overlay dismissal. No slide animation: reduced-motion safe. */
export function BottomSheet({
  open, onOpenChange, title, description, children, defaultSnap = 'half', className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  defaultSnap?: SheetSnap;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-2xl',
            'border-t border-border-strong bg-panel shadow-2xl',
            HEIGHT[defaultSnap], className,
          )}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="border-b border-border-subtle px-4 pb-2 pt-3">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border-strong" aria-hidden />
            <div className="flex items-center gap-3">
              <Dialog.Title className="text-sm font-semibold text-ink">{title}</Dialog.Title>
              <Dialog.Description className="sr-only">{description ?? title}</Dialog.Description>
              <Dialog.Close asChild>
                <button type="button" aria-label={`${title} বন্ধ করুন`}
                  className="ml-auto grid h-11 w-11 place-items-center rounded-md text-ink-subtle hover:bg-elevated hover:text-ink">
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
