import { describe, it, expect } from 'vitest';
import {
  SUPERCLUSTERS,
  GALAXIES,
  STAR_SYSTEMS_CATALOG,
  COSMIC_ERAS,
  SEMI_MAJOR_AU,
} from '../src/data/cosmicData';
import { applyStoredPreferences } from '../src/core/preferences';
import { AppState, ScaleLevel } from '../src/core/types';

function makeMinimalState(): AppState {
  return {
    currentScale: ScaleLevel.OBSERVABLE_UNIVERSE,
    zoomLevel: 0,
    cameraMinRadius: 2,
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
  };
}

describe('Catalog Provenance & State Preferences Integrity', () => {
  it('ensures every supercluster has valid NASA/ESA source metadata and member clusters', () => {
    expect(SUPERCLUSTERS.length).toBeGreaterThanOrEqual(4);
    for (const sc of SUPERCLUSTERS) {
      expect(sc.nameBn.trim().length).toBeGreaterThan(0);
      expect(sc.sourceName.trim().length).toBeGreaterThan(0);
      expect(sc.sourceUrl).toMatch(/^https:\/\//);
      if (!sc.id.includes('void')) {
        expect(sc.members.length).toBeGreaterThan(0);
      }
      for (const m of sc.members) {
        expect(m.distanceMly).toBeGreaterThan(0);
        expect(m.galaxyCount).toBeGreaterThan(0);
      }
    }
  });

  it('ensures every star system and planet has bilingual data, sources, and semi-major AU', () => {
    const systems = Object.values(STAR_SYSTEMS_CATALOG);
    expect(systems.length).toBe(4);
    for (const sys of systems) {
      expect(sys.sourceName.trim().length).toBeGreaterThan(0);
      expect(sys.sourceUrl).toMatch(/^https:\/\//);
      expect(sys.planets.length).toBeGreaterThan(0);
      for (const p of sys.planets) {
        expect(p.nameBn.trim().length).toBeGreaterThan(0);
        expect(p.sourceUrl).toMatch(/^https:\/\//);
        expect(SEMI_MAJOR_AU[p.id]).toBeGreaterThan(0);
      }
    }
  });

  it('ensures galaxies and cosmic timeline eras span monotonically to 13.8 Gyr', () => {
    expect(GALAXIES.some((g) => g.id === 'milkyway')).toBe(true);
    expect(GALAXIES.some((g) => g.id === 'andromeda')).toBe(true);
    for (let i = 1; i < COSMIC_ERAS.length; i++) {
      expect(COSMIC_ERAS[i].startBya).toBeGreaterThanOrEqual(COSMIC_ERAS[i - 1].startBya);
    }
  });

  it('clamps and sanitises untrusted stored preferences cleanly', () => {
    const s = makeMinimalState();
    applyStoredPreferences(s, {
      rotationSpeed: 9999999,
      bloom: -10,
      quality: 'invalid' as never,
      cosmicAge: 500,
      layers: { stars: false, flowLines: 'yes' as never } as never,
    });

    expect(s.rotationSpeed).toBe(10000);
    expect(s.bloom).toBe(0);
    expect(s.quality).toBe('high'); // invalid ignored
    expect(s.cosmicAge).toBe(13.8);
    expect(s.layers.stars).toBe(false);
    expect(s.layers.flowLines).toBe(true); // non-boolean ignored
  });
});
