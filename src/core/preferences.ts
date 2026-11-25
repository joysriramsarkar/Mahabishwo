/**
 * Preferences & last-view persistence (localStorage).
 *
 * Only a small, validated snapshot of the app state is stored — never camera
 * matrices or live physics. Everything is sanitised on load so an old or
 * hand-edited value can never break the simulation.
 */
import { AppState, DensityLevel, LayerVisibility, QualityLevel } from './types';
import { clamp } from '../utils/math';

const STORAGE_KEY = 'mahabishwo.state.v1';

export interface StoredPanels {
  controls: boolean;
  info: boolean;
  timeline: boolean;
  minimap: boolean;
}

export interface StoredPreferences {
  rotationSpeed: number;
  bloom: number;
  quality: QualityLevel;
  density: DensityLevel;
  autoRotate: boolean;
  cosmicAge: number;
  layers: LayerVisibility;
  panels: StoredPanels;
}

export interface StoredView {
  preset: string;
  systemId: string;
  planetId: string;
  scale: number;
  godsEye: boolean;
}

export interface StoredState {
  preferences: StoredPreferences;
  view: StoredView;
  savedAt: number;
}

const QUALITY_LEVELS: readonly QualityLevel[] = ['low', 'medium', 'high'];
const DENSITY_LEVELS: readonly DensityLevel[] = ['low', 'medium', 'high'];

let lastSerialized = '';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Read the persisted snapshot. Returns null when absent or corrupted. */
export function loadStoredState(): StoredState | null {
  const raw = safeGetItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.preferences) || !isRecord(parsed.view)) {
      return null;
    }
    return parsed as unknown as StoredState;
  } catch {
    return null;
  }
}

/** Merge a validated subset of stored preferences into the live state. */
export function applyStoredPreferences(
  state: AppState,
  prefs: Partial<StoredPreferences> | null | undefined
): void {
  if (!prefs || !isRecord(prefs)) return;

  if (typeof prefs.rotationSpeed === 'number' && Number.isFinite(prefs.rotationSpeed)) {
    state.rotationSpeed = clamp(prefs.rotationSpeed, 0, 10000);
  }
  if (typeof prefs.bloom === 'number' && Number.isFinite(prefs.bloom)) {
    state.bloom = clamp(prefs.bloom, 0, 1.5);
  }
  if (typeof prefs.quality === 'string' && QUALITY_LEVELS.includes(prefs.quality as QualityLevel)) {
    state.quality = prefs.quality as QualityLevel;
  }
  if (typeof prefs.density === 'string' && DENSITY_LEVELS.includes(prefs.density as DensityLevel)) {
    state.density = prefs.density as DensityLevel;
  }
  if (typeof prefs.autoRotate === 'boolean') {
    state.autoRotate = prefs.autoRotate;
  }
  if (typeof prefs.cosmicAge === 'number' && Number.isFinite(prefs.cosmicAge)) {
    state.cosmicAge = clamp(prefs.cosmicAge, 0, 13.8);
  }

  if (isRecord(prefs.layers)) {
    const layers = prefs.layers as unknown as Record<string, unknown>;
    (Object.keys(state.layers) as Array<keyof LayerVisibility>).forEach((key) => {
      const value = layers[key];
      if (typeof value === 'boolean') state.layers[key] = value;
    });
  }

  if (isRecord(prefs.panels)) {
    const panels = prefs.panels as Record<string, unknown>;
    if (typeof panels.controls === 'boolean') state.showControls = panels.controls;
    if (typeof panels.info === 'boolean') state.showInfo = panels.info;
    if (typeof panels.timeline === 'boolean') state.showTimeline = panels.timeline;
    if (typeof panels.minimap === 'boolean') state.showMinimap = panels.minimap;
  }
}

/** Validate and return the last view, or null when it cannot be trusted. */
export function getStoredView(store: StoredState | null): StoredView | null {
  if (!store || !isRecord(store.view)) return null;
  const view = store.view;
  if (typeof view.preset !== 'string' || !view.preset) return null;
  if (typeof view.systemId !== 'string' || !view.systemId) return null;
  if (typeof view.planetId !== 'string' || !view.planetId) return null;
  if (typeof view.scale !== 'number' || !Number.isFinite(view.scale)) return null;
  return {
    preset: view.preset,
    systemId: view.systemId,
    planetId: view.planetId,
    scale: clamp(view.scale, 0, 6),
    godsEye: view.godsEye === true,
  };
}

function buildSnapshot(state: AppState): StoredState {
  return {
    preferences: {
      rotationSpeed: state.rotationSpeed,
      bloom: state.bloom,
      quality: state.quality,
      density: state.density,
      autoRotate: state.autoRotate,
      cosmicAge: state.cosmicAge,
      layers: { ...state.layers },
      panels: {
        controls: state.showControls,
        info: state.showInfo,
        timeline: state.showTimeline,
        minimap: state.showMinimap,
      },
    },
    view: {
      preset: state.activePreset,
      systemId: state.activeSystemId,
      planetId: state.activePlanetId,
      scale: state.currentScale,
      godsEye: state.godsEye,
    },
    savedAt: Date.now(),
  };
}

/** Persist the current snapshot. No-ops when nothing relevant changed. */
export function saveStoredState(state: AppState): void {
  const snapshot = buildSnapshot(state);
  const { savedAt: _savedAt, ...comparable } = snapshot;
  const serialized = JSON.stringify(comparable);
  if (serialized === lastSerialized) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    lastSerialized = serialized;
  } catch {
    // Storage can be unavailable in private mode or when the quota is full.
  }
}

/** Remove every persisted preference and view. */
export function clearStoredState(): void {
  lastSerialized = '';
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore — nothing else we can do.
  }
}
