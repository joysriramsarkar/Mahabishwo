/** Real Arrow IPC light-cone tile client (masterplan s9.5/s9.6). */
import { RecordBatchStreamReader } from 'apache-arrow';
import type { CosmicObject } from '@/types/cosmos';
import { comovingDistanceMpc, PARAM_SETS } from '@/lib/cosmology';

const API_BASE: string =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_COSMOS_API
  ?? 'http://localhost:8000';

export interface TileQuery { level: number; tileId: number }

export async function fetchLightconeTile({ level, tileId }: TileQuery): Promise<CosmicObject[]> {
  const res = await fetch(`${API_BASE}/v1/lightcone/tiles/${level}/${tileId}`);
  if (!res.ok) throw new Error(`tile ${level}/${tileId}: HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const reader = RecordBatchStreamReader.from(bytes);
  const batches = reader.readAll();
  const p = PARAM_SETS.Planck18!;
  const objects: CosmicObject[] = [];
  let index = 0;
  for (const batch of batches) {
    const ra = batch.getChild('ra')!.toArray();
    const dec = batch.getChild('dec')!.toArray();
    const z = batch.getChild('z_cos')!.toArray();
    const chiColumn = batch.getChild('chi');
    const chiValues = chiColumn?.toArray();
    const logM = batch.getChild('log_mstar')!.toArray();
    for (let i = 0; i < batch.numRows; i++, index++) {
      const zz = Number(z[i]);
      const chi = chiValues ? Number(chiValues[i]) : comovingDistanceMpc(zz, p);
      const r = (Number(ra[i]) * Math.PI) / 180;
      const d = (Number(dec[i]) * Math.PI) / 180;
      objects.push({
        id: `tile-${level}-${tileId}-${index}`,
        name: `SIM টাইল গ্যালাক্সি ${level}/${tileId}/${index}`,
        aliases: [], type: 'galaxy', evidence: 'simulated', boundaryKind: 'physical',
        positionMpc: {
          x: chi * Math.cos(d) * Math.cos(r),
          y: chi * Math.cos(d) * Math.sin(r),
          z: chi * Math.sin(d),
        },
        ra: Number(ra[i]), dec: Number(dec[i]),
        redshift: { value: zz, unit: 'z', method: 'SIM tile catalogue' },
        distanceMpc: { value: chi, unit: 'Mpc', method: 'Planck18 comoving conversion' },
        massMsun: { value: 10 ** Number(logM[i]), unit: 'Msun', method: 'SIM tile catalogue' },
        sources: [{ dataset: 'COSMOS Arrow IPC tile', release: `${level}/${tileId}`,
                    accessedAt: new Date().toISOString() }],
      });
    }
  }
  return objects;
}
