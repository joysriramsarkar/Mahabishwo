import { useExplorer } from '@/state/explorer';

export function CompareView() {
  const mode = useExplorer((s) => s.compare.mode);
  const setMode = useExplorer((s) => s.setCompareMode);

  return (
    <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 border-b border-border-subtle bg-panel/80 px-4 py-2 text-[11px] backdrop-blur">
      <span className="text-ink-muted">তুলনা মোড:</span>
      {(['off', 'side', 'swipe', 'overlay', 'difference'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          className={
            'rounded-sm border px-2 py-0.5 ' +
            (mode === m
              ? 'border-accent/50 bg-accent/15 text-accent'
              : 'border-border-subtle text-ink-subtle hover:text-ink')
          }
        >
          {m === 'off' ? 'বন্ধ' : m}
        </button>
      ))}
    </div>
  );
}
