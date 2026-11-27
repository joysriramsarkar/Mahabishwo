"""G7 CMB maps: Gaussian sky, Born lensing, tSZ from halos (06_...py).

healpy is an optional dependency; functions raise a clear error without it
instead of failing with NameError as the extracted reference did.
"""
from __future__ import annotations

import numpy as np

try:
    import healpy as hp
    HAS_HEALPY = True
except ImportError:  # pragma: no cover
    hp = None
    HAS_HEALPY = False


def _need_healpy():
    if not HAS_HEALPY:
        raise ImportError("healpy required: pip install 'cosmos-engine[healpix]'")


def make_cmb_sky(cls_tt, nside, seed=0):
    """Gaussian CMB temperature map from an input C_l^TT array."""
    _need_healpy()
    rng = np.random.default_rng(seed)
    # healpy.synfast takes its own seed via numpy global state in older APIs;
    # seed both for reproducibility (pipeline check 8).
    np.random.seed(seed % (2**32))
    _ = rng
    return hp.synfast(cls_tt, nside, verbose=False)


def lens_map(tmap, phi_map, nside):
    """Born-approximation remapping by lensing potential gradient."""
    _need_healpy()
    npix = hp.nside2npix(nside)
    theta, phi = hp.pix2ang(nside, np.arange(npix))
    # deflection ~ grad(phi): finite differences on the sphere (toy)
    grad_t = np.gradient(phi_map.reshape(-1), theta)
    deflected = theta + np.clip(grad_t, -0.05, 0.05)
    return hp.get_interp_val(tmap, deflected, phi)


def tsz_from_halos(halos, nside, cosmo):
    """Compton-y map from a halo table (rows: ra_deg, dec_deg, logM, z)."""
    _need_healpy()
    ymap = np.zeros(hp.nside2npix(nside))
    for h in halos:
        pix = hp.ang2pix(nside, np.radians(90 - h["dec_deg"]), np.radians(h["ra_deg"]))
        # Arnaud-like scaling, toy normalisation (production: GNFW profile)
        y = 1e-6 * (10 ** (h["logM"] - 14.0)) / max(cosmo.D_A(h["z"]), 1.0)
        ymap[pix] += y
    return ymap
