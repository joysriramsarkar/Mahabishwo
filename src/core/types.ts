/**
 * Core type definitions for My Universe — Complete Universe Simulation.
 * Shared across engine, universe layers, UI and data modules.
 */
import * as THREE from 'three';

// ===================================================================
// Scale Hierarchy — 7 levels from Observable Universe to Surface
// ===================================================================
export enum ScaleLevel {
  OBSERVABLE_UNIVERSE = 0, // ~93 billion ly diameter
  COSMIC_WEB = 1,          // Superclusters & filaments ~500M ly
  GALAXY_CLUSTER = 2,      // Galaxy clusters / Local Group ~10M ly
  GALAXY = 3,              // Individual galaxy ~100K ly
  STAR_SYSTEM = 4,         // Star system ~100 AU
  PLANET = 5,              // Planet close-up ~thousands km
  SURFACE = 6,             // Surface detail ~meters
}

export interface ScaleConfig {
  level: ScaleLevel;
  id: string;
  name: string;
  nameBn: string;
  shortBn: string;
  readoutBn: string;
  minZoom: number;
  maxZoom: number;
  defaultRadius: number;
  defaultTheta: number;
  defaultPhi: number;
}

export const SCALE_CONFIGS: ScaleConfig[] = [
  {
    level: ScaleLevel.OBSERVABLE_UNIVERSE,
    id: 'god-eye',
    name: 'Observable Universe',
    nameBn: 'পর্যবেক্ষণযোগ্য মহাবিশ্ব',
    shortBn: 'মহাবিশ্ব',
    readoutBn: '~৯৩ বিলিয়ন আলোকবর্ষ',
    minZoom: 120,
    maxZoom: 900,
    defaultRadius: 430,
    defaultTheta: 0.55,
    defaultPhi: 0.96,
  },
  {
    level: ScaleLevel.COSMIC_WEB,
    id: 'cosmic-web',
    name: 'Cosmic Web',
    nameBn: 'কসমিক ওয়েব ও সুপারক্লাস্টার',
    shortBn: 'কসমিক ওয়েব',
    readoutBn: '~৫০০ মিলিয়ন আলোকবর্ষ',
    minZoom: 60,
    maxZoom: 620,
    defaultRadius: 280,
    defaultTheta: 0.55,
    defaultPhi: 0.96,
  },
  {
    level: ScaleLevel.GALAXY_CLUSTER,
    id: 'local-group',
    name: 'Local Group',
    nameBn: 'লোকাল গ্রুপ ছায়াপথ গোষ্ঠী',
    shortBn: 'লোকাল গ্রুপ',
    readoutBn: '~১ কোটি আলোকবর্ষ',
    minZoom: 20,
    maxZoom: 380,
    defaultRadius: 175,
    defaultTheta: 0.55,
    defaultPhi: 0.96,
  },
  {
    level: ScaleLevel.GALAXY,
    id: 'milky-way',
    name: 'Milky Way Galaxy',
    nameBn: 'আকাশগঙ্গা ছায়াপথ',
    shortBn: 'আকাশগঙ্গা',
    readoutBn: '~১,০০,০০০ আলোকবর্ষ',
    minZoom: 12,
    maxZoom: 240,
    defaultRadius: 110,
    defaultTheta: 0.55,
    defaultPhi: 0.96,
  },
  {
    level: ScaleLevel.STAR_SYSTEM,
    id: 'solar',
    name: 'Star System',
    nameBn: 'নক্ষত্রমণ্ডল',
    shortBn: 'নক্ষত্রমণ্ডল',
    readoutBn: '~১০০ AU',
    minZoom: 8,
    maxZoom: 140,
    defaultRadius: 44,
    defaultTheta: 0.85,
    defaultPhi: 1.02,
  },
  {
    level: ScaleLevel.PLANET,
    id: 'planet',
    name: 'Planet Close-Up',
    nameBn: 'গ্রহ ক্লোজ-আপ',
    shortBn: 'গ্রহ',
    readoutBn: '~১২,০০০ কিমি',
    minZoom: 4.6,
    maxZoom: 48,
    defaultRadius: 10,
    defaultTheta: 0.85,
    defaultPhi: 1.2,
  },
  {
    level: ScaleLevel.SURFACE,
    id: 'surface',
    name: 'Surface Inspection',
    nameBn: 'গ্রহপৃষ্ঠ পর্যবেক্ষণ',
    shortBn: 'গ্রহপৃষ্ঠ',
    readoutBn: '~১,০০০ কিমি',
    minZoom: 4.6,
    maxZoom: 22,
    defaultRadius: 5.6,
    defaultTheta: 0.85,
    defaultPhi: 1.2,
  },
];

