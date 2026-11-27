import importlib.util
import json
from pathlib import Path

COSMOS = Path(__file__).resolve().parents[1]


def test_benchmark_cli_reports_real_timings_and_fail_closed(monkeypatch, tmp_path):
    spec = importlib.util.spec_from_file_location("benchmark_api", COSMOS / "tools/benchmark_api.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    class Response:
        content = b"arrow"
        headers = {"x-evidence": "SIM"}
        def raise_for_status(self): pass
        def json(self): return {"state": "complete"}

    class Client:
        def __init__(self, *args, **kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def request(self, method, url, **kwargs):
            return Response()

    clock = iter([0.0, 0.001] * 4)
    monkeypatch.setattr(mod.time, "perf_counter", lambda: next(clock))
    monkeypatch.setattr(mod.httpx, "Client", Client)
    output = tmp_path / "bench.json"
    assert mod.main(["--output", str(output)]) == 0
    data = json.loads(output.read_text(encoding="utf-8"))
    assert data["all_fixed_targets_passed"] is True
    assert data["arrow_tile_ms"]["evidence"] == "SIM"
