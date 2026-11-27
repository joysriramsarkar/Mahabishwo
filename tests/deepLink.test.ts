import { describe, it, expect } from 'vitest';
import { buildDeepLink, parseDeepLink } from '../src/core/deepLink';
import { AppState, ScaleLevel } from '../src/core/types';

function makeBaseState(overrides: Partial<AppState> = {}): AppState {
  return {
    currentScale: ScaleLevel.OBSERVABLE_UNIVERSE,
    zoomLevel: 0,
    cameraMinRadius: 2.0,
    activeObjectId: null,
    activeSystemId: 'solar',
    activePlanetId: 'earth',
    activeGalaxyId: 'milkyway',
    activeClusterId: 'local_group',
    activePreset: 'god-eye',
    collisionMode: false,
    collisionPreset: 'prograde',
    collisionPhysicsMode: 'neural',
    collisionMassRatio: 1.38,
    activeSuperclusterId: null,
    activeMemberClusterId: null,
    godsEye: false,
    isPlaying: true,
    rotationSpeed: 1,
    elapsedTime: 0,
    elapsedSimDays: 0,
    cosmicAge: 13.8,
    density: 'medium',
    layers: {
      stars: true,
      nebulae: true,
      orbits: true,
      labels: true,
      halo: true,
      cosmicWeb: true,
      cmb: true,
      darkMatter: false,
      habitableZones: true,
      flowLines: true,
      dustLanes: true,
    },
    soundEnabled: false,
    showMinimap: false,
    showTimeline: false,
    showControls: false,
    showInfo: true,
    photoMode: false,
    searchOpen: false,
    helpOpen: false,
    compareOpen: false,
    scaleVizOpen: false,
    bloom: 0.65,
    quality: 'high',
    autoRotate: false,
    fps: 60,
    ...overrides,
  };
}

describe('Deep Link Routing & Serialization', () => {
  it('parses canonical and legacy hash links safely', () => {
    expect(parseDeepLink('#view/cosmic-web')).toEqual({ kind: 'view', preset: 'cosmic-web' });
    expect(parseDeepLink('#galaxy/andromeda')).toEqual({ kind: 'galaxy', galaxyId: 'andromeda' });
    expect(parseDeepLink('#system/trappist')).toEqual({ kind: 'system', systemId: 'trappist' });
    expect(parseDeepLink('#planet/solar/mars')).toEqual({
      kind: 'planet',
      systemId: 'solar',
      planetId: 'mars',
    });
    expect(parseDeepLink('#eye/solar/earth')).toEqual({
      kind: 'eye',
      systemId: 'solar',
      planetId: 'earth',
    });
    expect(parseDeepLink('#supercluster/laniakea')).toEqual({
      kind: 'supercluster',
      superclusterId: 'laniakea',
    });
    expect(parseDeepLink('#member/laniakea/virgo')).toEqual({
      kind: 'member',
      superclusterId: 'laniakea',
      memberId: 'virgo',
    });
    expect(parseDeepLink('#earth')).toEqual({ kind: 'view', preset: 'earth' });
    expect(parseDeepLink('')).toBeNull();
  });

  it('handles malformed percent encodings gracefully without throwing', () => {
    expect(() => parseDeepLink('#view/%E0%A4%A')).not.toThrow();
    expect(parseDeepLink('#view/%E0%A4%A')).toEqual({ kind: 'view', preset: '%E0%A4%A' });
  });

  it('round-trips key AppState views through buildDeepLink and parseDeepLink', () => {
    const cases: Array<[Partial<AppState>, string]> = [
      [{ collisionMode: true }, '#view/collision'],
      [{ currentScale: ScaleLevel.GALAXY, activeGalaxyId: 'andromeda' }, '#galaxy/andromeda'],
      [{ currentScale: ScaleLevel.STAR_SYSTEM, activeSystemId: 'trappist' }, '#system/trappist'],
      [
        { currentScale: ScaleLevel.PLANET, activeSystemId: 'solar', activePlanetId: 'saturn', godsEye: false },
        '#planet/solar/saturn',
      ],
      [
        { currentScale: ScaleLevel.SURFACE, activeSystemId: 'solar', activePlanetId: 'earth', godsEye: true },
        '#eye/solar/earth',
      ],
      [
        { currentScale: ScaleLevel.COSMIC_WEB, activeSuperclusterId: 'laniakea', activeMemberClusterId: 'virgo' },
        '#member/laniakea/virgo',
      ],
    ];

    for (const [override, expectedHash] of cases) {
      const hash = buildDeepLink(makeBaseState(override));
      expect(hash).toBe(expectedHash);
      expect(parseDeepLink(hash)).not.toBeNull();
    }
  });
});
