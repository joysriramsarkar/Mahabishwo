from fastapi import FastAPI, Query
from pydantic import BaseModel
import healpy as hp, numpy as np, pyarrow.parquet as pq, glob

app = FastAPI(title="ObservableUniverse API")
COSMO = Cosmology()

class ConeQuery(BaseModel):
    ra: float; dec: float; radius_deg: float
    z_min: float = 0.0; z_max: float = 1.0
    min_logmstar: float = 9.0
    frame: str = "observed"          # "observed" | "comoving-now"

@app.post("/galaxies/cone")
def galaxies_cone(q: ConeQuery, limit: int = Query(200_000, le=2_000_000)):
    vec = hp.ang2vec(np.radians(90-q.dec), np.radians(q.ra))
    pix = hp.query_disc(256, vec, np.radians(q.radius_deg), nest=True, inclusive=True)
    chi_lo, chi_hi = COSMO.chi(q.z_min), COSMO.chi(q.z_max)
    files = [f for f in glob.glob("lightcone/galaxies/shell_*.parquet")
             if chi_lo <= float(f.split("chi")[1][:7]) <= chi_hi]
    out = []
    for f in files:
        t = pq.read_table(f, filters=[("hpix","in",pix.tolist()),
                                      ("log_mstar",">=",q.min_logmstar)])
        out.append(t)
    import pyarrow as pa
    tbl = pa.concat_tables(out).slice(0, limit) if out else None
    return {"n": 0 if tbl is None else tbl.num_rows,
            "columns": tbl.column_names if tbl else [],
            "arrow_ipc_url": f"/stream/{hash(q.json())}"}   # বাইনারি স্ট্রিম আলাদা endpoint-এ

@app.get("/field/density")
def density_shell(z: float, nside: int = 128):
    """UI volume-rendering-এর জন্য δ_m HEALPix শেল (downgraded)."""
    m = hp.read_map(f"lightcone/fields/delta_z{z:.2f}.fits")
    return {"nside": nside, "data": hp.ud_grade(m, nside).astype("f4").tobytes().hex()}

@app.get("/cosmology/convert")
def convert(z: float):
    return {"chi_Mpc": COSMO.chi(z), "D_A_Mpc": COSMO.D_A(z),
            "D_L_Mpc": COSMO.D_L(z), "lookback_Gyr": COSMO.lookback(z),
            "age_Gyr": COSMO.age(z)}

@app.get("/transients")
def transients(t0: float, t1: float, kind: str | None = None):
    t = pq.read_table("lightcone/transients/events.parquet",
                      filters=[("t_peak",">=",t0),("t_peak","<=",t1)] +
                              ([("kind","==",kind)] if kind else []))
    return t.to_pylist()[:50_000]
