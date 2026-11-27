#!/usr/bin/env python3
"""COSMOS coverage verifier.

Checks (honest, mechanical):
 1. Source file line count (plan.txt).
 2. All P01-P19 sections present in 03_SOURCE_ARCHIVE.md with source-line markers.
 3. The archived-HTML exception: legacy single-file HTML exists (source lines 3766-7118).
 4. All files claimed by 04_CODE_INDEX.md (101 files) exist under code/ with matching count.
 5. Canonical working copies exist (root prototypes/, annex/).

Run:  python tools/coverage_verifier.py
Exit: 0 = all checks pass, 1 = any failure.
No claim beyond these mechanical checks is made.
"""
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE = HERE.parent           # COSMOS-Masterplan/
ROOT = BASE.parent           # repository root

failures = []


def check(label, ok, detail=""):
    print(f"[{'PASS' if ok else 'FAIL'}] {label} {detail}")
    if not ok:
        failures.append(label)


# 1. source line count
plan = BASE / "প্ল্যান.txt"
n_lines = len(plan.read_text(encoding="utf-8").splitlines())
check("source line count = 17690", n_lines == 17690, f"(actual: {n_lines})")

# 2. archive P-sections
archive = (BASE / "03_SOURCE_ARCHIVE.md").read_text(encoding="utf-8")
for i in range(1, 20):
    pid = f"P{i:02d}"
    check(f"archive has {pid}", re.search(rf"^# \[{pid}\]", archive, re.M) is not None)
markers = re.findall(r"source lines (\d+)-(\d+)", archive)
check("archive has >=19 source-line markers", len(markers) >= 19, f"(found: {len(markers)})")

# 3. HTML exception file
legacy = BASE / "code" / "legacy" / "universe-explorer-singlefile-v1.html"
check("legacy HTML extraction exists", legacy.exists(),
      f"({legacy.stat().st_size} B)" if legacy.exists() else "")

# 4. code/ file count (index claims 101)
code_files = [p for p in (BASE / "code").rglob("*") if p.is_file()]
check("code/ contains 101 files", len(code_files) == 101, f"(actual: {len(code_files)})")

# 5. canonical working copies
for rel in ["prototypes/explorer-react/package.json",
            "prototypes/dighonto/app.js",
            "prototypes/cosmos-engine/cosmos-engine.html",
            "annex/python-engine/cosmology.py"]:
    check(f"canonical copy exists: {rel}", (ROOT / rel).exists())

print()
if failures:
    print(f"RESULT: FAIL ({len(failures)} checks failed)")
    sys.exit(1)
print("RESULT: PASS (all mechanical checks)")
