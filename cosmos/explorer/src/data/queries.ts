import { useQuery } from '@tanstack/react-query';
import type { ApiClient, BoundingQuery, Snapshot } from '@/types/api';
import type { CosmicObject, EvidenceKind, SurveyDataset } from '@/types/cosmos';
import { MOCK_ALL_OBJECTS, LANDMARK_OBJECTS } from './mock';
import { comovingDistanceMpc, PARAM_SETS } from '@/lib/cosmology';

/**
 * Real API client (masterplan s9.6). Tries the COSMOS FastAPI service first
 * (VITE_COSMOS_API, default http://localhost:8000). Backend objects are
 * OBS/REC seed-catalogue entries; the demo SIM galaxies are merged in with
 * their evidence kept as 'simulated' - never silently upgraded to observed.
 * If the API is unreachable the UI still works on landmarks + SIM demo data.
 */
const API_BASE: string =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_COSMOS_API
  ?? 'http://localhost:8000';

const EVIDENCE_MAP: Record<string, EvidenceKind> = {
  OBS: 'observed', REC: 'reconstructed', SIM: 'simulated', MOCK: 'mock', UNC: 'unknown',
};

interface BackendObject {
  id: string; name: string; type: string; evidence: string; confidence: string;
  boundary_kind: string; ra_deg: number | null; dec_deg: number | null;
  distance_mpc: number | null; distance_sigma_mpc: number | null;
}

function backendToCosmic(b: BackendObject): CosmicObject | null {
  if (b.ra_deg === null || b.dec_deg === null || b.distance_mpc === null) return null;
  const ra = (b.ra_deg * Math.PI) / 180;
  const dec = (b.dec_deg * Math.PI) / 180;
  const d = b.distance_mpc;
  const type = (['galaxy', 'group', 'cluster', 'supercluster', 'void'].includes(b.type)
    ? b.type : 'galaxy') as CosmicObject['type'];
  return {
    id: `api-${b.id}`,
    name: b.name,
    aliases: [b.id],
    type,
    evidence: EVIDENCE_MAP[b.evidence] ?? 'unknown',
    boundaryKind: (b.boundary_kind === 'flow-defined' ? 'flow-defined'
      : b.boundary_kind === 'physical' ? 'physical' : 'model-dependent'),
    positionMpc: {
      x: d * Math.cos(dec) * Math.cos(ra),
      y: d * Math.cos(dec) * Math.sin(ra),
      z: d * Math.sin(dec),
    },
    ra: b.ra_deg, dec: b.dec_deg,
    distanceMpc: {
      value: d, unit: 'Mpc',
      low: b.distance_sigma_mpc ? d - b.distance_sigma_mpc : undefined,
      high: b.distance_sigma_mpc ? d + b.distance_sigma_mpc : undefined,
      method: 'COSMOS API seed catalogue',
    },
    sources: [{ dataset: 'COSMOS API /v1/objects', release: 'seed 2026-11-27', accessedAt: new Date().toISOString() }],
  };
}

async function fetchBackendObjects(): Promise<CosmicObject[] | null> {
  const configuredApi = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_COSMOS_API;
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && !configuredApi) {
    return null; // Skip localhost API probe on static HTTPS hosting unless VITE_COSMOS_API is configured
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${API_BASE}/v1/objects`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const body = (await res.json()) as { objects: BackendObject[] };
    const mapped = body.objects
      .map(backendToCosmic)
      .filter((o): o is CosmicObject => o !== null);
    return mapped.length ? mapped : null;
  } catch {
    return null; // offline fallback - evidence labels preserved either way
  }
}

let mergedCache: Promise<CosmicObject[]> | null = null;
export function loadAllObjects(): Promise<CosmicObject[]> {
  if (!mergedCache) {
    mergedCache = (async () => {
      const backend = await fetchBackendObjects();
      const simGalaxies = MOCK_ALL_OBJECTS.filter((o) => o.evidence === 'simulated');
      if (!backend) return MOCK_ALL_OBJECTS;
      // Backend landmarks (OBS/REC) replace same-named demo landmarks.
      const backendNames = new Set(backend.map((o) => o.aliases[0]));
      const landmarks = LANDMARK_OBJECTS.filter(
        (o) => !backend.some((b) => o.name.includes(b.name.split(' ')[0] ?? '___')),
      );
      void backendNames;
      return [...backend, ...landmarks, ...simGalaxies];
    })();
  }
  return mergedCache;
}

export const api: ApiClient = {
  async searchObjects(q) {
    const all = await loadAllObjects();
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return all.filter(
      (o) =>
        o.name.toLowerCase().includes(needle) ||
        o.aliases.some((a) => a.toLowerCase().includes(needle)) ||
        o.id.toLowerCase().includes(needle),
    ).slice(0, 40);
  },
  async objectsInVolume(query: BoundingQuery) {
    const all = await loadAllObjects();
    const [cx, cy, cz] = query.center;
    const r2 = query.radius * query.radius;
    return all.filter((o) => {
      const dx = o.positionMpc.x - cx;
      const dy = o.positionMpc.y - cy;
      const dz = o.positionMpc.z - cz;
      return dx * dx + dy * dy + dz * dz <= r2;
    });
  },
  async getObject(id) {
    const all = await loadAllObjects();
    const o = all.find((x) => x.id === id);
    if (!o) throw new Error(`Object not found: ${id}`);
    return o;
  },
  async getSnapshot(epochZ) {
    // Observed-frame snapshot: only objects inside the light-cone shell
    // z <= epochZ (by simulated/measured redshift) are shown (s15.2 mode 6).
    const all = await loadAllObjects();
    const chiMax = comovingDistanceMpc(epochZ, PARAM_SETS.Planck18!);
    const snap: Snapshot = {
      id: `snap-${epochZ}`,
      epochZ,
      label: `z ≤ ${epochZ.toFixed(3)} (χ ≤ ${chiMax.toFixed(0)} Mpc)`,
      objects: all.filter((o) => (o.redshift?.value ?? 0) <= epochZ),
    };
    return snap;
  },
  async listDatasets(): Promise<SurveyDataset[]> {
    try {
      const res = await fetch(`${API_BASE}/v1/catalogue/releases`);
      if (res.ok) {
        const body = (await res.json()) as {
          releases: { catalogue: string; status: string; expected: string }[];
        };
        return body.releases.map((r, i) => ({
          id: `rel-${i}`, label: r.catalogue,
          coverage: 'partial', objects: 0, release: `${r.expected} · ${r.status}`,
        }));
      }
    } catch { /* fall through to static list */ }
    return [
      { id: 'sdss', label: 'SDSS DR18', coverage: 'region', objects: 1_000_000_000, release: 'DR18' },
      { id: '2mrs', label: '2MRS', coverage: 'full-sky', objects: 45_000, release: '2MRS' },
      { id: 'desi', label: 'DESI DR1', coverage: 'region', objects: 15_000_000, release: 'DR1' },
      { id: 'cosmicflows4', label: 'Cosmicflows-4', coverage: 'region', objects: 55_877, release: 'CF4' },
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
