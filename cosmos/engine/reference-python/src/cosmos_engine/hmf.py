"""Press--Schechter and Tinker08 differential halo mass functions.

Units: M is M_sun, the returned dn/dlnM is Mpc^-3 at z=0 unless a
redshift is supplied.  Delta is relative to the *matter* density for
Tinker08; Press--Schechter also accepts ``delta_c`` for the usual 200 rho_c
approximation.  These analytic reference models are not N-body halo gates.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
import math

import numpy as np

_DELTAS = np.array([200., 300., 400., 600., 800., 1200., 1600., 2400., 3200.])
_ALPHA = np.array([.186, .200, .212, .218, .248, .255, .260, .260, .260])
_BETA = np.array([1.47, 1.52, 1.56, 1.61, 1.87, 2.13, 2.30, 2.53, 2.66])
_GAMMA = np.array([2.57, 2.25, 2.05, 1.87, 1.59, 1.51, 1.46, 1.44, 1.41])
_PHI = np.array([1.19, 1.27, 1.34, 1.45, 1.58, 1.80, 1.97, 2.24, 2.44])

# G in (km/s)^2 Mpc / M_sun.  H0 is km/s/Mpc, so 3 H0^2/(8 pi G)
# is M_sun/Mpc^3.  Keeping the conversion explicit prevents a 1e10 unit error.
_G_MPC_KMS2_MSUN = 4.300917270e-9


def matter_density(cosmo) -> float:
    """Present-day matter density rho_m = Omega_m rho_crit [M_sun/Mpc^3]."""
    return cosmo.Om * 3 * cosmo.H0**2 / (8 * np.pi * _G_MPC_KMS2_MSUN)


@dataclass(frozen=True)
class HmfComparison:
    """Result of comparing an observed dn/dlnM with an independent fit."""

    status: str                 # PASS or FAIL
    model: str
    reference: str
    tolerance: float
    mass_min: float
    mass_max: float
    max_rel_error: float
    errors: dict

    @property
    def passed(self) -> bool:
        return self.status == "PASS"

    def as_dict(self) -> dict:
        return asdict(self)


def _validate_mass(mass) -> np.ndarray:
    mass = np.atleast_1d(np.asarray(mass, dtype=float))
    if mass.ndim != 1 or not np.all(np.isfinite(mass)) or np.any(mass <= 0):
        raise ValueError("mass must be finite and positive")
    return mass


def _interp_delta(delta: float, table: np.ndarray) -> float:
    if not 200.0 <= delta <= 3200.0:
        raise ValueError("Tinker08 supports 200 <= Delta <= 3200")
    return float(np.interp(np.log10(delta), np.log10(_DELTAS), table))


def press_schechter(mass, sigma, cosmo, *, delta_c: float = 1.686,
                    mass_definition: str = "200m") -> np.ndarray:
    """Press--Schechter dn/dlnM [Mpc^-3] from sigma(M) and a cosmology.

    ``sigma`` may be a positive array at the requested masses.  The default
    uses nu = delta_c/sigma and collapses delta(z) to delta_c.  This collapse
    reference is defined for ``200m``; other definitions are rejected rather
    than silently mixing an SO fit with another halo definition.
    """
    if mass_definition != "200m":
        raise ValueError("collapse-reference PS implementation is defined for 200m only")
    if not np.isfinite(delta_c) or delta_c <= 0:
        raise ValueError("delta_c must be finite and positive")
    mass = _validate_mass(mass)
    sigma = np.asarray(sigma, dtype=float)
    if sigma.shape != mass.shape or np.any(sigma <= 0) or not np.all(np.isfinite(sigma)):
        raise ValueError("sigma must be positive and match mass")
    rho_m = matter_density(cosmo)
    nu = delta_c / sigma
    # Stable evaluation of sqrt(2/pi)*nu*exp(-nu^2/2).
    log_pdf = 0.5 * np.log(2 / np.pi) + np.log(nu) - 0.5 * nu**2
    # Values below the float64 floor are zero rather than a fabricated tail.
    return rho_m / mass * np.exp(log_pdf)


def tinker08_fsigma(sigma, *, delta: float = 200.0, redshift: float = 0.0,
                    mass_definition: str = "200m") -> np.ndarray:
    """Tinker et al. (2008) Eq. (3) f(nu), including redshift evolution."""
    if mass_definition != "200m":
        raise ValueError("Tinker08 is defined relative to the mean matter density")
    if not np.isfinite(redshift) or redshift < 0:
        raise ValueError("redshift must be finite and nonnegative")
    sigma = _validate_mass(sigma)  # same one-dimensional finite/positive rules
    a = 1.0 / (1.0 + redshift)
    p_a0 = _interp_delta(delta, _ALPHA)
    p_b0 = _interp_delta(delta, _BETA)
    p_c0 = _interp_delta(delta, _GAMMA)
    p_d = _interp_delta(delta, _PHI)
    log_delta = math.log10(delta)
    # Eq. (4): the Gamma redshift exponent approaches zero above Delta~247.
    gamma_scale = 10.0 ** (-(0.75 / (log_delta - 1.8750612633)) ** 1.2)
    return (p_a0 * a**0.14
            * ((p_c0 * a**gamma_scale / sigma) ** p_b0 + 1.0)
            * np.exp(-p_d / sigma**2))


def tinker08(mass, sigma, cosmo, *, delta: float = 200.0,
             redshift: float = 0.0, mass_definition: str = "200m") -> np.ndarray:
    """Tinker08 dn/dlnM [Mpc^-3] for Delta rho_m and a supplied sigma(M)."""
    if not 200.0 <= delta <= 3200.0:
        raise ValueError("Tinker08 supports 200 <= Delta <= 3200")
    mass = _validate_mass(mass)
    rho_m = matter_density(cosmo)
    return rho_m / mass * tinker08_fsigma(
        sigma, delta=delta, redshift=redshift, mass_definition=mass_definition)


def variance_tophat(k, power, radius: float) -> float:
    """Independent 3-D quadrature of sigma^2(R) = int dk k^2 P(k) W^2/(2pi^2)."""
    if not np.isfinite(radius) or radius <= 0:
        raise ValueError("radius must be finite and positive")
    k = np.asarray(k, dtype=float)
    power = np.asarray(power, dtype=float)
    if (k.ndim != 1 or power.shape != k.shape or k.size < 8
            or np.any(k <= 0) or np.any(power < 0)
            or not np.all(np.isfinite(k)) or not np.all(np.isfinite(power))):
        raise ValueError("k and power must be finite 1-D arrays with k > 0, P >= 0")
    if np.any(np.diff(k) <= 0):
        raise ValueError("k must be strictly increasing")
    x = k * radius
    # The series avoids 0/0 at R=0 and is accurate for the small-x quadrature nodes.
    window = np.empty_like(x)
    small = np.abs(x) < 0.05
    x2 = x[small]**2
    window[small] = 1 - x2 / 10 + x2**2 / 280 - x2**3 / 15120
    xx = x[~small]
    window[~small] = 3 * (np.sin(xx) - xx * np.cos(xx)) / xx**3
    integrate = np.trapezoid if hasattr(np, "trapezoid") else np.trapz
    return float(integrate(power * window**2 * k**2, k) / (2 * np.pi**2))


def sigma_at_mass(mass, k, power, cosmo) -> np.ndarray:
    """Compute sigma(M) from a sampled linear P(k) by 3-D quadrature.

    ``power`` is a callable P(k) with k in 1/Mpc.  The optional ``k`` argument
    accepts a supplied angular-k grid; if omitted, a dense grid spanning
    1e-4--1e2 h/Mpc is used.  Gauss-Legendre quadrature in log(k) is independent
    of the production ``ic.linear_pk`` sigma8 normalization mesh.
    """
    mass = _validate_mass(mass)
    if k is None:
        k = np.logspace(-4, 2, 4096) / cosmo.h
    k = np.asarray(k, dtype=float)
    if k.ndim != 1 or k.size < 8 or np.any(k <= 0) or not np.all(np.isfinite(k)):
        raise ValueError("k must be a finite one-dimensional positive grid")
    if np.any(np.diff(k) <= 0):
        raise ValueError("k must be strictly increasing")
    pp = np.asarray(power(k), dtype=float)
    if pp.shape != k.shape or np.any(pp <= 0) or not np.all(np.isfinite(pp)):
        raise ValueError("power must return positive finite values on the grid")
    # Fixed Gauss-Legendre nodes, rather than the production trapz mesh.
    nodes, weights = np.polynomial.legendre.leggauss(192)
    logk = np.log(k)
    logkq = 0.5 * (logk[-1] - logk[0]) * nodes + 0.5 * (logk[-1] + logk[0])
    kq = np.exp(logkq)
    pq = np.interp(logkq, logk, pp)
    rho_m = matter_density(cosmo)
    # k is sampled in 1/Mpc, matching linear_pk's documented convention.
    radius = (3 * mass / (4 * np.pi * rho_m)) ** (1 / 3)
    x = radius[:, None] * kq[None, :]
    window = np.empty_like(x)
    small = x < 0.05
    x2 = x[small]**2
    window[small] = 1 - x2 / 10 + x2**2 / 280 - x2**3 / 15120
    xx = x[~small]
    window[~small] = 3 * (np.sin(xx) - xx * np.cos(xx)) / xx**3
    variance = np.sum(weights[None, :] * pq[None, :] * kq[None, :]**3
                      * window**2, axis=1) * (0.5 * (logk[-1] - logk[0])
                                              / (2 * np.pi**2))
    return np.sqrt(variance)


def validate_hmf(mass, measured, sigma, cosmo, *, model: str = "tinker08",
                 tolerance: float = 0.02, delta: float = 200.0,
                 redshift: float = 0.0) -> HmfComparison:
    """Compare measured dn/dlnM with an independently evaluated analytic HMF.

    For the default Tinker08 path, ``measured`` is evaluated from a separately
    written reference implementation below; the test does not call
    ``tinker08`` for that side.  A Press--Schechter comparison is also supported.
    """
    if model not in {"tinker08", "press_schechter"}:
        raise ValueError("model must be 'tinker08' or 'press_schechter'")
    if not np.isfinite(tolerance) or tolerance <= 0:
        raise ValueError("tolerance must be finite and positive")
    mass = _validate_mass(mass)
    measured = np.asarray(measured, dtype=float)
    if measured.shape != mass.shape or not np.all(np.isfinite(measured)):
        raise ValueError("measured must be finite and match mass")
    sigma = np.asarray(sigma, dtype=float)
    if sigma.shape != mass.shape or np.any(sigma <= 0):
        raise ValueError("sigma must be positive and match mass")
    rho_m = matter_density(cosmo)
    if model == "press_schechter":
        reference = rho_m / mass * np.sqrt(2 / np.pi) * 1.686 / sigma * np.exp(
            -0.5 * (1.686 / sigma)**2)
        label = "Press-Schechter (delta_c=1.686 collapse)"
    else:
        # Deliberately independent reference implementation of Tinker Eq. 3.
        if delta != 200.0 or redshift != 0.0:
            raise ValueError("independent reference gate is implemented for Delta=200, z=0")
        f = .186 * ((2.57 / sigma) ** 1.47 + 1) * np.exp(-1.19 / sigma**2)
        reference = rho_m / mass * f
        label = "Tinker08 Delta=200m z=0 (independently evaluated)"
    # Compare logarithms in the exponentially suppressed tail; this remains a
    # relative mass-function comparison and avoids a 0/0 reference failure.
    positive = (measured > 0) & (reference > 0)
    both_zero = (measured == 0) & (reference == 0)
    errors = np.full(mass.shape, np.inf)
    errors[positive] = np.abs(np.log(measured[positive] / reference[positive]))
    errors[both_zero] = 0.0  # both are numerically zero in the suppressed tail
    maximum = float(errors.max())
    return HmfComparison(
        status="PASS" if maximum <= tolerance else "FAIL", model=model,
        reference=label, tolerance=float(tolerance), mass_min=float(mass.min()),
        mass_max=float(mass.max()), max_rel_error=maximum,
        errors={float(m): float(e) for m, e in zip(mass, errors)},
    )
