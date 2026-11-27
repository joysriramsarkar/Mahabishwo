# COSMOS bounded data ingest

This infrastructure normalizes **small, explicitly selected inputs** into the existing `catalogue` + `objects` Local Universe JSON shape. It does not populate or overwrite `cosmos/datasets/local-universe.json`, and it does not claim that any source dataset was downloaded.

Implementation: [`cosmos/datasets/adapters/`](../../datasets/adapters/README.md). The adapter-scoped release registry is [`cosmos/datasets/adapters/releases.json`](../../datasets/adapters/releases.json); the pre-existing repository release tracker is deliberately untouched.

## Safety and provenance rules

- `plan`, and `ingest` without `--execute`, perform **no network request and no data-file read**.
- Every measurement carries source/release, unit, method, licence, attribution, and either a finite non-negative sigma or an explicit `uncertainty_note`.
- A source statement that uncertainty is not quoted cannot be combined with an invented sigma. Non-finite values are rejected.
- Mass measurements require `mass_definition`.
- Planck and GWOSC asymmetric bounds remain `interval` objects with `sigma: null`; they are never symmetrized.
- Gaia-derived distance and magnitude errors are labelled as approximate transformations, not source-provided measurements.
- Mock rows always receive `evidence: MOCK`, `mock-` identifiers, synthetic-fixture source/licence text, and a notice that no scientific data or source download is represented.
- Gaia accepts only generated regional `CIRCLE` ADQL with `TOP <= 2000`; raw SQL is not accepted.
- HTTP responses are streamed with byte caps. GWOSC also has a 4 MiB aggregate metadata budget and never follows strain/posterior links.
- JWST accepts PUBLIC metadata only. FITS files and images are never requested.
- Local tables are capped at 2,000 rows (5,000 for DESI/Euclid) and 2 MiB by default. No adapter downloads a full survey.
- Output is written to a temporary sibling, checked by the existing [`validate_catalog.py`](validate_catalog.py), and atomically replaced only if validation succeeds.

## CLI

Run from the repository root with Python 3.10+ and `httpx` installed.

```powershell
# Discover enabled adapters and checked release status.
python cosmos/scientific-knowledge/ingest/cli.py sources
python cosmos/scientific-knowledge/ingest/cli.py releases

# Gaia: print the exact regional TAP request without making it.
python cosmos/scientific-knowledge/ingest/cli.py plan gaia --ra 10.6847 --dec 41.2692 --radius-deg 0.1 --limit 10

# Gaia: explicitly execute a small query and validate a separate output file.
python cosmos/scientific-knowledge/ingest/cli.py ingest gaia --ra 10.6847 --dec 41.2692 --radius-deg 0.1 --limit 10 --execute --output out/gaia-small.json

# A local, operator-supplied export. Omit --execute to inspect the plan only.
python cosmos/scientific-knowledge/ingest/cli.py ingest cosmicflows --input exports/cf4-small.csv --max-rows 100
python cosmos/scientific-knowledge/ingest/cli.py ingest cosmicflows --input exports/cf4-small.csv --max-rows 100 --execute --output out/cf4-small.json

# JWST metadata for one PUBLIC product URI (no FITS download).
python cosmos/scientific-knowledge/ingest/cli.py plan jwst --data-uri "mast:JWST/product/<public-product>.fits"

# GWOSC event metadata; default is at most ten events plus parameter metadata.
python cosmos/scientific-knowledge/ingest/cli.py plan ligo --limit 5
python cosmos/scientific-knowledge/ingest/cli.py ingest ligo --limit 5 --no-parameters --execute --output out/gwtc-events.json
```

`--output` is mandatory with `--execute`. `--fail-on-warnings` also rejects accepted sigma-null warnings. Unknown, upcoming, results-only, or schema-unreviewed releases fail closed.

### Local formats and column maps

CSV, TSV, TXT, DAT, and JSON row lists are supported with the standard library. FITS and Parquet are intentionally not parsed; convert a **small** official export externally and record that conversion in your provenance workflow. A JSON wrapper can be selected with `--list-key` (for example `parameters` for a Planck parameter-table export).

Release-specific columns can be mapped without editing code:

```json
{"id": "source_id", "ra": "right_ascension", "dec": "declination", "redshift": "photoz"}
```

```powershell
python cosmos/scientific-knowledge/ingest/cli.py ingest euclid --input exports/euclid-small.csv --column-map exports/euclid-columns.json --execute --output out/euclid-small.json
```

Planck rows must include `parameter`, `value`, `model`, `data_combination`, and either `sigma` or both interval bounds. Bounds default to absolute bounds; `*_error` columns infer signed offsets or positive error magnitudes. Set `bounds_kind` to `absolute`, `signed-offset`, or `magnitude` whenever the convention needs to be explicit.

### Synthetic fixture contract

A CLI fixture must be a bounded JSON object with all three fields:

```json
{
  "mock": true,
  "notice": "Synthetic schema fixture only; not archive data.",
  "payload": {"rows": []}
}
```

Use `rows` for local-table adapters, a row list for Gaia/GWOSC, or one MAST parameters object for JWST. Fixtures bypass all network access. Tests keep their synthetic rows inline in `cosmos/tests/test_ingest.py`.

## Release and licence snapshot

Public metadata was checked on **2026-11-27**. This is a provenance snapshot, not a guarantee of endpoint uptime. A real five-row Gaia DR3 TAP smoke query around M31 was attempted on the same date; the ESA endpoint returned non-JSON content, so the adapter failed closed and wrote no output. MockTransport tests remain green; no live Gaia rows are claimed.

| Source | Enabled release/access | Data licence recorded by adapter |
|---|---|---|
| Gaia | DR3, regional TAP/ADQL | CC BY-NC 3.0 IGO; non-commercial |
| Cosmicflows-4 | EDD `kallcf4` local bounded export | Public-domain EDD catalogue; cite Tully et al. |
| McConnachie | 2012 / VizieR J/AJ/144/4 local export | CC BY 4.0 public catalogue mirror; retain row references |
| DESI | DR1 local bounded export | CC BY 4.0 |
| Euclid | DR1-Foundation local bounded export | CC BY-NC 3.0 IGO; non-commercial |
| Planck | 2018 parameter table only | Planck public-product terms and product acknowledgement |
| JWST | Rolling PUBLIC MAST metadata | STScI public-data rights policy; per-product rights checked |
| LIGO/Virgo/KAGRA | Rolling GWTC event/default-parameter metadata | CC BY 4.0 |

Not enabled: Gaia DR4 (announced for 2026-12-02, still upcoming on the check date), DESI DR2 bulk data (the official overview listed DR2 results/supporting products, not a bulk spectroscopic release), all unreviewed future Euclid products, Planck maps/chains, and JWST restricted products.

## Tests

```powershell
python -m pytest cosmos/tests/test_ingest.py -q
```

The suite uses only synthetic schema fixtures and `httpx.MockTransport`. It checks all eight normalizers, metadata/licence gates, ADQL bounds, byte/row limits, coordinate and distance-modulus conversion, asymmetric intervals, dry-run I/O isolation, atomic CLI validation, and reuse of the existing catalog gate.
