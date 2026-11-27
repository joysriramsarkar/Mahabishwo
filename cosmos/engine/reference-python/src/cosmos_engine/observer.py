"""Observer frame on astropy Planck18 (from 10_observer_frame_astropy.py)."""
from __future__ import annotations

from dataclasses import dataclass

import astropy.units as u
from astropy.cosmology import Planck18


@dataclass(frozen=True)
class ObserverFrame:
    redshift: float
    scale_factor: float
    comoving_distance_mpc: float
    angular_diameter_distance_mpc: float
    luminosity_distance_mpc: float
    lookback_time_gyr: float
    universe_age_at_emission_gyr: float


def frame_at_redshift(z: float) -> ObserverFrame:
    if z < 0:
        raise ValueError("redshift must be non-negative")
    cosmo = Planck18
    return ObserverFrame(
        redshift=float(z),
        scale_factor=1.0 / (1.0 + z),
        comoving_distance_mpc=cosmo.comoving_distance(z).to_value(u.Mpc),
        angular_diameter_distance_mpc=cosmo.angular_diameter_distance(z).to_value(u.Mpc),
        luminosity_distance_mpc=cosmo.luminosity_distance(z).to_value(u.Mpc),
        lookback_time_gyr=cosmo.lookback_time(z).to_value(u.Gyr),
        universe_age_at_emission_gyr=cosmo.age(z).to_value(u.Gyr),
    )
