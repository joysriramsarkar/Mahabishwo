"""G6 galaxy painting: Zheng07 HOD + NFW satellites + toy SMHM.

From 05_hod_photometry.py (numpy import fixed). Parameters marked 'toy' in
the source stay toy - calibration against SMF/M*-Mhalo is validation step 4,
at most 5-6 tuned measurements (masterplan s12.1).
"""
from __future__ import annotations

import numpy as np
from scipy.special import erf


def hod_zheng07(logM, logMmin=12.0, sig=0.3, logM0=12.0, logM1=13.3, alpha=1.0):
    logM = np.asarray(logM, dtype=float)
    Ncen = 0.5 * (1 + erf((logM - logMmin) / sig))
    M, M0, M1 = 10**logM, 10**logM0, 10**logM1
    Nsat = Ncen * np.clip((M - M0) / M1, 0, None) ** alpha
    return Ncen, Nsat


def nfw_sample(n, c, rng):
    """Sample r/r_vir from an NFW profile, numeric inverse CDF.
    c may be scalar or per-sample array (reference assumed scalar)."""
    if n == 0:
        return np.empty(0)
    x = np.linspace(1e-3, 1, 2048)
    c_arr = np.broadcast_to(np.asarray(c, dtype=float), (n,))
    u = rng.random(n)
    out = np.empty(n)
    for i, ci in enumerate(c_arr):
        cdf = np.log(1 + ci * x) - ci * x / (1 + ci * x)
        cdf /= cdf[-1]
        out[i] = np.interp(u[i], cdf, x)
    return out


def paint_galaxies(halos, z, rng, cosmo=None):
    """halos: dict with logM, pos(N,3), vel(N,3), rvir, c."""
    Ncen, Nsat = hod_zheng07(np.asarray(halos["logM"]) + 0.1 * z)
    has_cen = rng.random(len(Ncen)) < Ncen
    nsat = rng.poisson(Nsat)
    out = [dict(pos=np.asarray(halos["pos"])[has_cen],
                vel=np.asarray(halos["vel"])[has_cen],
                logM=np.asarray(halos["logM"])[has_cen], central=True)]
    idx = np.repeat(np.arange(len(nsat)), nsat)
    if len(idx):
        r = nfw_sample(len(idx), np.asarray(halos["c"])[idx], rng) \
            * np.asarray(halos["rvir"])[idx]
        u = rng.normal(size=(len(idx), 3))
        u /= np.linalg.norm(u, axis=1)[:, None]
        sigv = np.sqrt(4.3e-9 * 10 ** np.asarray(halos["logM"])[idx]
                       / np.asarray(halos["rvir"])[idx])  # G in Mpc km^2/s^2/Msun
        out.append(dict(
            pos=np.asarray(halos["pos"])[idx] + r[:, None] * u,
            vel=np.asarray(halos["vel"])[idx]
                + rng.normal(size=(len(idx), 3)) * sigv[:, None] / np.sqrt(3),
            logM=np.asarray(halos["logM"])[idx], central=False))
    return out


def stellar_mass_from_halo(logMh, z, rng):
    """Behroozi-style SMHM, log-normal scatter 0.2 dex (toy parameters)."""
    logMh = np.asarray(logMh, dtype=float)
    M1 = 11.5 + 0.3 * z
    eps, a, b = 0.02, -1.4, 0.5
    x = logMh - M1
    logMs = np.log10(eps) + M1 + np.where(x < 0, a * x, b * x)
    return logMs + rng.normal(0, 0.2, size=np.shape(logMh))


def apparent_mag(logMs, sfr, z, cosmo, band="r"):
    """Very crude M/L stand-in for SPS (FSPS/SKIRT in production)."""
    logMs = np.asarray(logMs, dtype=float)
    sfr = np.asarray(sfr, dtype=float)
    ML = np.where(sfr < 0.1, 3.0, 1.0)
    Mabs = 4.65 - 2.5 * (logMs - np.log10(ML))
    mu = 5 * np.log10(cosmo.D_L(z) * 1e6 / 10)
    return Mabs + mu + 1.2 * z  # toy k-correction
