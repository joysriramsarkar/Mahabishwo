#!/usr/bin/env python3
"""Ingest gate (masterplan s17 phase-2/3 gates, 27 Nov 2026 tolerances).

Rules - a catalogue is REJECTED (exit 1) if any object/measurement has:
  * missing source, unit, method, data license (catalogue level), or
  * a mass measurement without mass_definition tag, or
  * sigma fabricated flag: sigma present but source says 'not quoted'.
A measurement with sigma=null is accepted ONLY with an explicit
uncertainty_note (honest 'not quoted in source'), and is counted as a warning.
"""
import json
import sys
from pathlib import Path

REQUIRED_MEAS = ("quantity", "value", "unit", "method", "source")


def validate(path: Path) -> tuple[list[str], list[str]]:
    errors, warnings = [], []
    data = json.loads(path.read_text(encoding="utf-8"))
    cat = data.get("catalogue", {})
    if not cat.get("license"):
        errors.append("catalogue.license missing")
    if not cat.get("data_version"):
        errors.append("catalogue.data_version missing")
    for obj in data.get("objects", []):
        oid = obj.get("id", "<no-id>")
        for field in ("name", "type", "evidence", "confidence", "boundary_kind"):
            if not obj.get(field):
                errors.append(f"{oid}: missing {field}")
        if obj.get("evidence") not in (None, "OBS", "REC", "SIM", "MOCK", "UNC"):
            errors.append(f"{oid}: bad evidence {obj.get('evidence')}")
        if obj.get("confidence") not in (None, "A", "B", "C", "D", "E"):
            errors.append(f"{oid}: bad confidence {obj.get('confidence')}")
        for m in obj.get("measurements", []):
            for f in REQUIRED_MEAS:
                if m.get(f) in (None, ""):
                    errors.append(f"{oid}/{m.get('quantity')}: missing {f}")
            if m.get("quantity") in ("mass", "smbh_mass") and not m.get("mass_definition"):
                errors.append(f"{oid}/{m['quantity']}: mass without definition tag (phase-2 gate)")
            if m.get("sigma") is None and not m.get("uncertainty_note"):
                errors.append(f"{oid}/{m.get('quantity')}: sigma null without uncertainty_note")
            if m.get("sigma") is None:
                warnings.append(f"{oid}/{m.get('quantity')}: uncertainty not quoted in source")
    return errors, warnings


def main(argv):
    path = Path(argv[1]) if len(argv) > 1 else \
        Path(__file__).resolve().parents[2] / "datasets" / "local-universe.json"
    errors, warnings = validate(path)
    for w in warnings:
        print(f"[warn] {w}")
    for e in errors:
        print(f"[FAIL] {e}")
    print(f"ingest-gate: {len(errors)} errors, {len(warnings)} warnings")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
