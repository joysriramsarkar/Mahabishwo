"""SimulationRun orchestrator: state machine + provenance + pre-registration.

Masterplan s14.1 / R-20 / R-21. State machine:
queued -> running -> checkpointed -> complete -> validated (or failed).
Every run carries a reproducibility manifest (seed, IC hash, code commit,
library versions, byte hashes). Pre-registration stores acceptance criteria
signed (SHA-256 over canonical JSON + secret key HMAC) BEFORE the run starts;
criteria cannot be edited afterwards without breaking the signature.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import platform
import sys
import time
import uuid
from dataclasses import dataclass, field, asdict
from enum import Enum


class RunState(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    CHECKPOINTED = "checkpointed"
    COMPLETE = "complete"
    VALIDATED = "validated"
    FAILED = "failed"


_ALLOWED = {
    RunState.QUEUED: {RunState.RUNNING, RunState.FAILED},
    RunState.RUNNING: {RunState.CHECKPOINTED, RunState.COMPLETE, RunState.FAILED},
    RunState.CHECKPOINTED: {RunState.RUNNING, RunState.COMPLETE, RunState.FAILED},
    RunState.COMPLETE: {RunState.VALIDATED, RunState.FAILED},
    RunState.VALIDATED: set(),
    RunState.FAILED: set(),
}


def _canonical(obj) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"),
                      ensure_ascii=False).encode("utf-8")


def content_hash(obj) -> str:
    return hashlib.sha256(_canonical(obj)).hexdigest()


@dataclass
class ProvenanceManifest:
    run_id: str
    seed: int
    parameter_set: str
    ic_hash: str
    code_commit: str
    code_version: str
    python_version: str
    platform: str
    library_versions: dict
    created_unix: float
    evidence: str = "SIM"
    license: str = "Apache-2.0"

    def manifest_hash(self) -> str:
        return content_hash(asdict(self))


@dataclass
class PreRegistration:
    run_id: str
    criteria: dict          # e.g. {"pk_max_rel_err": 0.02, "hmf_max_rel_err": 0.02}
    criteria_hash: str
    signature: str
    registered_unix: float

    @classmethod
    def create(cls, run_id: str, criteria: dict, secret: bytes) -> "PreRegistration":
        ch = content_hash(criteria)
        sig = hmac.new(secret, f"{run_id}:{ch}".encode(), hashlib.sha256).hexdigest()
        return cls(run_id, criteria, ch, sig, time.time())

    def verify(self, secret: bytes) -> bool:
        if content_hash(self.criteria) != self.criteria_hash:
            return False
        expect = hmac.new(secret, f"{self.run_id}:{self.criteria_hash}".encode(),
                          hashlib.sha256).hexdigest()
        return hmac.compare_digest(expect, self.signature)


@dataclass
class SimulationRun:
    mode: str = "statistical"     # statistical | twin | hybrid
    parameter_set: str = "Planck18"
    seed: int = 918273
    run_id: str = field(default_factory=lambda: f"run-{uuid.uuid4().hex[:12]}")
    state: RunState = RunState.QUEUED
    history: list = field(default_factory=list)
    manifest: ProvenanceManifest | None = None
    preregistration: PreRegistration | None = None

    def transition(self, to: RunState):
        if to not in _ALLOWED[self.state]:
            raise ValueError(f"illegal transition {self.state} -> {to}")
        self.state = to
        self.history.append({"state": to.value, "unix": time.time()})

    def build_manifest(self, ic_config: dict, code_commit: str = "unknown") -> ProvenanceManifest:
        import numpy, scipy
        self.manifest = ProvenanceManifest(
            run_id=self.run_id, seed=self.seed, parameter_set=self.parameter_set,
            ic_hash=content_hash(ic_config), code_commit=code_commit,
            code_version="cosmos-engine 0.1.0",
            python_version=sys.version.split()[0], platform=platform.platform(),
            library_versions={"numpy": numpy.__version__, "scipy": scipy.__version__},
            created_unix=time.time(),
        )
        return self.manifest

    def job_dag(self) -> list[dict]:
        """Ordered job DAG (Snakemake/Nextflow export target, s14.1)."""
        steps = ["ic.generate", "gravity.pm", "lightcone.write",
                 "galaxies.paint", "maps.healpix", "validation.pipeline"]
        return [{"step": s, "depends_on": steps[i - 1] if i else None,
                 "state": self.state.value} for i, s in enumerate(steps)]
