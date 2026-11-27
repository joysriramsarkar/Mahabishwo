"""Public adapter registry and lazy construction (network clients are injectable)."""
from __future__ import annotations

from typing import Any

import httpx

from .catalog_tables import CosmicflowsAdapter, DESIAdapter, EuclidAdapter, McConnachieAdapter, PlanckAdapter
from .framework import Adapter, LocalTableAdapter
from .gaia import GaiaAdapter
from .jwst import JWSTAdapter
from .ligo import LIGOAdapter
from .metadata import IngestError, SourceMetadata
from .sources import SOURCES

ADAPTER_NAMES = ("gaia", "cosmicflows", "mcconnachie", "desi", "euclid", "planck", "jwst", "ligo")


def get_adapter(name: str, *, client: httpx.Client | None = None) -> Adapter:
    if name not in ADAPTER_NAMES:
        raise IngestError(f"unknown adapter {name!r}; choose from {', '.join(ADAPTER_NAMES)}")
    if name == "gaia":
        return GaiaAdapter(client=client)
    if name == "jwst":
        return JWSTAdapter(client=client)
    if name == "ligo":
        return LIGOAdapter(client=client)
    classes: dict[str, type[LocalTableAdapter]] = {
        "cosmicflows": CosmicflowsAdapter,
        "mcconnachie": McConnachieAdapter,
        "desi": DESIAdapter,
        "euclid": EuclidAdapter,
        "planck": PlanckAdapter,
    }
    return classes[name](SOURCES[name])


def metadata(name: str) -> SourceMetadata:
    try:
        return SOURCES[name]
    except KeyError as exc:
        raise IngestError(f"unknown source {name!r}") from exc


def describe_sources() -> list[dict[str, Any]]:
    return [{
        "adapter": source.key,
        "release": source.release,
        "access": source.access_mode,
        "max_rows": source.max_rows,
        "max_response_bytes": source.max_response_bytes,
        "license": source.license_id,
        "commercial_use": source.commercial_use,
        "uncertainty_policy": source.uncertainty_policy,
        "endpoint_or_landing_page": source.endpoint,
        "metadata_checked_on": source.checked_on,
    } for source in SOURCES.values()]
