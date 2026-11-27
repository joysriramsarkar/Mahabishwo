import { useMemo, useState } from 'react';
import { useAllObjects } from '@/data/queries';
import { useExplorer } from '@/state/explorer';

/** Mode 3 - Light-cone Wedge (Pie): thin RA slice, distance vs angle, BAO ring. */
export function ViewportWedge() {
  const { data } = useAllObjects();
  const select = useExplorer((s) => s.select);
  const [rsd, setRsd] = useState(true);
  const objects = useMemo(() => {
    // central slice RA 150-210 deg (SDSS-like stripe), plot RA vs distance
    return (data ?? []).filter((o) => {
      const d = o.distanceMpc?.value
        ?? Math.hypot(o.positionMpc.x, o.positionMpc.y, o.positionMpc.z);
      return d < 600 && (o.ra === undefined || (o.ra >= 140 && o.ra <= 220));
    });
  }, [data]);

  const W = 900, H = 520, cx = 90, cy = H - 60;
  const scale = (W - 160) / 600;
  const xy = (o: (typeof objects)[number]) => {
    const d = o.distanceMpc?.value
      ?? Math.hypot(o.positionMpc.x, o.positionMpc.y, o.positionMpc.z);
    const ra = o.ra ?? 180;
    const ang = ((ra - 180) * Math.PI) / 180;
    // RSD toggle: redshift-space distortion toy offset along line of sight
    const dd = rsd && o.redshift ? d * (1 + 0.02 * Math.sin(ra)) : d;
    return { x: cx + Math.sin(ang) * dd * scale + dd * scale * 0.9, y: cy - Math.cos(ang) * dd * scale * 0.55, d };
  };

  return (
    <div className="absolute inset-0 overflow-auto bg-[#05070D] p-4" role="img" aria-label="Light-cone wedge plot">
      <div className="mb-2 flex items-center gap-3 text-[12px] text-ink-subtle">
        <span className="font-medium text-ink">Light-cone Wedge — RA 140°–220° স্লাইস</span>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={rsd} onChange={(e) => setRsd(e.target.checked)} />
          RSD (redshift-space distortion) টয়-অফসেট
        </label>
        <span>BAO রিং: r_d ≈ 147.09 Mpc (ড্যাশ বৃত্ত)</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[1100px]">
        {[50, 147.09, 300, 450, 600].map((r) => (
          <g key={r}>
            <circle cx={cx + r * scale * 0.9} cy={cy} r={r * scale * 0.7} fill="none"
              stroke={r === 147.09 ? '#F0B35A' : '#1E2942'}
              strokeDasharray={r === 147.09 ? '6 4' : undefined} />
            <text x={cx + r * scale * 0.9} y={cy - r * scale * 0.7 - 4} fill="#6B7894" fontSize="10">{r} Mpc</text>
          </g>
        ))}
        <text x={cx} y={cy + 18} fill="#A2AEC0" fontSize="11">পর্যবেক্ষক (আকাশগঙ্গা)</text>
        {objects.map((o) => {
          const p = xy(o);
          return (
            <circle key={o.id} cx={p.x} cy={p.y} r={o.type === 'galaxy' ? 1.6 : 4}
              fill={o.evidence === 'simulated' ? '#7DD3FC' : '#56D4E8'}
              opacity={0.8} onClick={() => select(o.id)} className="cursor-pointer">
              <title>{o.name} — {p.d.toFixed(1)} Mpc [{o.evidence}]</title>
            </circle>
          );
        })}
      </svg>
      <p className="text-[11px] text-ink-muted">নীল বিন্দু = পর্যবেক্ষিত/পুনর্গঠিত ল্যান্ডমার্ক; হালকা নীল = SIM ডেমো গ্যালাক্সি। বাস্তব জরিপে এই প্লটেই Finger-of-God ও BAO মাপা হয়।</p>
    </div>
  );
}
