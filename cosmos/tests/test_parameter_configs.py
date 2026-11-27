import sys
from pathlib import Path

import pytest

COSMOS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(COSMOS / "engine/reference-python/src"))
from cosmos_engine import ParameterSet  # noqa: E402


@pytest.mark.parametrize("name", ["Planck18", "SH0ES", "CCHP", "DESI_w0wa"])
def test_yaml_parameter_set_matches_python_constants(name):
    yaml = pytest.importorskip("yaml")
    data = yaml.safe_load((COSMOS / f"config/parameter-sets/{name}.yaml").read_text(encoding="utf-8"))
    ps = ParameterSet.named(name)
    for key in ("H0", "H0_sigma", "Om0", "Ob_h2", "Oc_h2", "sigma8", "ns", "tau",
                "Tcmb", "Neff", "sum_mnu_eV", "w0", "wa"):
        assert data[key] == getattr(ps, key), key
    loaded = ParameterSet.from_yaml(COSMOS / f"config/parameter-sets/{name}.yaml")
    assert loaded == ps
