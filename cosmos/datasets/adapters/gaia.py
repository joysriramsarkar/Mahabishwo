"""Gaia DR3 regional TAP/ADQL adapter. Full-catalogue queries are impossible by API."""
from __future__ import annotations

import math
from typing import Any

import httpx

from .framework import Adapter, BoundedHTTP, LimitExceeded
from .metadata import IngestError
from .normalization import (
    add_measurement,
    catalogue,
    column,
    coordinate,
    measurement,
    number,
    object_record,
    text,
)
from .sources import SOURCES

_SELECT = (
    "source_id, ra, dec, ra_error, dec_error, parallax, parallax_error, "
    "radial_velocity, radial_velocity_error, phot_g_mean_mag, "
    "phot_g_mean_flux_over_error"
)


def build_adql(ra_deg: float, dec_deg: float, radius_deg: float = 1.0, limit: int = 100) -> str:
    """Build a bounded ADQL statement; arbitrary caller SQL is never accepted."""
    ra = number(ra_deg, "ra_deg", minimum=0, maximum=360)
    dec = number(dec_deg, "dec_deg", minimum=-90, maximum=90)
    radius = number(radius_deg, "radius_deg", minimum=0.001, maximum=10)
    if not isinstance(limit, int) or isinstance(limit, bool) or not 1 <= limit <= 2_000:
        raise IngestError("Gaia limit must be an integer in 1..2000")
    # Numeric validation plus fixed formatting prevents ADQL injection.
    return (
        f"SELECT TOP {limit} {_SELECT} FROM gaiadr3.gaia_source "
        "WHERE CONTAINS(POINT('ICRS', "
        f"{ra:.12g}, {dec:.12g}), CIRCLE('ICRS', {ra:.12g}, {dec:.12g}, "
        f"{radius:.12g})) = 1"
    )


