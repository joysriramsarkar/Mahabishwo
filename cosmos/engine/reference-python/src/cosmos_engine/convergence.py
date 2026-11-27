"""Small-scale PM time-step convergence ladder and explicit full-gate status."""
from __future__ import annotations

from dataclasses import asdict, dataclass
import math

import numpy as np

from .pm import run_pm, total_mass_proxy


@dataclass(frozen=True)
class ConvergenceResult:
    status: str                 # PASS, FAIL, or UNAVAILABLE
    scope: str
    reason: str | None
    mode: str
    levels: tuple[int, ...]
    errors: dict
    mass_errors: dict
    tolerance: float | None
    phase_5_status: str = "UNAVAILABLE"

    def as_dict(self) -> dict:
        result = asdict(self)
        result["levels"] = list(self.levels)
        return result


def _periodic_displacement(a: np.ndarray, b: np.ndarray, box: float) -> np.ndarray:
    delta = np.abs(a - b)
    return np.minimum(delta, box - delta)


def validate_pm_convergence(pos0: np.ndarray, vel0: np.ndarray, kvec, *, n_grid: int,
                            box_mpc: float, cosmo, a_start: float, a_end: float,
                            levels: tuple[int, ...] = (2, 4, 8),
                            reference_steps: int = 32,
                            tolerance: float = 0.02) -> ConvergenceResult:
    """Execute the local 2/4/8 PM ladder against a finer step reference.

    This is a genuinely executed step-convergence check.  It is *not* a spatial
    resolution ×2/×4/×8 study and cannot open the phase-5 gate.
    """
    levels = tuple(levels)
    if not levels or any(not isinstance(n, int) or n <= 0 for n in levels):
        raise ValueError("levels must contain positive integer time-step counts")
    if reference_steps <= max(levels):
        raise ValueError("reference_steps must exceed every ladder level")
    if not math.isfinite(tolerance) or tolerance <= 0:
        raise ValueError("tolerance must be finite and positive")
    if not 0 < a_start < a_end:
        raise ValueError("require 0 < a_start < a_end")
    pos_ref, _ = run_pm(pos0, vel0, kvec, n_grid, box_mpc, cosmo,
                        a_start, a_end, nsteps=reference_steps)
    errors: dict[int, float] = {}
    mass_errors: dict[int, float] = {}
    for steps in levels:
        pos, _ = run_pm(pos0, vel0, kvec, n_grid, box_mpc, cosmo,
                        a_start, a_end, nsteps=steps)
        errors[steps] = float(_periodic_displacement(pos, pos_ref, box_mpc).max()
                              / box_mpc)
        mass_errors[steps] = abs(total_mass_proxy(pos, n_grid, box_mpc) - 1.0)
    ordered = np.maximum.accumulate([errors[n] for n in levels])
    decreasing = bool(np.all(np.diff(ordered) <= 1e-12))
    within = bool(max(errors.values()) <= tolerance and max(mass_errors.values()) <= 1e-9)
    return ConvergenceResult(
        status="PASS" if decreasing and within else "FAIL",
        scope="local PM time-step ladder 2/4/8 versus 32 steps; not spatial convergence",
        reason=None if decreasing and within else "ladder is not decreasing within tolerance",
        mode="time steps per integration interval", levels=levels, errors=errors,
        mass_errors=mass_errors, tolerance=tolerance,
    )


def validate_pm_spatial_convergence(seed: int, *, box_mpc: float = 100.0,
                                    cosmo, levels: tuple[int, ...] = (2, 4, 8),
                                    nsteps: int = 8, tolerance: float = 0.02) -> ConvergenceResult:
    """Require resolution grids large enough for a real spatial ladder.

    Cosmological ICs need many cells per hour.  Executing N=2/4/8 would be
    numerically meaningless.  Even scientifically sized levels need production
    transfer matching and HPC resources, so this function remains UNAVAILABLE.
    No fake pass is produced for tiny grids.
    """
    if any(n < 32 for n in levels):
        return ConvergenceResult(
            status="UNAVAILABLE", scope="PM spatial resolution ×2/×4/×8",
            reason="requested spatial grids are below the 32^3 minimum; not scientifically meaningful",
            mode="cells per axis", levels=levels, errors={}, mass_errors={},
            tolerance=tolerance)
    return ConvergenceResult(
        status="UNAVAILABLE", scope="PM spatial resolution ×2/×4/×8",
        reason="production IC transfer, matching phase and HPC resources are not wired",
        mode="cells per axis", levels=levels, errors={}, mass_errors={},
        tolerance=tolerance)
