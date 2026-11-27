"""G2 particle-mesh gravity: CIC + FFT Poisson + KDK leapfrog in a.

From 03_pm_nbody_cola.py (missing numpy import fixed). Despite the original
filename this is a plain PM solver, not COLA - the COLA residual scheme is
production work (phase 5, external FastPM/COLA). on_step hook = light-cone.
"""
from __future__ import annotations

import numpy as np


def cic_deposit(pos, N, L):
    """Cloud-in-cell deposit -> overdensity delta (equal-mass particles)."""
    pos = np.asarray(pos, dtype=float)
    if pos.ndim != 2 or pos.shape[1] != 3 or len(pos) == 0:
        raise ValueError("pos must be a non-empty N x 3 array")
    if not isinstance(N, int) or isinstance(N, bool) or N < 1:
        raise ValueError("N must be a positive integer")
    if not np.isfinite(L) or L <= 0 or not np.all(np.isfinite(pos)):
        raise ValueError("L and positions must be finite; L must be positive")
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
    delta = np.asarray(delta, dtype=float)
    if delta.ndim != 3 or not np.all(np.isfinite(delta)):
        raise ValueError("delta must be a finite 3-D grid")
    if not np.isfinite(Om) or not np.isfinite(a) or a <= 0:
        raise ValueError("Om must be finite and a must be finite and positive")
    KX, KY, KZ, k = kvec
    expected_shape = delta.shape[:2] + (delta.shape[2] // 2 + 1,)
    if KX.shape != expected_shape or KY.shape != expected_shape or KZ.shape != expected_shape:
        raise ValueError("k vector grids do not match the rfft density grid")
    k2 = k**2
    if k.shape != delta.shape[:2] + (delta.shape[2] // 2 + 1,):
        raise ValueError("k grid does not match the rfft density grid")
    if np.any(k2 <= 0):
        raise ValueError("k grid must use a non-zero sentinel at k=0")
    dk = np.fft.rfftn(delta)
    phik = -1.5 * Om / a * dk / k2
    phik[0, 0, 0] = 0
    return [np.fft.irfftn(-1j * Ki * phik) for Ki in (KX, KY, KZ)]


def cic_interp(field, pos, N, L):
    pos = np.asarray(pos, dtype=float)
    if pos.ndim != 2 or pos.shape[1] != 3 or not np.all(np.isfinite(pos)):
        raise ValueError("pos must be a finite N x 3 array")
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
    if pos.shape != vel.shape or pos.ndim != 2 or pos.shape[1] != 3:
        raise ValueError("pos and vel must be matching N x 3 arrays")
    if not np.all(np.isfinite(pos)) or not np.all(np.isfinite(vel)):
        raise ValueError("pos and vel must be finite")
    if not isinstance(nsteps, int) or isinstance(nsteps, bool) or nsteps < 1:
        raise ValueError("nsteps must be a positive integer")
    if not np.isfinite(a_start) or not np.isfinite(a_end) or not 0 < a_start < a_end:
        raise ValueError("require finite 0 < a_start < a_end")
    if len(pos) == 0:
        raise ValueError("particle arrays must be non-empty")
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
    """Dimensionless mass ratio: deposited cell volume over particle volume.

    For equal-mass particles this should be one: CIC conserves the sum of
    rho+1, so dividing by the particle count removes the N^3 grid factor.
    """
    delta = cic_deposit(pos, N, L)
    return float((delta + 1.0).sum() / len(pos))
