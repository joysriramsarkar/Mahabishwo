"""ParameterSet - single source of cosmological parameters (masterplan s3.4).

Default = Planck18 (astropy-compatible). Named alternatives are runtime sets,
not competing hard-coded values. H0 tension (U15): dual ensemble mandatory.
"""
from __future__ import annotations

from dataclasses import dataclass, replace


@dataclass(frozen=True)
class ParameterSet:
    name: str
    H0: float          # km/s/Mpc
    H0_sigma: float
    Om0: float         # total matter today
    Ob_h2: float       # baryon physical density
    Oc_h2: float       # CDM physical density
    sigma8: float
    ns: float
    tau: float
    Tcmb: float = 2.72548
    Neff: float = 3.044
    sum_mnu_eV: float = 0.06
    w0: float = -1.0
    wa: float = 0.0
    source: str = ""

    @property
    def h(self) -> float:
        return self.H0 / 100.0

    @property
    def Ob0(self) -> float:
        return self.Ob_h2 / self.h**2

    @property
    def Oc0(self) -> float:
        return self.Oc_h2 / self.h**2

    @property
    def Ode0(self) -> float:
        # Flat by default (|Omega_k| <~ 0.002, masterplan s3.4); radiation
        # is handled inside Cosmology.E and is negligible in this closure.
        return 1.0 - self.Om0

    @classmethod
    def named(cls, name: str) -> "ParameterSet":
        try:
            return _NAMED[name]
        except KeyError:
            raise ValueError(
                f"unknown ParameterSet {name!r}; available: {sorted(_NAMED)}"
            ) from None

    @classmethod
    def custom(cls, name: str = "custom", **overrides) -> "ParameterSet":
        base = cls.named("Planck18")
        return replace(base, name=name, source="custom overrides on Planck18", **overrides)

    @classmethod
    def from_yaml(cls, path) -> "ParameterSet":
        """Load one canonical YAML parameter set (PyYAML is a dev/runtime extra)."""
        from pathlib import Path
        try:
            import yaml
        except ImportError as exc:  # pragma: no cover
            raise ImportError("PyYAML required to load parameter-set YAML") from exc
        data = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError("parameter-set YAML must be a mapping")
        allowed = {f for f in cls.__dataclass_fields__}
        unknown = set(data) - allowed
        if unknown:
            raise ValueError(f"unknown ParameterSet fields: {sorted(unknown)}")
        return cls(**data)

    @classmethod
    def dual_h0_ensemble(cls) -> list["ParameterSet"]:
        """Mandatory pair for any local-distance result (masterplan s3.4/U15)."""
        return [cls.named("Planck18"), cls.named("SH0ES")]


_NAMED: dict[str, ParameterSet] = {
    # Planck 2018 TT,TE,EE+lowE+lensing+BAO via astropy Planck18 values.
    "Planck18": ParameterSet(
        name="Planck18", H0=67.66, H0_sigma=0.42, Om0=0.30966,
        Ob_h2=0.02242, Oc_h2=0.11933, sigma8=0.8102, ns=0.9665, tau=0.0561,
        source="Planck Collaboration 2020 (astropy Planck18)",
    ),
    # SH0ES distance ladder (Riess et al. 2022): H0 = 73.04 +- 1.04.
    "SH0ES": ParameterSet(
        name="SH0ES", H0=73.04, H0_sigma=1.04, Om0=0.30966,
        Ob_h2=0.02242, Oc_h2=0.11933, sigma8=0.8102, ns=0.9665, tau=0.0561,
        source="Riess et al. 2022 (SH0ES); matter densities kept at Planck18 - only H0 varies",
    ),
    # CCHP TRGB (Freedman et al.): H0 ~ 69.8.
    "CCHP": ParameterSet(
        name="CCHP", H0=69.8, H0_sigma=1.7, Om0=0.30966,
        Ob_h2=0.02242, Oc_h2=0.11933, sigma8=0.8102, ns=0.9665, tau=0.0561,
        source="Freedman et al. CCHP/TRGB (~69.8); sigma is indicative, see dataset manifest",
    ),
    # DESI w0wa branch (U3): evolving dark energy, CPL form.
    "DESI_w0wa": ParameterSet(
        name="DESI_w0wa", H0=67.66, H0_sigma=0.42, Om0=0.30966,
        Ob_h2=0.02242, Oc_h2=0.11933, sigma8=0.8102, ns=0.9665, tau=0.0561,
        w0=-0.827, wa=-0.75,
        source="DESI DR2 w0wa indicative branch (U3) - model alternative, not default",
    ),
}

AVAILABLE_SETS = tuple(_NAMED)
