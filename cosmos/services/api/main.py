"""COSMOS FastAPI service - masterplan s9.6 endpoints.

Data sources (honest labelling):
 * Observed/seed objects: cosmos/datasets/local-universe.json (OBS/REC, cited)
 * Tiles / transients / mock jobs: deterministic simulated demo data (SIM/MOCK)
   generated per-request from a fixed seed - never presented as observations.
Performance targets (s9.6 checklist D): cone < 2 s, mock job < 10 s,
statistics < 5 s cached. All seed-scale operations here are milliseconds.
Run:  uvicorn main:app  (from this directory)  |  tests: cosmos/tests/test_api.py
"""
from __future__ import annotations

import hashlib
import io
import json
import math
import time
import uuid
from contextlib import asynccontextmanager
from dataclasses import asdict
from functools import lru_cache
from pathlib import Path

import duckdb
import numpy as np
import pyarrow as pa
import pyarrow.ipc as ipc
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

from cosmos_engine import (Cosmology, ParameterSet, SimulationRun, RunState,
                           PreRegistration, frame_at_redshift)
from cosmos_engine.transients import sample_transients

ROOT = Path(__file__).resolve().parents[2]  # cosmos/
DATASET = json.loads((ROOT / "datasets" / "local-universe.json").read_text(encoding="utf-8"))
OBJECTS = {o["id"]: o for o in DATASET["objects"]}
APP_VERSION = "0.1.0"
_PREREG_SECRET = b"cosmos-dev-secret-change-in-production"

@asynccontextmanager
async def lifespan(_: FastAPI):
    # Warm binary/columnar runtimes before /health reports ready. Otherwise the
    # first Arrow tile pays PyArrow's one-time table initialization (~0.7 s).
    pa.table({"warmup": np.zeros(1, dtype="u1")})
    con = duckdb.connect()
    try:
        con.execute("SELECT 1").fetchall()
    finally:
        con.close()
    yield


app = FastAPI(title="COSMOS API", version=APP_VERSION,
              description="Masterplan s9.6 - all data carries evidence labels.",
              lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"],
                   allow_headers=["*"], expose_headers=["X-Evidence", "X-Rows"])

# ---------------------------------------------------------------- runs store
def _seed_run() -> SimulationRun:
    run = SimulationRun(mode="statistical", parameter_set="Planck18", seed=918273,
                        run_id="lcdm-ensemble-0042")
    run.build_manifest({"box_mpc": 200.0, "n_particles": 64**3, "z_init": 49},
                       code_commit="cosmos-0.1-dev")
    run.preregistration = PreRegistration.create(
        run.run_id, {"pk_max_rel_err": 0.02, "hmf_max_rel_err": 0.02}, _PREREG_SECRET)
    run.transition(RunState.RUNNING)
    run.transition(RunState.CHECKPOINTED)
    run.transition(RunState.COMPLETE)
    run.transition(RunState.VALIDATED)
    return run

RUNS: dict[str, SimulationRun] = {_seed_run().run_id: _seed_run()}
JOBS: dict[str, dict] = {}
_STATS_CACHE: dict = {}


def _obj_summary(o: dict) -> dict:
    dist = next((m for m in o.get("measurements", []) if m["quantity"] == "distance"), None)
    return {"id": o["id"], "name": o["name"], "type": o["type"],
            "evidence": o["evidence"], "confidence": o["confidence"],
            "boundary_kind": o["boundary_kind"],
            "ra_deg": o.get("ra_deg"), "dec_deg": o.get("dec_deg"),
            "distance_mpc": dist["value"] if dist else None,
            "distance_sigma_mpc": dist["sigma"] if dist else None}


# ---------------------------------------------------------------- health
@app.get("/v1/health")
def health():
    return {"status": "ok", "version": APP_VERSION, "service": "cosmos-api",
            "objects": len(OBJECTS), "runs": len(RUNS),
            "data_version": DATASET["catalogue"]["data_version"]}


# ---------------------------------------------------------------- runs
@app.get("/v1/runs")
def list_runs():
    return [{"run_id": r.run_id, "mode": r.mode, "parameter_set": r.parameter_set,
             "seed": r.seed, "state": r.state.value,
             "manifest_hash": r.manifest.manifest_hash() if r.manifest else None}
            for r in RUNS.values()]


