import { useExplorer } from '@/state/explorer';
import { formatMpc } from '@/lib/format';

const MODE_LABEL = { '3d': 'কমভিং মানচিত্র', sky: 'আকাশ', slice: 'স্লাইস' } as const;

export function StatusBar() {
  const { mode, epochZ, scaleMpc, filters, selectedId } = useExplorer();

  return (
    <footer
      role="contentinfo"
      className="flex items-center gap-4 border-t border-border-subtle bg-panel px-4 text-[11px] text-ink-muted"
      style={{ height: 'var(--statusbar-h)' }}
    >
      <span>দৃশ্য: {MODE_LABEL[mode]}</span>
      <span>স্কেল: {formatMpc(scaleMpc)}</span>
      <span>যুগ: z = {epochZ.toFixed(3)}</span>
      <span className="ml-auto">
        ফিল্টার: {filters.types.length + filters.evidence.length === 0 ? 'নেই' : 'সক্রিয়'}
      </span>
      <span>নির্বাচিত: {selectedId ?? '—'}</span>
    </footer>
  );
}
