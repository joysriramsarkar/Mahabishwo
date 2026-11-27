"""COSMOS 0.1 - 10 acceptance tests (masterplan s17.3).
Each maps to one numbered criterion. Where data is unavailable the test
reports the honest state instead of fabricating a pass (s17.2 phase-4 rule).
Run via cosmos/tests (this file is collected through test_validation.py shim)
or directly: pytest cosmos/validation/acceptance/
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT / "datasets/local-universe.json").read_text(encoding="utf-8"))
OBJ = {o["id"]: o for o in DATA["objects"]}


def _meas(obj_id, quantity):
    return next(m for m in OBJ[obj_id].get("measurements", []) if m["quantity"] == quantity)


# 1. Milky Way geometry: bar, disk, bulge, arms, halo present with positions/proportions
def test_01_milky_way_geometry():
    comps = set(OBJ["milky-way"]["components"])
    assert {"galactic-bar", "galactic-disk", "galactic-bulge",
            "spiral-arms", "stellar-halo", "sgr-a-star"} <= comps
    assert all(c in OBJ for c in comps)


# 2. Galactic rotation: rotation data present with uncertainty, R0 consistent
def test_02_galactic_rotation():
    vc = _meas("milky-way", "circular_velocity_solar")
    assert vc["sigma"] is not None and vc["value"] > 200
    r0 = _meas("milky-way", "galactocentric_solar_distance")
    assert abs(r0["value"] - 8.277) <= max(r0["sigma"], 0.05)


# 3. Solar position: R0 = 8.277 kpc default (phase-1 gate)
def test_03_solar_position():
    r0 = _meas("solar-system", "galactocentric_distance")
    assert r0["value"] == 8.277 and r0["unit"] == "kpc"


# 4. Local Group: M31, M33, LMC, SMC, dwarfs with distances
def test_04_local_group():
    for oid, lo, hi in [("m31", 0.70, 0.85), ("m33", 0.75, 0.95),
                        ("lmc", 0.045, 0.055), ("smc", 0.055, 0.07),
                        ("sagittarius-dsph", 0.02, 0.035),
                        ("fornax-dsph", 0.12, 0.17)]:
        d = _meas(oid, "distance")
        assert lo <= d["value"] <= hi, (oid, d)
        assert d["sigma"] is not None


# 5. Galaxy clusters: Virgo + Fornax 3D position and mass-definition tags
def test_05_galaxy_clusters():
    for oid in ("virgo-cluster", "fornax-cluster"):
        assert OBJ[oid]["ra_deg"] is not None and OBJ[oid]["dec_deg"] is not None
    d = _meas("virgo-cluster", "distance")
    assert abs(d["value"] - 16.5) <= 0.5
    for o in OBJ.values():
        for m in o.get("measurements", []):
            if m["quantity"] in ("mass", "smbh_mass"):
                assert m.get("mass_definition"), f"{o['id']} mass untagged"


# 6. Laniakea: flow-defined watershed boundary + LG->CMB 620+-15 km/s, direction +-15 deg
def test_06_laniakea_flow():
    assert OBJ["laniakea"]["boundary_kind"] == "flow-defined"
    assert "watershed" in OBJ["laniakea"]["definition"]
    v = _meas("local-group", "lg_to_cmb_velocity")
    assert abs(v["value"] - 620) <= 15
    assert abs(v["direction_galactic"]["l_deg"] - 274) <= 15


# 7. Cosmic web: filament/sheet/void structures represented
def test_07_cosmic_web():
    types = {o["type"] for o in OBJ.values()}
    assert "void" in types and "supercluster" in types
    assert "local-sheet" in OBJ and "local-void" in OBJ
    assert len(OBJ["local-sheet"]["council_of_giants"]) == 12


# 8. Data integrity: source, unit, confidence, uncertainty on every measurement
def test_08_data_integrity():
    for o in OBJ.values():
        assert o["evidence"] in ("OBS", "REC", "SIM", "MOCK", "UNC")
        assert o["confidence"] in "ABCDE"
        for m in o.get("measurements", []):
            assert m["source"] and m["unit"] and m["method"]
            assert m["sigma"] is not None or m.get("uncertainty_note")


# 9. Navigation: continuous L0-L12 scale ladder present
def test_09_navigation_scale_ladder():
    levels = [s["level"] for s in DATA["scale_ladder"]]
    assert levels == [f"L{i}" for i in range(13)]


# 10. Reproducibility: same seed -> same hash (engine level)
def test_10_reproducibility():
    import hashlib, sys
    sys.path.insert(0, str(ROOT / "engine/reference-python/src"))
    import numpy as np
    from cosmos_engine import Cosmology
    from cosmos_engine.ic import gaussian_field
    cosmo = Cosmology()
    d1, _ = gaussian_field(16, 100.0, cosmo, seed=918273)
    d2, _ = gaussian_field(16, 100.0, cosmo, seed=918273)
    h = lambda d: hashlib.sha256(np.asarray(d).tobytes()).hexdigest()
    assert h(d1) == h(d2)
