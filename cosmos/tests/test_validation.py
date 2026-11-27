"""Shim: run pipeline checks + COSMOS 0.1 acceptance tests in the main suite."""
import importlib.util
from pathlib import Path

COSMOS = Path(__file__).resolve().parents[1]


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_pipeline_10_checks():
    checks = _load("pipeline_checks", COSMOS / "validation/pipeline/checks.py")
    results = [(fn.__name__, fn()) for fn in checks.CHECKS]
    failed = [n for n, (ok, _) in results if not ok]
    assert failed == [], results


def test_acceptance_10_criteria():
    acc = _load("acceptance", COSMOS / "validation/acceptance/test_acceptance.py")
    fns = [getattr(acc, n) for n in dir(acc) if n.startswith("test_")]
    assert len(fns) == 10
    for fn in fns:
        fn()