@app.get("/v1/runs/{run_id}/snapshots")
def run_snapshots(run_id: str):
    if run_id not in RUNS:
        raise HTTPException(404, f"run {run_id} not found")
    # Snapshot strategy: logarithmic in scale factor (run config s14.3)
    snaps = []
    for i, a in enumerate(np.geomspace(0.02, 1.0, 9)):
        snaps.append({"snapshot_id": f"a_{a:.4f}", "scale_factor": round(float(a), 4),
                      "redshift": round(float(1 / a - 1), 3), "index": i})
    return {"run_id": run_id, "snapshots": snaps}


@app.get("/v1/provenance/{run_id}")
def provenance(run_id: str):
    run = RUNS.get(run_id)
    if not run:
        raise HTTPException(404, f"run {run_id} not found")
    m = run.manifest
    return {"run_id": run_id, "state": run.state.value,
            "manifest": asdict(m) if m else None,
            "manifest_hash": m.manifest_hash() if m else None,
            "preregistration": ({"criteria": run.preregistration.criteria,
                                 "criteria_hash": run.preregistration.criteria_hash,
                                 "signature_valid": run.preregistration.verify(_PREREG_SECRET)}
                                if run.preregistration else None),
            "job_dag": run.job_dag()}


# ---------------------------------------------------------------- objects
@app.get("/v1/objects")
def list_objects(type: str | None = None, evidence: str | None = None):
    out = [_obj_summary(o) for o in OBJECTS.values()
           if (type is None or o["type"] == type)
           and (evidence is None or o["evidence"] == evidence)]
    return {"count": len(out), "objects": out,
            "catalogue": DATASET["catalogue"]}


@app.get("/v1/objects/{object_id}")
def get_object(object_id: str):
    o = OBJECTS.get(object_id)
    if not o:
        raise HTTPException(404, f"object {object_id} not found")
    return o


@app.get("/v1/objects/{object_id}/merger-tree")
def merger_tree(object_id: str):
    o = OBJECTS.get(object_id)
    if not o:
        raise HTTPException(404, f"object {object_id} not found")
    if o["evidence"] in ("OBS", "REC"):
        return {"object_id": object_id, "evidence": o["evidence"], "tree": [],
                "note": "Observed/reconstructed object - merger tree exists only "
                        "for SIM runs. No tree fabricated (N14)."}
    return {"object_id": object_id, "tree": []}


@app.get("/v1/objects/{object_id}/spectrum")
def spectrum(object_id: str):
    o = OBJECTS.get(object_id)
    if not o:
        raise HTTPException(404, f"object {object_id} not found")
    # Toy blackbody-like mock spectrum - explicitly MOCK, not an observation.
    wl = np.linspace(300, 900, 25)  # nm
    temp = 5500.0
    flux = (wl / 550.0) ** -2 * np.exp(-np.abs(wl - 550) / 400)
    return {"object_id": object_id, "evidence": "MOCK",
            "note": "Synthetic demonstration spectrum (toy continuum). "
                    "Production: FSPS/SKIRT forward model (s11.2).",
            "wavelength_nm": [round(float(x), 1) for x in wl],
            "flux_relative": [round(float(x), 4) for x in flux],
            "assumed_temperature_k": temp}


# ---------------------------------------------------------------- cone search
class ConeQuery(BaseModel):
    ra_deg: float = Field(ge=0, lt=360)
    dec_deg: float = Field(ge=-90, le=90)
    radius_deg: float = Field(gt=0, le=180)
    z_min: float = 0.0
    z_max: float = 20.0


def _cone(q: ConeQuery):
    t0 = time.perf_counter()
    hits = []
    for o in OBJECTS.values():
        ra, dec = o.get("ra_deg"), o.get("dec_deg")
        if ra is None or dec is None:
            continue
        dra = (ra - q.ra_deg + 180) % 360 - 180
        sep = math.degrees(math.acos(max(-1, min(1,
            math.sin(math.radians(q.dec_deg)) * math.sin(math.radians(dec))
            + math.cos(math.radians(q.dec_deg)) * math.cos(math.radians(dec))
            * math.cos(math.radians(dra))))))
        if sep <= q.radius_deg:
            hits.append(_obj_summary(o))
    return {"count": len(hits), "objects": hits,
            "elapsed_s": round(time.perf_counter() - t0, 4),
            "target_s": 2.0}


