"""Adapter-scoped release tracker. It never implies that data were downloaded."""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Any

from .metadata import IngestError
from .sources import SOURCES

TRACKER_PATH = Path(__file__).with_name("releases.json")
_STATUSES = {"published", "published-results-only", "upcoming", "rolling", "unverified"}


def load_releases(path: str | Path | None = None) -> dict[str, Any]:
    tracker = Path(path) if path is not None else TRACKER_PATH
    try:
        payload = json.loads(tracker.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise IngestError(f"cannot load release tracker {tracker}: {exc}") from exc
    errors = validate_releases(payload)
    if errors:
        raise IngestError("invalid release tracker: " + "; ".join(errors))
    return payload


def validate_releases(payload: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(payload, dict) or payload.get("schema_version") != 1:
        return ["schema_version must be 1"]
    try:
        date.fromisoformat(payload.get("checked_on"))
    except (TypeError, ValueError):
        errors.append("checked_on must be an ISO date")
    if not isinstance(payload.get("policy"), str) or not payload["policy"]:
        errors.append("policy is required")
    releases = payload.get("releases")
    if not isinstance(releases, list) or not releases:
        errors.append("releases must be a non-empty list")
        return errors
    keys = set()
    for index, release in enumerate(releases):
        if not isinstance(release, dict):
            errors.append(f"release {index} is not an object")
            continue
        source = release.get("source")
        name = release.get("release")
        status = release.get("status")
        if source not in SOURCES:
            errors.append(f"release {index}: unknown source {source!r}")
        if not isinstance(name, str) or not name:
            errors.append(f"release {index}: release is required")
        if status not in _STATUSES:
            errors.append(f"release {index}: invalid status {status!r}")
        key = (source, name)
        if key in keys:
            errors.append(f"duplicate release {source}/{name}")
        keys.add(key)
        for field in ("checked_on", "access", "note"):
            if not isinstance(release.get(field), str) or not release[field]:
                errors.append(f"{source}/{name}: {field} is required")
        try:
            date.fromisoformat(release.get("checked_on"))
        except (TypeError, ValueError):
            errors.append(f"{source}/{name}: checked_on must be an ISO date")
        if status == "published":
            try:
                date.fromisoformat(release.get("release_date"))
            except (TypeError, ValueError):
                errors.append(f"{source}/{name}: published release requires an ISO release_date")
    for source in SOURCES:
        if not any(isinstance(item, dict) and item.get("source") == source for item in releases):
            errors.append(f"source {source} has no tracker entry")
    return errors


def release_for(source: str, release: str | None = None) -> dict[str, Any]:
    """Resolve a release and reject anything not usable by an enabled adapter."""
    if source not in SOURCES:
        raise IngestError(f"unknown source {source!r}")
    payload = load_releases()
    requested = release or SOURCES[source].release
    matches = [
        item for item in payload["releases"]
        if item.get("source") == source and item.get("release") == requested
    ]
    if not matches:
        raise IngestError(f"release {source}/{requested} is not tracked")
    item = matches[0]
    if item["status"] not in {"published", "rolling"}:
        raise IngestError(
            f"release {source}/{requested} is {item['status']}; ingestion disabled: {item['note']}"
        )
    if requested != SOURCES[source].release:
        raise IngestError(
            f"no enabled adapter schema for {source}/{requested}; enabled release is {SOURCES[source].release}"
        )
    return item
