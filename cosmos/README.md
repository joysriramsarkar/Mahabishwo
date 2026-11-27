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
# Python ইঞ্জিন + API টেস্ট
cd cosmos
pip install -e ".[dev]"
pytest

# API সার্ভার
uvicorn services.api.main:app --reload   # অথবা: python -m cosmos_api

# Explorer
cd explorer
npm install
npm run dev
```