@app.post("/v1/galaxies/cone")
def cone_v1(q: ConeQuery):
    return _cone(q)


@app.post("/galaxies/cone")
def cone_legacy(q: ConeQuery):
    return _cone(q)


# ---------------------------------------------------------------- tiles (DuckDB)
@lru_cache(maxsize=1)
def _comoving_grid():
    """Vectorized Planck18 chi(z) lookup for SIM tile generation."""
    cosmo = Cosmology(ParameterSet.named("Planck18"))
    z = np.linspace(0.0, 20.0, 16_385)
    integrand = 1.0 / cosmo.E(z)
    integral = np.concatenate(([0.0], np.cumsum(
        (integrand[:-1] + integrand[1:]) * 0.5 * np.diff(z))))
    return z, integral * (299792.458 / cosmo.H0)


@lru_cache(maxsize=128)
def _tile_table(level: int, tile_id: int) -> pa.Table:
    """Deterministic SIM galaxies for a tile (seed = level*100000+tile_id)."""
    rng = np.random.default_rng(level * 100000 + tile_id)
    n = 2000
    ra = rng.uniform(0, 360, n)
    dec = np.degrees(np.arcsin(rng.uniform(-1, 1, n)))
    z = rng.exponential(0.4, n)
    # Every row inherits SIM from the response's X-Evidence header. Avoid a
    # redundant per-row Python string array (its cold Arrow initialization
    # dominated tile latency); the Explorer applies the SIM label to each row.
    z_grid, chi_grid = _comoving_grid()
    chi = np.interp(z, z_grid, chi_grid)
    tbl = pa.table({"id": np.arange(n, dtype="u8"),
                    "ra": ra.astype("f4"), "dec": dec.astype("f4"),
                    "z_cos": z.astype("f4"), "chi": chi.astype("f4"),
                    "log_mstar": rng.normal(10, 0.8, n).astype("f4")})
    con = duckdb.connect()
    try:
        con.register("tile_tbl", tbl)
        return con.sql(
            "SELECT * FROM tile_tbl WHERE z_cos < 2.0 ORDER BY id").to_arrow_table()
    finally:
        con.close()


@app.get("/v1/lightcone/tiles/{level}/{tile_id}")
def tile(level: int, tile_id: int):
    tbl = _tile_table(level, tile_id)
    sink = pa.BufferOutputStream()
    with ipc.new_stream(sink, tbl.schema) as w:
        w.write_table(tbl)
    return Response(content=sink.getvalue().to_pybytes(),
                    media_type="application/vnd.apache.arrow.stream",
                    headers={"X-Evidence": "SIM", "X-Rows": str(tbl.num_rows)})


# ---------------------------------------------------------------- maps / fields
@app.get("/v1/maps/{map_type}/{healpix_tile}")
def sky_map(map_type: str, healpix_tile: int, nside: int = 64):
    if map_type not in ("cmb_temperature", "lensing", "tsz", "21cm"):
        raise HTTPException(400, f"unknown map_type {map_type}")
    rng = np.random.default_rng(healpix_tile)
    return {"map_type": map_type, "healpix_tile": healpix_tile, "nside": nside,
            "evidence": "MOCK",
            "note": "Summary statistics only at seed stage; full HEALPix maps "
                    "are phase-6 (Nside up to 8192, s11.2).",
            "mean": float(rng.normal()), "rms": float(abs(rng.normal())),
            "unit": {"cmb_temperature": "uK", "lensing": "dimensionless",
                     "tsz": "y (dimensionless)", "21cm": "mK"}[map_type]}


@app.get("/v1/field/density")
@app.get("/field/density")
def density_field(z: float = Query(ge=0), parameter_set: str = "Planck18"):
    cosmo = Cosmology(ParameterSet.named(parameter_set))
    return {"redshift": z, "evidence": "SIM",
            "growth_factor": cosmo.growth(z),
            "note": "Scalar summary; volume density fields are HDF5/Zarr in production."}


