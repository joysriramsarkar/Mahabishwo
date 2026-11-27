# Local Universe ingest adapters

Stdlib + `httpx` adapters for bounded Gaia, Cosmicflows-4, McConnachie, DESI, Euclid, Planck, JWST, and LIGO/Virgo/KAGRA inputs. See the [CLI and provenance guide](../../scientific-knowledge/ingest/README.md).

## Module map

| File | Responsibility |
|---|---|
| `metadata.py` | Immutable, fail-closed source/release/licence/uncertainty metadata |
| `sources.py` | Checked declarations for the eight enabled sources |
| `framework.py` | Dry-run contract, streaming HTTP caps, bounded local table reader |
| `normalization.py` | Existing catalogue/object/measurement schema and strict scalar rules |
| `gaia.py` | Regional Gaia DR3 TAP/ADQL builder, query, and normalization |
| `catalog_tables.py` | Cosmicflows-4, McConnachie, DESI, Euclid, and Planck local adapters |
| `jwst.py` | One PUBLIC MAST parameters metadata query |
| `ligo.py` | Bounded GWOSC event/default-parameter metadata; no strain files |
| `registry.py` | Adapter discovery and client injection |
| `release_tracker.py` | Release registry validation and availability gate |
| `releases.json` | Adapter-scoped status checked 2026-11-27; no scientific rows |

## Programmatic use

```python
from cosmos.datasets.adapters import get_adapter

gaia = get_adapter("gaia")
plan = gaia.plan(ra_deg=10.0, dec_deg=20.0, radius_deg=0.2, limit=10)
assert plan["request_performed"] is False

# This performs one bounded request; use an explicit small sky region.
catalogue = gaia.ingest(ra_deg=10.0, dec_deg=20.0, radius_deg=0.2, limit=10)
```

For deterministic offline tests, pass `client=httpx.Client(transport=httpx.MockTransport(handler))` to `get_adapter` and pass `mock=True` to `ingest`/`normalize`. Local-table adapters accept `input_path`, `delimiter`, `max_rows`, `list_key`, and per-role `columns`.

No adapter writes the canonical Local Universe catalogue. Callers must run `cosmos/scientific-knowledge/ingest/validate_catalog.py` (the CLI does this automatically) before using an output.
