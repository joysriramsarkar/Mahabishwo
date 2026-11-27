import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  CoordinateFrame, EvidenceKind, LayerId, ObjectType, ScopeKind,
} from '@/types/cosmos';
import { DEFAULT_LAYERS } from '@/data/layers';

/** 9 view modes, masterplan s15.2 (keyboard 1-9). */
export type ViewMode =
  | '3d'        // 1 Cosmic Web / Light-cone 3D (default)
  | 'sky'       // 2 Sky Atlas
  | 'wedge'     // 3 Light-cone Wedge (Pie)
  | 'slice'     // 4 Slice / Density Map
  | 'comoving'  // 5 Comoving Volume (outside view - banner mandatory)
  | 'timelab'   // 6 Time Lab / Epoch Timeline
  | 'compare'   // 7 Observation Comparison / Virtual Observatory
  | 'statistics'// 8 Statistics & Physics Inspector
  | 'modellab'; // 9 Model Lab & Ensemble Compare

export const VIEW_MODES: ViewMode[] = [
  '3d', 'sky', 'wedge', 'slice', 'comoving', 'timelab', 'compare', 'statistics', 'modellab',
];

export type CompareMode = 'off' | 'side' | 'swipe' | 'overlay' | 'difference';
export type H0SetName = 'Planck18' | 'SH0ES' | 'CCHP';

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

export interface ExplorerState {
  /* View */
  mode: ViewMode;
  frame: CoordinateFrame;
  scope: ScopeKind;
  h0Set: H0SetName;
  caveatCount: number;
  scaleMpc: number;
  camera: CameraState;

  /* Time */
  epochZ: number;
  timePlaying: boolean;
  timeSpeed: number;

  /* Layers */
  layers: Record<LayerId, { visible: boolean; opacity: number }>;

  /* Filters */
  filters: {
    types: ObjectType[];
    evidence: EvidenceKind[];
    maxRedshift?: number;
  };

  /* Selection */
  selectedId: string | null;
  hoveredId: string | null;
  pinnedIds: string[];

  /* Comparison */
  compare: { mode: CompareMode; snapshotA: string | null; snapshotB: string | null };

  /* Panels */
  panels: { layers: boolean; info: boolean };

  /* Actions */
  setMode: (m: ViewMode) => void;
  setFrame: (f: CoordinateFrame) => void;
  setScope: (s: ScopeKind) => void;
  setH0Set: (s: H0SetName) => void;
  setCaveatCount: (n: number) => void;
  setScale: (s: number) => void;
  setCamera: (c: CameraState) => void;
  setEpochZ: (z: number) => void;
  toggleTimePlaying: () => void;
  setTimeSpeed: (s: number) => void;
  toggleLayer: (id: LayerId) => void;
  setLayerOpacity: (id: LayerId, opacity: number) => void;
  toggleFilterType: (t: ObjectType) => void;
  toggleFilterEvidence: (e: EvidenceKind) => void;
  setMaxRedshift: (z?: number) => void;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  pin: (id: string) => void;
  unpin: (id: string) => void;
  setCompareMode: (m: CompareMode) => void;
  setCompareSnapshot: (side: 'A' | 'B', id: string | null) => void;
  togglePanel: (p: keyof ExplorerState['panels']) => void;
  resetView: () => void;
}

const HOME_CAMERA: CameraState = {
  position: [600, 320, 900],
  target: [0, 0, 0],
};

export const useExplorer = create<ExplorerState>()(
  persist(
    (set, get) => ({
      mode: '3d',
      frame: 'lightcone',
      scope: 'extragalactic',
      h0Set: 'Planck18',
      caveatCount: 0,
      scaleMpc: 2000,
      camera: HOME_CAMERA,

      epochZ: 0,
      timePlaying: false,
      timeSpeed: 1,

      layers: DEFAULT_LAYERS,

      filters: { types: [], evidence: [], maxRedshift: undefined },

      selectedId: null,
      hoveredId: null,
      pinnedIds: [],

      compare: { mode: 'off', snapshotA: null, snapshotB: null },

      panels: { layers: true, info: true },

      setMode: (mode) => set({ mode }),
      setFrame: (frame) => set({ frame }),
      setScope: (scope) => set({ scope }),
      setH0Set: (h0Set) => set({ h0Set }),
      setCaveatCount: (caveatCount) => set({ caveatCount }),
      setScale: (scaleMpc) => set({ scaleMpc }),
      setCamera: (camera) => set({ camera }),

      setEpochZ: (epochZ) => set({ epochZ }),
      toggleTimePlaying: () => set((s) => ({ timePlaying: !s.timePlaying })),
      setTimeSpeed: (timeSpeed) => set({ timeSpeed }),

      toggleLayer: (id) =>
        set((s) => ({
          layers: { ...s.layers, [id]: { ...s.layers[id], visible: !s.layers[id].visible } },
        })),
      setLayerOpacity: (id, opacity) =>
        set((s) => ({
          layers: { ...s.layers, [id]: { ...s.layers[id], opacity } },
        })),

      toggleFilterType: (t) =>
        set((s) => ({
          filters: {
            ...s.filters,
            types: s.filters.types.includes(t)
              ? s.filters.types.filter((x) => x !== t)
              : [...s.filters.types, t],
          },
        })),
      toggleFilterEvidence: (e) =>
        set((s) => ({
          filters: {
            ...s.filters,
            evidence: s.filters.evidence.includes(e)
              ? s.filters.evidence.filter((x) => x !== e)
              : [...s.filters.evidence, e],
          },
        })),
      setMaxRedshift: (z) =>
        set((s) => ({ filters: { ...s.filters, maxRedshift: z } })),

      select: (id) => set({ selectedId: id }),
      hover: (id) => set({ hoveredId: id }),
      pin: (id) =>
        set((s) => ({
          pinnedIds: s.pinnedIds.includes(id) ? s.pinnedIds : [...s.pinnedIds, id],
        })),
      unpin: (id) => set((s) => ({ pinnedIds: s.pinnedIds.filter((x) => x !== id) })),

      setCompareMode: (mode) =>
        set((s) => ({ compare: { ...s.compare, mode } })),
      setCompareSnapshot: (side, id) =>
        set((s) => ({
          compare: side === 'A'
            ? { ...s.compare, snapshotA: id }
            : { ...s.compare, snapshotB: id },
        })),

      togglePanel: (p) =>
        set((s) => ({ panels: { ...s.panels, [p]: !s.panels[p] } })),

      resetView: () => set({ camera: HOME_CAMERA, scaleMpc: 2000 }),
    }),
    {
      name: 'universe-explorer',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        mode: s.mode,
        frame: s.frame,
        scope: s.scope,
        h0Set: s.h0Set,
        layers: s.layers,
        filters: s.filters,
        panels: s.panels,
      }),
    }
  )
);
