"""Bounded GWOSC GWTC metadata adapter; strain and posterior files are never fetched."""
from __future__ import annotations

import re
from typing import Any, Mapping
from urllib.parse import quote

import httpx

from .framework import Adapter, BoundedHTTP, LimitExceeded
from .metadata import IngestError
from .normalization import add_measurement, catalogue, measurement, number, object_record, slug, text
from .sources import SOURCES

_PARAMETERS = {
    "mass_1": ("mass", "detector-frame primary component mass"),
    "mass_2": ("mass", "detector-frame secondary component mass"),
    "chirp_mass": ("mass", "detector-frame chirp mass"),
    "total_mass": ("mass", "detector-frame total mass"),
    "final_mass": ("mass", "detector-frame remnant mass"),
    "mass_1_source": ("mass", "source-frame primary component mass"),
    "mass_2_source": ("mass", "source-frame secondary component mass"),
    "chirp_mass_source": ("mass", "source-frame chirp mass"),
    "total_mass_source": ("mass", "source-frame total mass"),
    "final_mass_source": ("mass", "source-frame remnant mass"),
    "luminosity_distance": ("distance", None),
    "redshift": ("redshift", None),
    "chi_eff": ("effective_spin", None),
    "network_matched_filter_snr": ("network_snr", None),
    "far": ("false_alarm_rate", None),
    "p_astro": ("probability_astrophysical", None),
}


