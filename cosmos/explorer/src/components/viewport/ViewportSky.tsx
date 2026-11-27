import { useExplorer } from '@/state/explorer';
import { useAllObjects } from '@/data/queries';

/** Simple equirectangular all-sky view. Convert to Mollweide later. */
export function ViewportSky() {
  const { data } = useAllObjects();
  const objects = data ?? [];
  const size = 900;

  return (
    <div className="absolute inset-0 grid place-items-center bg-[#020409]">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full max-h-full w-full max-w-full">
        <rect width={size} height={size} fill="#020409" />
        {Array.from({ length: 13 }).map((_, i) => {
          const ra = (i / 12) * 360;
          const x = (ra / 360) * size;
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={0} y2={size} stroke="#1E2942" strokeWidth={1} />
              <text x={x + 4} y={14} fill="#6B7894" fontSize="10">{ra.toFixed(0)}°</text>
            </g>
          );
        })}
        {Array.from({ length: 7 }).map((_, i) => {
          const dec = -90 + (i / 6) * 180;
          const y = size / 2 - (dec / 90) * (size / 2);
          return (
            <g key={i}>
              <line x1={0} x2={size} y1={y} y2={y} stroke="#1E2942" strokeWidth={1} />
              <text x={4} y={y - 4} fill="#6B7894" fontSize="10">{dec.toFixed(0)}°</text>
            </g>
          );
        })}
        {objects.map((o) => {
          if (o.ra === undefined || o.dec === undefined) {
            // Approximate RA/Dec from position — just for demo purposes.
            const r = Math.hypot(o.positionMpc.x, o.positionMpc.y, o.positionMpc.z);
            if (r === 0) return null;
            const ra = (Math.atan2(o.positionMpc.y, o.positionMpc.x) * 180 / Math.PI + 360) % 360;
            const dec = Math.asin(o.positionMpc.z / r) * 180 / Math.PI;
            return <circle key={o.id} cx={(ra / 360) * size} cy={size / 2 - (dec / 90) * (size / 2)} r={1.5} fill="#8FB8FF" />;
          }
          return (
            <circle
              key={o.id}
              cx={(o.ra / 360) * size}
              cy={size / 2 - (o.dec / 90) * (size / 2)}
              r={2}
              fill={o.evidence === 'observed' ? '#56D4E8' : '#A78BFA'}
            />
          );
        })}
      </svg>
    </div>
  );
}
