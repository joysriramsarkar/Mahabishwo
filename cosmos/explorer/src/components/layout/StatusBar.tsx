import { useExplorer } from '@/state/explorer';
import { formatMpc } from '@/lib/format';

const MODE_LABEL: Record<string, string> = {
  '3d': 'Cosmic Web 3D', sky: 'Sky Atlas', wedge: 'Wedge', slice: 'Slice',
  comoving: 'Comoving (অভৌত দৃষ্টিকোণ)', timelab: 'Time Lab',
  compare: 'Observation Comparison', statistics: 'Statistics', modellab: 'Model Lab',
};

export function StatusBar() {
  const { mode, epochZ, scaleMpc, filters, selectedId, frame, scope, caveatCount } = useExplorer();

  return (
    <footer
      role="contentinfo"
      className="flex items-center gap-4 border-t border-border-subtle bg-panel px-4 text-[11px] text-ink-muted"
      style={{ height: 'var(--statusbar-h)' }}
    >
      <span>দৃশ্য: {MODE_LABEL[mode] ?? mode}</span>
      <span>ফ্রেম: {frame === 'lightcone' ? 'Observed (light-cone)' : 'Comoving-now'}</span>
      <span>স্কোপ: {scope === 'local' ? 'Local' : 'Extragalactic'}</span>
      <span>স্কেল: {formatMpc(scaleMpc)}</span>
      <span>যুগ: z = {epochZ.toFixed(3)}</span>
      <span aria-label={`সতর্কতা ${caveatCount}টি`} title="Caveat সিস্টেম (s15.3) — বিস্তারিত তথ্য প্যানেলে">
        ⚠ {caveatCount} caveats
      </span>
      <span className="ml-auto">
        ফিল্টার: {filters.types.length + filters.evidence.length === 0 ? 'নেই' : 'সক্রিয়'}
      </span>
      <span>নির্বাচিত: {selectedId ?? '—'}</span>
    </footer>
  );
}