# ---------------------------------------------------------------- cosmology
@app.get("/v1/cosmology/convert")
@app.get("/cosmology/convert")
def convert(z: float = Query(ge=0), parameter_set: str = "Planck18"):
    ps = ParameterSet.named(parameter_set)
    cosmo = Cosmology(ps)
    frame = frame_at_redshift(z) if parameter_set == "Planck18" else None
    return {"z": z, "parameter_set": parameter_set, "H0": ps.H0,
            "chi_mpc": cosmo.chi(z), "D_A_mpc": cosmo.D_A(z),
            "D_L_mpc": cosmo.D_L(z), "lookback_gyr": cosmo.lookback(z),
            "age_gyr": cosmo.age(z),
            "astropy_frame": asdict(frame) if frame else None,
            "evidence": "SIM"}


@app.get("/v1/cosmology/parameter-sets")
def parameter_sets():
    from cosmos_engine import AVAILABLE_SETS
    out = []
    for name in AVAILABLE_SETS:
        ps = ParameterSet.named(name)
        out.append({"name": ps.name, "H0": ps.H0, "H0_sigma": ps.H0_sigma,
                    "Om0": ps.Om0, "sigma8": ps.sigma8, "ns": ps.ns,
                    "w0": ps.w0, "wa": ps.wa, "source": ps.source})
    return {"parameter_sets": out, "default": "Planck18",
            "dual_ensemble_required": ["Planck18", "SH0ES"]}


# ---------------------------------------------------------------- transients
@app.get("/v1/transients")
@app.get("/transients")
def transients(t_years: float = 1.0, kind: str | None = None, seed: int = 42):
    rng = np.random.default_rng(seed)
    gal = {"sfr": rng.uniform(0.1, 5, 50), "logM": rng.uniform(9, 11, 50),
           "z": rng.uniform(0.01, 0.5, 50)}
    events = sample_transients(gal, t_years, rng, Cosmology())
    if kind:
        events = [e for e in events if e["kind"] == kind]
    return {"count": len(events), "evidence": "SIM",
            "note": "Poisson-sampled demo events from toy SFR/M* (s11.2).",
            "events": events[:200]}


# ---------------------------------------------------------------- jobs
class MockObservationRequest(BaseModel):
    object_id: str
    telescope: str = "generic"
    exposure_s: float = 3600.0


@app.post("/v1/jobs/mock-observation")
def mock_observation(req: MockObservationRequest):
    o = OBJECTS.get(req.object_id)
    if not o:
        raise HTTPException(404, f"object {req.object_id} not found")
    job_id = f"job-{uuid.uuid4().hex[:10]}"
    # Forward-model summary computed synchronously (seed scale << 10 s target);
    # production queues this as an async job (s9.6).
    snr = round(8.0 * math.sqrt(req.exposure_s / 3600.0), 2)
    JOBS[job_id] = {"job_id": job_id, "kind": "mock-observation",
                    "state": "complete", "object_id": req.object_id,
                    "telescope": req.telescope, "evidence": "MOCK",
                    "result": {"estimated_snr": snr,
                               "psf_model": "gaussian (toy; production SKIRT/FSPS)",
                               "noise_model": "poisson+read (toy)"}}
    return JOBS[job_id]


@app.get("/v1/jobs/{job_id}")
def job_status(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(404, f"job {job_id} not found")
    return job


# ---------------------------------------------------------------- statistics
@app.get("/v1/statistics/summary")
def statistics_summary():
    if "summary" in _STATS_CACHE:
        return _STATS_CACHE["summary"]
    types: dict[str, int] = {}
    evid: dict[str, int] = {}
    for o in OBJECTS.values():
        types[o["type"]] = types.get(o["type"], 0) + 1
        evid[o["evidence"]] = evid.get(o["evidence"], 0) + 1
    out = {"evidence": "OBS", "object_count": len(OBJECTS),
           "by_type": types, "by_evidence": evid,
           "scale_ladder": DATASET["scale_ladder"],
           "note": "Catalogue statistics. P(k)/xi(r)/C_l are computed in the "
                   "Explorer Statistics view from loaded objects (demo data "
                   "labelled by its evidence kind)."}
    _STATS_CACHE["summary"] = out
    return out


@app.get("/v1/catalogue/releases")
def releases():
    rel = json.loads((ROOT / "datasets" / "release-tracker.json").read_text(encoding="utf-8"))
    return rel
