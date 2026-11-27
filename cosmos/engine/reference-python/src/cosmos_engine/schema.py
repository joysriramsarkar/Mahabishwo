"""Light-cone galaxy record: real Apache Arrow schema (masterplan s9.2).

Replaces lightcone_record_schema.py, whose dict literal was syntactically
invalid ('"ra", "dec": "float32"'). ~140 bytes/galaxy uncompressed estimate.
"""
from __future__ import annotations

import pyarrow as pa

GALAXY_SCHEMA = pa.schema([
    ("id", pa.uint64()),
    ("halo_id", pa.uint64()),
    ("hpix", pa.uint32()),          # HEALPix nested, nside=256
    ("ra", pa.float32()),           # degrees, ICRS
    ("dec", pa.float32()),          # degrees, ICRS
    ("z_cos", pa.float32()),        # cosmological redshift
    ("z_obs", pa.float32()),        # + peculiar velocity (RSD)
    ("chi", pa.float32()),          # comoving distance, Mpc
    ("v_los", pa.float32()),        # km/s
    ("log_mstar", pa.float32()),
    ("log_mhalo", pa.float32()),
    ("sfr", pa.float32()),
    ("log_z_gas", pa.float32()),
    ("log_mbh", pa.float32()),
    ("lambda_edd", pa.float32()),
    ("r_half_kpc", pa.float32()),
    ("bt_ratio", pa.float32()),     # bulge/total
    ("a_v", pa.float32()),          # internal dust extinction
    ("mag", pa.list_(pa.float32(), 12)),  # u g r i z y J H K W1 W2 + UV
    ("is_central", pa.bool_()),
    ("kappa_lens", pa.float32()),   # weak-lensing convergence
    ("gamma1", pa.float32()),
    ("gamma2", pa.float32()),
    ("mw_ebv", pa.float32()),       # Milky Way foreground E(B-V)
])

# Shells S0-S7 of the full light-cone system (galaxy cone z<=20 in run config;
# CMB shell reaches z~1090) - masterplan s5.4/s11.
SHELLS = [
    {"id": "S0", "z_min": 0.0, "z_max": 0.05, "content": "Local Volume observed catalogues"},
    {"id": "S1", "z_min": 0.05, "z_max": 0.2, "content": "Local Universe reconstruction"},
    {"id": "S2", "z_min": 0.2, "z_max": 0.5, "content": "Constrained + statistical mix"},
    {"id": "S3", "z_min": 0.5, "z_max": 1.0, "content": "Statistical light-cone"},
    {"id": "S4", "z_min": 1.0, "z_max": 2.0, "content": "Statistical light-cone, cosmic noon"},
    {"id": "S5", "z_min": 2.0, "z_max": 6.0, "content": "Statistical, reionization tail"},
    {"id": "S6", "z_min": 6.0, "z_max": 20.0, "content": "Galaxy cone limit (run config z_max)"},
    {"id": "S7", "z_min": 20.0, "z_max": 1090.0, "content": "CMB / early-universe shells"},
]


def empty_galaxy_table() -> pa.Table:
    return GALAXY_SCHEMA.empty_table()
