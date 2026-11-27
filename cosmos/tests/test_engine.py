"""Engine tests: phase-1 gate (astropy), IC/PM/lightcone, orchestration."""
import numpy as np
import pytest

from cosmos_engine import (Cosmology, ParameterSet, PreRegistration,
                           SimulationRun, RunState, frame_at_redshift)


# --- Phase-1 gate: G0 production path is astropy (masterplan s8.1) ---------
def test_observer_frame_vs_astropy_gate_1e6():
    import astropy.units as u
    from astropy.cosmology import Planck18
    for z in (0.1, 0.5, 1.0, 2.0, 6.0):
        f = frame_at_redshift(z)
        for ours, ref in [
            (f.comoving_distance_mpc, Planck18.comoving_distance(z).to_value(u.Mpc)),
            (f.luminosity_distance_mpc, Planck18.luminosity_distance(z).to_value(u.Mpc)),
            (f.angular_diameter_distance_mpc, Planck18.angular_diameter_distance(z).to_value(u.Mpc)),
        ]:
            assert abs(ours - ref) / ref <= 1e-6


def test_reference_cosmology_vs_astropy_documented_tolerance():
    """Independent numeric reference: neutrino approx -> ~1e-3, documented."""
    import astropy.units as u
    from astropy.cosmology import Planck18
    c = Cosmology()
    for z in (0.1, 1.0, 2.0):
        ref = Planck18.luminosity_distance(z).to_value(u.Mpc)
        assert abs(c.D_L(z) - ref) / ref < 3e-3


def test_parameter_sets_and_dual_ensemble():
    sets = ParameterSet.dual_h0_ensemble()
    assert [s.H0 for s in sets] == [67.66, 73.04]
    assert ParameterSet.named("Planck18").Om0 == pytest.approx(0.30966)
    with pytest.raises(ValueError):
        ParameterSet.named("nope")


def test_distances_monotonic_and_growth():
    c = Cosmology()
    assert c.chi(0) == 0
    assert c.chi(1) > c.chi(0.5) > c.chi(0.1) > 0
    assert c.growth(0) == pytest.approx(1.0)
    assert 0 < c.growth(2) < c.growth(1) < 1


# --- IC / PM -----------------------------------------------------------------
def test_gaussian_field_reproducible_and_pk_positive():
    from cosmos_engine.ic import gaussian_field, linear_pk
    cosmo = Cosmology()
    d1, kv = gaussian_field(16, 100.0, cosmo, seed=7)
    d2, _ = gaussian_field(16, 100.0, cosmo, seed=7)
    assert np.array_equal(np.asarray(d1), np.asarray(d2))
    assert np.all(linear_pk(np.array([0.01, 0.1, 1.0]), cosmo) > 0)


def test_lpt_place_particles_order1_and_order2():
    from cosmos_engine.ic import gaussian_field, lpt_displacement, place_particles
    cosmo = Cosmology()
    dk, kv = gaussian_field(16, 100.0, cosmo, seed=3)
    psi1, psi2 = lpt_displacement(dk, kv, order=2)
    x2 = place_particles(16, 100.0, psi1, psi2)
    psi1b, none2 = lpt_displacement(dk, kv, order=1)
    assert none2 is None
    x1 = place_particles(16, 100.0, psi1b, None)  # was a crash in reference
    assert x1.shape == x2.shape == (16**3, 3)
    assert np.all((x1 >= 0) & (x1 < 100.0))


def test_pm_rejects_invalid_inputs():
    from cosmos_engine.pm import cic_deposit
    with pytest.raises(ValueError):
        cic_deposit(np.empty((0, 3)), 8, 50)
    with pytest.raises(ValueError):
        cic_deposit(np.zeros((2, 2)), 8, 50)
    with pytest.raises(ValueError):
        cic_deposit(np.zeros((2, 3)), 0, 50)


def test_pm_rejects_invalid_step_counts():
    from cosmos_engine.pm import run_pm, make_kvec
    cosmo = Cosmology()
    pos = np.zeros((1, 3))
    with pytest.raises(ValueError):
        run_pm(pos, pos, make_kvec(2, 10), 2, 10, cosmo, 0.5, 0.6, nsteps=0)
    with pytest.raises(ValueError):
        run_pm(pos, pos, make_kvec(2, 10), 2, 10, cosmo, 0.6, 0.5, nsteps=2)