class GaiaAdapter(Adapter, BoundedHTTP):
    def __init__(self, *, client: httpx.Client | None = None, timeout: float = 20.0) -> None:
        BoundedHTTP.__init__(self, SOURCES["gaia"], client=client, timeout=timeout)

    def _query(self, ra_deg: float, dec_deg: float, radius_deg: float, limit: int) -> str:
        return build_adql(ra_deg, dec_deg, radius_deg, limit)

    def plan(
        self,
        *,
        ra_deg: float,
        dec_deg: float,
        radius_deg: float = 1.0,
        limit: int = 100,
        mock: bool = False,
        **_: Any,
    ) -> dict[str, Any]:
        query = self._query(ra_deg, dec_deg, radius_deg, limit)
        return self._plan(
            operations=[{
                "method": "POST",
                "url": self.metadata.endpoint,
                "form": {
                    "REQUEST": "doQuery", "LANG": "ADQL", "FORMAT": "json", "QUERY": query,
                },
            }],
            row_limit=limit,
            mock=mock,
        )

    def fetch(
        self,
        *,
        ra_deg: float,
        dec_deg: float,
        radius_deg: float = 1.0,
        limit: int = 100,
        **_: Any,
    ) -> list[dict[str, Any]]:
        query = self._query(ra_deg, dec_deg, radius_deg, limit)
        payload = self.request_json(
            "POST", self.metadata.endpoint,
            data={"REQUEST": "doQuery", "LANG": "ADQL", "FORMAT": "json", "QUERY": query},
        )
        if not isinstance(payload, dict) or not isinstance(payload.get("data"), list):
            raise IngestError("Gaia TAP JSON must contain a data list")
        rows = payload["data"]
        if len(rows) > limit:
            raise LimitExceeded("Gaia returned more rows than TOP; refusing unbounded response")
        if any(not isinstance(row, dict) for row in rows):
            raise IngestError("Gaia TAP data rows must be objects")
        return rows

    def normalize(
        self,
        rows: Any,
        *,
        mock: bool = False,
        retrieved_at: str | None = None,
        source_files: Any = (),
        **_: Any,
    ) -> dict[str, Any]:
        if not isinstance(rows, list):
            raise IngestError("Gaia rows must be a list")
        if len(rows) > self.metadata.max_rows:
            raise LimitExceeded(f"Gaia rows exceed max_rows={self.metadata.max_rows}")
        objects: list[dict[str, Any]] = []
        for index, row in enumerate(rows, 1):
            if not isinstance(row, dict):
                raise IngestError(f"Gaia row {index} is not an object")
            source_id = text(row.get("source_id"), f"row {index}.source_id", required=True)
            ra = coordinate(row.get("ra"), f"row {index}.ra", 0, 360)
            dec = coordinate(row.get("dec"), f"row {index}.dec", -90, 90)
            obj = object_record(
                self.metadata,
                suffix=source_id,
                name=f"Gaia DR3 source {source_id}",
                object_type="star",
                mock=mock,
                ra_deg=ra,
                dec_deg=dec,
                source_identifier=source_id,
                position_uncertainty_deg={
                    "ra": number(row.get("ra_error"), "ra_error", required=False, minimum=0),
                    "dec": number(row.get("dec_error"), "dec_error", required=False, minimum=0),
                },
            )
            parallax = number(row.get("parallax"), "parallax", required=False)
            parallax_error = number(
                row.get("parallax_error"), "parallax_error", required=False, minimum=0
            )
            if parallax is not None and parallax > 0:
                distance = 0.001 / parallax  # arcsec inverse -> kpc -> Mpc
                sigma = (
                    0.001 * parallax_error / (parallax * parallax)
                    if parallax_error is not None else None
                )
                note = None if sigma is not None else "parallax_error not quoted in source row; sigma left null"
                add_measurement(obj, measurement(
                    self.metadata,
                    quantity="distance",
                    value=distance,
                    sigma=sigma,
                    uncertainty_note=note,
                    unit="Mpc",
                    method="inverse-parallax geometric distance; first-order propagation; no zero-point correction",
                    mock=mock,
                    original={"parallax_mas": parallax, "parallax_error_mas": parallax_error},
                ))
            radial_velocity = number(row.get("radial_velocity"), "radial_velocity", required=False)
            if radial_velocity is not None:
                sigma = number(row.get("radial_velocity_error"), "radial_velocity_error", required=False, minimum=0)
                add_measurement(obj, measurement(
                    self.metadata,
                    quantity="radial_velocity",
                    value=radial_velocity,
                    sigma=sigma,
                    uncertainty_note=None if sigma is not None else "radial_velocity_error not quoted in source row; sigma left null",
                    unit="km/s",
                    method="Gaia DR3 RVS radial velocity",
                    mock=mock,
                ))
            magnitude = number(row.get("phot_g_mean_mag"), "phot_g_mean_mag", required=False)
            flux_snr = number(row.get("phot_g_mean_flux_over_error"), "flux_snr", required=False)
            if magnitude is not None:
                sigma = 2.5 / math.log(10) / flux_snr if flux_snr is not None and flux_snr > 0 else None
                magnitude_note = None if sigma is not None else (
                    "non-positive flux-over-error; magnitude sigma left null"
                    if flux_snr is not None else
                    "flux-over-error not quoted; magnitude sigma left null"
                )
                add_measurement(obj, measurement(
                    self.metadata,
                    quantity="apparent_magnitude_g",
                    value=magnitude,
                    sigma=sigma,
                    uncertainty_note=magnitude_note,
                    unit="mag",
                    method="Gaia G-band magnitude; approximate sigma from flux S/N",
                    mock=mock,
                ))
            objects.append(obj)
        return catalogue(
            self.metadata, objects, mock=mock, retrieved_at=retrieved_at, source_files=source_files,
            note=(
                "Synthetic Gaia-shaped fixture; not Gaia observations and no TAP request or source download was made."
                if mock else
                "Regional Gaia DR3 TAP extract. Derived distances/magnitude sigmas are labelled; no full catalogue download."
            ),
        )
