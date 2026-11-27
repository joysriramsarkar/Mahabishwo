export type ObjectType =
  | 'galaxy'
  | 'group'
  | 'cluster'
  | 'supercluster'
  | 'filament'
  | 'void'
  | 'great-wall'
  | 'cmb';

export type EvidenceKind = 'observed' | 'reconstructed' | 'simulated' | 'mock' | 'unknown';

/** Masterplan s9.4 UI provenance tags: OBS / REC / SIM / MOCK / UNC */
export const EVIDENCE_TAG: Record<EvidenceKind, string> = {
  observed: 'OBS',
  reconstructed: 'REC',
  simulated: 'SIM',
  mock: 'MOCK',
  unknown: 'UNC',
};

export type ScopeKind = 'extragalactic' | 'local';

export type BoundaryKind = 'physical' | 'model-dependent' | 'flow-defined';

export type CoordinateFrame = 'comoving' | 'proper' | 'lightcone';

export type DistanceKind = 'comoving' | 'luminosity' | 'light-travel' | 'proper';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface UncertainValue {
  value: number;
  unit: string;
  low?: number;
  high?: number;
  confidence?: number;
  method?: string;
}

export interface SourceRef {
  dataset: string;
  release: string;
  citation?: string;
  doi?: string;
  url?: string;
  accessedAt: string;
}

export interface CosmicObject {
  id: string;
  name: string;
  aliases: string[];
  type: ObjectType;
  evidence: EvidenceKind;
  boundaryKind: BoundaryKind;
  /** Comoving heliocentric coordinates in Mpc. Not Solar-System-relative display frame. */
  positionMpc: Vec3;
  ra?: number;
  dec?: number;
  redshift?: UncertainValue;
  distanceMpc?: UncertainValue;
  distanceKind?: DistanceKind;
  massMsun?: UncertainValue;
  radiusMpc?: number;
  parentId?: string;
  childIds?: string[];
  summary?: string;
  sources: SourceRef[];
}

export type LayerId =
  | 'observable-boundary'
  | 'cmb'
  | 'cosmic-web'
  | 'superclusters'
  | 'clusters-groups'
  | 'galaxies'
  | 'filaments'
  | 'voids'
  | 'velocity-field'
  | 'survey-footprint'
  | 'uncertainty';

export interface LayerDef {
  id: LayerId;
  label: string;
  description: string;
  evidence: EvidenceKind[];
  defaultVisible: boolean;
  defaultOpacity: number;
}

export interface SurveyDataset {
  id: string;
  label: string;
  coverage: 'partial' | 'full-sky' | 'region';
  footprint?: { raMin: number; raMax: number; decMin: number; decMax: number };
  objects: number;
  release: string;
}
