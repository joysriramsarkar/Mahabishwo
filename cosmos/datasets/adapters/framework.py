"""Small, bounded adapter primitives. No adapter performs a bulk download."""
from __future__ import annotations

import csv
import io
import json
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator, Mapping
from urllib.parse import urlparse

import httpx

from .metadata import IngestError, SourceMetadata


class LimitExceeded(IngestError):
    """A configured byte, row, query-radius, or page limit was exceeded."""


class BoundedHTTP:
    """HTTP JSON helper with streaming byte caps and an injectable test client."""

    def __init__(
        self,
        metadata: SourceMetadata,
        *,
        client: httpx.Client | None = None,
        timeout: float = 20.0,
    ) -> None:
        if not 0 < timeout <= 60:
            raise IngestError("timeout must be in (0, 60] seconds")
        self.metadata = metadata
        self._client = client
        self._timeout = timeout
        self.last_response_bytes = 0

    @contextmanager
    def _http(self) -> Iterator[httpx.Client]:
        if self._client is not None:
            yield self._client
        else:
            with httpx.Client(timeout=self._timeout, follow_redirects=False) as client:
                yield client

    @staticmethod
    def _https(url: str) -> str:
        parsed = urlparse(url)
        if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password:
            raise IngestError("only absolute HTTPS URLs without credentials are allowed")
        return url

    def request_bytes(
        self,
        method: str,
        url: str,
        *,
        params: Mapping[str, Any] | None = None,
        data: Mapping[str, Any] | None = None,
        headers: Mapping[str, str] | None = None,
        max_bytes: int | None = None,
    ) -> bytes:
        cap = self.metadata.max_response_bytes if max_bytes is None else max_bytes
        if not 1 <= cap <= self.metadata.max_response_bytes:
            raise IngestError("response cap must be positive and no larger than the source cap")
        method = method.upper()
        if method not in {"GET", "POST"}:
            raise IngestError("only GET and POST metadata queries are supported")
        url = self._https(url)
        with self._http() as client:
            with client.stream(
                method, url, params=params, data=data, headers=headers, timeout=self._timeout
            ) as response:
                response.raise_for_status()
                chunks: list[bytes] = []
                size = 0
                for chunk in response.iter_bytes():
                    size += len(chunk)
                    if size > cap:
                        raise LimitExceeded(f"response exceeded {cap} bytes; request aborted")
                    chunks.append(chunk)
        raw = b"".join(chunks)
        self.last_response_bytes = len(raw)
        return raw

    def request_json(self, method: str, url: str, **kwargs: Any) -> Any:
        raw = self.request_bytes(method, url, **kwargs)
        try:
            return json.loads(raw.decode("utf-8-sig"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise IngestError(f"invalid JSON response from {url}: {exc}") from exc


class Adapter:
    """Common dry-run contract: plan() must never perform I/O."""

    metadata: SourceMetadata

    def plan(self, **kwargs: Any) -> dict[str, Any]:
        raise NotImplementedError

    def ingest(self, *, dry_run: bool = False, **kwargs: Any) -> dict[str, Any]:
        if dry_run:
            return self.plan(**kwargs)
        rows = self.fetch(**kwargs)
        normalize_kwargs = {
            key: kwargs[key]
            for key in ("columns", "mock", "retrieved_at", "source_files", "public_only")
            if key in kwargs
        }
        if "input_path" in kwargs and "source_files" not in normalize_kwargs:
            normalize_kwargs["source_files"] = [kwargs["input_path"]]
        return self.normalize(rows, **normalize_kwargs)

    def fetch(self, **kwargs: Any) -> Any:
        raise NotImplementedError

    def normalize(self, rows: Any, **kwargs: Any) -> dict[str, Any]:
        raise NotImplementedError

    def _plan(
        self,
        *,
        operations: list[dict[str, Any]] | None = None,
        local_input: Path | None = None,
        row_limit: int | None = None,
        notes: str = "",
        mock: bool = False,
    ) -> dict[str, Any]:
        return {
            "adapter": self.metadata.key,
            "release": self.metadata.release,
            "release_kind": self.metadata.release_kind,
            "source": self.metadata.citation,
            "license": self.metadata.license_id,
            "license_url": self.metadata.license_url,
            "commercial_use": self.metadata.commercial_use,
            "mode": "synthetic-fixture" if mock else self.metadata.access_mode,
            "dry_run": True,
            "request_performed": False,
            "row_limit": row_limit or self.metadata.max_rows,
            "response_byte_limit": self.metadata.max_response_bytes,
            "network_operations": operations or [],
            "local_input": str(local_input.resolve()) if local_input else None,
            "notes": notes or self.metadata.notes,
        }


class LocalTableAdapter(Adapter):
    """CSV/TSV/JSON table reader. FITS/Parquet require an explicit local conversion."""

    def __init__(self, metadata: SourceMetadata) -> None:
        self.metadata = metadata
        metadata.validate()

    @staticmethod
    def _delimiter(header: str, requested: str | None) -> str:
        if requested:
            if requested == "whitespace":
                return "whitespace"
            if len(requested) != 1:
                raise IngestError("delimiter must be one character or 'whitespace'")
            return requested
        counts = {candidate: header.count(candidate) for candidate in (",", "\t", ";")}
        best = max(counts, key=counts.get)
        if counts[best] == 0:
            raise IngestError("cannot detect CSV delimiter; pass --delimiter explicitly")
        return best

    def read_table(
        self,
        path: str | Path,
        *,
        delimiter: str | None = None,
        max_rows: int | None = None,
        list_key: str | None = None,
    ) -> list[dict[str, Any]]:
        source = Path(path)
        if not source.is_file():
            raise IngestError(f"local input is not a file: {source}")
        size = source.stat().st_size
        if size > self.metadata.max_response_bytes:
            raise LimitExceeded(
                f"local input is {size} bytes; cap is {self.metadata.max_response_bytes}"
            )
        limit = self.metadata.max_rows if max_rows is None else max_rows
        if not 1 <= limit <= self.metadata.max_rows:
            raise LimitExceeded(f"max_rows must be in 1..{self.metadata.max_rows}")
        raw = source.read_bytes()
        if len(raw) > self.metadata.max_response_bytes:
            raise LimitExceeded("local input grew beyond the configured byte cap")
        text = raw.decode("utf-8-sig")
        if source.suffix.lower() == ".json":
            try:
                payload = json.loads(text)
            except json.JSONDecodeError as exc:
                raise IngestError(f"invalid JSON table: {exc}") from exc
            if isinstance(payload, dict):
                if list_key:
                    payload = payload.get(list_key)
                else:
                    for key in ("data", "results", "rows"):
                        if isinstance(payload.get(key), list):
                            payload = payload[key]
                            break
            if not isinstance(payload, list):
                raise IngestError("JSON table must be a list or contain a named list")
            rows: list[dict[str, Any]] = []
            for index, row in enumerate(payload, 1):
                if not isinstance(row, dict):
                    raise IngestError(f"JSON row {index} is not an object")
                rows.append(row)
        else:
            if source.suffix.lower() not in {".csv", ".tsv", ".txt", ".dat"}:
                raise IngestError("supported local formats are CSV, TSV, TXT, DAT, and JSON")
            header = text.splitlines()[0] if text else ""
            if not header.strip():
                raise IngestError("input has no header")
            actual_delimiter = self._delimiter(header, delimiter)
            if actual_delimiter == "whitespace":
                if any(len(line.split()) != len(header.split()) for line in text.splitlines() if line.strip()):
                    raise IngestError("whitespace table rows must have the same field count as the header")
                stream = io.StringIO("\n".join(" ".join(line.split()) for line in text.splitlines()))
                reader = csv.DictReader(stream, delimiter=" ")
            else:
                stream = io.StringIO(text)
                reader = csv.DictReader(stream, delimiter=actual_delimiter)
            fields = reader.fieldnames or []
            if not fields or any(not field.strip() for field in fields):
                raise IngestError("input has missing or blank column names")
            if len(fields) != len(set(fields)):
                raise IngestError("input has duplicate column names")
            rows = []
            for line_number, row in enumerate(reader, 2):
                if None in row:
                    raise IngestError(f"row {line_number} has more values than header columns")
                if not any(str(value or "").strip() for value in row.values()):
                    continue
                rows.append(dict(row))
                if len(rows) > limit:
                    raise LimitExceeded(f"table exceeds max_rows={limit}")
        if len(rows) > limit:
            raise LimitExceeded(f"table exceeds max_rows={limit}")
        return rows

    def fetch(
        self,
        *,
        input_path: str | Path,
        delimiter: str | None = None,
        max_rows: int | None = None,
        list_key: str | None = None,
        **_: Any,
    ) -> list[dict[str, Any]]:
        return self.read_table(
            input_path, delimiter=delimiter, max_rows=max_rows, list_key=list_key
        )

    def plan(
        self,
        *,
        input_path: str | Path,
        max_rows: int | None = None,
        delimiter: str | None = None,
        list_key: str | None = None,
        mock: bool = False,
        **_: Any,
    ) -> dict[str, Any]:
        source = Path(input_path)
        if not source.is_file():
            raise IngestError(f"local input is not a file: {source}")
        limit = self.metadata.max_rows if max_rows is None else max_rows
        if not 1 <= limit <= self.metadata.max_rows:
            raise LimitExceeded(f"max_rows must be in 1..{self.metadata.max_rows}")
        return self._plan(
            local_input=source,
            row_limit=limit,
            mock=mock,
            notes="Local file only; no network request. FITS/Parquet are not parsed by this stdlib adapter.",
        )

    def normalize(self, rows: Any, **kwargs: Any) -> dict[str, Any]:
        raise NotImplementedError
