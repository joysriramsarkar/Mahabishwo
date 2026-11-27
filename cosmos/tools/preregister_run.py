#!/usr/bin/env python3
"""R-20 pre-registration CLI: signed criteria JSON + immutable git tag.

Secret is read from COSMOS_PREREG_SECRET (never embedded in the JSON).
The tag is annotated and points at the current code commit. Existing tags or
uncommitted changes fail closed unless --allow-dirty is explicitly supplied.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT / "cosmos/engine/reference-python/src"))
from cosmos_engine import PreRegistration  # noqa: E402


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("run_id")
    p.add_argument("criteria_json", type=Path, help="JSON file of numeric acceptance criteria")
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--allow-dirty", action="store_true")
    args = p.parse_args(argv)
    secret = os.environ.get("COSMOS_PREREG_SECRET")
    if not secret:
        print("ERROR: COSMOS_PREREG_SECRET is required", file=sys.stderr)
        return 2
    criteria = json.loads(args.criteria_json.read_text(encoding="utf-8"))
    if not isinstance(criteria, dict) or not criteria:
        print("ERROR: criteria must be a non-empty JSON object", file=sys.stderr)
        return 2
    for key, value in criteria.items():
        if not isinstance(key, str) or not key.strip():
            print("ERROR: criteria keys must be non-empty strings", file=sys.stderr)
            return 2
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            print(f"ERROR: criterion {key!r} must be a finite number", file=sys.stderr)
            return 2
    dirty = bool(git("status", "--porcelain"))
    if dirty and not args.allow_dirty:
        print("ERROR: uncommitted changes; commit first or use --allow-dirty", file=sys.stderr)
        return 2
    commit = git("rev-parse", "HEAD")
    tag = f"prereg-{args.run_id}"
    if subprocess.run(["git", "rev-parse", "--verify", tag], cwd=ROOT,
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
        print(f"ERROR: tag already exists: {tag}", file=sys.stderr)
        return 2
    reg = PreRegistration.create(args.run_id, criteria, secret.encode())
    payload = {
        "run_id": reg.run_id,
        "code_commit": commit,
        "criteria": reg.criteria,
        "criteria_hash": reg.criteria_hash,
        "signature": reg.signature,
        "registered_unix": reg.registered_unix,
        "tag": tag,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    git("tag", "-a", tag, commit, "-m", f"COSMOS pre-registration {args.run_id}: {reg.criteria_hash}")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
