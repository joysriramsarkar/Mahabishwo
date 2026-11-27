# COSMOS মাস্টারপ্ল্যান — পড়ার ক্রম ও ক্যাননিক্যাল কপি

> সংশোধিত: ২৭ নভেম্বর ২০২৬ (ক্যাননিক্যাল-কপির সিদ্ধান্ত ও Q1–Q5 অনুমোদনসহ)

| # | ফাইল | কী | মর্যাদা |
|---|---|---|---|
| 1 | `cosmos_unified_masterplan.md` | **একীভূত মাস্টারপ্ল্যান v2.0** (ভাগ ০–১৯): সংজ্ঞা, নীতি, বিজ্ঞান, সীমা, স্থাপত্য, ডেটা, ইঞ্জিন, ভ্যালিডেশন, স্ট্যাক, UI, রোডম্যাপ, MVP | ✅ **ক্যাননিক্যাল — সক্রিয় সিদ্ধান্তে এটিই প্রামাণ্য** |
| 2 | `02_DECISION_REGISTER.md` | ২৯টি সংঘাত-মীমাংসা (C-01–C-29), ২৬টি অস্পষ্ট→কংক্রিট (R-01–R-26), ৫টি সোর্স-সংশোধন (E-01–E-05); Q1–Q5 অনুমোদিত (২৭ নভে. ২০২৬) | পূর্ণ সিদ্ধান্ত-লগ |
| 3 | `03_SOURCE_ARCHIVE.md` + `প্ল্যান.txt` | মূল ১৭,৬৯০ লাইনের সোর্স-আর্কাইভ (P01–P19)। একমাত্র ব্যতিক্রম: লাইন ৩৭৬৬–৭১১৮-এর দুটি বাইট-অভিন্ন HTML → `code/legacy/`-তে এক কপি | সোর্স-রেফারেন্স |
| 4 | `04_CODE_INDEX.md` + `code/` | ১০১টি কোড/ডায়াগ্রাম/স্কিমা ফাইল (সোর্স-হুবহু এক্সট্র্যাকশন) | **সংরক্ষণ; অপরীক্ষিত — সম্পাদনার জায়গা নয়** |
| 5 | `01_MASTERPLAN.md`, `মাস্টারপ্লান.md` | v2.0-এর দুটি প্যারেন্ট-নথি (v1.0 ভাগ ০–১৫; একক সংকলন) | ঐতিহাসিক রেফারেন্স |

**কভারেজ:** মূল ১৭,৬৯০ লাইন আর্কাইভ/এক্সট্র্যাকশনে সংরক্ষিত (উপরের HTML-ব্যতিক্রমসহ)। যান্ত্রিক যাচাই: `python tools/coverage_verifier.py` → PASS (২৭ নভে. ২০২৬)।

## ক্যাননিক্যাল কার্যকরী কোড (কোথায় সম্পাদনা হবে)

> ২৭ নভে. ২০২৬-এ `cosmos/` মনোরিপো বাস্তবায়িত (ভাগ ১৪.৪, ADR-0001)। সব নতুন কাজ `cosmos/`-এ।

| কোডবেস | ক্যাননিক্যাল কপি (রিপো-রুট থেকে) | অন্য কপি | অবস্থা |
|---|---|---|---|
| Explorer (React/TS) | `cosmos/explorer/` | `code/universe-explorer/` (আর্কাইভ); পুরনো `prototypes/explorer-react/` স্থানান্তরিত | ✅ ২৭ নভে. ২০২৬: tsc ০ এরর, vitest ২৯/২৯, vite build, Playwright ১৪/১৪ (axe accessibility ২টি সহ); ৯ ভিউ-মোড, ~৯০০ ms RSD frame animation, mobile bottom-sheet, reduced-motion, Dual-Scope + L0 iframe, lazy Arrow IPC tile loader, bounded-heap LOD |
| দিগন্ত প্রোটোটাইপ | `cosmos/prototypes/dighonto/` | `code/digant-prototype/` (আর্কাইভ) | ✅ স্ট্যাটিক সার্ভারে চালানো যায় |
| স্কেল-কনসোল | `cosmos/prototypes/cosmos-engine/cosmos-engine.html` | — | ✅ একক ফাইল |
| Python ইঞ্জিন | `cosmos/engine/reference-python/` (প্যাকেজ `cosmos_engine`) | `code/engine-reference/python/` (সোর্স-সংরক্ষণ); `annex/` (লিগ্যাসি) | ✅ pip-package, astropy 1e-6 গেট, ensemble P(k) normalization + per-shell 3σ audit, HMF density-unit gate/PM/EMU validation; full suite ৯৫/৯৫, local numerical ২৮/২৮ PASS (production solver/spatial gates UNAVAILABLE) |
| ব্যাকএন্ড API | `cosmos/services/api/main.py` | — | ✅ FastAPI `/v1/` পূর্ণ সেট; লাইভ টেস্ট পাস |
| ডেটা/স্কিমা/ভ্যালিডেশন | `cosmos/datasets/`, `cosmos/scientific-knowledge/`, `cosmos/validation/` | — | ✅ ৮ উৎসের bounded adapter (pytest ৩৩/৩৩), ingest-গেট ০ এরর; pipeline ১০/১০; acceptance ১০/১০; numerical references বাস্তবায়িত (production solver gates UNAVAILABLE) |
| L0 সৌরজগৎ মডিউল | রিপো-রুট `src/` (নিজস্ব অ্যাপ) | — | ✅ build সফল; Explorer Local Scope থেকে lazy iframe handoff |
| Deployment/HPC readiness | `cosmos/deploy/`, `cosmos/tools/hpc_readiness.py` | — | ⚠️ Docker/Apptainer recipes ও fail-closed checker; এই মেশিনে HPC executables নেই (ready=false, exit 2) |
| বাকি roadmap-এর সীমা | [`cosmos/docs/remaining-work.md`](../cosmos/docs/remaining-work.md) | — | ⚠️ COSMOS 0.1 সম্পূর্ণ; phase 5–8, full Gaia/Cosmicflows, HEALPix/60 fps gate-গুলো real data/HPC ছাড়া `UNAVAILABLE` — কোনো বানানো pass নেই |
