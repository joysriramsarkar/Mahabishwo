"""G7 on-the-fly light-cone writer (from 04_lightcone_shell_writer.py).

Writes particles crossing the chi(a_prev) -> chi(a_now) shell at each PM step.
Snapshot interpolation is forbidden (C-23); this hook runs inside the solver
loop. healpy is optional: without it, theta/phi come from plain geometry and
hpix is set to 0 (documented degradation, never silent).
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq

from .cosmology import C_KMS

try:
    import healpy as hp
    HAS_HEALPY = True
except ImportError:  # pragma: no cover
    hp = None
    HAS_HEALPY = False


def _vec2ang(unit):
    """theta (colatitude), phi for unit vectors - healpy-compatible."""
    theta = np.arccos(np.clip(unit[:, 2], -1, 1))
    phi = np.mod(np.arctan2(unit[:, 1], unit[:, 0]), 2 * np.pi)
    return theta, phi


class LightconeWriter:
    def __init__(self, cosmo, L, observer, nside=256, outdir="lightcone/halos"):
        self.cosmo, self.L = cosmo, L
        self.obs = np.asarray(observer, dtype=float)
        self.nside = nside
        self.outdir = Path(outdir)
        self.outdir.mkdir(parents=True, exist_ok=True)
        self.chi_prev = None
        self.files: list[str] = []

    def __call__(self, pos, vel, a):
        z = 1 / a - 1
        chi_now = self.cosmo.chi(z)
        if self.chi_prev is None:
            self.chi_prev = chi_now
            return None
        d = pos - self.obs
        d -= self.L * np.round(d / self.L)  # minimum-image convention
        r = np.linalg.norm(d, axis=1)
        sel = (r <= self.chi_prev) & (r > chi_now)
        written = None
        if sel.any():
            dd, rr = d[sel], r[sel]
            unit = dd / rr[:, None]
            if HAS_HEALPY:
                theta, phi = hp.vec2ang(unit)
                hpix = hp.ang2pix(self.nside, theta, phi, nest=True).astype("u4")
            else:
                theta, phi = _vec2ang(unit)
                hpix = np.zeros(len(rr), dtype="u4")
            v_los = np.einsum("ij,ij->i", vel[sel], dd) / rr
            z_cos = np.interp(rr, [chi_now, self.chi_prev], [z, 1 / (a - 1e-9) - 1])
            tbl = pa.table({
                "hpix": hpix,
                "ra": np.degrees(phi).astype("f4"),
                "dec": (90 - np.degrees(theta)).astype("f4"),
                "chi": rr.astype("f4"),
                "z_cos": z_cos.astype("f4"),
                "z_obs": (z_cos + (1 + z_cos) * v_los / C_KMS).astype("f4"),
                "v_los": v_los.astype("f4"),
            })
            written = str(self.outdir / f"shell_z{z:.3f}.parquet")
            pq.write_table(tbl, written)
            self.files.append(written)
        self.chi_prev = chi_now
        return written


def repetition_check(tables: list[pa.Table], tol: float = 1e-6) -> dict:
    """Repetition detector (pipeline check 7): identical (ra,dec,chi) rows
    appearing in non-adjacent shells indicate box-replication artefacts."""
    seen: dict[tuple, int] = {}
    duplicates = 0
    total = 0
    for idx, tbl in enumerate(tables):
        if tbl.num_rows == 0:
            continue
        ra = tbl.column("ra").to_numpy()
        dec = tbl.column("dec").to_numpy()
        chi = tbl.column("chi").to_numpy()
        for a, b, c in zip(ra, dec, chi):
            key = (round(float(a), 4), round(float(b), 4), round(float(c), 3))
            total += 1
            if key in seen and abs(seen[key] - idx) > 1:
                duplicates += 1
            seen.setdefault(key, idx)
    return {"rows_checked": total, "suspected_repetitions": duplicates,
            "passed": duplicates == 0}
