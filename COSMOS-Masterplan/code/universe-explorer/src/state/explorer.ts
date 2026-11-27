import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  CoordinateFrame, EvidenceKind, LayerId, ObjectType,
} from '@/types/cosmos';
import { DEFAULT_LAYERS } from '@/data/layers';

export type ViewMode = '3d' | 'sky' | 'slice';
export type CompareMode = 'off' | 'side' | 'swipe' | 'overlay' | 'difference';

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

export interface ExplorerState {
  /* View */
  mode: ViewMode;
  frame: CoordinateFrame;
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
      frame: 'comoving',
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
        frame: s.frame,
        layers: s.layers,
        filters: s.filters,
        panels: s.panels,
      }),
    }
  )
);
