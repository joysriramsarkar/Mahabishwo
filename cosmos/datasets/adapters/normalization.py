"""Normalization into the existing ``catalogue`` + ``objects`` JSON shape."""
from __future__ import annotations

import math
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

from .metadata import IngestError, SourceMetadata

_MISSING = {"", "na", "n/a", "nan", "none", "null", "--", "-"}


def text(value: Any, field: str, *, required: bool = False) -> str | None:
    if value is None:
        result = None
    elif isinstance(value, (dict, list, tuple, set)):
        raise IngestError(f"{field}: expected a scalar string")
    else:
        result = str(value).strip()
    if not result or result.lower() in _MISSING:
        if required:
            raise IngestError(f"{field}: required value is missing")
        return None
    return result


def number(
    value: Any,
    field: str,
    *,
    required: bool = True,
    minimum: float | None = None,
    maximum: float | None = None,
) -> float | None:
    if value is None or (isinstance(value, str) and value.strip().lower() in _MISSING):
        if required:
            raise IngestError(f"{field}: required number is missing")
        return None
    if isinstance(value, bool):
        raise IngestError(f"{field}: booleans are not measurements")
    try:
        result = float(value)
    except (TypeError, ValueError) as exc:
        raise IngestError(f"{field}: not a number: {value!r}") from exc
    if not math.isfinite(result):
        raise IngestError(f"{field}: non-finite numbers are forbidden")
    if minimum is not None and result < minimum:
        raise IngestError(f"{field}: must be >= {minimum}")
    if maximum is not None and result > maximum:
        raise IngestError(f"{field}: must be <= {maximum}")
    return result


def coordinate(value: Any, field: str, low: float, high: float, *, hours: bool = False) -> float | None:
    """Accept decimal degrees or explicit HH/DD MM SS[.ss] coordinates."""
    if value is None or (isinstance(value, str) and value.strip().lower() in _MISSING):
        return None
    if not isinstance(value, str):
        return number(value, field, required=False, minimum=low, maximum=high)
    cleaned = value.strip()
    for suffix in ("degrees", "degree", "deg"):
        if cleaned.lower().endswith(suffix):
            cleaned = cleaned[:-len(suffix)].strip()
            break
    if len(cleaned.split()) == 1 and ":" not in cleaned and not re.search(r"[hHdDmMsS]", cleaned):
        return number(cleaned, field, required=False, minimum=low, maximum=high)
    parts = [part for part in re.split(r"[\s:hHdDmMsS]+", cleaned) if part]
    if not 2 <= len(parts) <= 3:
        raise IngestError(f"{field}: expected decimal degrees or sexagesimal coordinates")
    try:
        first = float(parts[0])
        minutes = float(parts[1])
        seconds = float(parts[2]) if len(parts) == 3 else 0.0
    except ValueError as exc:
        raise IngestError(f"{field}: invalid sexagesimal coordinate {value!r}") from exc
    if not all(math.isfinite(item) for item in (first, minutes, seconds)):
        raise IngestError(f"{field}: non-finite sexagesimal coordinate")
    if not 0 <= minutes < 60 or not 0 <= seconds < 60:
        raise IngestError(f"{field}: sexagesimal minutes/seconds must be in [0, 60)")
    negative = cleaned.startswith("-")
    magnitude = abs(first) + minutes / 60 + seconds / 3600
    if hours:
        if abs(first) > 24 or (abs(first) == 24 and (minutes or seconds)):
            raise IngestError(f"{field}: RA hours must be in [0, 24]")
        magnitude *= 15
    result = -magnitude if negative else magnitude
    return number(result, field, required=False, minimum=low, maximum=high)


def slug(value: str, fallback: str = "row") -> str:
    result = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return result or fallback


def column(row: Mapping[str, Any], names: Sequence[str] | str | None) -> Any:
    if not names:
        return None
    if isinstance(names, str):
        names = (names,)
    for name in names:
        if name in row:
            return row[name]
    return None


def source_fields(metadata: SourceMetadata, *, mock: bool) -> dict[str, Any]:
    if mock:
        return {
            "source": "SYNTHETIC TEST FIXTURE — not scientific data; no source download claimed",
            "data_version": "mock-1",
            "license": "Apache-2.0 (synthetic fixture only)",
            "license_url": "https://www.apache.org/licenses/LICENSE-2.0",
            "attribution": "Synthetic fixture; not attributed to the source archive",
        }
    return {
        "source": metadata.citation,
        "data_version": metadata.release,
        "license": metadata.license_id,
        "license_url": metadata.license_url,
        "attribution": metadata.attribution,
    }


def object_id(metadata: SourceMetadata, suffix: str, *, mock: bool) -> str:
    prefix = "mock-" if mock else ""
    return f"{prefix}{slug(metadata.key)}-{slug(metadata.release)}-{slug(suffix, 'object')[:110]}"