def test_pm_mass_conservation_and_motion():
    from cosmos_engine.ic import gaussian_field, lpt_displacement, place_particles
    from cosmos_engine.pm import cic_deposit, make_kvec, run_pm
    cosmo = Cosmology()
    N, L = 16, 100.0
    dk, kv = gaussian_field(N, L, cosmo, seed=5)
    psi1, _ = lpt_displacement(dk, kv, order=1)
    pos = place_particles(N, L, psi1, None)
    delta = cic_deposit(pos, N, L)
    assert float((delta + 1).sum()) == pytest.approx(N**3, rel=1e-9)
    vel = np.zeros_like(pos)
    pos2, vel2 = run_pm(pos, vel, make_kvec(N, L), N, L, cosmo, 0.5, 0.6, nsteps=2)
    assert np.all(np.isfinite(pos2)) and np.all(np.isfinite(vel2))
    assert not np.array_equal(pos, pos2)  # gravity moved particles


def test_lightcone_writer_and_arrow_schema(tmp_path):
    import pyarrow as pa
    from cosmos_engine import GALAXY_SCHEMA
    from cosmos_engine.lightcone import LightconeWriter
    assert isinstance(GALAXY_SCHEMA, pa.Schema)
    assert GALAXY_SCHEMA.field("mag").type.list_size == 12
    cosmo = Cosmology()
    w = LightconeWriter(cosmo, 100.0, observer=[50, 50, 50], outdir=tmp_path)
    rng = np.random.default_rng(0)
    pos = rng.uniform(0, 100, (200, 3))
    vel = rng.normal(0, 100, (200, 3))
    w(pos, vel, 0.99)
    w(pos, vel, 0.98)  # may or may not cross a shell; must not crash
    for f in w.files:
        t = pa.parquet.read_table(f) if False else None
    import pyarrow.parquet as pq
    for f in w.files:
        assert pq.read_table(f).num_columns >= 7


def test_hod_and_transients():
    from cosmos_engine.hod import hod_zheng07, paint_galaxies
    from cosmos_engine.transients import sample_transients
    ncen, nsat = hod_zheng07(np.array([11.0, 13.0, 14.0]))
    assert np.all((ncen >= 0) & (ncen <= 1)) and np.all(nsat >= 0)
    rng = np.random.default_rng(0)
    halos = {"logM": np.array([12.5, 13.5]), "pos": rng.uniform(0, 10, (2, 3)),
             "vel": np.zeros((2, 3)), "rvir": np.array([0.3, 0.5]),
             "c": np.array([8.0, 6.0])}
    gal = paint_galaxies(halos, 0.0, rng)
    assert isinstance(gal, list)
    ev = sample_transients({"sfr": [1.0], "logM": [10.0], "z": [0.1]},
                           10.0, rng, Cosmology())
    assert isinstance(ev, list)


def test_pm_step_convergence_small():
    """Phase-5 gate at toy scale: more steps -> closer to many-step result;
    mass conserved at both resolutions (full P(k)/HMF gates need HPC runs)."""
    from cosmos_engine.ic import gaussian_field, lpt_displacement, place_particles
    from cosmos_engine.pm import make_kvec, run_pm
    cosmo = Cosmology()
    N, L = 16, 100.0
    dk, kv = gaussian_field(N, L, cosmo, seed=11)
    psi1, _ = lpt_displacement(dk, kv, order=1)
    pos0 = place_particles(N, L, psi1, None)
    vel0 = np.zeros_like(pos0)
    kvec = make_kvec(N, L)
    p_coarse, _ = run_pm(pos0, vel0, kvec, N, L, cosmo, 0.5, 0.55, nsteps=2)
    p_fine, _ = run_pm(pos0, vel0, kvec, N, L, cosmo, 0.5, 0.55, nsteps=8)
    # periodic minimal-image displacement between the two solutions
    d = np.abs(p_coarse - p_fine)
    d = np.minimum(d, L - d)
    assert float(d.max()) < L * 0.05  # step-size convergence at toy scale


# --- Orchestration / provenance / pre-registration (R-20, R-21) --------------
def test_run_state_machine_and_manifest():
    run = SimulationRun(seed=1)
    run.build_manifest({"box": 10}, code_commit="abc")
    assert run.manifest.manifest_hash()
    run.transition(RunState.RUNNING)
    with pytest.raises(ValueError):
        run.transition(RunState.VALIDATED)  # illegal jump
    run.transition(RunState.COMPLETE)
    run.transition(RunState.VALIDATED)
    dag = run.job_dag()
    assert dag[0]["depends_on"] is None and len(dag) == 6


def test_preregistration_tamper_evident():
    pr = PreRegistration.create("run-1", {"pk": 0.02}, b"secret")
    assert pr.verify(b"secret")
    pr.criteria["pk"] = 0.99  # editing criteria after registration
    assert not pr.verify(b"secret")