// ===================================================================
// Camera
// ===================================================================
export interface SphericalCameraState {
  theta: number;
  phi: number;
  radius: number;
  targetTheta: number;
  targetPhi: number;
  targetRadius: number;
  target: THREE.Vector3;
  desiredTarget: THREE.Vector3;
}

export interface CameraPreset {
  mode: ScaleLevel;
  theta?: number;
  phi?: number;
  radius?: number;
  target?: [number, number, number];
  systemId?: string;
  planetId?: string;
  clusterId?: string;
  galaxyId?: string;
}

// ===================================================================
// Cosmic Objects — Data definitions
// ===================================================================
export interface CosmicObjectBase {
  id: string;
  name: string;
  nameBn: string;
  description: string;
  descriptionBn: string;
  color: string;
  position: [number, number, number];
}

export interface MemberClusterData {
  id: string;
  name: string;
  nameBn: string;
  /** Normalised position inside the parent supercluster (-1..1). */
  offset: [number, number, number];
  distanceMly: number;
  galaxyCount: number;
  massSOL: string;
  descriptionBn: string;
}

// Observable Universe Level
export interface SuperclusterData extends CosmicObjectBase {
  radiusMly: number;        // Radius in millions of light-years
  galaxyCount: number;      // Estimated galaxy count
  massSOL: string;          // Mass in solar masses (string for large nums)
  members: MemberClusterData[];
  sourceUrl: string;
  sourceName: string;
}

// Galaxy Cluster Level
export interface GalaxyClusterData extends CosmicObjectBase {
  radiusKly: number;        // Radius in thousands of light-years
  memberGalaxies: string[];
  dominantGalaxy?: string;
}

// Galaxy Level
export interface GalaxyData extends CosmicObjectBase {
  type: 'spiral' | 'barred-spiral' | 'elliptical' | 'irregular' | 'lenticular' | 'dwarf';
  diameterKly: number;      // Diameter in thousands of light-years
  starCountBillions: number;
  ageBillionYears: number;
  hasBlackHole: boolean;
  blackHoleMassSolar?: number;
  starSystems?: StarSystemData[];
  landmarks?: GalaxyLandmark[];
}

export interface GalaxyLandmark {
  id: string;
  label: string;
  labelBn: string;
  color: string;
  position: [number, number, number];
  camera?: Partial<CameraPreset>;
  description: string;
  descriptionBn: string;
  stats: StatItem[];
  actionLabel?: string;
  actionLabelBn?: string;
  actionType?: 'enterSystem' | 'focusPlanet' | 'enterGalaxy';
  actionTarget?: string;
  sourceUrl: string;
  sourceName: string;
}

// Star System Level
export interface StarSystemData {
  id: string;
  name: string;
  nameBn: string;
  subtitle: string;
  subtitleBn: string;
  description: string;
  descriptionBn: string;
  star: StarData;
  habitableZone?: { inner: number; outer: number };
  defaultCamera: { theta: number; phi: number; radius: number };
  planets: PlanetData[];
  asteroidBelt?: { inner: number; outer: number; count: number };
  stats: StatItem[];
  sourceUrl: string;
  sourceName: string;
}

export interface StarData {
  name: string;
  nameBn: string;
  radius: number;
  color: string;
  glowColor: string;
  textureType: string;
  temperature?: number;    // Kelvin
  spectralClass?: string;
  luminosity?: number;     // Solar luminosities
}