class LIGOAdapter(Adapter, BoundedHTTP):
    def __init__(self, *, client: httpx.Client | None = None, timeout: float = 20.0) -> None:
        BoundedHTTP.__init__(self, SOURCES["ligo"], client=client, timeout=timeout)

    @staticmethod
    def _catalog(catalog: str) -> str:
        result = text(catalog, "catalog", required=True)
        if not re.fullmatch(r"[A-Za-z0-9._-]{1,80}", result):
            raise IngestError("catalog must be one GWOSC catalogue identifier")
        return result

    def _events_url(self, catalog: str) -> str:
        return f"https://gwosc.org/api/v2/catalogs/{quote(catalog, safe='')}/events"

    @staticmethod
    def _parameters_url(short_name: str) -> str:
        short_name = text(short_name, "shortName", required=True)
        return (
            "https://gwosc.org/api/v2/event-versions/"
            f"{quote(short_name, safe='')}/default-parameters"
        )

    def plan(
        self, *, catalog: str = "GWTC", limit: int = 10, include_parameters: bool = True,
        mock: bool = False, **_: Any,
    ) -> dict[str, Any]:
        catalog = self._catalog(catalog)
        if not isinstance(limit, int) or isinstance(limit, bool) or not 1 <= limit <= self.metadata.max_rows:
            raise IngestError(f"limit must be in 1..{self.metadata.max_rows}")
        operations = [{
            "method": "GET", "url": self._events_url(catalog),
            "params": {"format": "api", "pagesize": limit, "include-default-parameters": "false"},
        }]
        if include_parameters:
            operations.append({
                "method": "GET",
                "url_pattern": "https://gwosc.org/api/v2/event-versions/{shortName}/default-parameters",
                "params": {"format": "api"},
                "maximum_operations": limit,
            })
        return self._plan(
            operations=operations, row_limit=limit, mock=mock,
            notes="Small event metadata only; no strain/posterior URLs are followed.",
        )

    def fetch(
        self, *, catalog: str = "GWTC", limit: int = 10, include_parameters: bool = True, **_: Any
    ) -> list[dict[str, Any]]:
        plan = self.plan(catalog=catalog, limit=limit, include_parameters=include_parameters)
        payload = self.request_json(
            "GET", plan["network_operations"][0]["url"], params=plan["network_operations"][0]["params"]
        )
        if not isinstance(payload, dict) or not isinstance(payload.get("results"), list):
            raise IngestError("GWOSC event list must contain a results list")
        rows = payload["results"]
        if len(rows) > limit:
            raise LimitExceeded("GWOSC returned more events than pagesize")
        total_bytes = self.last_response_bytes
        normalized: list[dict[str, Any]] = []
        for row in rows:
            if not isinstance(row, dict):
                raise IngestError("GWOSC event rows must be objects")
            item = dict(row)
            if include_parameters:
                short_name = text(item.get("shortName"), "GWOSC shortName", required=True)
                parameters = self.request_json(
                    "GET", self._parameters_url(short_name), params={"format": "api"}
                )
                total_bytes += self.last_response_bytes
                if total_bytes > self.metadata.max_response_bytes:
                    raise LimitExceeded("aggregate GWOSC metadata exceeded the byte budget")
                item["parameters"] = parameters
            normalized.append(item)
        return normalized

    @staticmethod
    def _entries(row: Mapping[str, Any]) -> list[dict[str, Any]]:
        parameters = row.get("parameters")
        if isinstance(parameters, list):
            entries = []
            for parameter in parameters:
                if not isinstance(parameter, dict):
                    raise IngestError("GWOSC parameter list entries must be objects")
                name = parameter.get("name") or parameter.get("parameter")
                entries.append({"name": text(name, "parameter name", required=True), **parameter})
            return entries
        if isinstance(parameters, dict):
            for wrapper in ("parameters", "default_parameters", "results"):
                if isinstance(parameters.get(wrapper), (dict, list)):
                    return LIGOAdapter._entries({"parameters": parameters[wrapper]})
            if any(isinstance(value, dict) for value in parameters.values()):
                entries = []
                for name, value in parameters.items():
                    if not isinstance(value, dict):
                        continue
                    entries.append({"name": name, **value})
                return entries
            entries = []
            metadata_suffixes = ("_lower", "_upper", "_unit", "_meta")
            for name, value in parameters.items():
                if (
                    isinstance(value, (int, float, str))
                    and not isinstance(value, bool)
                    and not name.endswith(metadata_suffixes)
                ):
                    # Keep sibling offsets on the same entry; they are not parameters.
                    entries.append({"name": name, **parameters})
            return entries
        entries = []
        for name in _PARAMETERS:
            if name in row:
                entries.append({"name": name, **row})
        return entries

    def normalize(
        self, rows: Any, *, mock: bool = False, retrieved_at: str | None = None,
        source_files: Any = (), **_: Any,
    ) -> dict[str, Any]:
        if not isinstance(rows, list):
            raise IngestError("GWOSC normalizer expects an event list")
        if len(rows) > self.metadata.max_rows:
            raise LimitExceeded(f"event list exceeds max_rows={self.metadata.max_rows}")
        objects = []
        for row in rows:
            if not isinstance(row, dict):
                raise IngestError("GWOSC event rows must be objects")
            name = text(row.get("name") or row.get("commonName"), "event name", required=True)
            version = row.get("version")
            if version is not None and (
                not isinstance(version, int) or isinstance(version, bool) or version < 1
            ):
                raise IngestError("GWOSC event version must be a positive integer")
            suffix = f"{name}-v{version}" if version is not None else name
            obj = object_record(
                self.metadata, suffix=suffix, name=name, object_type="gravitational-wave-event", mock=mock,
                event_gps=number(row.get("gps", row.get("GPS")), "event GPS", required=False),
                detectors=[str(item) for item in row.get("detectors", [])] if isinstance(row.get("detectors"), list) else [],
                catalog=text(row.get("catalog"), "catalog"),
                event_version=version,
            )
            for entry in self._entries(row):
                parameter = text(entry.get("name"), "parameter name", required=True)
                # GWOSC default-parameter values use signed lower/upper offsets.
                value = number(
                    entry.get("value", entry.get("best", entry.get(parameter, row.get(parameter)))),
                    parameter, required=False,
                )
                if value is None:
                    continue
                sigma = number(entry.get("sigma"), f"{parameter}.sigma", required=False, minimum=0)
                lower_offset = number(
                    entry.get(
                        "lower", entry.get(
                            "lower_error", entry.get(
                                f"{parameter}_lower", entry.get(
                                    f"{parameter}_lower_error", row.get(f"{parameter}_lower", entry.get("minus"))
                                )
                            )
                        )
                    ),
                    f"{parameter}.lower", required=False,
                )
                upper_offset = number(
                    entry.get(
                        "upper", entry.get(
                            "upper_error", entry.get(
                                f"{parameter}_upper", entry.get(
                                    f"{parameter}_upper_error", row.get(f"{parameter}_upper", entry.get("plus"))
                                )
                            )
                        )
                    ),
                    f"{parameter}.upper", required=False,
                )
                if (lower_offset is None) != (upper_offset is None):
                    raise IngestError(f"{parameter}: both GWOSC lower and upper offsets are required")
                if sigma is not None and (lower_offset is not None or upper_offset is not None):
                    raise IngestError(f"{parameter}: ambiguous sigma plus interval")
                quantity, definition = _PARAMETERS.get(parameter, (f"gw_{slug(parameter)}", None))
                unit = text(entry.get("unit", entry.get(f"{parameter}_unit", row.get(f"{parameter}_unit"))), f"{parameter}.unit") or (
                    "Msun" if "mass" in parameter else "Mpc" if parameter == "luminosity_distance" else "1/yr" if parameter == "far" else "1"
                )
                if unit == "M_sun":
                    unit = "Msun"
                extra: dict[str, Any] = {}
                upper_limit = entry.get("is_upper_limit", False)
                lower_limit = entry.get("is_lower_limit", False)
                if not isinstance(upper_limit, bool) or not isinstance(lower_limit, bool):
                    raise IngestError(f"{parameter}: GWOSC limit flags must be booleans")
                if upper_limit or lower_limit:
                    extra["parameter_limit"] = {
                        "upper": upper_limit, "lower": lower_limit,
                    }
                description = text(entry.get("description"), f"{parameter}.description")
                if description:
                    extra["parameter_description"] = description
                note = None
                if sigma is None and lower_offset is not None and upper_offset is not None:
                    if lower_offset > 0 or upper_offset < 0:
                        raise IngestError(f"{parameter}: GWOSC offsets must be lower<=0 and upper>=0")
                    extra["interval"] = {
                        "lower": value + lower_offset,
                        "upper": value + upper_offset,
                        "kind": "source-credible-interval-not-sigma",
                    }
                    note = "GWOSC lower/upper credible bounds retained; not converted to a symmetric sigma"
                elif sigma is None:
                    if upper_limit or lower_limit:
                        note = "GWOSC reports a one-sided parameter limit; no symmetric sigma is available"
                    else:
                        note = "parameter uncertainty not quoted in GWOSC metadata; sigma left null"
                add_measurement(obj, measurement(
                    self.metadata, quantity=quantity, value=value, sigma=sigma,
                    uncertainty_note=note, unit=unit,
                    method="GWOSC GWTC default parameter metadata (event version retained)",
                    mock=mock, mass_definition=definition,
                    original_parameter=parameter,
                    original={"value": value, "lower_offset": lower_offset, "upper_offset": upper_offset},
                    **extra,
                ))
            objects.append(obj)
        return catalogue(
            self.metadata, objects, mock=mock, retrieved_at=retrieved_at, source_files=source_files,
            note="Synthetic GWOSC-shaped fixture; not a detected event and no download claimed." if mock else None,
        )
