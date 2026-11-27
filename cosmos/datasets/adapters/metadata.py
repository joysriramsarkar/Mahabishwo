"""Fail-closed provenance and rights metadata for catalogue adapters."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from urllib.parse import urlparse


class IngestError(ValueError):
    """An input, provenance rule, or adapter safety limit was violated."""


@dataclass(frozen=True)
class SourceMetadata:
    key: str
    title: str
    release: str
    release_kind: str
    release_date: str | None
    citation: str
    license_id: str
    license_url: str
    attribution: str
    endpoint: str
    landing_page: str
    access_mode: str
    uncertainty_policy: str
    checked_on: str
    evidence: str = "OBS"
    confidence: str = "B"
    commercial_use: bool = True
    max_rows: int = 2_000
    max_response_bytes: int = 2 * 1024 * 1024
    notes: str = ""

    def __post_init__(self) -> None:
        errors = self.validate()
        if errors:
            raise IngestError(f"invalid metadata for {self.key!r}: " + "; ".join(errors))

    def validate(self) -> list[str]:
        errors: list[str] = []
        for field in (
            "key", "title", "release", "citation", "license_id", "attribution",
            "endpoint", "landing_page", "access_mode", "uncertainty_policy", "checked_on",
        ):
            value = getattr(self, field)
            if not isinstance(value, str) or not value.strip():
                errors.append(f"{field} is required")
        if self.license_id.strip().lower() in {"tbd", "unknown", "todo", "n/a"}:
            errors.append("license_id must identify actual terms, not a placeholder")
        if self.release_kind not in {"published", "rolling"}:
            errors.append("release_kind must be published or rolling")
        if self.release_kind == "published":
            try:
                date.fromisoformat(self.release_date or "")
            except (TypeError, ValueError):
                errors.append("published releases require an ISO release_date")
        elif self.release_date is not None:
            errors.append("rolling releases must not assert a fixed release_date")
        try:
            date.fromisoformat(self.checked_on)
        except (TypeError, ValueError):
            errors.append("checked_on must be an ISO date")
        for field in ("endpoint", "landing_page", "license_url"):
            value = getattr(self, field)
            if not isinstance(value, str):
                errors.append(f"{field} must be an absolute HTTPS URL")
                continue
            parsed = urlparse(value)
            if parsed.scheme != "https" or not parsed.netloc:
                errors.append(f"{field} must be an absolute HTTPS URL")
        if self.access_mode not in {"bounded-tap", "local-table", "bounded-json"}:
            errors.append("unsupported access_mode")
        if self.uncertainty_policy not in {
            "source-sigma-or-null", "asymmetric-interval-not-sigma", "metadata-no-sigma",
        }:
            errors.append("unsupported uncertainty_policy")
        if self.evidence not in {"OBS", "REC", "SIM", "MOCK", "UNC"}:
            errors.append("bad evidence tag")
        if self.confidence not in {"A", "B", "C", "D", "E"}:
            errors.append("bad confidence tag")
        if "-NC-" in self.license_id.upper() and self.commercial_use:
            errors.append("non-commercial licence requires commercial_use=false")
        if not isinstance(self.max_rows, int) or isinstance(self.max_rows, bool) or self.max_rows < 1:
            errors.append("max_rows must be a positive integer")
        if (
            not isinstance(self.max_response_bytes, int)
            or isinstance(self.max_response_bytes, bool)
            or self.max_response_bytes < 1
        ):
            errors.append("max_response_bytes must be a positive integer")
        return errors
