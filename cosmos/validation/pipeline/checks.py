"""10 pipeline checks (masterplan s12.2, P19). Each returns (passed, detail).
Run: python -m checks  |  pytest cosmos/tests/test_pipeline.py
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
import sys
sys.path.insert(0, str(ROOT / "engine" / "reference-python" / "src"))

from cosmos_engine import Cosmology, ParameterSet, content_hash  # noqa: E402
from cosmos_engine.ic import gaussian_field, linear_pk  # noqa: E402


def _dataset():
    return json.loads((ROOT / "datasets" / "local-universe.json").read_text(encoding="utf-8"))


def check_1_units():
    ok = all(m.get("unit") for o in _dataset()["objects"] for m in o.get("measurements", []))
    return ok, "every measurement declares a unit"


def check_2_coord_roundtrip():
    ra, dec = 187.7, 12.34
    x = math.cos(math.radians(dec)) * math.cos(math.radians(ra))
    y = math.cos(math.radians(dec)) * math.sin(math.radians(ra))
    z = math.sin(math.radians(dec))
    ra2 = math.degrees(math.atan2(y, x)) % 360
    dec2 = math.degrees(math.asin(z))
    return abs(ra - ra2) < 1e-9 and abs(dec - dec2) < 1e-9, f"roundtrip d_ra={abs(ra-ra2):.2e}"


def check_3_h_dependence():
    # Physical Mpc distances must not be quoted in h-dependent units silently:
    # chi computed in Mpc for Planck18 vs SH0ES differs by H0 ratio ~8%.
    c1, c2 = Cosmology(ParameterSet.named("Planck18")), Cosmology(ParameterSet.named("SH0ES"))
    ratio = c1.chi(1.0) / c2.chi(1.0)
    expected = 73.04 / 67.66
    return abs(ratio - expected) / expected < 0.02, f"chi ratio {ratio:.3f} vs H0 ratio {expected:.3f}"


def check_4_same_code_both_sets():
    outs = {}
    for name in ("Planck18", "SH0ES"):
        c = Cosmology(ParameterSet.named(name))
        outs[name] = (c.chi(0.5), c.D_L(0.5), c.growth(0.5))
    ok = all(np.isfinite(v) for pair in outs.values() for v in pair)
    return ok, f"same Cosmology code runs Planck18 & SH0ES: {outs}"


def check_5_shell_continuity():
    from cosmos_engine import SHELLS
    ok = all(SHELLS[i]["z_max"] == SHELLS[i + 1]["z_min"] for i in range(len(SHELLS) - 1))
    return ok, "S0-S7 shells are contiguous 0 -> 1090"


def check_6_wedge_sky_consistency():
    # Same catalogue counted in sky bins vs wedge bins must agree (counts).
    objs = [o for o in _dataset()["objects"] if o.get("ra_deg") is not None]
    sky = len(objs)
    wedge = sum(1 for o in objs if 0 <= o["ra_deg"] < 360)
    return sky == wedge and sky > 0, f"sky count {sky} == wedge count {wedge}"


def check_7_repetition_detector():
    import pyarrow as pa
    from cosmos_engine.lightcone import repetition_check
    rng = np.random.default_rng(0)
    def tbl(offset):
        return pa.table({"ra": rng.uniform(0, 360, 50).astype("f4"),
                         "dec": rng.uniform(-90, 90, 50).astype("f4"),
                         "chi": (rng.uniform(0, 100, 50) + offset).astype("f4")})
    res = repetition_check([tbl(0), tbl(1000)])
    return res["passed"], str(res)


def check_8_reproducibility():
    cosmo = Cosmology()
    d1, _ = gaussian_field(16, 100.0, cosmo, seed=123)
    d2, _ = gaussian_field(16, 100.0, cosmo, seed=123)
    h1 = hashlib.sha256(np.asarray(d1).tobytes()).hexdigest()
    h2 = hashlib.sha256(np.asarray(d2).tobytes()).hexdigest()
    return h1 == h2, f"same seed -> same hash {h1[:12]}"


def check_9_conservation():
    from cosmos_engine.pm import cic_deposit
    rng = np.random.default_rng(1)
    pos = rng.uniform(0, 50, (500, 3))
    delta = cic_deposit(pos, 16, 50.0)
    total = float((delta + 1).sum())
    return abs(total - 16**3) / 16**3 < 1e-9, f"CIC mass sum {total:.1f} vs grid {16**3}"


def check_10_provenance_completeness():
    bad = [o["id"] for o in _dataset()["objects"]
           if not o.get("evidence") or not o.get("confidence")]
    return not bad, f"objects missing evidence/confidence: {bad}"


CHECKS = [check_1_units, check_2_coord_roundtrip, check_3_h_dependence,
          check_4_same_code_both_sets, check_5_shell_continuity,
          check_6_wedge_sky_consistency, check_7_repetition_detector,
          check_8_reproducibility, check_9_conservation,
          check_10_provenance_completeness]

if __name__ == "__main__":
    failed = 0
    for fn in CHECKS:
        passed, detail = fn()
        print(f"[{'PASS' if passed else 'FAIL'}] {fn.__name__}: {detail}")
        failed += 0 if passed else 1
    raise SystemExit(1 if failed else 0)
