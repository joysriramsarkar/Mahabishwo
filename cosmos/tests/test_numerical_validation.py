"""Executable small-scale numerical gates and honest unavailable production gates.

These tests generate their own inputs.  They do not read a precomputed result
and do not treat an installed/absent executable as scientific validation.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

import numpy as np
import pytest

from cosmos_engine import Cosmology
from cosmos_engine.adapters import (SUPPORTED_SOLVERS, SolverAdapter, SolverUnavailable,
                                    detect_all_solvers, detect_solver,
                                    unavailable_gates)
from cosmos_engine.convergence import (validate_pm_convergence,
                                       validate_pm_spatial_convergence)
from cosmos_engine.emulator import (predict_emulator, require_emulator_gate,
                                    train_polynomial_emulator, validate_emulator)
from cosmos_engine.hmf import (matter_density, press_schechter, sigma_at_mass,
                               tinker08, validate_hmf)
from cosmos_engine.ic import gaussian_field, linear_pk, lpt_displacement, place_particles
import cosmos_engine.ic as ic_module
from cosmos_engine.pm import make_kvec
from cosmos_engine.power import (ensemble_power_spectrum, interpolated_power, mode_power,
                                 shell_mode_counts, validate_power_spectrum)

COSMOS = Path(__file__).resolve().parents[1]


def _load_numerical():
    path = COSMOS / "validation" / "pipeline" / "numerical.py"
    spec = importlib.util.spec_from_file_location("numerical_validation", path)
    module = importlib.util.module_from_spec(spec)
    import sys
    sys.modules[spec.name] = module  # dataclasses resolves postponed annotations here
    try:
        spec.loader.exec_module(module)
    finally:
        sys.modules.pop(spec.name, None)
    return module


# --- Generated small-box P(k) -------------------------------------------------
def test_generated_pk_is_recovered_by_independent_fft_ensemble():
    """Low-k shells need an ensemble: a single six-mode shell has ~58% scatter."""
    cosmo = Cosmology()
    n, box = 16, 100.0
    fields = []
    for seed in range(32):
        delta_k, _ = gaussian_field(n, box, cosmo, seed=seed)
        fields.append(np.fft.irfftn(delta_k, s=(n, n, n), axes=(0, 1, 2)))
    expected = lambda k: linear_pk(k, cosmo) * cosmo.growth(49.0)**2
    result = ensemble_power_spectrum(np.asarray(fields), expected,
                                     n_grid=n, box_mpc=box,
                                     k_min=2 * np.pi / box,
                                     k_max=4 * np.pi / box, tolerance=0.10)
    assert result.passed, result
    assert result.effective_modes >= 32 * 6
    assert result.z_score == 3.0
    assert result.ensemble_standard_errors
    assert result.shell_thresholds
    for k_value, error in result.shell_errors.items():
        if k_value in result.shell_thresholds:
            sigma = result.ensemble_standard_errors[k_value]
            assert result.shell_thresholds[k_value] == pytest.approx(
                max(result.tolerance, 3.0 * sigma))
            assert error <= result.shell_thresholds[k_value]
    assert result.max_rel_error <= max(result.shell_thresholds.values())


def test_gaussian_field_constant_power_normalization(monkeypatch):
    """Regression: unit white noise has N^3 FFT variance before volume scaling."""
    cosmo = Cosmology()
    n, box, p0 = 16, 100.0, 2.5e4
    monkeypatch.setattr(ic_module, "linear_pk", lambda k, *args, **kwargs: np.full_like(k, p0))
    fields = []
    for seed in range(32):
        delta_k, _ = gaussian_field(n, box, cosmo, seed=seed, z_init=0.0)
        fields.append(np.fft.irfftn(delta_k, s=(n, n, n), axes=(0, 1, 2)))
    result = ensemble_power_spectrum(np.asarray(fields), lambda k: np.full_like(k, p0),
                                     n_grid=n, box_mpc=box,
                                     k_min=2 * np.pi / box, k_max=np.pi * n / box,
                                     tolerance=0.10, min_modes_per_shell=6)
    # Check the normalization jointly over well-resolved shells.  Individual
    # low-mode shells remain noisy, but their aggregate has standard error
    # sqrt(2 / effective_modes); five sigma is a conservative regression gate.
    k = mode_power(fields[0], n, box)[0]
    counts = shell_mode_counts(n, box)
    selected = (k >= 2 * np.pi / box) & (k <= np.pi * n / box) & (counts >= 32)
    spectra = np.asarray([mode_power(field, n, box)[1][selected] for field in fields])
    ratio = float(spectra.mean() / p0)
    sigma = float(np.sqrt(2 / (len(fields) * counts[selected].sum())))
    assert abs(ratio - 1) <= 5 * sigma, (ratio, sigma, result)
    assert result.effective_modes > 1000


def test_low_mode_single_field_power_is_not_a_fake_pass():
    cosmo = Cosmology()
    n, box = 16, 100.0
    delta_k, _ = gaussian_field(n, box, cosmo, seed=90210)
    delta = np.fft.irfftn(delta_k, s=(n, n, n), axes=(0, 1, 2))
    result = validate_power_spectrum(delta, lambda k: linear_pk(k, cosmo),
                                     n_grid=n, box_mpc=box,
                                     k_min=2 * np.pi / box,
                                     k_max=4 * np.pi / box, tolerance=0.10)
    assert result.status == "UNAVAILABLE"
    assert result.under_resolved
    assert not result.passed


def test_mode_power_matches_direct_linear_delta_k():
    """An rfft-generated delta(k) must measure the same power as a full FFT."""
    n, box = 8, 50.0
    # Build delta(k) directly, with a known shell power and a real-space field.
    fundamental = 2 * np.pi / box
    kk = np.fft.fftfreq(n, d=1 / n) * fundamental
    KX, KY, KZ = np.meshgrid(kk, kk, kk, indexing="ij")
    delta_k = np.zeros((n, n, n), dtype=complex)
    delta_k[1, 0, 0] = 3.0 * n**3
    delta_k[-1, 0, 0] = 3.0 * n**3
    delta = np.fft.ifftn(delta_k).real
    k, p = mode_power(delta, n, box)
    assert p[1] == pytest.approx(3 * box**3, rel=1e-12)
    assert p[0] == 0
    assert interpolated_power(k, p, np.array([fundamental]))[0] == pytest.approx(
        3 * box**3)


def test_power_comparison_fails_when_input_spectrum_is_wrong():
    n, box = 8, 50.0
    rng = np.random.default_rng(4)
    delta = rng.normal(size=(n, n, n))
    with pytest.raises(ValueError):
        validate_power_spectrum(delta, lambda k: np.ones_like(k), n_grid=n,
                                box_mpc=box, tolerance=0.0)
    # A deliberately wrong reference cannot pass the threshold gate.
    result = validate_power_spectrum(delta, lambda k: np.ones_like(k) * 1e-12,
                                     n_grid=n, box_mpc=box, k_min=0.2, k_max=0.4,
                                     tolerance=0.5, min_modes_per_shell=1)
    assert result.status == "FAIL"
    assert result.max_rel_error > result.tolerance


# --- Independent Press--Schechter / Tinker HMF references --------------------
def test_matter_density_units_and_sigma_mass_reference():
    """rho_m is ~4e10 Msun/Mpc^3 and sigma(M) agrees with Simpson quadrature."""
    cosmo = Cosmology()
    rho_m = matter_density(cosmo)
    numerical = _load_numerical()
    assert rho_m == pytest.approx(numerical._reference_density(cosmo), rel=1e-10)
    assert 3.5e10 < rho_m < 4.5e10
    mass = np.logspace(10, 14, 8)
    engine_sigma = sigma_at_mass(mass, None, lambda k: linear_pk(k, cosmo), cosmo)
    reference_sigma = numerical._reference_sigma(mass, cosmo)
    assert np.allclose(engine_sigma, reference_sigma, rtol=2e-3)


def test_independent_sigma8_integral_and_hmf_references():
    numerical = _load_numerical()
    sigma8 = numerical.sigma8_reference()
    assert sigma8.status == "PASS", sigma8
    for check in (numerical.ps_hmf_reference, numerical.tinker_hmf_reference):
        result = check()
        assert result.status == "PASS", result
        assert result.detail["max_rel_error"] < 1e-10


def test_ps_and_tinker_are_distinct_and_redshift_evolves():
    cosmo = Cosmology()
    mass = np.logspace(9, 12, 8)
    # A toy variance curve keeps PS numerically representable while still
    # exercising distinct analytic mass functions.
    sigma = 0.2 * (mass / 1e10) ** -0.25
    ps = press_schechter(mass, sigma, cosmo)
    tinker = tinker08(mass, sigma, cosmo)
    assert np.all(ps > 0) and np.all(tinker > 0)
    assert not np.allclose(ps, tinker, rtol=0.01, atol=0.0)
    tinker_z1 = tinker08(mass, sigma, cosmo, redshift=1.0)
    assert np.all(np.isfinite(tinker_z1))
    assert not np.allclose(tinker, tinker_z1, atol=0.0)


def test_hmf_comparison_detects_bad_measured_values():
    cosmo = Cosmology()
    mass = np.array([1e11, 1e12, 1e13])
    sigma = np.array([2.0, 1.0, 0.5])
    # Positive analytic values remain measurable even in the exponentially
    # suppressed PS tail; validate_hmf supports a log-space comparison.
    bad = tinker08(mass, sigma, cosmo) * 1.2
    result = validate_hmf(mass, bad, sigma, cosmo, tolerance=0.02)
    assert result.status == "FAIL"
    assert result.max_rel_error == pytest.approx(np.log(1.2))


def test_hmf_refuses_wrong_mass_definition():
    cosmo = Cosmology()
    mass = np.array([1e12])
    with pytest.raises(ValueError):
        tinker08(mass, np.array([1.0]), cosmo, mass_definition="200c")
    with pytest.raises(ValueError):
        press_schechter(mass, np.array([1.0]), cosmo, mass_definition="virial")


# --- Executed PM convergence ladder ------------------------------------------
def test_pm_2_4_8_time_step_ladder_executes_and_converges():
    cosmo = Cosmology()
    n, box = 16, 100.0
    delta_k, kvec = gaussian_field(n, box, cosmo, seed=11)
    psi1, _ = lpt_displacement(delta_k, kvec, order=1)
    pos0 = place_particles(n, box, psi1, None)
    result = validate_pm_convergence(pos0, np.zeros_like(pos0), make_kvec(n, box),
                                     n_grid=n, box_mpc=box, cosmo=cosmo,
                                     a_start=0.5, a_end=0.6, levels=(2, 4, 8),
                                     reference_steps=32, tolerance=0.02)
    assert result.status == "PASS", result
    assert result.levels == (2, 4, 8)
    assert result.errors[2] >= result.errors[4] >= result.errors[8]
    assert all(error <= 1e-9 for error in result.mass_errors.values())
    assert result.phase_5_status == "UNAVAILABLE"


def test_spatial_2_4_8_ladder_is_explicitly_unavailable_at_toy_size():
    result = validate_pm_spatial_convergence(seed=1, cosmo=Cosmology())
    assert result.status == "UNAVAILABLE"
    assert "not scientifically meaningful" in result.reason
    assert unavailable_gates()["phase_5_resolution_convergence_2_4_8"] == "UNAVAILABLE"


# --- Solver detection / fail-closed invocation --------------------------------
@pytest.mark.parametrize("solver", SUPPORTED_SOLVERS)
def test_every_solver_adapter_reports_availability_without_fake_pass(solver, monkeypatch):
    monkeypatch.setenv("PATH", "")
    monkeypatch.setenv("PATHEXT", ".EXE")
    status = detect_solver(solver, version_probe=False, environ={})
    assert status.status == "UNAVAILABLE"
    assert status.reason
    assert status.executable is None
    adapter = __import__("cosmos_engine.adapters", fromlist=["get_adapter"]).get_adapter(solver)
    with pytest.raises(SolverUnavailable):
        adapter.command("input", "output")
    assert adapter.invoke("input", "output").status == "UNAVAILABLE"
    assert "phase" not in status.status.lower()


def test_adapter_detects_a_generated_executable_and_executes_it(tmp_path):
    """The adapter executes a local stub; it never substitutes for real solver validation."""
    if __import__("os").name != "nt":
        pytest.skip("generated .bat probe is Windows-specific")
    exe = tmp_path / "stub-solver.bat"
    out = tmp_path / "output.txt"
    exe.write_text("@echo off\nif \"%1\"==\"--version\" (echo stub 1.0 & exit /b 0)\n"
                   f"echo ran > \"{out}\"\nexit /b 0\n", encoding="utf-8")
    adapter = SolverAdapter("STUB", "test execution", (str(exe),),
                            run_args=("run", "{input}", "{output}"), version_args=("--version",))
    status = adapter.detect()
    assert status.status == "AVAILABLE"
    assert status.version == "stub 1.0"
    invocation = adapter.invoke(tmp_path / "input.yaml", out)
    assert invocation.status == "COMPLETED"
    assert out.exists()
    # A completed test process still carries no scientific pass claim.
    assert "scientific output validation" in invocation.detection


def test_adapter_without_run_template_is_unavailable_not_a_pass():
    adapter = SolverAdapter("ABSENT", "test", ("definitely-not-a-real-cosmos-solver.exe",))
    assert adapter.detect(version_probe=False).status == "UNAVAILABLE"
    result = adapter.invoke("input", "output")
    assert result.status == "UNAVAILABLE"
    assert not result.available


def test_solver_detection_report_keeps_phase_5_and_7_unavailable():
    numerical = _load_numerical()
    result = numerical.solver_detection_reference()
    assert result.status == "UNAVAILABLE"
    assert set(result.detail["full_gates"].values()) == {"UNAVAILABLE"}
    assert "AVAILABLE means executable found" in result.detail["note"]


# --- Emulator holdout gate ----------------------------------------------------
def test_emulator_trains_and_passes_untouched_holdout_with_mandatory_emu_tag():
    numerical = _load_numerical()
    result = numerical.emulator_reference()
    assert result.status == "PASS", result
    assert result.detail["tag"] == "EMU"
    assert "EMU" in result.detail["evidence_tags"]
    assert result.detail["model"]["training_rows"] == 9
    assert len(result.detail["holdout_relative_errors"]) == 2


def test_emulator_rejects_missing_emu_tag_empty_holdout_and_large_error():
    truth = np.array([1.0, 2.0])
    prediction = np.array([1.0, 2.0])
    missing = validate_emulator(truth, prediction, evidence_tags=("SIM",))
    assert missing.status == "UNAVAILABLE"
    assert "EMU" in missing.detail
    empty = validate_emulator(np.array([]), np.array([]), evidence_tags=("EMU",))
    assert empty.status == "UNAVAILABLE"
    bad = validate_emulator(truth, np.array([1.03, 2.0]), evidence_tags=("EMU",),
                            tolerance=0.02)
    assert bad.status == "FAIL"
    assert bad.max_relative_error == pytest.approx(0.03)
    # Numerical PASS cannot be approved without matching provenance.
    downgraded = require_emulator_gate(bad, {"evidence_tags": ["SIM"]})
    assert downgraded.status == "FAIL"  # never upgrades an existing failure


def test_emulator_holdout_must_not_be_training_data():
    x = np.array([[-1.], [0.], [1.]])
    y = 1 + x[:, 0]**2
    model = train_polynomial_emulator(x, y, parameters=("x",), dimensions=("y",))
    # Training points are not a holdout; inference on them is merely a smoke check.
    assert predict_emulator(model, x).shape == y.shape
    assert model["evidence_tag"] == "EMU"
    with pytest.raises(ValueError):
        validate_emulator(np.array([1.0]), np.array([1.0]), evidence_tags=("EMU",),
                          tolerance=0.0)
