#!/usr/bin/env python3
"""Measure COSMOS API seed-scale targets (masterplan checklist D).

Targets: cone < 2 s, mock observation < 10 s, statistics < 5 s (cached).
This is not a production-load benchmark; it reports measured seed-scale times.
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import httpx


def timed(client: httpx.Client, method: str, url: str, **kwargs):
    start = time.perf_counter()
    response = client.request(method, url, **kwargs)
    response.raise_for_status()
    return response, (time.perf_counter() - start) * 1000


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--output", type=Path, help="optional JSON report path")
    args = parser.parse_args(argv)
    results = {}
    with httpx.Client(base_url=args.base_url, timeout=15.0) as client:
        _, ms = timed(client, "POST", "/v1/galaxies/cone", json={
            "ra_deg": 187.7, "dec_deg": 12.3, "radius_deg": 5.0,
        })
        results["cone_ms"] = {"value": ms, "target_ms": 2000, "passed": ms < 2000}

        job, ms = timed(client, "POST", "/v1/jobs/mock-observation", json={
            "object_id": "m87", "telescope": "HST", "exposure_s": 3600,
        })
        results["mock_observation_ms"] = {"value": ms, "target_ms": 10000, "passed": ms < 10000}
        if job.json().get("state") != "complete":
            raise RuntimeError("mock observation job did not complete")

        _, ms = timed(client, "GET", "/v1/statistics/summary")
        results["statistics_ms"] = {"value": ms, "target_ms": 5000, "passed": ms < 5000}

        tile, ms = timed(client, "GET", "/v1/lightcone/tiles/2/7")
        results["arrow_tile_ms"] = {
            "value": ms, "bytes": len(tile.content), "evidence": tile.headers.get("x-evidence"),
            "note": "No fixed target in masterplan; reported for visibility.",
        }
    results["all_fixed_targets_passed"] = all(
        r["passed"] for r in results.values() if isinstance(r, dict) and "target_ms" in r
    )
    text = json.dumps(results, indent=2)
    print(text)
    if args.output:
        args.output.write_text(text + "\n", encoding="utf-8")
    return 0 if results["all_fixed_targets_passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
