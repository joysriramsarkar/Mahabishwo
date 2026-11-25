/**
 * Shareable deep links.
 *
 * Hash routes are intentionally human-readable and stable:
 *   #view/earth
 *   #system/trappist
 *   #planet/solar/earth
 *   #eye/solar/earth
 *   #supercluster/laniakea
 *   #member/laniakea/virgo
 *
 * The old `#earth` form is still accepted so previously shared links work.
 */
import { AppState, ScaleLevel } from './types';

export type DeepLinkKind = 'view' | 'system' | 'planet' | 'eye' | 'supercluster' | 'member';

export interface DeepLinkTarget {
  kind: DeepLinkKind;
  preset?: string;
  systemId?: string;
  planetId?: string;
  superclusterId?: string;
  memberId?: string;
}

const PRESET_BY_SCALE: Partial<Record<ScaleLevel, string>> = {
  [ScaleLevel.OBSERVABLE_UNIVERSE]: 'god-eye',
  [ScaleLevel.COSMIC_WEB]: 'cosmic-web',
  [ScaleLevel.GALAXY_CLUSTER]: 'local-group',
  [ScaleLevel.GALAXY]: 'milky-way',
  [ScaleLevel.STAR_SYSTEM]: 'solar',
};

function safeDecode(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

/** Parse a location hash into a navigation target. */
export function parseDeepLink(hash: string = window.location.hash): DeepLinkTarget | null {
  const raw = hash.replace(/^#\/?/, '').trim();
  if (!raw) return null;

  const parts = raw.split('/').map(safeDecode);
  switch (parts[0]) {
    case 'supercluster':
      if (parts[1]) return { kind: 'supercluster', superclusterId: parts[1] };
      break;
    case 'member':
      if (parts[1] && parts[2]) {
        return { kind: 'member', superclusterId: parts[1], memberId: parts[2] };
      }
      break;
    case 'planet':
      if (parts[1] && parts[2]) {
        return { kind: 'planet', systemId: parts[1], planetId: parts[2] };
      }
      break;
    case 'eye':
      if (parts[1] && parts[2]) {
        return { kind: 'eye', systemId: parts[1], planetId: parts[2] };
      }
      break;
    case 'system':
      if (parts[1]) return { kind: 'system', systemId: parts[1] };
      break;
    case 'view':
      if (parts[1]) return { kind: 'view', preset: parts[1] };
      break;
    default:
      // Legacy form: #earth, #solar, #milky-way
      return { kind: 'view', preset: parts[0] };
  }
  return null;
}

/** Build the canonical hash for the current view. */
export function buildDeepLink(state: AppState): string {
  const systemId = encodeURIComponent(state.activeSystemId || 'solar');
  const planetId = encodeURIComponent(state.activePlanetId || 'earth');

  if (state.activeSuperclusterId && state.currentScale <= ScaleLevel.COSMIC_WEB) {
    const superclusterId = encodeURIComponent(state.activeSuperclusterId);
    if (state.activeMemberClusterId) {
      return `#member/${superclusterId}/${encodeURIComponent(state.activeMemberClusterId)}`;
    }
    return `#supercluster/${superclusterId}`;
  }

  if (state.currentScale >= ScaleLevel.PLANET) {
    return state.godsEye ? `#eye/${systemId}/${planetId}` : `#planet/${systemId}/${planetId}`;
  }
  if (state.currentScale === ScaleLevel.STAR_SYSTEM) {
    return `#system/${systemId}`;
  }

  const preset = PRESET_BY_SCALE[state.currentScale] ?? state.activePreset ?? 'god-eye';
  return `#view/${encodeURIComponent(preset)}`;
}

/** Keep the address bar in sync without creating history entries. */
export function syncDeepLink(state: AppState): void {
  const hash = buildDeepLink(state);
  if (window.location.hash === hash) return;
  try {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
  } catch {
    // History can be restricted in sandboxed iframes — the app still works.
  }
}

/** Absolute, copy-pasteable URL for the current view. */
export function buildShareUrl(state: AppState): string {
  return `${window.location.origin}${window.location.pathname}${window.location.search}${buildDeepLink(state)}`;
}
