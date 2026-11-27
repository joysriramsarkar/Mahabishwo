import type { CosmicObject } from '@/types/cosmos';

const src = (dataset: string) => [{
  dataset, release: 'mock', accessedAt: new Date().toISOString(),
}];

/** Simple deterministic RNG so dev data stays stable across reloads. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

function gaussian(scale: number): number {
  return (rand() + rand() + rand() + rand() - 2) * scale;
}

/** Named landmarks of the visible universe, roughly (in comoving Mpc). */
export const LANDMARK_OBJECTS: CosmicObject[] = [
  {
    id: 'virgo', name: 'কন্যা গুচ্ছ (Virgo)', aliases: ['Virgo Cluster', 'Abell 1656'],
    type: 'cluster', evidence: 'observed', boundaryKind: 'physical',
    positionMpc: { x: -14, y: 6, z: 5 },
    distanceMpc: { value: 16.5, unit: 'Mpc', low: 16.4, high: 16.6, method: 'SBF' },
    radiusMpc: 2.2, massMsun: { value: 1.2e15, unit: 'Msun', low: 1.0e15, high: 1.5e15 },
    summary: 'নিকটতম বড় গুচ্ছ, ত্রিখণ্ডিত উপগোষ্ঠী।',
    sources: src('Virgo Cluster Catalog'),
  },
  {
    id: 'laniakea', name: 'Laniakea', aliases: ['Local Supercluster Complex'],
    type: 'supercluster', evidence: 'reconstructed', boundaryKind: 'flow-defined',
    positionMpc: { x: -30, y: 10, z: -20 }, radiusMpc: 80,
    massMsun: { value: 1.0e17, unit: 'Msun', confidence: 0.4 },
    summary: 'প্রবাহ-সংজ্ঞায়িত অঞ্চল, শারীরিক সীমানা নয়।',
    sources: src('Cosmicflows-4'),
  },
  {
    id: 'ga', name: 'Great Attractor', aliases: ['Norma Region'],
    type: 'supercluster', evidence: 'reconstructed', boundaryKind: 'flow-defined',
    positionMpc: { x: -55, y: -20, z: 30 }, radiusMpc: 25,
    summary: 'Zone of Avoidance-এ আংশিক লুকানো আকর্ষণ কেন্দ্র।',
    sources: src('Cosmicflows-4'),
  },
  {
    id: 'shapley', name: 'Shapley Supercluster', aliases: ['Shapley Concentration'],
    type: 'supercluster', evidence: 'observed', boundaryKind: 'model-dependent',
    positionMpc: { x: -150, y: -60, z: 90 }, radiusMpc: 40,
    massMsun: { value: 1.0e16, unit: 'Msun', low: 7e15, high: 1.3e16 },
    summary: 'স্থানীয় মহাবিশ্বের সবচেয়ে বড় ভর-ঘনীভবন।',
    sources: src('Shapley Supercluster Survey'),
  },
  {
    id: 'coma', name: 'কোমা গুচ্ছ', aliases: ['Coma Cluster', 'Abell 1656'],
    type: 'cluster', evidence: 'observed', boundaryKind: 'physical',
    positionMpc: { x: 69, y: -20, z: 55 },
    distanceMpc: { value: 99, unit: 'Mpc' }, radiusMpc: 2.5,
    sources: src('SDSS'),
  },
  {
    id: 'local-void', name: 'লোকাল ভoid', aliases: ['Local Void'],
    type: 'void', evidence: 'reconstructed', boundaryKind: 'model-dependent',
    positionMpc: { x: 25, y: 15, z: -30 }, radiusMpc: 25,
    sources: src('Cosmicflows-4'),
  },
  {
    id: 'boötes-void', name: 'Boötes Void', aliases: ['Great Nothing'],
    type: 'void', evidence: 'observed', boundaryKind: 'physical',
    positionMpc: { x: 130, y: 40, z: 100 }, radiusMpc: 50,
    sources: src('SDSS'),
  },
];

function generateGalaxies(count: number): CosmicObject[] {
  const out: CosmicObject[] = [];
  // A couple of coarse filaments.
  const filaments = [
    { from: [-150, -70, 90], to: [-20, 5, 0], n: 60 },
    { from: [-20, 5, 0], to: [80, -30, 60], n: 80 },
    { from: [-20, 5, 0], to: [10, 40, -60], n: 40 },
  ];

  for (let i = 0; i < count; i++) {
    const which = i % 3;
    const f = filaments[which]!;
    const t = rand();
    const base = [
      f.from[0]! + (f.to[0]! - f.from[0]!) * t,
      f.from[1]! + (f.to[1]! - f.from[1]!) * t,
      f.from[2]! + (f.to[2]! - f.from[2]!) * t,
    ];
    out.push({
      id: `gal-${i}`,
      name: `গ্যালাক্সি ${i}`,
      aliases: [],
      type: 'galaxy',
      evidence: 'observed',
      boundaryKind: 'physical',
      positionMpc: {
        x: base[0]! + gaussian(8),
        y: base[1]! + gaussian(8),
        z: base[2]! + gaussian(8),
      },
      sources: src('Mock'),
    });
  }
  return out;
}

export const MOCK_ALL_OBJECTS: CosmicObject[] = [
  ...LANDMARK_OBJECTS,
  ...generateGalaxies(2400),
];
