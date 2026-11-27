"""Fail-closed gate for emulator holdouts and mandatory evidence tags."""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
import math
from typing import Any, Iterable, Sequence

import numpy as np


@dataclass(frozen=True)
class EmulatorGateResult:
    """A gate result, including the exact evidence tag used by manifests."""

    status: str                 # PASS, FAIL, or UNAVAILABLE
    tag: str                    # mandatory EMU evidence tag
    detail: str
    evidence_tags: tuple[str, ...] = ()
    holdout_relative_errors: dict = field(default_factory=dict)
    max_relative_error: float | None = None
    tolerance: float | None = None
    passed: bool = False

    def as_dict(self) -> dict:
        result = asdict(self)
        result["evidence_tags"] = list(self.evidence_tags)
        return result


def _normalise_tags(tags: Iterable[str] | str | None) -> tuple[str, ...]:
    if tags is None:
        return ()
    values = [tags] if isinstance(tags, str) else list(tags)
    if any(not isinstance(tag, str) or not tag.strip() for tag in values):
        raise ValueError("evidence tags must be nonempty strings")
    return tuple(dict.fromkeys(values))


def _unavailable(reason: str, tags: tuple[str, ...], tolerance: float | None) -> EmulatorGateResult:
    return EmulatorGateResult(status="UNAVAILABLE", tag="EMU", detail=reason,
                              evidence_tags=tags, tolerance=tolerance)


def validate_emulator(truth: np.ndarray, prediction: np.ndarray, *, tolerance: float = 0.02,
                      evidence_tags: Iterable[str] | str | None = None,
                      provenance: dict | None = None,
                      parameters: Any = None, dimensions: Any = None) -> EmulatorGateResult:
    """Validate a real holdout, refusing synthetic/empty or untagged results.

    ``truth`` and ``prediction`` are equal-shaped, finite arrays with at least
    one strictly positive truth value per compared element.  Errors are
    ``abs(prediction / truth - 1)``.  No seed or automatic data generation is
    accepted here: synthetic test data must be written by the test, and the
    gate still requires a ``EMU`` tag plus holdout provenance.
    """
    tags = _normalise_tags(evidence_tags)
    if not math.isfinite(tolerance) or tolerance <= 0:
        raise ValueError("tolerance must be finite and positive")
    if "EMU" not in tags:
        return _unavailable("mandatory EMU evidence tag is missing", tags, tolerance)
    truth = np.asarray(truth, dtype=float)
    prediction = np.asarray(prediction, dtype=float)
    if truth.size == 0 or truth.shape != prediction.shape:
        return _unavailable("holdout is empty or truth/prediction shapes differ", tags, tolerance)
    if not np.all(np.isfinite(truth)) or not np.all(np.isfinite(prediction)):
        return _unavailable("holdout contains non-finite truth or predictions", tags, tolerance)
    if np.any(truth <= 0):
        return _unavailable("relative-error gate requires strictly positive truth", tags, tolerance)
    errors = np.abs(prediction / truth - 1.0)
    maximum = float(errors.max())
    passed = bool(maximum <= tolerance)
    error_by_element = {str(i): float(e) for i, e in enumerate(errors.ravel())}
    return EmulatorGateResult(
        status="PASS" if passed else "FAIL", tag="EMU",
        detail=("holdout within tolerance" if passed else "holdout exceeds tolerance"),
        evidence_tags=tags, holdout_relative_errors=error_by_element,
        max_relative_error=maximum, tolerance=tolerance, passed=passed,
    )


def train_polynomial_emulator(x: np.ndarray, y: np.ndarray, *, degree: int = 1,
                              parameters: Sequence[str] | None = None,
                              dimensions: Sequence[str] | None = None) -> dict:
    """Tiny deterministic training-data surrogate; inference is explicitly EMU.

    A diagonal quadratic model with normalised columns is sufficient to make
    the holdout gate executable without an ML dependency.  This is not a
    production hydro emulator.  Training data are supplied, never generated
    from the holdout.
    """
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    if x.ndim != 2 or y.ndim not in (1, 2) or len(x) != len(y) or len(x) < 3:
        raise ValueError("x must be 2-D and y matching, with at least three training rows")
    if not np.all(np.isfinite(x)) or not np.all(np.isfinite(y)):
        raise ValueError("training data must be finite")
    n_parameters = x.shape[1]
    if parameters is None:
        parameters = tuple(f"p{i}" for i in range(n_parameters))
    if dimensions is None:
        dimensions = ("value",) if y.ndim == 1 else tuple(f"d{i}" for i in range(y.shape[1]))
    if len(parameters) != n_parameters or len(dimensions) != (1 if y.ndim == 1 else y.shape[1]):
        raise ValueError("parameter/dimension labels do not match the training arrays")
    mean = x.mean(axis=0)
    scale = x.std(axis=0)
    scale[scale == 0] = 1.0
    z = (x - mean) / scale
    columns = [np.ones(len(x))]
    for i in range(n_parameters):
        columns.append(z[:, i])
    for i in range(n_parameters):
        for j in range(i, n_parameters):
            columns.append(z[:, i] * z[:, j])
    design = np.column_stack(columns)
    if design.shape[1] > len(x):
        raise ValueError("not enough training rows for the polynomial basis")
    coefficients, _, rank, _ = np.linalg.lstsq(design, y, rcond=None)
    if rank < design.shape[1]:
        raise ValueError("training design is rank deficient")
    return {"kind": "polynomial", "degree": 2, "mean": mean, "scale": scale,
            "coefficients": coefficients, "parameters": tuple(parameters),
            "dimensions": tuple(dimensions), "evidence_tag": "EMU",
            "training_rows": len(x), "note": "toy surrogate, not a phase-5 hydro emulator"}


def predict_emulator(model: dict, x: np.ndarray) -> np.ndarray:
    """Predict with a model returned by :func:`train_polynomial_emulator`."""
    x = np.asarray(x, dtype=float)
    if x.ndim != 2 or x.shape[1] != len(model["mean"]):
        raise ValueError("prediction parameter dimensions do not match the model")
    z = (x - model["mean"]) / model["scale"]
    columns = [np.ones(len(x))]
    for i in range(x.shape[1]):
        columns.append(z[:, i])
    for i in range(x.shape[1]):
        for j in range(i, x.shape[1]):
            columns.append(z[:, i] * z[:, j])
    return np.column_stack(columns) @ model["coefficients"]


def require_emulator_gate(result: EmulatorGateResult,
                          provenance: dict | None = None) -> EmulatorGateResult:
    """Second provenance gate: a numerical PASS alone is not approval."""
    tags = _normalise_tags((provenance or {}).get("evidence_tags"))
    if result.status == "PASS" and "EMU" not in tags:
        return EmulatorGateResult(
            status="UNAVAILABLE", tag="EMU",
            detail="holdout result lacks EMU provenance tag", evidence_tags=tags,
            tolerance=result.tolerance, max_relative_error=result.max_relative_error)
    return result
