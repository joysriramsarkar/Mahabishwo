import { useQuery } from '@tanstack/react-query';
import type { ApiClient, BoundingQuery, Snapshot } from '@/types/api';
import type { CosmicObject, SurveyDataset } from '@/types/cosmos';
import { MOCK_ALL_OBJECTS } from './mock';

/** Replace with a real client to hit an actual backend. */
export const api: ApiClient = {
  async searchObjects(q) {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return MOCK_ALL_OBJECTS.filter(
      (o) =>
        o.name.toLowerCase().includes(needle) ||
        o.aliases.some((a) => a.toLowerCase().includes(needle)) ||
        o.id.toLowerCase().includes(needle)
    ).slice(0, 40);
  },
  async objectsInVolume(query: BoundingQuery) {
    const [cx, cy, cz] = query.center;
    const r2 = query.radius * query.radius;
    return MOCK_ALL_OBJECTS.filter((o) => {
      const dx = o.positionMpc.x - cx;
      const dy = o.positionMpc.y - cy;
      const dz = o.positionMpc.z - cz;
      return dx * dx + dy * dy + dz * dz <= r2;
    });
  },
  async getObject(id) {
    const o = MOCK_ALL_OBJECTS.find((x) => x.id === id);
    if (!o) throw new Error(`Object not found: ${id}`);
    return o;
  },
  async getSnapshot(epochZ) {
    // Simple stub: same data regardless of epoch — replace with real backend.
    const snap: Snapshot = {
      id: `snap-${epochZ}`,
      epochZ,
      label: `z = ${epochZ.toFixed(3)}`,
      objects: MOCK_ALL_OBJECTS,
    };
    return snap;
  },
  async listDatasets(): Promise<SurveyDataset[]> {
    return [
      { id: 'sdss', label: 'SDSS DR18', coverage: 'region', objects: 1_000_000_000, release: 'DR18' },
      { id: '2mrs', label: '2MRS', coverage: 'full-sky', objects: 45_000, release: '2MRS' },
      { id: 'desi', label: 'DESI DR1', coverage: 'region', objects: 15_000_000, release: 'DR1' },
      { id: 'cosmicflows4', label: 'Cosmicflows-4', coverage: 'region', objects: 56_000, release: 'CF4' },
    ];
  },
};

export function useAllObjects() {
  return useQuery({
    queryKey: ['objects', 'all'],
    queryFn: () => api.objectsInVolume({ center: [0, 0, 0], radius: 5000 }),
    staleTime: Infinity,
  });
}

export function useObjectDetail(id: string | null) {
  return useQuery({
    queryKey: ['object', id],
    queryFn: () => (id ? api.getObject(id) : Promise.resolve(null as unknown as CosmicObject)),
    enabled: !!id,
  });
}

export function useSearchResults(q: string) {
  return useQuery({
    queryKey: ['search', q],
    queryFn: () => api.searchObjects(q),
    enabled: q.trim().length > 0,
    staleTime: 30_000,
  });
}

export function useDatasets() {
  return useQuery({ queryKey: ['datasets'], queryFn: () => api.listDatasets() });
}
