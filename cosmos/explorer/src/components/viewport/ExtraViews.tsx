import { useMemo, useState } from 'react';
import { useAllObjects } from '@/data/queries';
import { useExplorer } from '@/state/explorer';
import { Viewport3D } from './Viewport3D';
import { TimeController } from '@/components/panels/TimeController';
import { CompareView } from '@/components/compare/CompareView';
import { massFunction, redshiftHistogram, correlationFunction, chiSquare, histogram } from '@/lib/statistics';
import { PARAM_SETS, comovingDistanceMpc, lookbackGyr } from '@/lib/cosmology';
import { distanceRangeForH0 } from '@/lib/cosmology';

/** Mode 5 - Comoving Volume: outside view, permanent unphysical-viewpoint banner. */
export function ComovingView() {
  return (
    <div className="absolute inset-0">
      <Viewport3D />
      <div role="alert" className="absolute inset-x-0 top-0 z-20 bg-[#F0B35A]/90 px-4 py-1.5 text-center text-[12px] font-medium text-black">
        অভৌত দৃষ্টিকোণ — এই "বাইরে থেকে দেখা" দৃশ্য কোনো ভৌত পর্যবেক্ষকের পক্ষে সম্ভব নয় (U10)
      </div>
    </div>
  );
}

/** Mode 6 - Time Lab: epoch scrub drives the Observed snapshot (z-cut). */
export function TimeLabView() {
  const epochZ = useExplorer((s) => s.epochZ);
  const { data } = useAllObjects();
  const p = PARAM_SETS.Planck18!;
  const visible = useMemo(
    () => (data ?? []).filter((o) => (o.redshift?.value ?? 0) <= Math.max(epochZ, 0.02)),
    [data, epochZ],
  );
  return (
    <div className="absolute inset-0 overflow-auto bg-[#05070D] p-5 text-sm">
      <h3 className="text-base font-semibold">Time Lab / Epoch Timeline</h3>
      <p className="mt-1 text-ink-subtle">
        Observed মোডে স্লাইডার = দূরত্ব-কাট (z &lt; z<sub>max</sub>); Comoving মোডে = মহাজাগতিক বয়স।
        বর্তমান কাট: z ≤ {epochZ.toFixed(3)} · χ ≤ {comovingDistanceMpc(epochZ, p).toFixed(0)} Mpc ·
        lookback {lookbackGyr(epochZ, p).toFixed(2)} Gyr · দৃশ্যমান বস্তু: {visible.length}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[['BBN', 1e-9], ['Recombination', 1090], ['Cosmic Dawn', 20], ['Reionization', 7.7], ['Cosmic Noon', 2], ['Λ-era', 0.3], ['Today', 0]].map(([label, z]) => (
          <div key={label as string} className="rounded-md border border-border-subtle bg-panel p-3">
            <div className="font-medium">{label}</div>
            <div className="text-ink-muted">z ≈ {z}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[12px] text-ink-muted">
        নিচের Timebar দিয়ে স্ক্রাব করুন — Viewport3D-তে epochZ অনুযায়ী বস্তু ছাঁটা হয় (getSnapshot)।
        Transient-এর জন্য আলাদা Observer-time (API /transients)।
      </p>
      <TimeController presentation="sheet" />
    </div>
  );
}

/** Mode 7 - Observation Comparison: real (OBS/REC) vs mock (SIM) distributions + chi2. */
export function CompareObsView() {
  const { data } = useAllObjects();
  const real = useMemo(() => (data ?? []).filter((o) => o.evidence === 'observed' || o.evidence === 'reconstructed'), [data]);
  const sim = useMemo(() => (data ?? []).filter((o) => o.evidence === 'simulated'), [data]);
  const distOf = (o: (typeof real)[number]) => o.distanceMpc?.value ?? Math.hypot(o.positionMpc.x, o.positionMpc.y, o.positionMpc.z);
  const hReal = useMemo(() => histogram(real.map(distOf), 8), [real]);
  const hSim = useMemo(() => histogram(sim.slice(0, 400).map(distOf), 8), [sim]);
  const chi2 = chiSquare(hReal, hSim);
  return (
    <div className="absolute inset-0 overflow-auto bg-[#05070D] p-5 text-sm">
      <CompareView />
      <h3 className="mt-8 text-base font-semibold">Observation Comparison / Virtual Observatory</h3>
      <p className="text-ink-subtle">
        বাস্তব (OBS/REC ল্যান্ডমার্ক, {real.length}টি) বনাম মক (SIM ডেমো, নমুনা 400) — দূরত্ব-বণ্টনের residual χ² ={' '}
        <span className="font-mono">{chi2.toFixed(1)}</span>। ডেমো ডেটা বাস্তব জরিপের সঙ্গে মিলবে এমন দাবি করা হচ্ছে না;
        পদ্ধতিটি (split তুলনা + χ²) উৎপাদন mock-observation পাইপলাইনের (FSPS/SKIRT) কাঠামো।
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Hist title="OBS/REC দূরত্ব-হিস্টোগ্রাম" bins={hReal} color="#56D4E8" />
        <Hist title="SIM দূরত্ব-হিস্টোগ্রাম" bins={hSim} color="#7DD3FC" />
      </div>
    </div>
  );
}

function Hist({ title, bins, color }: { title: string; bins: { lo: number; hi: number; count: number }[]; color: string }) {
  const max = Math.max(...bins.map((b) => b.count), 1);
  return (
    <div className="rounded-md border border-border-subtle bg-panel p-3">
      <div className="mb-2 font-medium">{title}</div>
      <svg viewBox="0 0 320 140" className="w-full">
        {bins.map((b, i) => (
          <g key={i}>
            <rect x={10 + i * 38} y={120 - (b.count / max) * 100} width={30} height={(b.count / max) * 100} fill={color} opacity={0.8} />
            <text x={10 + i * 38} y={134} fill="#6B7894" fontSize="8">{b.lo.toFixed(0)}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Mode 8 - Statistics & Physics Inspector. */
export function StatisticsView() {
  const { data } = useAllObjects();
  const objects = data ?? [];
  const mf = useMemo(() => massFunction(objects), [objects]);
  const zh = useMemo(() => redshiftHistogram(objects), [objects]);
  const xi = useMemo(() => correlationFunction(objects), [objects]);
  return (
    <div className="absolute inset-0 overflow-auto bg-[#05070D] p-5 text-sm">
      <h3 className="text-base font-semibold">Statistics &amp; Physics Inspector</h3>
      <p className="text-ink-subtle">
        লোডকৃত বস্তু: {objects.length} (SIM ডেমো থাকলে পরিসংখ্যানও ডেমো-মানের — evidence লেবেল দেখুন)।
        P(k)-এর উৎপাদন সংস্করণ API/engine থেকে আসবে; এখানে ξ(r), ভর-ফাংশন ও z-বণ্টন সরাসরি গণনা করা।
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Hist title="ভর-ফাংশন (log₁₀ M☉ বিন)" bins={mf} color="#A78BFA" />
        <Hist title="Redshift বণ্টন" bins={zh} color="#56D4E8" />
        <div className="rounded-md border border-border-subtle bg-panel p-3">
          <div className="mb-2 font-medium">ξ(r) দুই-বিন্দু correlation (DD/RR−1)</div>
          <ul className="space-y-1 font-mono text-[12px]">
            {xi.map((p) => (
              <li key={p.rMid}>r ≈ {p.rMid.toFixed(0)} Mpc → ξ = {p.xi.toFixed(2)}</li>
            ))}
            {!xi.length && <li>অজানা / পরিমাপ নেই (পর্যাপ্ত বস্তু লোড হয়নি)</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Mode 9 - Model Lab: ParameterSet / H0 ensemble compare. */
export function ModelLabView() {
  const h0Set = useExplorer((s) => s.h0Set);
  const setH0Set = useExplorer((s) => s.setH0Set);
  const [customH0, setCustomH0] = useState(67.66);
  const [tileLevel, setTileLevel] = useState(2);
  const [tileId, setTileId] = useState(7);
  const tileStatus = useExplorer((s) => s.tileStatus);
  const tileError = useExplorer((s) => s.tileError);
  const tileObjects = useExplorer((s) => s.tileObjects);
  const setTileObjects = useExplorer((s) => s.setTileObjects);
  const setTileStatus = useExplorer((s) => s.setTileStatus);
  const loadTile = async () => {
    setTileStatus('loading');
    try {
      const { fetchLightconeTile } = await import('@/data/lightconeTiles');
      const objects = await fetchLightconeTile({ level: tileLevel, tileId });
      setTileObjects(objects);
    } catch (error) {
      setTileStatus('error', error instanceof Error ? error.message : String(error));
    }
  };
  const targets = [
    { name: 'Virgo Cluster', refMpc: 16.5 },
    { name: 'Coma', refMpc: 99.5 },
    { name: 'z = 1 galaxy (χ)', z: 1 },
    { name: 'z = 6 galaxy (χ)', z: 6 },
  ];
  return (
    <div className="absolute inset-0 overflow-auto bg-[#05070D] p-5 text-sm">
      <h3 className="text-base font-semibold">Model Lab &amp; Ensemble Compare</h3>
      <p className="text-ink-subtle">Hubble tension (U15): একই কোড, ভিন্ন ParameterSet — দুটি ensemble-ই বাধ্যতামূলক।</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(PARAM_SETS) as (keyof typeof PARAM_SETS)[]).map((k) => (
          <button key={k} type="button" onClick={() => setH0Set(k as typeof h0Set)}
            className={`rounded-sm border px-2 py-1 ${h0Set === k ? 'border-accent/50 bg-accent/15 text-accent' : 'border-border-subtle'}`}>
            {PARAM_SETS[k]!.label} (H₀={PARAM_SETS[k]!.H0})
          </button>
        ))}
        <label className="flex items-center gap-2">
          কাস্টম H₀: {customH0.toFixed(1)}
          <input type="range" min={60} max={80} step={0.1} value={customH0}
            onChange={(e) => setCustomH0(Number(e.target.value))} aria-label="Custom H0" />
        </label>
      </div>
      <table className="mt-4 w-full max-w-3xl text-left text-[13px]">
        <thead><tr className="text-ink-muted"><th className="py-1">বস্তু</th><th>Planck18</th><th>SH0ES</th><th>কাস্টম</th><th>পার্থক্য</th></tr></thead>
        <tbody>
          {targets.map((t) => {
            const val = (p: (typeof PARAM_SETS)['Planck18']) =>
              t.z !== undefined ? comovingDistanceMpc(t.z, p!) : (t.refMpc! * 67.66) / p!.H0;
            const a = val(PARAM_SETS.Planck18!), b = val(PARAM_SETS.SH0ES!);
            const c = val({ ...PARAM_SETS.Planck18!, H0: customH0 });
            return (
              <tr key={t.name} className="border-t border-border-subtle">
                <td className="py-1.5">{t.name}</td>
                <td className="font-mono">{a.toFixed(1)} Mpc</td>
                <td className="font-mono">{b.toFixed(1)} Mpc</td>
                <td className="font-mono">{c.toFixed(1)} Mpc</td>
                <td className="font-mono">{(((b - a) / a) * 100).toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-[12px] text-ink-muted">
        দূরত্বের H₀-রেঞ্জ (Virgo উদাহরণ): {distanceRangeForH0(16.5).low.toFixed(1)}–{distanceRangeForH0(16.5).high.toFixed(1)} Mpc (±৭% caveat-এর ভিত্তি)।
        বিকল্প cosmology (WDM, w₀wₐ, modified gravity) পর্যায় ১০-এর কাজ — এখানে শুধু H₀/w নব।
      </p>
      <section className="mt-5 rounded-md border border-border-subtle bg-panel p-3">
        <h4 className="font-medium">Arrow IPC Light-cone Tile (বাস্তব API path)</h4>
        <p className="mt-1 text-[12px] text-ink-subtle">
          FastAPI <span className="font-mono">/v1/lightcone/tiles/&lt;level&gt;/&lt;tile_id&gt;</span> থেকে Arrow stream লোড করুন।
          টাইল ডেটা SIM — OBS নয়। API চালু না থাকলে error দেখাবে, mock data দিয়ে pass দেখাবে না।
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1">level
            <input type="number" min={0} max={12} value={tileLevel} onChange={(e) => setTileLevel(Number(e.target.value))}
              className="w-20 rounded border border-border-subtle bg-base px-2 py-2" />
          </label>
          <label className="flex items-center gap-1">tile
            <input type="number" min={0} value={tileId} onChange={(e) => setTileId(Number(e.target.value))}
              className="w-24 rounded border border-border-subtle bg-base px-2 py-2" />
          </label>
          <button type="button" onClick={loadTile} disabled={tileStatus === 'loading'}
            className="min-h-11 rounded border border-accent/50 px-3 text-accent disabled:opacity-40">
            {tileStatus === 'loading' ? 'লোড হচ্ছে…' : 'Arrow tile লোড'}
          </button>
          <span className="text-[12px] text-ink-muted">লোডকৃত SIM বস্তু: {tileObjects.length}{tileStatus === 'loaded' ? ' · Arrow IPC' : ''}</span>
        </div>
        {tileError && <p role="alert" className="mt-2 text-[12px] text-[#FF7373]">{tileError}</p>}
      </section>
    </div>
  );
}

/** Local Scope (Dual-Scope s15.1 rule 7): full MW + L0 handoff. */
export function LocalScopeView() {
  const [showL0, setShowL0] = useState(false);
  const { data } = useAllObjects();
  const local = useMemo(() => {
    return (data ?? []).filter((o) => {
      const d = o.distanceMpc?.value ?? Math.hypot(o.positionMpc.x, o.positionMpc.y, o.positionMpc.z);
      return d <= 1.5 || o.id.includes('milky') || o.id.includes('lmc') || o.id.includes('smc');
    });
  }, [data]);
  const select = useExplorer((s) => s.select);
  return (
    <div className="absolute inset-0 overflow-auto bg-[#05070D] p-5 text-sm">
      <h3 className="text-base font-semibold">Local Universe Scope — পূর্ণ আকাশগঙ্গা + Local Group</h3>
      <p className="text-ink-subtle">
        Extragalactic scope-এ আকাশগঙ্গা শুধু observer marker ("আকাশগঙ্গা: বাদ" ব্যাজ); এখানে পূর্ণ MW (L3) ও
        সৌরজগৎ (L0) মডিউল সক্রিয়। 1 Mpc-এর ভেতরে জুমে L0-তে মসৃণ handoff:
      </p>
      <div className="mt-3 rounded-md border border-accent/40 bg-accent/10 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-medium">L0 সৌরজগৎ মডিউল (রুট অ্যাপ)</div>
          <button type="button" onClick={() => setShowL0((v) => !v)}
            className="min-h-11 rounded-sm border border-accent/50 px-3 text-[12px] text-accent">
            {showL0 ? 'L0 বন্ধ করুন' : 'L0 এখানেই খুলুন'}
          </button>
        </div>
        <p className="mt-1 text-ink-subtle">
          Keplerian সৌরজগৎ (৮ গ্রহ, ১৫ চাঁদ, বলয়, বাসযোগ্য অঞ্চল)। URL পরিবর্তন: <span className="font-mono">VITE_LOCAL_APP_URL</span>।
          মডিউল: <span className="font-mono">src/universe/layers/StarSystemLayer.ts + PlanetLayer.ts</span>।
        </p>
        {showL0 && (
          <div className="mt-3 overflow-hidden rounded-md border border-border-subtle">
            <iframe
              title="COSMOS L0 Solar System"
              src={(import.meta as unknown as { env?: Record<string, string> }).env?.VITE_LOCAL_APP_URL ?? 'http://localhost:3000'}
              className="h-[60dvh] w-full bg-base"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <p className="px-3 py-2 text-[11px] text-ink-muted">
              L0 আলাদা origin-এ চলছে। না খুললে রিপো-রুটে <span className="font-mono">npm run dev</span> চালান।
            </p>
          </div>
        )}
      </div>
      <h4 className="mt-4 font-medium">স্থানীয় বস্তু ({local.length})</h4>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {local.map((o) => (
          <li key={o.id}>
            <button type="button" onClick={() => select(o.id)}
              className="w-full rounded-md border border-border-subtle bg-panel p-3 text-left hover:border-accent/50">
              <div className="font-medium">{o.name}</div>
              <div className="text-[11px] text-ink-muted">
                {o.type} · {o.evidence} · {o.distanceMpc ? `${o.distanceMpc.value.toFixed(3)} Mpc` : 'দূরত্ব: অজানা / পরিমাপ নেই'}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
