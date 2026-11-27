from dataclasses import asdict
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

# আগের উদাহরণের frame_at_redshift একই প্রকল্পে রাখা হয়েছে ধরে
from cosmology import frame_at_redshift

app = FastAPI(
    title="Extragalactic Universe API",
    version="0.1.0",
)

# Production-এ শুধু নির্দিষ্ট frontend origin অনুমোদন করতে হবে।
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/v1/cosmology/frame")
def cosmology_frame(
    z: float = Query(default=1.0, ge=0.0, le=1100.0)
):
    return asdict(frame_at_redshift(z))


@app.get("/v1/health")
def health():
    return {"status": "ok"}
Production API-তে আরও থাকবে:

text

GET  /v1/runs
GET  /v1/runs/{run_id}/snapshots
GET  /v1/lightcone/tiles/{level}/{tile_id}
GET  /v1/objects/{object_id}
GET  /v1/objects/{object_id}/merger-tree
GET  /v1/objects/{object_id}/spectrum
GET  /v1/maps/{map_type}/{healpix_tile}
POST /v1/jobs/mock-observation
GET  /v1/jobs/{job_id}
GET  /v1/provenance/{run_id}
বড় particle tile JSON-এ না পাঠিয়ে binary format ব্যবহার করা ভালো।
