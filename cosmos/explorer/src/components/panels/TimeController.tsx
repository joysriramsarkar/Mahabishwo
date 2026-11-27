import { useEffect, useRef } from 'react';
import { useExplorer } from '@/state/explorer';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Play, Pause, RotateCcw } from 'lucide-react';

const MILESTONES = [
  { z: 1100, label: 'CMB / পুনর্মিলন' },
  { z: 20, label: 'Dark Ages' },
  { z: 6, label: 'Reionization' },
  { z: 1, label: 'কাঠামো-গঠন' },
  { z: 0, label: 'আজ' },
];

export function TimeController({ presentation = 'bar' }: { presentation?: 'bar' | 'sheet' }) {
  const reducedMotion = useReducedMotion();
  const epochZ = useExplorer((s) => s.epochZ);
  const setEpochZ = useExplorer((s) => s.setEpochZ);
  const playing = useExplorer((s) => s.timePlaying);
  const toggle = useExplorer((s) => s.toggleTimePlaying);
  const speed = useExplorer((s) => s.timeSpeed);
  const setSpeed = useExplorer((s) => s.setTimeSpeed);
  const frame = useRef<number>(0);
  const last = useRef<number>(performance.now());

  useEffect(() => {
    if (reducedMotion && playing) { toggle(); return; }
    if (!playing || reducedMotion) return;
    const tick = (t: number) => {
      const dt = (t - last.current) / 1000;
      last.current = t;
      const nextZ = Math.max(0, epochZ - dt * speed * 0.05);
      setEpochZ(nextZ);
      if (nextZ <= 0) { toggle(); return; }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [playing, reducedMotion, speed, epochZ, setEpochZ, toggle]);

  // Convert z to a 0..1 timeline position (log scale for large z).
  const position = 1 - Math.log10(1 + epochZ) / Math.log10(1 + 1200);

  return (
    <div
      className={presentation === 'sheet'
        ? 'relative border-t border-border-subtle bg-panel px-4 py-3'
        : 'absolute bottom-0 left-0 right-0 border-t border-border-subtle bg-panel/90 px-4 py-2 backdrop-blur'}
      style={presentation === 'sheet' ? undefined : { height: 'var(--timebar-h)' }}
      role="region"
      aria-label="সময় নিয়ন্ত্রণ"
    >
      <div className="mb-1 flex items-center gap-3 text-[11px] text-ink-muted">
        <button
          type="button"
          onClick={toggle}
          disabled={reducedMotion}
          className="grid h-11 w-11 place-items-center rounded-md border border-border-subtle bg-base/60 text-ink hover:border-accent/50 hover:text-accent disabled:opacity-40"
          aria-label={playing ? 'বিরতি' : reducedMotion ? 'reduced-motion-এ প্লে নিষ্ক্রিয়; স্লাইডার ব্যবহার করুন' : 'চালাও'}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          type="button"
          onClick={() => { setEpochZ(0); }}
          className="grid h-7 w-7 place-items-center rounded-md border border-border-subtle bg-base/60 text-ink hover:border-accent/50 hover:text-accent"
          aria-label="আজে ফিরুন"
        >
          <RotateCcw size={14} />
        </button>
        <span className="font-mono tabular-nums">z = {epochZ.toFixed(3)}</span>
        <label className="ml-4 flex items-center gap-1">
          গতি
          <input
            type="range" min={0.1} max={5} step={0.1}
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-24 accent-[color:var(--accent-primary)]"
            aria-label="সময়ের গতি"
          />
        </label>
      </div>

      <div className="relative h-8">
        <div className="absolute left-0 right-0 top-3 h-0.5 bg-border-subtle" />
        <div
          className="absolute top-3 h-0.5 bg-accent"
          style={{ width: `${position * 100}%` }}
        />
        {MILESTONES.map((m) => {
          const p = 1 - Math.log10(1 + m.z) / Math.log10(1 + 1200);
          return (
            <div
              key={m.label}
              className="absolute top-0 -translate-x-1/2 text-center text-[9px] text-ink-muted"
              style={{ left: `${p * 100}%` }}
            >
              <div className="mx-auto h-2 w-0.5 bg-border-strong" />
              <div className="mt-0.5 whitespace-nowrap">{m.label}</div>
            </div>
          );
        })}
        <input
          type="range" min={0} max={1200} step={0.1}
          value={epochZ}
          onChange={(e) => setEpochZ(parseFloat(e.target.value))}
          className="absolute inset-x-0 top-1 h-6 w-full cursor-pointer opacity-0"
          aria-label="redshift (z)"
        />
      </div>
    </div>
  );
}
