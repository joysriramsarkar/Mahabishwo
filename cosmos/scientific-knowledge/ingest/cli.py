#!/usr/bin/env python3
"""Safe CLI for COSMOS adapters.

``plan`` (and ``ingest`` without --execute) performs no network or data-file read.
``ingest --execute`` requires an explicit output and validates through the existing
scientific-knowledge/ingest/validate_catalog.py gate before an atomic replace.
"""
from __future__ import annotations

import argparse
import importlib.util
import inspect
import json
import os
import sys
import tempfile
from pathlib import Path

import httpx
from types import ModuleType
from typing import Any

COSMOS = Path(__file__).resolve().parents[2]
# ``cosmos`` and ``datasets`` are namespace packages; the repository root must
# be importable when this file is executed directly.
if str(COSMOS.parent) not in sys.path:
    sys.path.insert(0, str(COSMOS.parent))

from cosmos.datasets.adapters import (  # noqa: E402
    ADAPTER_NAMES,
    IngestError,
    LimitExceeded,
    describe_sources,
    get_adapter,
    load_releases,
    release_for,
)
from cosmos.datasets.adapters.framework import LocalTableAdapter  # noqa: E402

_VALIDATOR: ModuleType | None = None


def catalog_validator() -> ModuleType:
    """Load the existing gate by path; do not duplicate its validation rules."""
    global _VALIDATOR
    if _VALIDATOR is None:
        path = Path(__file__).with_name("validate_catalog.py")
        spec = importlib.util.spec_from_file_location("_cosmos_ingest_validate_catalog", path)
        if spec is None or spec.loader is None:
            raise IngestError(f"cannot load existing validator: {path}")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        _VALIDATOR = module
    return _VALIDATOR


def _fixture(path: Path, max_bytes: int) -> dict[str, Any]:
    if path.stat().st_size > max_bytes:
        raise LimitExceeded(f"fixture exceeds {max_bytes} bytes")
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise IngestError(f"cannot read mock fixture {path}: {exc}") from exc
    if not isinstance(payload, dict) or payload.get("mock") is not True:
        raise IngestError("fixture must be a JSON object with mock=true")
    if not isinstance(payload.get("notice"), str) or not payload["notice"].strip():
        raise IngestError("fixture requires a notice explaining that it is synthetic test data")
    if "payload" not in payload:
        raise IngestError("fixture requires payload")
    return payload


def _column_map(path: Path | None) -> dict[str, str] | None:
    if path is None:
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise IngestError(f"cannot read column map {path}: {exc}") from exc
    if not isinstance(payload, dict) or any(
        not isinstance(key, str) or not key.strip()
        or not isinstance(value, str) or not value.strip()
        for key, value in payload.items()
    ):
        raise IngestError("column map must be a JSON object of non-empty role -> column strings")
    return payload


def _adapter_kwargs(args: argparse.Namespace, adapter: Any) -> dict[str, Any]:
    if args.fixture:
        if args.input:
            raise IngestError("use either --fixture or --input, not both")
        if not args.fixture.is_file():
            raise IngestError(f"fixture is not a file: {args.fixture}")
        return {"mock": True, "columns": _column_map(args.column_map)}
    candidates = {
        "input_path": args.input,
        "delimiter": args.delimiter,
        "list_key": args.list_key,
        "max_rows": args.max_rows,
        "columns": _column_map(args.column_map),
        "ra_deg": args.ra,
        "dec_deg": args.dec,
        "radius_deg": args.radius_deg,
        "limit": args.limit,
        "data_uri": args.data_uri,
        "public_only": True,
        "catalog": args.catalog,
        "include_parameters": not args.no_parameters,
        "mock": args.mock,
    }
    signature = inspect.signature(adapter.plan)
    accepts_kwargs = any(
        parameter.kind == inspect.Parameter.VAR_KEYWORD
        for parameter in signature.parameters.values()
    )
    result = {
        key: value for key, value in candidates.items()
        if value is not None and (accepts_kwargs or key in signature.parameters)
    }
    if args.max_rows is not None and "max_rows" not in signature.parameters:
        raise IngestError(f"--max-rows is not supported by {args.source}")
    if args.limit is not None and "limit" not in signature.parameters:
        raise IngestError(f"--limit is not supported by {args.source}")
    try:
        signature.bind(**result)
    except TypeError as exc:
        raise IngestError(f"missing or invalid arguments for {args.source}: {exc}") from exc
    return result


def _fixture_rows(source: str, adapter: Any, payload: Any) -> Any:
    if isinstance(adapter, LocalTableAdapter):
        if isinstance(payload, dict):
            payload = payload.get("rows", payload.get("data", payload.get("results")))
        if not isinstance(payload, list):
            raise IngestError("local-table fixture payload must be a list (or an object containing rows)")
        return payload
    if source in {"gaia", "ligo"}:
        if isinstance(payload, dict):
            payload = payload.get("data" if source == "gaia" else "results")
        if not isinstance(payload, list):
            raise IngestError(f"{source} fixture payload must be a list of rows")
        return payload
    return payload


