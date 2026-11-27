import json
from pathlib import Path

from cosmos_engine import PreRegistration


def test_preregistration_cli_creates_signed_payload_and_tag(tmp_path, monkeypatch):
    """Run the real CLI in a disposable git repo (never tags the user's repo)."""
    import subprocess, sys, os
    repo = tmp_path / "repo"
    repo.mkdir()
    subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
    subprocess.run(["git", "config", "user.email", "test@example.invalid"], cwd=repo, check=True)
    subprocess.run(["git", "config", "user.name", "COSMOS Test"], cwd=repo, check=True)
    (repo / "README").write_text("test", encoding="utf-8")
    subprocess.run(["git", "add", "README"], cwd=repo, check=True)
    subprocess.run(["git", "commit", "-qm", "init"], cwd=repo, check=True)
    # Copy the tool and package into the disposable repo at the expected paths.
    cosmos = Path(__file__).resolve().parents[1]
    tool = repo / "cosmos/tools/preregister_run.py"
    tool.parent.mkdir(parents=True)
    tool.write_text((cosmos / "tools/preregister_run.py").read_text(encoding="utf-8"), encoding="utf-8")
    pkg = repo / "cosmos/engine/reference-python/src/cosmos_engine"
    pkg.mkdir(parents=True)
    for f in (cosmos / "engine/reference-python/src/cosmos_engine").glob("*.py"):
        (pkg / f.name).write_text(f.read_text(encoding="utf-8"), encoding="utf-8")
    subprocess.run(["git", "add", "cosmos"], cwd=repo, check=True)
    subprocess.run(["git", "commit", "-qm", "tooling"], cwd=repo, check=True)
    criteria = tmp_path / "criteria.json"
    criteria.write_text(json.dumps({"pk_max_rel_err": 0.02}), encoding="utf-8")
    out = tmp_path / "prereg.json"
    monkeypatch.setenv("COSMOS_PREREG_SECRET", "test-secret")
    subprocess.run([sys.executable, str(tool), "run-test", str(criteria), "--output", str(out)],
                   cwd=repo, check=True, env=os.environ.copy())
    payload = json.loads(out.read_text(encoding="utf-8"))
    assert payload["tag"] == "prereg-run-test"
    assert PreRegistration(payload["run_id"], payload["criteria"], payload["criteria_hash"],
                           payload["signature"], payload["registered_unix"]).verify(b"test-secret")
    tag = subprocess.check_output(["git", "rev-parse", "prereg-run-test^{}"], cwd=repo, text=True).strip()
    assert tag == payload["code_commit"]
