import type { CosmicObject, SurveyDataset } from './cosmos';

export interface BoundingQuery {
  center: [number, number, number];
  radius: number;
  types?: string[];
  maxRedshift?: number;
}

export interface Snapshot {
  id: string;
  epochZ: number;
  objects: CosmicObject[];
  label: string;
}

export interface ApiClient {
  searchObjects(q: string): Promise<CosmicObject[]>;
  objectsInVolume(q: BoundingQuery): Promise<CosmicObject[]>;
  getObject(id: string): Promise<CosmicObject>;
  getSnapshot(epochZ: number): Promise<Snapshot>;
  listDatasets(): Promise<SurveyDataset[]>;
}
