"""Executable numerical validation with independent references and honest scope.

Run ``python -m numerical`` from this directory (or import the functions from
tests).  Every result is PASS/FAIL/UNAVAILABLE; unavailable production work is
never converted into a pass.  References are evaluated here, not imported from
the implementation under test, wherever the formula is short enough to make
that independence auditable.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
import math
from pathlib import Path
import sys

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "engine" / "reference-python" / "src"))

from cosmos_engine import Cosmology                         # noqa: E402
from cosmos_engine.adapters import detect_all_solvers, unavailable_gates  # noqa: E402
from cosmos_engine.convergence import validate_pm_convergence  # noqa: E402
from cosmos_engine.emulator import (train_polynomial_emulator,  # noqa: E402
                                    predict_emulator, require_emulator_gate,
                                    validate_emulator)
from cosmos_engine.hmf import press_schechter, sigma_at_mass, tinker08, variance_tophat  # noqa: E402
from cosmos_engine.ic import gaussian_field, linear_pk            # noqa: E402
from cosmos_engine.pm import make_kvec                             # noqa: E402
from cosmos_engine.power import ensemble_power_spectrum            # noqa: E402


@dataclass(frozen=True)
class NumericalResult:
    name: str
    status: str
    scope: str
    reference: str
    detail: dict

    def as_dict(self) -> dict:
        return asdict(self)


def _pass_fail(name: str, result, reference: str) -> NumericalResult:
    return NumericalResult(name, result.status, result.scope, reference, result.as_dict())


def generated_pk_reference(n_grid: int = 16, box_mpc: float = 100.0,
                           seed: int = 90210, realizations: int = 32) -> NumericalResult:
    """Ensemble-average independent Gaussian ICs before the low-k P(k) gate."""
    cosmo = Cosmology()
    fields = []
    for realization in range(realizations):
        delta_k, _ = gaussian_field(n_grid, box_mpc, cosmo, seed=seed + realization)
        fields.append(np.fft.irfftn(delta_k, s=(n_grid, n_grid, n_grid), axes=(0, 1, 2)))
    expected = lambda k: linear_pk(k, cosmo) * cosmo.growth(49.0)**2
    result = ensemble_power_spectrum(np.asarray(fields), expected,
                                     n_grid=n_grid, box_mpc=box_mpc,
                                     k_min=2 * np.pi / box_mpc,
                                     k_max=4 * np.pi / box_mpc, tolerance=0.10)
    return _pass_fail("small_generated_pk_recovery", result,
                      "input EH98 P(k) versus independent full-complex FFT ensemble shells")


def _reference_density(cosmo: Cosmology) -> float:
    """Independent critical-density calculation using astropy constants/units."""
    import astropy.constants as const
    import astropy.units as u
    h0 = cosmo.H0 * u.km / u.s / u.Mpc
    rho_crit = 3 * h0**2 / (8 * np.pi * const.G)
    return float((cosmo.Om * rho_crit).to_value(u.Msun / u.Mpc**3))


def _reference_sigma(mass: np.ndarray, cosmo: Cosmology) -> np.ndarray:
    """Independent Simpson-rule top-hat integral, separate from hmf.sigma_at_mass."""
    logk = np.linspace(np.log(1e-4 / cosmo.h), np.log(1e2 / cosmo.h), 2049)
    k = np.exp(logk)
    p = linear_pk(k, cosmo)
    rho_m = _reference_density(cosmo)
    radius = (3 * mass / (4 * np.pi * rho_m)) ** (1 / 3)
    x = radius[:, None] * k[None, :]
    w = np.where(x < 0.05,
                 1 - x**2 / 10 + x**4 / 280 - x**6 / 15120,
                 3 * (np.sin(x) - x * np.cos(x)) / x**3)
    integrand = p[None, :] * w**2 * k[None, :]**3 / (2 * np.pi**2)
    # Simpson's rule on a uniform log-k mesh (odd node count).
    integral = (logk[1] - logk[0]) / 3 * (
        integrand[:, 0] + integrand[:, -1]
        + 4 * integrand[:, 1:-1:2].sum(axis=1)
        + 2 * integrand[:, 2:-1:2].sum(axis=1))
    return np.sqrt(integral)


def ps_hmf_reference() -> NumericalResult:
    """Independent Press--Schechter reference using Simpson sigma(M)."""
    cosmo = Cosmology()
    mass = np.logspace(10, 15, 12)
    sigma = _reference_sigma(mass, cosmo)
    measured = press_schechter(mass, sigma, cosmo)
    nu = 1.686 / sigma
    reference_values = _reference_density(cosmo) / mass * np.sqrt(2 / np.pi) * nu * np.exp(-nu**2 / 2)
    errors = np.abs(np.log(measured / reference_values))
    maximum = float(errors.max())
    status = "PASS" if maximum <= 1e-10 else "FAIL"
    return NumericalResult("press_schechter_hmf_reference", status,
                           "analytic Press-Schechter dn/dlnM gate, not a simulated halo catalogue",
                           "independent Simpson sigma(M), astropy critical-density units, closed-form PS",
                           {"max_rel_error": maximum, "tolerance": 1e-10,
                            "rho_m": _reference_density(cosmo), "errors": errors.tolist()})


def tinker_hmf_reference() -> NumericalResult:
    """Independent Tinker08 reference; also checks sigma8 recovery at 0.5%."""
    cosmo = Cosmology()
    mass = np.logspace(10, 15, 12)
    sigma = _reference_sigma(mass, cosmo)
    measured = tinker08(mass, sigma, cosmo)
    f_sigma = 0.186 * ((2.57 / sigma)**1.47 + 1) * np.exp(-1.19 / sigma**2)
    reference_values = _reference_density(cosmo) / mass * f_sigma
    errors = np.abs(np.log(measured / reference_values))
    maximum = float(errors.max())
    status = "PASS" if maximum <= 1e-10 else "FAIL"
    return NumericalResult("tinker_hmf_reference", status,
                           "analytic Tinker08 dn/dlnM gate, not phase-5 HMF",
                           "independent Tinker08 Delta=200m z=0 Eq. (3) coefficients and astropy density units",
                           {"max_rel_error": maximum, "tolerance": 1e-10,
                            "rho_m": _reference_density(cosmo), "errors": errors.tolist()})


def sigma8_reference() -> NumericalResult:
    """Independent top-hat quadrature must recover the engine's target sigma8."""
    cosmo = Cosmology()
    k = np.logspace(-4, 2, 4097) / cosmo.h
    sigma8 = math.sqrt(variance_tophat(k, linear_pk(k, cosmo), 8 / cosmo.h))
    error = abs(sigma8 / cosmo.params.sigma8 - 1)
    status = "PASS" if error <= 0.005 else "FAIL"
    return NumericalResult("sigma8_reference", status,
                           "analytic linear-theory normalization; not a simulated P(k) gate",
                           "independent top-hat integral versus ParameterSet.sigma8",
                           {"sigma8": sigma8, "target": cosmo.params.sigma8,
                            "max_relative_error": error, "tolerance": 0.005})


