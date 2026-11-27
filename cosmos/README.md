# COSMOS — একীভূত মনোরিপো

মাস্টারপ্ল্যান v2.0 ভাগ ১৪.৪ অনুযায়ী একীভূত কাঠামো। ক্যাননিক্যাল নথি: `../COSMOS-Masterplan/cosmos_unified_masterplan.md`

## কাঠামো

| ডিরেক্টরি | বিষয় |
|---|---|
| `docs/adr/` | Architecture Decision Records (`02_DECISION_REGISTER.md`-র ভিত্তিতে) |
| `config/` | রান-কনফিগ YAML + `parameter-sets/` (Planck18, SH0ES, CCHP, DESI_w0wa) |
| `scientific-knowledge/` | PostgreSQL DDL স্কিমা, তত্ত্ব-তালিকা, ingest অ্যাডাপ্টার, provenance/লাইসেন্স |
| `datasets/` | যাচাইকৃত ক্যাটালগ-ডেটা (উৎস+অনিশ্চয়তা+লাইসেন্স বাধ্যতামূলক) |
| `engine/` | G0–G8 ইঞ্জিন মডিউল; `reference-python/` = ক্যাননিক্যাল Python রেফারেন্স বাস্তবায়ন |
| `services/api/` | FastAPI `/v1/` সার্ভিস + DuckDB টাইল-সার্ভার |
| `explorer/` | Production Explorer (React/TS) — `prototypes/explorer-react/` থেকে স্থানান্তরিত |
| `prototypes/` | `dighonto/` আলোক-শঙ্কু প্রোটোটাইপ, `cosmos-engine/` স্কেল-কনসোল |
| `validation/` | ১০টি পাইপলাইন-চেক + COSMOS 0.1 গ্রহণযোগ্যতা-পরীক্ষা |
| `tests/` | Python pytest স্যুট (engine + api + schema) |
| `tools/` | coverage-verifier, checksum, রিপোর্ট-জেনারেটর |
| `legacy/` | আর্কাইভ (সম্পাদনা নয়) |

## নীতি (অপরিবর্তনীয়)

- Tier A নিষিদ্ধ; লক্ষ্য Tier B statistical + সীমিত Tier C (Twin Mode ≥5 Mpc)।
- প্রতিটি পরিমাপে: `value ± σ, unit, method, source, data_version, license, confidence A–E, evidence OBS/REC/SIM/MOCK/UNC, boundary_kind, alternatives[]`।
- ডেটা না থাকলে: "অজানা / পরিমাপ নেই" — বানানো মান নিষিদ্ধ।
- নিজস্ব কোড: Apache-2.0 (`LICENSE`)।

## দ্রুত শুরু

```powershell
# Python ইঞ্জিন + API টেস্ট (রিপো রুট থেকে)
pip install -e "cosmos/engine/reference-python[api,dev]"
python -m pytest cosmos/tests -q

# API সার্ভার
uvicorn services.api.main:app --reload --app-dir cosmos

# Explorer
cd cosmos/explorer
npm install
npm run dev

# L0 handoff (আলাদা terminal, রিপো রুট)
npm run dev
```

## Bounded data ingest
```powershell
python cosmos/scientific-knowledge/ingest/cli.py sources
python cosmos/scientific-knowledge/ingest/cli.py plan gaia --ra 10.6847 --dec 41.2692 --radius-deg 0.1 --limit 10
```
Dry-run ডিফল্ট; `--execute` ছাড়া network/file read হয় না। বিস্তারিত `cosmos/scientific-knowledge/ingest/README.md`।

## Deployment / HPC readiness
```powershell
docker compose -f cosmos/deploy/docker-compose.yml up --build
python cosmos/tools/hpc_readiness.py phase5 hpc
```
Readiness exit 2 = solver/HPC executable অনুপস্থিত; এটি validation pass নয়।

## API benchmark
API চালু অবস্থায়:
```powershell
python cosmos/tools/benchmark_api.py
```
২৭ নভে. ২০২৬-এর seed-scale ফল: cone ~১৯ ms (<২ s), mock observation ~৬ ms (<১০ s), statistics ~৪ ms (<৫ s), Arrow tile ~৬৮ ms / ৫৬,৩৬৮ B (chiসহ, SIM; startup warm-up + cache)। এটি production-load benchmark নয়।

## Numerical validation
```powershell
python cosmos/validation/pipeline/numerical.py
```
স্থানীয় generated-IC P(k), σ₈/PS/Tinker HMF, PM 2/4/8 time-step ও EMU holdout চালায়। External solver/production spatial gates `UNAVAILABLE` রিপোর্ট করে; executable presence-কে scientific pass ধরা হয় না।

## বাকি কাজ ও সীমা
COSMOS 0.1 (পর্যায় ০–৪) সম্পূর্ণ। Phase 5–8, পূর্ণ Gaia/Cosmicflows ingest, HEALPix tile traversal ও ৫–১০M/60 fps gate-গুলোর local scaffold আছে, কিন্তু real data/HPC/GPU ছাড়া scientific pass `UNAVAILABLE`। বিস্তারিত: [`docs/remaining-work.md`](docs/remaining-work.md)।

## R-20 pre-registration (রানের আগে)
```powershell
$env:COSMOS_PREREG_SECRET="..."
python cosmos/tools/preregister_run.py run-001 criteria.json --output out/prereg-run-001.json
```
CLI finite numeric criteria, clean git tree (অথবা explicit `--allow-dirty`), HMAC signature ও annotated `prereg-<run_id>` tag নিশ্চিত করে। Secret JSON-এ থাকে না।