def measurement(
    metadata: SourceMetadata,
    *,
    quantity: str,
    value: Any,
    unit: str,
    method: str,
    sigma: Any = None,
    uncertainty_note: str | None = None,
    mock: bool = False,
    mass_definition: str | None = None,
    original: Mapping[str, Any] | None = None,
    **extra: Any,
) -> dict[str, Any]:
    quantity = text(quantity, "quantity", required=True)
    unit = text(unit, "unit", required=True)
    method = text(method, "method", required=True)
    measured = number(value, f"{quantity}.value")
    sigma_value = number(sigma, f"{quantity}.sigma", required=False, minimum=0)
    note = text(uncertainty_note, f"{quantity}.uncertainty_note")
    if sigma_value is None and not note:
        raise IngestError(f"{quantity}: sigma is absent; an explicit uncertainty_note is required")
    if sigma_value is not None and note and "not quoted" in note.lower():
        raise IngestError(f"{quantity}: source says uncertainty is not quoted but sigma was supplied")
    if "mass" in quantity.lower() and not text(mass_definition, f"{quantity}.mass_definition"):
        raise IngestError(f"{quantity}: mass measurements require a mass_definition")
    result: dict[str, Any] = {
        "quantity": quantity,
        "value": measured,
        "sigma": sigma_value,
        "unit": unit,
        "method": method,
        **source_fields(metadata, mock=mock),
        "mass_definition": mass_definition,
        "evidence": "MOCK" if mock else metadata.evidence,
        "confidence": metadata.confidence,
    }
    if note:
        result["uncertainty_note"] = note
    if original is not None:
        result["original"] = dict(original)
    reserved = set(result) | {"uncertainty_note", "original"}
    collisions = reserved.intersection(extra)
    if collisions:
        raise IngestError(f"{quantity}: cannot override normalized fields {sorted(collisions)}")
    result.update(extra)
    return result


def object_record(
    metadata: SourceMetadata,
    *,
    suffix: str,
    name: str,
    object_type: str,
    boundary_kind: str = "physical",
    mock: bool = False,
    ra_deg: Any = None,
    dec_deg: Any = None,
    **extra: Any,
) -> dict[str, Any]:
    return {
        "id": object_id(metadata, suffix, mock=mock),
        "name": text(name, "name", required=True),
        "type": text(object_type, "type", required=True),
        "evidence": "MOCK" if mock else metadata.evidence,
        "confidence": metadata.confidence,
        "boundary_kind": boundary_kind,
        "ra_deg": coordinate(ra_deg, "ra_deg", 0, 360, hours=True),
        "dec_deg": coordinate(dec_deg, "dec_deg", -90, 90),
        "measurements": [],
        **source_fields(metadata, mock=mock),
        **extra,
    }


def catalogue(
    metadata: SourceMetadata,
    objects: Iterable[dict[str, Any]],
    *,
    mock: bool = False,
    retrieved_at: str | None = None,
    source_files: Sequence[str | Path] = (),
    note: str = "",
) -> dict[str, Any]:
    object_list = list(objects)
    identifiers = [obj.get("id") for obj in object_list]
    if len(identifiers) != len(set(identifiers)):
        raise IngestError("duplicate normalized object identifiers")
    for obj in object_list:
        if not isinstance(obj.get("measurements"), list):
            raise IngestError(f"{obj.get('id')}: measurements must be a list")
    fields = source_fields(metadata, mock=mock)
    return {
        "catalogue": {
            "id": ("mock-" if mock else "") + f"cosmos-{metadata.key}-{slug(metadata.release)}",
            "name": metadata.title,
            **fields,
            "source_release": metadata.release,
            "source_license": metadata.license_id,
            "source_commercial_use": metadata.commercial_use,
            "commercial_use": True if mock else metadata.commercial_use,
            "license_url": fields["license_url"],
            "attribution": fields["attribution"],
            "evidence": "MOCK" if mock else metadata.evidence,
            "note": note or (
                "Synthetic adapter fixture only; no scientific data or source download."
                if mock else
                "Bounded normalization into the COSMOS Local Universe schema. Missing sigmas remain null with explicit notes."
            ),
            "ingest": {
                "adapter": metadata.key,
                "release": metadata.release,
                "mode": "synthetic-fixture" if mock else metadata.access_mode,
                "mock": mock,
                "processed_at": retrieved_at or datetime.now(timezone.utc).isoformat(),
                "source_files": [str(Path(path).resolve()) for path in source_files],
                "uncertainty_policy": metadata.uncertainty_policy,
                "metadata_checked_on": metadata.checked_on,
                "source_notes": metadata.notes,
            },
        },
        "objects": object_list,
    }


def add_measurement(obj: dict[str, Any], item: dict[str, Any]) -> None:
    obj["measurements"].append(item)