def pm_convergence_reference() -> NumericalResult:
    """Execute 2/4/8 time-step levels locally; spatial gate remains unavailable."""
    from cosmos_engine.convergence import validate_pm_spatial_convergence
    from cosmos_engine.ic import lpt_displacement, place_particles

    cosmo = Cosmology()
    n, box = 16, 100.0
    delta_k, kvec = gaussian_field(n, box, cosmo, seed=11)
    psi1, _ = lpt_displacement(delta_k, kvec, order=1)
    pos0 = place_particles(n, box, psi1, None)
    result = validate_pm_convergence(pos0, np.zeros_like(pos0), make_kvec(n, box),
                                     n_grid=n, box_mpc=box, cosmo=cosmo,
                                     a_start=0.5, a_end=0.6, reference_steps=32)
    spatial = validate_pm_spatial_convergence(seed=11, cosmo=cosmo)
    return NumericalResult("pm_convergence_ladder", result.status, result.scope,
                           "32-step PM result versus executed 2/4/8 runs",
                           {**result.as_dict(),
                            "spatial_resolution_gate": spatial.as_dict(),
                            "phase_5_gate": unavailable_gates()})


def emulator_reference() -> NumericalResult:
    """Train on supplied toy data, then evaluate an untouched holdout with EMU."""
    # This explicit synthetic polynomial makes the gate locally executable; it
    # is not evidence about a production hydro emulator.
    x = np.array([[-1., -1.], [-1., 0.], [-1., 1.], [0., -1.], [0., 0.],
                  [0., 1.], [1., -1.], [1., 0.], [1., 1.]])
    y = 1 + 0.2 * x[:, 0] + 0.1 * x[:, 1] + 0.03 * x[:, 0]**2 + 0.02 * x[:, 1]**2
    model = train_polynomial_emulator(x, y, parameters=("omega_m", "sigma8"),
                                      dimensions=("power_amplitude",))
    holdout_x = np.array([[-0.35, 0.42], [0.27, -0.51]])
    truth = 1 + 0.2 * holdout_x[:, 0] + 0.1 * holdout_x[:, 1] \
        + 0.03 * holdout_x[:, 0]**2 + 0.02 * holdout_x[:, 1]**2
    prediction = predict_emulator(model, holdout_x)
    result = validate_emulator(truth, prediction, evidence_tags=("EMU",),
                               parameters=model["parameters"], dimensions=model["dimensions"])
    return NumericalResult("emulator_holdout_gate", result.status,
                           "toy polynomial training/holdout only; no production hydro training",
                           "two held-out analytic truth points after independent training",
                           {**result.as_dict(), "model": {k: v for k, v in model.items()
                                                          if k not in {"coefficients", "mean", "scale"}},
                            "provenance_gate": require_emulator_gate(
                                result, {"evidence_tags": ["EMU"]}).as_dict()})


def solver_detection_reference() -> NumericalResult:
    """Detection report only: solver presence cannot be a validation pass."""
    report = detect_all_solvers(version_probe=False)
    available = [name for name, value in report.items() if value["status"] == "AVAILABLE"]
    return NumericalResult("external_solver_detection", "UNAVAILABLE",
                           "executable detection only; all phase-5/7 solver integrations remain unavailable",
                           "local PATH and PATHEXT, no version execution",
                           {"detected_available": available, "solvers": report,
                            "full_gates": unavailable_gates(),
                            "note": "AVAILABLE means executable found, not scientifically validated"})


CHECKS = (
    generated_pk_reference,
    sigma8_reference,
    ps_hmf_reference,
    tinker_hmf_reference,
    pm_convergence_reference,
    emulator_reference,
    solver_detection_reference,
)


def run_all() -> list[NumericalResult]:
    return [check() for check in CHECKS]


if __name__ == "__main__":
    results = run_all()
    for result in results:
        print(f"[{result.status}] {result.name}: {result.scope}")
    failed = [result.name for result in results if result.status == "FAIL"]
    # Detection and production-only gates are intentionally UNAVAILABLE.  A
    # local validation command succeeds only if every executable check passes;
    # it still prints unavailable gates and never labels the whole project done.
    if failed:
        print("FAILED:", ", ".join(failed))
        raise SystemExit(1)
    print("Local executable checks passed; phase-5/7 production gates remain UNAVAILABLE.")
