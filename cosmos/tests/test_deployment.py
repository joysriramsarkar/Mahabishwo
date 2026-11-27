"""Deployment/HPC recipes are present and fail closed; no HPC claim is made."""
import importlib.util
from pathlib import Path

COSMOS = Path(__file__).resolve().parents[1]


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_container_and_apptainer_recipes_exist():
    docker = (COSMOS / "deploy/Dockerfile.api").read_text(encoding="utf-8")
    compose = (COSMOS / "deploy/docker-compose.yml").read_text(encoding="utf-8")
    apptainer = (COSMOS / "deploy/cosmos.def").read_text(encoding="utf-8")
    assert "python:3.11-slim" in docker and "uvicorn" in docker
    assert "postgres:16" in compose and "001_initial.sql" in compose
    assert "Bootstrap: docker" in apptainer and "%test" in apptainer
    assert "../tools /opt/cosmos/tools" in apptainer
    assert "../scientific-knowledge /opt/cosmos/scientific-knowledge" in apptainer


def test_hpc_readiness_missing_is_never_a_pass(monkeypatch):
    mod = _load("hpc_readiness", COSMOS / "tools/hpc_readiness.py")
    monkeypatch.setattr(mod.shutil, "which", lambda exe: None)
    result = mod.report(["phase5", "hpc"])
    assert result["ready"] is False
    assert set(result["missing"]) == {"class", "camb", "music", "cola", "fastpm",
                                      "gadget4", "rockstar", "apptainer", "sbatch"}


def test_hpc_readiness_all_present(monkeypatch):
    mod = _load("hpc_readiness2", COSMOS / "tools/hpc_readiness.py")
    monkeypatch.setattr(mod.shutil, "which", lambda exe: f"/usr/bin/{exe}")
    result = mod.report(["container"])
    assert result["ready"] is True and result["missing"] == []
