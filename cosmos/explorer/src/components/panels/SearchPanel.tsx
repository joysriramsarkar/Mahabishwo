import { useState } from 'react';
import { useSearchResults } from '@/data/queries';
import { useExplorer } from '@/state/explorer';
import { EvidenceBadge } from '@/components/ui/Badge';
import { Search } from 'lucide-react';

export function SearchPanel() {
  const [q, setQ] = useState('');
  const { data, isPending } = useSearchResults(q);
  const select = useExplorer((s) => s.select);
  const setCamera = useExplorer((s) => s.setCamera);

  return (
    <div className="relative">
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="গ্যালাক্সি, গুচ্ছ, redshift, বা RA/Dec…"
        aria-label="অনুসন্ধান"
        className="w-full rounded-md border border-border-subtle bg-base/60 pl-9 pr-3 py-1.5 text-sm placeholder:text-ink-muted focus:border-accent focus:outline-none"
      />
      {q.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-md border border-border-subtle bg-panel shadow-2xl">
          {isPending && <div className="p-3 text-xs text-ink-muted">খোঁজা হচ্ছে…</div>}
          {data && data.length === 0 && (
            <div className="p-3 text-xs text-ink-muted">কোনো ফলাফল নেই।</div>
          )}
          {data?.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                select(o.id);
                setCamera({
                  position: [o.positionMpc.x + 40, o.positionMpc.y + 30, o.positionMpc.z + 40],
                  target: [o.positionMpc.x, o.positionMpc.y, o.positionMpc.z],
                });
                setQ('');
              }}
              className="flex w-full items-center gap-3 border-b border-border-subtle px-3 py-2 text-left text-sm last:border-0 hover:bg-elevated"
            >
              <div className="flex-1">
                <div className="font-medium text-ink">{o.name}</div>
                <div className="text-[10px] uppercase tracking-wider text-ink-muted">
                  {o.type} · {o.evidence}
                </div>
              </div>
              <EvidenceBadge kind={o.evidence} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
