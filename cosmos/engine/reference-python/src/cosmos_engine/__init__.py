"""COSMOS reference engine (G0-G8 educational implementation)."""
from .parameters import ParameterSet, AVAILABLE_SETS
from .cosmology import Cosmology, C_KMS
from .observer import ObserverFrame, frame_at_redshift
from .schema import GALAXY_SCHEMA, SHELLS, empty_galaxy_table
from .orchestration import (SimulationRun, RunState, ProvenanceManifest,
                            PreRegistration, content_hash)

__version__ = "0.1.0"
__all__ = [
    "ParameterSet", "AVAILABLE_SETS", "Cosmology", "C_KMS",
    "ObserverFrame", "frame_at_redshift", "GALAXY_SCHEMA", "SHELLS",
    "empty_galaxy_table", "SimulationRun", "RunState", "ProvenanceManifest",
    "PreRegistration", "content_hash",
]