def _validated_write(catalogue: dict[str, Any], output: Path, fail_on_warnings: bool) -> list[str]:
    output = output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{output.stem}.", suffix=".tmp.json", dir=output.parent
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as stream:
            json.dump(catalogue, stream, ensure_ascii=False, indent=2, allow_nan=False)
            stream.write("\n")
        errors, warnings = catalog_validator().validate(temporary)
        if errors:
            raise IngestError("existing ingest gate rejected output: " + "; ".join(errors))
        if warnings and fail_on_warnings:
            raise IngestError("uncertainty warnings treated as errors: " + "; ".join(warnings))
        os.replace(temporary, output)
        return warnings
    finally:
        temporary.unlink(missing_ok=True)


def _common(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("source", choices=ADAPTER_NAMES)
    parser.add_argument("--release", help="must resolve to an enabled release in adapters/releases.json")
    parser.add_argument("--input", type=Path, help="bounded local CSV/TSV/TXT/DAT/JSON export")
    parser.add_argument("--fixture", type=Path, help="synthetic JSON fixture with mock=true and notice")
    parser.add_argument("--mock", action="store_true", help="label real input rows as MOCK; never upgrades evidence")
    parser.add_argument("--column-map", type=Path, help="JSON role -> source-column overrides")
    parser.add_argument("--delimiter", help="one delimiter character or 'whitespace'")
    parser.add_argument("--list-key", help="JSON wrapper key containing the row list")
    parser.add_argument("--max-rows", type=int, help="local table cap (also bounded by the source metadata)")
    parser.add_argument("--ra", type=float, help="Gaia centre RA in degrees")
    parser.add_argument("--dec", type=float, help="Gaia centre Dec in degrees")
    parser.add_argument("--radius-deg", type=float, default=1.0, help="Gaia CIRCLE radius, 0.001..10 deg")
    parser.add_argument("--limit", type=int, help="Gaia or GWOSC row cap")
    parser.add_argument("--data-uri", help="JWST mast:JWST/product/ URI (PUBLIC metadata only)")
    parser.add_argument("--catalog", default="GWTC", help="GWOSC cumulative catalogue identifier")
    parser.add_argument("--no-parameters", action="store_true", help="GWOSC event names only; no per-event parameter requests")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("sources", help="list enabled adapters and safety limits")
    commands.add_parser("releases", help="list adapter-scoped release status (not download status)")
    plan = commands.add_parser("plan", help="print a request/file plan without I/O")
    _common(plan)
    ingest = commands.add_parser("ingest", help="dry-run by default; --execute is required to read/query and write")
    _common(ingest)
    ingest.add_argument("--execute", action="store_true", help="perform the bounded query/local read")
    ingest.add_argument("--output", type=Path, help="required with --execute; existing files are replaced only after validation")
    ingest.add_argument("--fail-on-warnings", action="store_true", help="reject sigma-null warnings as well as errors")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "sources":
            print(json.dumps(describe_sources(), indent=2, ensure_ascii=False))
            return 0
        if args.command == "releases":
            print(json.dumps(load_releases(), indent=2, ensure_ascii=False))
            return 0
        adapter = get_adapter(args.source)
        release_for(args.source, args.release)
        kwargs = _adapter_kwargs(args, adapter)
        if args.command == "plan":
            print(json.dumps(adapter.plan(**kwargs), indent=2, ensure_ascii=False, allow_nan=False))
            return 0
        execute = args.execute
        if execute and args.output is None:
            raise IngestError("--output is required with --execute")
        if not execute:
            print(json.dumps(adapter.plan(**kwargs), indent=2, ensure_ascii=False, allow_nan=False))
            return 0
        if args.fixture:
            fixture = _fixture(args.fixture, adapter.metadata.max_response_bytes)
            payload = _fixture_rows(args.source, adapter, fixture["payload"])
            result = adapter.normalize(
                payload,
                columns=_column_map(args.column_map),
                mock=True,
                source_files=[args.fixture],
            )
        else:
            result = adapter.ingest(**kwargs)
        warnings = _validated_write(result, args.output, args.fail_on_warnings)
        print(json.dumps({
            "output": str(args.output.resolve()),
            "objects": len(result["objects"]),
            "measurements": sum(len(obj["measurements"]) for obj in result["objects"]),
            "warnings": warnings,
            "validated_by": "scientific-knowledge/ingest/validate_catalog.py",
        }, indent=2, ensure_ascii=False))
        return 0
    except (IngestError, OSError, ValueError, httpx.HTTPError) as exc:
        print(f"[FAIL] {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
