import { useExplorer } from '@/state/explorer';
import { useObjectDetail } from '@/data/queries';
import { EvidenceBadge } from '@/components/ui/Badge';
import { formatMpc, formatMassMsun } from '@/lib/format';
import { Pin, Focus, GitCompare, ExternalLink } from 'lucide-react';

export function InfoPanel() {
  const selectedId = useExplorer((s) => s.selectedId);
  const setCamera = useExplorer((s) => s.setCamera);
  const pin = useExplorer((s) => s.pin);
  const { data: obj, isPending } = useObjectDetail(selectedId);

  return (
    <aside
      aria-label="নির্বাচিত বস্তুর তথ্য"
      className="flex flex-col overflow-hidden border-l border-border-subtle bg-panel"
    >
      <header className="border-b border-border-subtle px-4 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">তথ্য</h2>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-3 text-sm">
        {!selectedId && <Empty />}
        {isPending && <div className="text-ink-muted">লোড হচ্ছে…</div>}
        {obj && (
          <article className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold leading-tight">{obj.name}</h3>
              {obj.aliases.length > 0 && (
                <div className="text-[11px] text-ink-muted">{obj.aliases.join(' · ')}</div>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-sm border border-border-subtle bg-base/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-subtle">
                  {obj.type}
                </span>
                <EvidenceBadge kind={obj.evidence} />
                <span className="rounded-sm border border-border-subtle bg-base/50 px-1.5 py-0.5 text-[10px] text-ink-subtle">
                  {obj.boundaryKind === 'physical' ? 'শারীরিক সীমানা' : obj.boundaryKind === 'flow-defined' ? 'প্রবাহ-সংজ্ঞায়িত' : 'মডেল-নির্ভর'}
                </span>
              </div>
            </div>

            {obj.summary && <p className="text-[12px] text-ink-subtle">{obj.summary}</p>}

            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
              <Field label="স্থানাঙ্ক (Mpc)">
                ({obj.positionMpc.x.toFixed(1)}, {obj.positionMpc.y.toFixed(1)}, {obj.positionMpc.z.toFixed(1)})
              </Field>
              {obj.redshift && <Field label="redshift">z = {obj.redshift.value.toFixed(3)}</Field>}
              {obj.distanceMpc && <Field label="দূরত্ব">{formatMpc(obj.distanceMpc.value)}</Field>}
              {obj.radiusMpc && <Field label="ব্যাসার্ধ">{formatMpc(obj.radiusMpc)}</Field>}
              {obj.massMsun && <Field label="ভর">{formatMassMsun(obj.massMsun.value)}</Field>}
            </dl>

            <div className="flex flex-wrap gap-1.5">
              <ActionButton onClick={() => setCamera({ position: [obj.positionMpc.x + 40, obj.positionMpc.y + 30, obj.positionMpc.z + 40], target: [obj.positionMpc.x, obj.positionMpc.y, obj.positionMpc.z] })}>
                <Focus size={14} /> ফোকাস
              </ActionButton>
              <ActionButton onClick={() => pin(obj.id)}>
                <Pin size={14} /> পিন
              </ActionButton>
              <ActionButton onClick={() => {}}>
                <GitCompare size={14} /> তুলনা
              </ActionButton>
            </div>

            <section>
              <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">সূত্র</h4>
              <ul className="space-y-1 text-[11px] text-ink-muted">
                {obj.sources.map((s, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <ExternalLink size={10} />
                    {s.dataset} · {s.release}
                  </li>
                ))}
              </ul>
            </section>
          </article>
        )}
      </div>
    </aside>
  );
}

function Empty() {
  return (
    <div className="space-y-2 text-[12px] text-ink-muted">
      <p>এখনো কোনো বস্তু নির্বাচিত হয়নি।</p>
      <p>দৃশ্যে একটি বিন্দুতে ক্লিক করুন, অথবা উপরের অনুসন্ধান ব্যবহার করুন।</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-[10px] uppercase tracking-wider text-ink-muted">{label}</dt>
      <dd className="font-mono tabular-nums text-ink">{children}</dd>
    </>
  );
}

function ActionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-sm border border-border-subtle bg-base/60 px-2 py-1 text-[11px] text-ink-subtle hover:border-accent/50 hover:text-accent"
    >
      {children}
    </button>
  );
}
