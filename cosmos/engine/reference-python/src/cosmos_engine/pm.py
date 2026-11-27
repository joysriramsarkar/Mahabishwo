"""G2 particle-mesh gravity: CIC + FFT Poisson + KDK leapfrog in a.

From 03_pm_nbody_cola.py (missing numpy import fixed). Despite the original
filename this is a plain PM solver, not COLA - the COLA residual scheme is
production work (phase 5, external FastPM/COLA). on_step hook = light-cone.
"""
from __future__ import annotations

import numpy as np


def cic_deposit(pos, N, L):
    """Cloud-in-cell deposit -> overdensity delta (equal-mass particles)."""
    rho = np.zeros((N, N, N))
    g = pos / L * N
    i = np.floor(g).astype(int)
    f = g - i
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = ((f[:, 0] if dx else 1 - f[:, 0]) *
                     (f[:, 1] if dy else 1 - f[:, 1]) *
                     (f[:, 2] if dz else 1 - f[:, 2]))
                np.add.at(rho, ((i[:, 0] + dx) % N, (i[:, 1] + dy) % N,
                                (i[:, 2] + dz) % N), w)
    return rho / rho.mean() - 1.0


def pm_force(delta, kvec, L, Om, a):
    """Solve Poisson equation in Fourier space (code units H0=1)."""
    KX, KY, KZ, k = kvec
    k2 = k**2
    dk = np.fft.rfftn(delta)
    phik = -1.5 * Om / a * dk / k2
    phik[0, 0, 0] = 0
    return [np.fft.irfftn(-1j * Ki * phik) for Ki in (KX, KY, KZ)]


def cic_interp(field, pos, N, L):
    g = pos / L * N
    i = np.floor(g).astype(int)
    f = g - i
    out = np.zeros(len(pos))
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = ((f[:, 0] if dx else 1 - f[:, 0]) *
                     (f[:, 1] if dy else 1 - f[:, 1]) *
                     (f[:, 2] if dz else 1 - f[:, 2]))
                out += w * field[(i[:, 0] + dx) % N, (i[:, 1] + dy) % N,
                                 (i[:, 2] + dz) % N]
    return out


def make_kvec(N, L):
    kf = 2 * np.pi / L
    kx = np.fft.fftfreq(N, d=1 / N) * kf
    kz = np.fft.rfftfreq(N, d=1 / N) * kf
    KX, KY, KZ = np.meshgrid(kx, kx, kz, indexing="ij")
    k = np.sqrt(KX**2 + KY**2 + KZ**2)
    k[0, 0, 0] = 1e-10
    return KX, KY, KZ, k


def run_pm(pos, vel, kvec, N, L, cosmo, a_start, a_end, nsteps=20, on_step=None):
    """KDK leapfrog in scale factor a. vel = a^2 dx/dt (code units).

    on_step(pos, vel, a) is called after every full step - the on-the-fly
    light-cone writer hooks here (snapshot interpolation is forbidden, C-23).
    """
    pos = np.array(pos, dtype=float, copy=True)
    vel = np.array(vel, dtype=float, copy=True)
    a_grid = np.linspace(a_start, a_end, nsteps + 1)
    E = lambda a: float(cosmo.E(1 / a - 1))
    for a0, a1 in zip(a_grid[:-1], a_grid[1:]):
        am = 0.5 * (a0 + a1)
        delta = cic_deposit(pos, N, L)
        F = pm_force(delta, kvec, L, cosmo.Om, a0)
        acc = np.stack([cic_interp(Fi, pos, N, L) for Fi in F], -1)
        vel += acc * (am - a0) / (a0**2 * E(a0))
        pos = np.mod(pos + vel * (a1 - a0) / (am**3 * E(am)), L)
        delta = cic_deposit(pos, N, L)
        F = pm_force(delta, kvec, L, cosmo.Om, a1)
        acc = np.stack([cic_interp(Fi, pos, N, L) for Fi in F], -1)
        vel += acc * (a1 - am) / (a1**2 * E(a1))
        if on_step:
            on_step(pos, vel, a1)
    return pos, vel


def total_mass_proxy(pos, N, L):
    """Mass conservation proxy: CIC grid sum must equal particle count."""
    delta = cic_deposit(pos, N, L)
    return float((delta + 1.0).sum() * (L / N) ** 3 / (L**3 / len(pos)))
