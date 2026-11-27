import type { EvidenceKind } from '@/types/cosmos';
import { cn } from '@/lib/format';

const LABEL: Record<EvidenceKind, string> = {
  observed: 'পর্যবেক্ষিত',
  reconstructed: 'পুনর্গঠিত',
  simulated: 'সিমুলেটেড',
  unknown: 'অনিশ্চিত',
};

export function EvidenceBadge({ kind, className }: { kind: EvidenceKind; className?: string }) {
  return (
    <span
      data-evidence={kind}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[11px] font-medium tracking-wide',
        'border border-[color:var(--evidence-color)]/40 bg-[color:var(--evidence-color)]/10',
        'text-[color:var(--evidence-color)]',
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--evidence-color)]" aria-hidden />
      {LABEL[kind]}
    </span>
  );
}