// Planet Level
export interface PlanetData {
  id: string;
  name: string;
  nameBn: string;
  shortName: string;
  shortNameBn: string;
  orbitRadius: number;
  radius: number;
  speed: number;
  tilt: number;
  rotSpeed: number;
  textureType: string;
  color: string;
  atmosphereColor?: string;
  subtitle: string;
  subtitleBn: string;
  description: string;
  descriptionBn: string;
  hasClouds?: boolean;
  hasRings?: boolean;
  hasThinRing?: boolean;
  hasMoon?: boolean;
  hasNightLights?: boolean;
  ringInner?: number;
  ringOuter?: number;
  stats: StatItem[];
  sourceUrl: string;
  sourceName: string;
}

export interface StatItem {
  label: string;
  value: string;
}

// ===================================================================
// Application State
// ===================================================================
export type DensityLevel = 'low' | 'medium' | 'high';
export type QualityLevel = 'low' | 'medium' | 'high';

export interface AppState {
  currentScale: ScaleLevel;
  activeObjectId: string | null;
  activeSystemId: string;
  activePlanetId: string;
  activeGalaxyId: string;
  activeClusterId: string;
  activePreset: string;
  /** Selected supercluster / member cluster for the cosmic-web detail panel. */
  activeSuperclusterId: string | null;
  activeMemberClusterId: string | null;
  /** True while the camera is in the fully-lit "God's Eye" planet portrait. */
  godsEye: boolean;
  isPlaying: boolean;
  rotationSpeed: number;
  /** Continuous zoom level 0..6 (fractional = between scales, seamless) */
  zoomLevel: number;
  /** Dynamic minimum camera radius (planet collision avoidance) */
  cameraMinRadius: number;
  elapsedTime: number;       // Context-dependent time
  /** Elapsed simulated days on the unified physical clock (1 s = 1 day at 1×). */
  elapsedSimDays: number;    // Total simulated days since boot
  cosmicAge: number;         // Billion years since Big Bang (0 = Big Bang, 13.8 = now)
  density: DensityLevel;
  layers: LayerVisibility;
  soundEnabled: boolean;
  showMinimap: boolean;
  showTimeline: boolean;
  showControls: boolean;
  showInfo: boolean;
  photoMode: boolean;
  searchOpen: boolean;
  helpOpen: boolean;
  bloom: number;
  quality: QualityLevel;
  autoRotate: boolean;
  fps: number;
}

export interface LayerVisibility {
  stars: boolean;
  nebulae: boolean;
  orbits: boolean;
  labels: boolean;
  halo: boolean;
  cosmicWeb: boolean;
  cmb: boolean;
  darkMatter: boolean;
  habitableZones: boolean;
  flowLines: boolean;
  dustLanes: boolean;
}

// ===================================================================
// Events
// ===================================================================
export type UniverseEvent =
  | { type: 'SCALE_CHANGE'; from: ScaleLevel; to: ScaleLevel }
  | { type: 'OBJECT_SELECT'; objectId: string; scale: ScaleLevel }
  | { type: 'CAMERA_MOVE'; preset?: string }
  | { type: 'LAYER_TOGGLE'; layer: keyof LayerVisibility; enabled: boolean }
  | { type: 'TIME_CHANGE'; cosmicAge: number }
  | { type: 'SEARCH'; query: string }
  | { type: 'DENSITY_CHANGE'; density: DensityLevel }
  | { type: 'STATE_PATCH'; patch: Partial<AppState> };

export type EventHandler = (event: UniverseEvent) => void;

// ===================================================================
// Rendering
// ===================================================================
export interface SceneLayer {
  group: THREE.Group;
  visible: boolean;
  update(dt: number, state: AppState): void;
  build(options?: Record<string, unknown>): void;
  dispose(): void;
}

// ===================================================================
// Cosmic Timeline
// ===================================================================
export interface CosmicEra {
  id: string;
  name: string;
  nameBn: string;
  startBya: number;         // Billion years since Big Bang (0 = Big Bang, 13.8 = now)
  endBya: number;
  color: string;
  description: string;
  descriptionBn: string;
}

// ===================================================================
// Utility Types
// ===================================================================
export type Vec3 = [number, number, number];

export interface ProjectedPin {
  id: string;
  el: HTMLButtonElement;
  worldPos: THREE.Vector3;
  onClick: () => void;
  kind?: 'supercluster' | 'member' | 'landmark';
}
