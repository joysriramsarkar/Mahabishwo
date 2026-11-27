"""JWST MAST metadata adapter: one data URI, no FITS/image downloads."""
from __future__ import annotations

from typing import Any

import httpx

from .framework import Adapter, BoundedHTTP
from .metadata import IngestError
from .normalization import add_measurement, catalogue, measurement, number, object_record, text
from .sources import SOURCES


class JWSTAdapter(Adapter, BoundedHTTP):
    def __init__(self, *, client: httpx.Client | None = None, timeout: float = 20.0) -> None:
        BoundedHTTP.__init__(self, SOURCES["jwst"], client=client, timeout=timeout)

    @staticmethod
    def _uri(data_uri: str) -> str:
        uri = text(data_uri, "data_uri", required=True)
        if not uri.startswith("mast:JWST/product/") or any(c in uri for c in "\r\n"):
            raise IngestError("data_uri must be a single-line mast:JWST/product/ URI")
        return uri

    def plan(
        self, *, data_uri: str, public_only: bool = True, mock: bool = False, **_: Any
    ) -> dict[str, Any]:
        uri = self._uri(data_uri)
        return self._plan(
            operations=[{"method": "GET", "url": self.metadata.endpoint, "params": {"uri": uri}}],
            row_limit=1,
            mock=mock,
            notes="MAST parameters metadata only; never requests a FITS data product.",
        )

    def fetch(self, *, data_uri: str, public_only: bool = True, **_: Any) -> dict[str, Any]:
        uri = self._uri(data_uri)
        payload = self.request_json("GET", self.metadata.endpoint, params={"uri": uri})
        if not isinstance(payload, dict):
            raise IngestError("MAST parameters response must be a JSON object")
        self._check_rights(payload, public_only=public_only)
        return payload

    @staticmethod
    def _check_rights(payload: dict[str, Any], *, public_only: bool) -> None:
        if public_only:
            for field in ("dataRights", "metaDataRights"):
                rights = payload.get(field)
                if not isinstance(rights, str) or rights.upper() != "PUBLIC":
                    raise IngestError(f"{field} is not PUBLIC; restricted/EAP metadata is not ingested")

    def normalize(
        self, payload: Any, *, mock: bool = False, public_only: bool = True,
        retrieved_at: str | None = None, source_files: Any = (), **_: Any,
    ) -> dict[str, Any]:
        if not isinstance(payload, dict):
            raise IngestError("JWST normalizer expects one MAST parameters object")
        self._check_rights(payload, public_only=public_only)
        obs_id = text(payload.get("obs_id"), "obs_id", required=True)
        target = text(payload.get("target_name"), "target_name") or obs_id
        obj = object_record(
            self.metadata, suffix=obs_id, name=f"JWST observation of {target}", object_type="observation",
            mock=mock, ra_deg=payload.get("s_ra"), dec_deg=payload.get("s_dec"),
            mast_observation_id=obs_id,
            instrument=text(payload.get("instrument_name"), "instrument_name"),
            proposal_id=text(payload.get("proposal_id"), "proposal_id"),
            calibration_level=payload.get("calib_level"),
            data_rights=text(payload.get("dataRights"), "dataRights"),
            metadata_rights=text(payload.get("metaDataRights"), "metaDataRights"),
            target_name=target,
        )
        exposure = number(payload.get("t_exptime"), "t_exptime", required=False, minimum=0)
        if exposure is not None:
            add_measurement(obj, measurement(
                self.metadata, quantity="exposure_time", value=exposure, sigma=None,
                uncertainty_note="MAST metadata does not quote a 1-sigma exposure-time uncertainty; sigma left null",
                unit="s", method="MAST JWST parameters t_exptime metadata", mock=mock,
            ))
        return catalogue(
            self.metadata, [obj], mock=mock, retrieved_at=retrieved_at, source_files=source_files,
            note="Synthetic MAST-shaped fixture; no JWST observation or download claimed." if mock else None,
        )
