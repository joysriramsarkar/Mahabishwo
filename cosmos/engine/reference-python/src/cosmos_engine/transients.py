"""Transient sampling: SN II/Ia Poisson rates per galaxy (07_...py)."""
from __future__ import annotations

import numpy as np


def sample_transients(galaxies, t_years, rng, cosmo,
                      sn2_per_sfr=0.01, snia_per_mstar=1e-13):
    """galaxies: dict with sfr [Msun/yr], logM [log Msun], z, id.

    Returns list of event dicts. Rates are order-of-magnitude educational
    values; production uses per-galaxy SFH (masterplan s11.2).
    """
    sfr = np.asarray(galaxies["sfr"], dtype=float)
    mstar = 10 ** np.asarray(galaxies["logM"], dtype=float)
    z = np.asarray(galaxies["z"], dtype=float)
    rate = (sn2_per_sfr * sfr + snia_per_mstar * mstar) / (1 + z)  # time dilation
    counts = rng.poisson(rate * t_years)
    events = []
    for i, n in enumerate(counts):
        for _ in range(int(n)):
            kind = "SN-II" if rng.random() < (sn2_per_sfr * sfr[i]) / max(rate[i] * (1 + z[i]), 1e-30) else "SN-Ia"
            events.append({
                "galaxy_index": int(i),
                "kind": kind,
                "z": float(z[i]),
                "peak_mag": float(-19.3 if kind == "SN-Ia" else -17.0),
            })
    return events
