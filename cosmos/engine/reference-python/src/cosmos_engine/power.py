"""Discrete P(k) estimators and common-k comparisons for small periodic boxes.

All functions use discrete Fourier modes.  For NumPy's unnormalised forward
FFT, P(k) = L^3 |<FFT(delta)>|^2 / N^6.  Matching finite-volume shells avoid
k-dependent Nyquist-mode weights when comparing a real-space FFT with an
rfft/irfft-generated field.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field

import numpy as np


@dataclass(frozen=True)
class PowerComparison:
    """Measurable, threshold-driven result of a common-k P(k) comparison."""

    status: str                 # PASS or FAIL
    scope: str
    reference: str
    tolerance: float
    k_min: float
    k_max: float
    modes_per_shell: int
    max_rel_error: float
    shell_errors: dict
    under_resolved: dict = field(default_factory=dict)
    effective_modes: int = 0
    ensemble_standard_errors: dict = field(default_factory=dict)
    shell_thresholds: dict = field(default_factory=dict)
    z_score: float | None = None

    @property
    def passed(self) -> bool:
        return self.status == "PASS"

    def as_dict(self) -> dict:
        return asdict(self)


def _validate_box(n_grid: int, box_mpc: float) -> tuple[int, float]:
    if not isinstance(n_grid, (int, np.integer)) or n_grid < 2:
        raise ValueError("n_grid must be an integer >= 2")
    if not np.isfinite(box_mpc) or box_mpc <= 0:
        raise ValueError("box_mpc must be finite and positive")
    return int(n_grid), float(box_mpc)


def mode_shells(n_grid: int, box_mpc: float) -> tuple[np.ndarray, np.ndarray]:
    """Return wavenumbers and integer indices for every unique Fourier shell."""
    n_grid, box_mpc = _validate_box(n_grid, box_mpc)
    kf = 2 * np.pi / box_mpc
    i = np.arange(n_grid)
    i[i > n_grid // 2] -= n_grid
    squares = i * i
    values, inverse = np.unique(squares[:, None, None] + squares[None, :, None]
                                + squares[None, None, :], return_inverse=True)
    return np.sqrt(values) * kf, inverse.reshape(n_grid, n_grid, n_grid)


def shell_mode_counts(n_grid: int, box_mpc: float) -> np.ndarray:
    """Real-field degrees of freedom in each full discrete Fourier shell.

    A conjugate pair supplies two real degrees of freedom and a
    self-conjugate Nyquist mode supplies one, so the full wavevector count is
    the effective N_modes in the fractional variance 2/N_modes.
    """
    _, inverse = mode_shells(n_grid, box_mpc)
    counts = np.bincount(inverse.ravel(), minlength=inverse.max() + 1).astype(int)
    counts[0] = 0  # the zero mode is constrained and is not a power sample
    return counts


def mode_power(delta: np.ndarray, n_grid: int, box_mpc: float) -> tuple[np.ndarray, np.ndarray]:
    """Estimate the periodogram P(|k|) for each full discrete shell."""
    n_grid, box_mpc = _validate_box(n_grid, box_mpc)
    delta = np.asarray(delta, dtype=float)
    if delta.shape != (n_grid, n_grid, n_grid) or not np.all(np.isfinite(delta)):
        raise ValueError("delta must be a finite N x N x N array")
    k, inverse = mode_shells(n_grid, box_mpc)
    dk = np.fft.fftn(delta)
    shell_power = np.bincount(inverse.ravel(), weights=np.abs(dk.ravel()) ** 2,
                              minlength=k.size)
    count = np.bincount(inverse.ravel(), minlength=k.size)
    # Mean over the full shell, then the unnormalised-FFT volume factor.
    p = shell_power / count * box_mpc**3 / n_grid**6
    p[0] = 0.0
    return k, p


def interpolated_power(k_shells: np.ndarray, p_shells: np.ndarray,
                       k_target: np.ndarray) -> np.ndarray:
    """Interpolate a positive discrete P(k), refusing extrapolation."""
    k_shells = np.asarray(k_shells, dtype=float)
    p_shells = np.asarray(p_shells, dtype=float)
    k_target = np.asarray(k_target, dtype=float)
    positive = k_shells > 0
    if not positive.any():
        raise ValueError("P(k) needs at least one positive shell")
    k_shells = k_shells[positive]
    p_shells = p_shells[positive]
    if p_shells.shape != k_shells.shape or np.any(p_shells < 0):
        raise ValueError("p_shells must be nonnegative and match k_shells")
    if k_target.ndim != 1 or not np.all(np.isfinite(k_target)):
        raise ValueError("k_target must be a finite 1-D array")
    if np.any(k_target < k_shells[0]) or np.any(k_target > k_shells[-1]):
        raise ValueError("P(k) interpolation cannot extrapolate outside the shells")
    return np.interp(k_target, k_shells, p_shells)


def validate_power_spectrum(delta: np.ndarray, linear_power, *, n_grid: int,
                            box_mpc: float, tolerance: float = 0.10,
                            k_min: float | None = None,
                            k_max: float | None = None,
                            min_modes_per_shell: int = 64) -> PowerComparison:
    """Compare a measured field to an independent input P(k) callable.

    This is a genuine generated-IC recovery gate, not a self-consistency check:
    the Gaussian field is generated from ``linear_power`` and measured by an
    independent FFT/shell estimator.  The toy tolerance includes sampling and
    CIC/FFT effects; it is not a substitute for the production phase-5 gate.

    A single real field has fractional power scatter sqrt(2 / N_modes), where
    N_modes is the full-shell real-field degree count.  Shells below
    ``min_modes_per_shell`` are reported as under-resolved and cannot turn the
    gate into PASS.  Use :func:`ensemble_power_spectrum` for low-k recovery.
    """
    if not np.isfinite(tolerance) or tolerance <= 0:
        raise ValueError("tolerance must be finite and positive")
    if not isinstance(min_modes_per_shell, (int, np.integer)) or min_modes_per_shell < 1:
        raise ValueError("min_modes_per_shell must be a positive integer")
    delta = np.asarray(delta, dtype=float)
    if delta.ndim != 3:
        raise ValueError("delta must be a 3-D field or a seed-by-3-D field ensemble")
    if delta.ndim == 3:
        k, measured = mode_power(delta, n_grid, box_mpc)
    else:
        raise ValueError("a single field must be three-dimensional; use ensemble_power_spectrum")
    counts = shell_mode_counts(n_grid, box_mpc)
    fundamental = 2 * np.pi / box_mpc
    lo = fundamental if k_min is None else float(k_min)
    hi = np.pi * n_grid / box_mpc if k_max is None else float(k_max)
    mask = (k >= lo) & (k <= hi)
    if not np.isfinite(lo) or not np.isfinite(hi) or lo <= 0 or hi <= lo:
        raise ValueError("require 0 < k_min < k_max")
    if mask.sum() < 2:
        raise ValueError("comparison needs at least two Fourier shells")
    expected = np.asarray(linear_power(k[mask]), dtype=float)
    if expected.shape != measured[mask].shape or np.any(expected <= 0):
        raise ValueError("linear_power must return positive values at each shell")
    errors = np.abs(measured[mask] / expected - 1.0)
    shell_errors = {float(ki): float(err) for ki, err in zip(k[mask], errors)}
    under_resolved = {
        float(ki): {"modes": int(count), "single_realization_sigma": float(np.sqrt(2 / count))}
        for ki, count in zip(k[mask], counts[mask])
        if count < min_modes_per_shell
    }
    resolved = np.array([ki not in under_resolved for ki in k[mask]])
    if not resolved.any():
        status = "UNAVAILABLE"
        maximum = float("nan")
        scope = "single-field P(k): every requested shell is under-resolved; no gate decision"
    else:
        maximum = float(errors[resolved].max())
        status = "PASS" if maximum <= tolerance else "FAIL"
        scope = "small generated-IC resolved-shell P(k) recovery; low-mode shells excluded"
    return PowerComparison(
        status=status, scope=scope,
        reference="independent FFT shell estimator versus supplied input P(k)",
        tolerance=float(tolerance), k_min=float(k[mask][0]), k_max=float(k[mask][-1]),
        modes_per_shell=int(counts[mask][resolved].sum()) if resolved.any() else 0,
        max_rel_error=maximum, shell_errors=shell_errors,
        under_resolved=under_resolved, effective_modes=int(counts[mask][resolved].sum()),
    )


def ensemble_power_spectrum(fields: np.ndarray, linear_power, *, n_grid: int,
                            box_mpc: float, tolerance: float = 0.10,
                            k_min: float | None = None,
                            k_max: float | None = None,
                            min_realizations: int = 16,
                            min_modes_per_shell: int = 1,
                             z_score: float = 3.0) -> PowerComparison:
    """Average power over independent generated fields, then compare to P(k).

    Each resolved shell passes when its relative error is below
    ``max(tolerance, z_score * sqrt(2 / (N_realizations * N_modes)))``.
    The tolerance is therefore a floor, not a globally relaxed limit; the
    per-shell sampling allowance is recorded in the result.
    """
    fields = np.asarray(fields, dtype=float)
    if fields.ndim != 4 or fields.shape[1:] != (n_grid, n_grid, n_grid):
        raise ValueError("fields must have shape (realizations, N, N, N)")
    if fields.shape[0] < min_realizations or not np.all(np.isfinite(fields)):
        raise ValueError(f"need at least {min_realizations} finite realizations")
    if not np.isfinite(tolerance) or tolerance <= 0:
        raise ValueError("tolerance must be finite and positive")
    if not np.isfinite(z_score) or z_score <= 0:
        raise ValueError("z_score must be finite and positive")
    if not isinstance(min_modes_per_shell, (int, np.integer)) or min_modes_per_shell < 1:
        raise ValueError("min_modes_per_shell must be a positive integer")
    spectra = np.asarray([mode_power(field, n_grid, box_mpc) for field in fields])
    k = spectra[0, 0]
    measured = spectra[:, 1, :].mean(axis=0)
    counts = shell_mode_counts(n_grid, box_mpc)
    fundamental = 2 * np.pi / box_mpc
    lo = fundamental if k_min is None else float(k_min)
    hi = np.pi * n_grid / box_mpc if k_max is None else float(k_max)
    mask = (k >= lo) & (k <= hi)
    if not np.isfinite(lo) or not np.isfinite(hi) or lo <= 0 or hi <= lo:
        raise ValueError("require 0 < k_min < k_max")
    if mask.sum() < 2:
        raise ValueError("comparison needs at least two Fourier shells")
    expected = np.asarray(linear_power(k[mask]), dtype=float)
    if expected.shape != measured[mask].shape or np.any(expected <= 0):
        raise ValueError("linear_power must return positive values at each shell")
    errors = np.abs(measured[mask] / expected - 1.0)
    selected_counts = counts[mask]
    resolved = selected_counts >= min_modes_per_shell
    if not resolved.any():
        raise ValueError("no requested shell meets min_modes_per_shell")
    resolved_k = k[mask][resolved]
    resolved_errors = errors[resolved]
    resolved_counts = selected_counts[resolved]
    sigmas = np.sqrt(2 / (fields.shape[0] * resolved_counts))
    thresholds_array = np.maximum(tolerance, z_score * sigmas)
    maximum = float(resolved_errors.max())
    standard_errors = {
        float(ki): float(sigma) for ki, sigma in zip(resolved_k, sigmas)
    }
    thresholds = {
        float(ki): float(threshold)
        for ki, threshold in zip(resolved_k, thresholds_array)
    }
    under_resolved = {
        float(ki): {
            "modes": int(count),
            "ensemble_sigma": float(np.sqrt(2 / (fields.shape[0] * count))),
        }
        for ki, count in zip(k[mask], selected_counts) if count < min_modes_per_shell
    }
    passed = bool(np.all(resolved_errors <= thresholds_array))
    return PowerComparison(
        status="PASS" if passed else "FAIL",
        scope=f"ensemble P(k) recovery over {fields.shape[0]} independent generated fields",
        reference="ensemble-mean independent FFT shells versus supplied input P(k)",
        tolerance=float(tolerance), k_min=float(k[mask][0]), k_max=float(k[mask][-1]),
        modes_per_shell=int(resolved_counts.sum()), max_rel_error=maximum,
        shell_errors={float(ki): float(err) for ki, err in zip(k[mask], errors)},
        under_resolved=under_resolved,
        effective_modes=int(fields.shape[0] * resolved_counts.sum()),
        ensemble_standard_errors=standard_errors,
        shell_thresholds=thresholds, z_score=float(z_score),
    )
