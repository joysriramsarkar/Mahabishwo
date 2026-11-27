#!/usr/bin/env python3
"""Fail-closed readiness report for HPC / external solver phases (Q4).

This script NEVER fabricates a successful run. It reports executable presence
only; scientific validation still requires the phase gates and provenance.
Exit 0 = all requested executables found, 2 = one or more unavailable.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys

SOLVERS = {
    "phase5": ["class", "camb", "music", "cola", "fastpm", "gadget4", "rockstar"],
    "phase7": ["arepo", "gizmo", "borg"],
    "phase8": ["mesa", "ipole"],
    "hpc": ["apptainer", "sbatch"],
    "container": ["docker"],
}


def report(groups: list[str]) -> dict:
    required = sorted({exe for group in groups for exe in SOLVERS[group]})
    found = {exe: shutil.which(exe) for exe in required}
    return {
        "groups": groups,
        "executables": found,
        "missing": [exe for exe, path in found.items() if path is None],
        "ready": all(path is not None for path in found.values()),
        "notice": "Executable presence is not a scientific validation pass. "
                  "Run the phase gates and record R-20/R-21 provenance.",
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("groups", nargs="*", default=["phase5"], choices=list(SOLVERS))
    args = parser.parse_args(argv)
    result = report(args.groups)
    print(json.dumps(result, indent=2))
    return 0 if result["ready"] else 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
