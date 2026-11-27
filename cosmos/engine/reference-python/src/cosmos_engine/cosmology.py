"""G0 background cosmology: E(z), distances, age, linear growth.

Reference implementation (from 01_background_cosmology.py, cleaned).
Gate (phase 1): D_L / D_A vs astropy within 1e-6 relative - see tests.
"""
from __future__ import annotations

import numpy as np
from scipy.integrate import quad

from .parameters import ParameterSet

C_KMS = 299792.458  # speed of light, km/s


class Cosmology:
    def __init__(self, params: ParameterSet | None = None, **legacy):
        if legacy:  # backward-compat with reference file's kwargs
            base = ParameterSet.named("Planck18")
            mapping = {"h": None, "Om": "Om0", "Ob": None, "OL": None,
                       "Tcmb": "Tcmb", "Neff": "Neff", "w0": "w0", "wa": "wa"}
            overrides = {}
            for k, v in legacy.items():
                if k == "h":
                    overrides["H0"] = 100.0 * v
                elif mapping.get(k):
                    overrides[mapping[k]] = v
            from dataclasses import replace
            params = replace(base, name="legacy-custom", **overrides)
        self.params = params or ParameterSet.named("Planck18")
        p = self.params
        self.h = p.h
        self.H0 = p.H0
        self.Om = p.Om0
        self.Ob = p.Ob0
        self.OL = p.Ode0
        self.w0, self.wa = p.w0, p.wa
        Og = 2.4728e-5 / self.h**2 * (p.Tcmb / 2.7255) ** 4
        self.Or = Og * (1 + 0.2271 * p.Neff)
        # Massive-neutrino density today: Omega_nu h^2 ~= sum(m_nu)/93.14 eV.
        # Without this, flat closure overstates Omega_Lambda by ~0.0015 and
        # distances drift ~8e-4 from astropy Planck18 (found in phase-1 gate).
        self.Onu = (p.sum_mnu_eV / 93.14) / self.h**2 if p.sum_mnu_eV else 0.0
        self.OL = 1.0 - self.Om - self.Or - self.Onu  # flat closure
        self.Ok = 1.0 - self.Om - self.OL - self.Or - self.Onu

    # -- expansion ---------------------------------------------------------
    def E(self, z):
        """Dimensionless Hubble rate H(z)/H0, CPL dark energy."""
        z = np.asarray(z, dtype=float)
        a = 1.0 / (1.0 + z)
        fde = a ** (-3 * (1 + self.w0 + self.wa)) * np.exp(-3 * self.wa * (1 - a))
        # Om here is baryons+CDM (Ob+Oc from the ParameterSet); the massive
        # neutrino density is added separately ~(1+z)^3 at low z. This is an
        # approximation to astropy's full Fermi-Dirac treatment - measured
        # deviation ~1e-3 in D_L, documented in tests. The production G0 path
        # (observer.frame_at_redshift, astropy Planck18) meets the 1e-6 gate.
        return np.sqrt(self.Or * (1 + z) ** 4 + self.Om * (1 + z) ** 3
                       + self.Onu * (1 + z) ** 3
                       + self.Ok * (1 + z) ** 2 + self.OL * fde)

    def chi(self, z) -> float:
        """Line-of-sight comoving distance [Mpc]."""
        if z == 0:
            return 0.0
        val, _ = quad(lambda zz: 1.0 / float(self.E(zz)), 0, float(z),
                      limit=200, epsabs=1e-12, epsrel=1e-12)
        return C_KMS / self.H0 * val

    def D_A(self, z) -> float:
        return self.chi(z) / (1 + z)

    def D_L(self, z) -> float:
        return self.chi(z) * (1 + z)

    def age(self, z) -> float:
        """Age of the universe at redshift z [Gyr]."""
        val, _ = quad(lambda zz: 1.0 / ((1 + zz) * float(self.E(zz))),
                      float(z), np.inf, limit=200, epsabs=1e-12, epsrel=1e-10)
        return 977.8 / self.H0 * val

    def lookback(self, z) -> float:
        return self.age(0) - self.age(z)

    def growth(self, z) -> float:
        """Linear growth factor D(z), normalised D(0)=1 (Heath integral)."""
        def D_of_a(a: float) -> float:
            val, _ = quad(lambda aa: 1.0 / (aa * float(self.E(1 / aa - 1))) ** 3,
                          1e-6, a, limit=200, epsabs=1e-12, epsrel=1e-10)
            return 2.5 * self.Om * float(self.E(1 / a - 1)) * val
        return D_of_a(1.0 / (1.0 + z)) / D_of_a(1.0)
