-- COSMOS Object Registry - PostgreSQL DDL (masterplan s9.3)
-- 18 tables: 12 core + 6 simulation-output. Every measurement must carry
-- value +- sigma, unit, method, source, data_version, license,
-- confidence A-E, evidence OBS/REC/SIM/MOCK/UNC, boundary_kind, alternatives.
-- Ingest gate: rows violating NOT NULL provenance are rejected by the DB.

CREATE TYPE confidence_grade AS ENUM ('A', 'B', 'C', 'D', 'E');
CREATE TYPE evidence_kind AS ENUM ('OBS', 'REC', 'SIM', 'MOCK', 'UNC');
CREATE TYPE boundary_kind AS ENUM (
  'physical', 'model-dependent', 'flow-defined', 'watershed-probability',
  'observational-limit', 'none'
);
CREATE TYPE run_state AS ENUM (
  'queued', 'running', 'checkpointed', 'complete', 'validated', 'failed'
);

-- ================= 12 CORE TABLES =================

CREATE TABLE cosmic_objects (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  object_type   TEXT NOT NULL,
  evidence      evidence_kind NOT NULL,
  confidence    confidence_grade NOT NULL,
  boundary_kind boundary_kind NOT NULL DEFAULT 'none',
  parent_id     TEXT REFERENCES cosmic_objects(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE object_properties (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  object_id   TEXT NOT NULL REFERENCES cosmic_objects(id) ON DELETE CASCADE,
  property    TEXT NOT NULL,
  value_json  JSONB NOT NULL,
  UNIQUE (object_id, property)
);

CREATE TABLE object_positions (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  object_id   TEXT NOT NULL REFERENCES cosmic_objects(id) ON DELETE CASCADE,
  frame       TEXT NOT NULL,               -- ICRS | FK5 | Galactic | Supergalactic
  ra_deg      DOUBLE PRECISION,
  dec_deg     DOUBLE PRECISION,
  distance_mpc DOUBLE PRECISION,
  x_mpc       DOUBLE PRECISION,
  y_mpc       DOUBLE PRECISION,
  z_mpc       DOUBLE PRECISION,
  UNIQUE (object_id, frame)
);

CREATE TABLE measurements (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  object_id     TEXT NOT NULL REFERENCES cosmic_objects(id) ON DELETE CASCADE,
  quantity      TEXT NOT NULL,             -- e.g. distance, mass, velocity
  value         DOUBLE PRECISION NOT NULL,
  sigma         DOUBLE PRECISION NOT NULL CHECK (sigma >= 0),
  unit          TEXT NOT NULL,
  method        TEXT NOT NULL,
  source        TEXT NOT NULL,             -- citation / DOI / catalogue name
  data_version  TEXT NOT NULL,
  license       TEXT NOT NULL,
  confidence    confidence_grade NOT NULL,
  evidence      evidence_kind NOT NULL,
  boundary_kind boundary_kind NOT NULL DEFAULT 'none',
  -- mass values must declare their definition (phase-2 gate, 27 Nov 2026)
  mass_definition TEXT CHECK (
    quantity <> 'mass' OR mass_definition IN ('M200c', 'M500c', 'Mvir', 'Mstar', 'other')
  ),
  alternatives  JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX measurements_object_idx ON measurements (object_id, quantity);

CREATE TABLE membership_relations (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  object_id   TEXT NOT NULL REFERENCES cosmic_objects(id) ON DELETE CASCADE,
  structure_id TEXT NOT NULL REFERENCES cosmic_objects(id) ON DELETE CASCADE,
  model       TEXT NOT NULL,               -- e.g. historical-catalogue | cosmicflows4-watershed
  definition  TEXT NOT NULL,
  confidence  confidence_grade NOT NULL,
  UNIQUE (object_id, structure_id, model)
);

CREATE TABLE physical_models (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  theory_class TEXT NOT NULL CHECK (theory_class IN ('A', 'B', 'C', 'D')),
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE scientific_equations (
  id          TEXT PRIMARY KEY,
  model_id    TEXT REFERENCES physical_models(id),
  latex       TEXT NOT NULL,
  variables   JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE catalogues (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  data_version  TEXT NOT NULL,
  license       TEXT NOT NULL,
  source_url    TEXT NOT NULL DEFAULT '',
  release_date  DATE,
  status        TEXT NOT NULL DEFAULT 'available'  -- available | upcoming | deprecated
);

CREATE TABLE publications (
  id          TEXT PRIMARY KEY,            -- DOI or bibcode
  title       TEXT NOT NULL,
  year        INTEGER NOT NULL,
  catalogue_id TEXT REFERENCES catalogues(id)
);

CREATE TABLE uncertainty_records (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  measurement_id BIGINT NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,               -- statistical | systematic | model | cosmic-variance
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE simulation_runs (
  run_id        TEXT PRIMARY KEY,
  mode          TEXT NOT NULL CHECK (mode IN ('statistical', 'twin', 'hybrid')),
  parameter_set TEXT NOT NULL,
  seed          BIGINT NOT NULL,
  state         run_state NOT NULL DEFAULT 'queued',
  ic_hash       TEXT NOT NULL,
  code_commit   TEXT NOT NULL,
  manifest_hash TEXT NOT NULL,
  preregistration_hash TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE simulation_results (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id      TEXT NOT NULL REFERENCES simulation_runs(run_id) ON DELETE CASCADE,
  result_type TEXT NOT NULL,
  uri         TEXT NOT NULL,
  byte_hash   TEXT NOT NULL
);

-- ================= 6 SIMULATION-OUTPUT TABLES =================

CREATE TABLE merger_tree (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id        TEXT NOT NULL REFERENCES simulation_runs(run_id) ON DELETE CASCADE,
  object_id     TEXT NOT NULL,
  progenitor_id TEXT NOT NULL,
  snapshot      TEXT NOT NULL,
  mass_msun     DOUBLE PRECISION
);
CREATE INDEX merger_tree_object_idx ON merger_tree (run_id, object_id);

CREATE TABLE gas_field (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id      TEXT NOT NULL REFERENCES simulation_runs(run_id) ON DELETE CASCADE,
  snapshot    TEXT NOT NULL,
  uri         TEXT NOT NULL,               -- Zarr/HDF5 store
  byte_hash   TEXT NOT NULL
);

CREATE TABLE lightcone_object (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id      TEXT NOT NULL REFERENCES simulation_runs(run_id) ON DELETE CASCADE,
  shell       TEXT NOT NULL CHECK (shell IN ('S0','S1','S2','S3','S4','S5','S6','S7')),
  hpix        BIGINT NOT NULL,
  ra_deg      DOUBLE PRECISION NOT NULL,
  dec_deg     DOUBLE PRECISION NOT NULL,
  z_cos       DOUBLE PRECISION NOT NULL,
  z_obs       DOUBLE PRECISION NOT NULL,
  chi_mpc     DOUBLE PRECISION NOT NULL
);
CREATE INDEX lightcone_shell_idx ON lightcone_object (run_id, shell, hpix);

CREATE TABLE sky_map (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id      TEXT NOT NULL REFERENCES simulation_runs(run_id) ON DELETE CASCADE,
  map_type    TEXT NOT NULL,               -- cmb_temperature | lensing | tsz | 21cm
  nside       INTEGER NOT NULL,
  uri         TEXT NOT NULL,
  byte_hash   TEXT NOT NULL
);

CREATE TABLE transient_event (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id      TEXT REFERENCES simulation_runs(run_id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,               -- SN-Ia | SN-II | GRB | TDE | kilonova | FRB | BBH | BNS
  z           DOUBLE PRECISION NOT NULL,
  ra_deg      DOUBLE PRECISION,
  dec_deg     DOUBLE PRECISION,
  event_json  JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE provenance (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id      TEXT NOT NULL REFERENCES simulation_runs(run_id) ON DELETE CASCADE,
  manifest    JSONB NOT NULL,              -- full R-21 reproducibility manifest
  manifest_hash TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
