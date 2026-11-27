import { useExplorer } from '@/state/explorer';
import { useAllObjects } from '@/data/queries';

export function ViewportSlice() {
  const { data } = useAllObjects();
  const objects = data ?? [];
  const size = 900;
  const range = 500;
  const scale = size / (2 * range);

  return (
    <div className="absolute inset-0 grid place-items-center bg-[#020409]">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full max-h-full w-full max-w-full">
        <rect width={size} height={size} fill="#020409" />
        {objects
          .filter((o) => Math.abs(o.positionMpc.z) < 5)
          .map((o) => {
            const x = size / 2 + o.positionMpc.x * scale;
            const y = size / 2 - o.positionMpc.y * scale;
            if (x < 0 || x > size || y < 0 || y > size) return null;
            return <circle key={o.id} cx={x} cy={y} r={1.5} fill="#8FB8FF" />;
          })}
      </svg>
    </div>
  );
}
