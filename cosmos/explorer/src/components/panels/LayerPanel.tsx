import { useExplorer } from '@/state/explorer';
import { LAYERS } from '@/data/layers';
import { EvidenceBadge } from '@/components/ui/Badge';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { ObjectType, EvidenceKind } from '@/types/cosmos';

export function LayerPanel() {
  const layers = useExplorer((s) => s.layers);
  const toggleLayer = useExplorer((s) => s.toggleLayer);
  const setOpacity = useExplorer((s) => s.setLayerOpacity);
  const filters = useExplorer((s) => s.filters);
  const toggleFilterType = useExplorer((s) => s.toggleFilterType);
  const toggleFilterEvidence = useExplorer((s) => s.toggleFilterEvidence);

  return (
    <aside
      aria-label="স্তর ও ফিল্টার"
      className="flex flex-col overflow-hidden border-r border-border-subtle bg-panel"
    >
      <header className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">স্তর</h2>
      </header>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-1">
          {LAYERS.map((l) => (
            <li key={l.id} className="rounded-md border border-transparent px-2 py-1.5 hover:border-border-subtle">
              <Switch
                checked={layers[l.id].visible}
                onCheckedChange={() => toggleLayer(l.id)}
                label={l.label}
              />
              <div className="mt-1 flex flex-wrap items-center gap-1 pl-6 text-[10px] text-ink-muted">
                {l.evidence.map((e) => (
                  <EvidenceBadge key={e} kind={e as EvidenceKind} />
                ))}
              </div>
              {layers[l.id].visible && (
                <div className="mt-1 pl-6">
                  <Slider
                    value={layers[l.id].opacity}
                    min={0} max={1} step={0.05}
                    onValueChange={(v) => setOpacity(l.id, v)}
                    label={`${l.label} opacity`}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>

        <Section title="ফিল্টার">
          <FilterChips
            label="বস্তুর ধরন"
            items={[
              'galaxy', 'cluster', 'supercluster', 'filament', 'void', 'cmb',
            ] as ObjectType[]}
            selected={filters.types}
            onToggle={toggleFilterType}
          />
          <FilterChips
            label="প্রমাণ"
            items={['observed', 'reconstructed', 'simulated', 'unknown'] as EvidenceKind[]}
            selected={filters.evidence}
            onToggle={toggleFilterEvidence}
          />
        </Section>
      </div>
      <footer className="border-t border-border-subtle px-3 py-2 text-[11px] text-ink-muted">
        আকাশগঙ্গা ও তার অভ্যন্তরীণ বস্তু এই workspace থেকে বাদ।
      </footer>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-subtle"
        aria-expanded={open}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {title}
      </button>
      {open && <div className="mt-1 pl-3">{children}</div>}
    </section>
  );
}

function FilterChips<T extends string>({
  label, items, selected, onToggle,
}: { label: string; items: T[]; selected: T[]; onToggle: (v: T) => void }) {
  return (
    <div className="mb-2">
      <div className="mb-1 text-[10px] text-ink-muted">{label}</div>
      <div className="flex flex-wrap gap-1">
        {items.map((it) => {
          const on = selected.includes(it);
          return (
            <button
              key={it}
              type="button"
              onClick={() => onToggle(it)}
              className={
                'rounded-sm border px-1.5 py-0.5 text-[10px] transition-colors ' +
                (on
                  ? 'border-accent/50 bg-accent/15 text-accent'
                  : 'border-border-subtle bg-base/40 text-ink-subtle hover:text-ink')
              }
            >
              {it}
            </button>
          );
        })}
      </div>
    </div>
  );
}
