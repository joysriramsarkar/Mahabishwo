# COSMOS টাস্ক-চেকলিস্ট (মাস্টারপ্ল্যান v2.0 অনুযায়ী)

> তৈরি: ২৭ নভে. ২০২৬ · হালনাগাদ: ২৭ নভে. ২০২৬ (বাস্তবায়ন-সেশন শেষে)
> অবস্থা-চিহ্ন: `[ ]` বাকি · `[x]` সম্পন্ন ও যাচাইকৃত · `[~]` আংশিক · `[!]` বাহ্যিক সম্পদে অবরুদ্ধ (HPC/ভবিষ্যৎ ডেটা-রিলিজ) — বানানো ফল দিয়ে পাস দেখানো নিষিদ্ধ (N14/N16)।
> ক্যাননিক্যাল নথি: `cosmos_unified_masterplan.md` · সিদ্ধান্ত: `02_DECISION_REGISTER.md` (Q1–Q5 অনুমোদিত)

## A. ডকুমেন্টেশন ও সিদ্ধান্ত
- [x] `00_README.md` পুনর্লেখা — ক্যাননিক্যাল = unified v2.0
- [x] Unified নথির সংখ্যা-গরমিল সংশোধন (সংঘাত ১৭, তত্ত্ব ১২, টেবিল ১৮, শো-স্টপার ৪+১, z_max ব্যাখ্যা)
- [x] `মাস্টারপ্লান.md` সোর্স-লাইন ১৭,৬৯০ সংশোধন
- [x] কভারেজ-যাচাই স্ক্রিপ্ট `tools/coverage_verifier.py` — PASS (ক্যাননিক্যাল পাথ cosmos/-এ হালনাগাদ)
- [x] Q1–Q5 অনুমোদিত ও নথিভুক্ত (২৭ নভে. ২০২৬)
- [x] পর্যায় ২–৪ গেটে সংখ্যাগত সহনমাত্রা
- [x] ক্যাননিক্যাল-কপি সিদ্ধান্ত (Explorer/Python/দিগন্ত) + stray `.js` পরিষ্কার + Git কমিট `4ea6de3`

## B. পর্যায় ০ — ভিত্তি (গেট: CI সবুজ, স্কিমা-মাইগ্রেশন পরীক্ষিত)
- [x] `cosmos/` মনোরিপো কাঠামো (ভাগ ১৪.৪) বাস্তবে তৈরি
- [x] ক্যাননিক্যাল কপি স্থানান্তর: Explorer → `cosmos/explorer/`, দিগন্ত → `cosmos/prototypes/dighonto/`, স্কেল-কনসোল → `cosmos/prototypes/cosmos-engine/`, Python → `cosmos/engine/reference-python/` (ADR-0001)
- [x] GitHub Actions CI: tsc + vitest + vite build + pytest + PostgreSQL migration + Playwright (`.github/workflows/ci.yml`)
- [x] `ParameterSet` বাস্তবায়ন — `cosmos_engine.parameters` (Planck18 ডিফল্ট; SH0ES/CCHP/DESI_w0wa; H₀ 67.7/73.0 দ্বৈত ensemble)
- [x] PostgreSQL Object Registry: ১৮ টেবিল DDL (`cosmos/scientific-knowledge/schema/001_initial.sql`) + pglast grammar-যাচাই + CI-তে প্রকৃত Postgres migration; বাধ্যতামূলক ফিল্ডসহ
- [x] Apache-2.0 `LICENSE` (cosmos/, দাপ্তরিক পাঠ্য) + ক্যাটালগ লাইসেন্স-ম্যানিফেস্ট (ingest-গেটে বাধ্যতামূলক)
- [x] ADR প্রক্রিয়া (`cosmos/docs/adr/`: টেমপ্লেট + ADR-0001–0004)
- [x] Python প্যাকেজিং: `cosmos-engine 0.1.0` pyproject, ফেন্স-মুক্ত পরিচ্ছন্ন মডিউল, সত্যিকারের Arrow স্কিমা, YAML ParameterSet loader; core engine ১৪/১৪, non-numerical suite ৬৭/৬৭, full suite ৯৫/৯৫ পাস

## C. Explorer ফ্রন্টএন্ড (ট্র্যাক X)
- [x] Mock-ডেটা → বাস্তব API-ক্লায়েন্ট (`VITE_COSMOS_API`; backend OBS/REC + SIM ডেমো মার্জ; অফলাইনে evidence-লেবেলসহ fallback)। ডেমো গ্যালাক্সির আগের ভুল `observed` লেবেল সংশোধন করে `SIM` করা হয়েছে
- [x] ৯টি ভিউ-মোড (3D, Sky, Wedge+BAO/RSD, Slice, Comoving+ব্যানার, Time Lab, Obs Comparison+χ², Statistics ξ(r)/ভর-ফাংশন, Model Lab) — কীবোর্ড ১–৯
- [x] Dual-Scope সুইচ (Extragalactic ব্যাজ / Local Scope + রুট L0 অ্যাপের lazy iframe handoff; `VITE_LOCAL_APP_URL`)
- [x] Caveat সিস্টেম: ⚠ কাউন্টার (StatusBar), "Why is this here?" (InfoPanel), ৫টি ট্রিগার — ইউনিট টেস্টসহ
- [x] ফ্রেম-টগল Observed ⇄ Comoving-now: source comoving data অক্ষত; known v_los-এ first-order RSD, unknown-এ identity; ~৯০০ ms CPU interpolation (galaxy/cluster/filament/void), reduced-motion-এ instant
- [~] পারফরম্যান্স: WebGL2/R3F, deterministic camera-distance LOD (far 25k / near max 250k, stable-hash bounded top-k heap `O(n log k)` / `O(k)` memory, unit-tested), Model Lab-এর lazy Arrow IPC tile loader (live API-তে ১,৯৮৬ SIM row parse পাস) ও cone-query < ২ s API-টেস্ট আছে; পূর্ণ HEALPix tile traversal ও ৫–১০M পয়েন্টে ৬০ fps বাস্তব ডেটাসেটে যাচাই বাকি (পর্যায় ৬)
- [x] Playwright ১৪/১৪ desktop+mobile (bottom-sheet, ৯ modes, selection preservation, keyboard search, reduced-motion, L0 iframe, Arrow tile, uncaught-error guard, axe ২ scan) + CI chromium
- [x] WCAG/mobile: Radix focus-trap bottom-sheet, ≥৪৪px touch targets, safe-area, listbox/combobox semantics, reduced-motion hook; axe-core WCAG 2.1 AA desktop+mobile scan-এ serious/critical ০ (muted contrast 4.18→≥4.5, slider thumb label সংশোধিত)

## D. ব্যাকএন্ড ও Knowledge Core (ট্র্যাক K)
- [x] FastAPI: ভাগ ৯.৬-এর সব এন্ডপয়েন্ট + DuckDB টাইল-সার্ভার (Arrow IPC) — pytest ও লাইভ uvicorn যাচাইকৃত
- [x] API লক্ষ্য (সিড-স্কেল, `tools/benchmark_api.py`): cone ~১৯ ms <২ s, mock ~৬ ms <১০ s, statistics ~৪ ms <৫ s; Arrow tile (chi columnসহ) startup warm-up+cache-এ ~৬৮ ms — উৎপাদন-লোডে পুনঃযাচাই প্রয়োজন
- [x] Orchestrator: SimulationRun + job DAG + অবস্থা-মেশিন (queued→running→checkpointed→complete→validated)
- [x] Provenance-ম্যানিফেস্ট (seed, IC-hash, code-commit, লাইব্রেরি-সংস্করণ, হ্যাশ) R-21
- [x] Pre-registration: HMAC-signed criteria, ট্যাম্পার-প্রমাণ (R-20); `cosmos/tools/preregister_run.py` signed JSON + annotated git tag CLI (disposable-repo test পাস)

## E. ডেটা-Ingest (M1–M7)
- [~] M1–M2 সিড: MW + উপাদান + Sgr A* + সৌরজগৎ; R₀=8.277 kpc acceptance-টেস্টে। Gaia DR3 regional TAP adapter প্রস্তুত (৩৩ ingestion tests-এর অংশ); পূর্ণ ক্যাটালগ ডাউনলোড ইচ্ছাকৃতভাবে বাদ (ডেটা-পর্যায়)
- [x] M3–M5 সিড-ক্যাটালগ: Local Group সদস্য, Local Sheet + Council of Giants (১২) + Local Void, Virgo (16.5±0.1 Mpc) + Fornax — সব ভরে definition ট্যাগ
- [~] M6–M7 সিড: Laniakea (flow-defined watershed, LG→CMB 620±15 km/s গেট), Shapley/Perseus–Pisces/Coma/Hercules। Cosmicflows-4 bounded local-table adapter প্রস্তুত; পূর্ণ Wiener পুনর্গঠন বাস্তব ডেটাসেটে বাকি
- [x] ৮ উৎসের adapter: Gaia DR3 TAP/ADQL, Cosmicflows-4, McConnachie, DESI, Euclid, Planck, JWST PUBLIC metadata, LIGO/Virgo/KAGRA GWOSC — dry-run default, byte/row/rights caps, atomic validated output; pytest ৩৩/৩৩
- [x] রিলিজ-ট্র্যাকার: repository + adapter-scoped registries; Gaia DR4 (২ ডিসে. ২০২৬) ও DESI DR2 bulk upstream unavailable হলে fail closed
- [x] Ingest-গেট CI-তে: উৎস+অনিশ্চয়তা-নোট+লাইসেন্স+ভর-ট্যাগ ছাড়া ডেটা প্রবেশ নিষিদ্ধ — সিড ক্যাটালগে ০ এরর, ১২টি সৎ সতর্কতা

## F. ইঞ্জিন (ট্র্যাক E)
- [x] রেফারেন্স Python যাচাই: G0 astropy-পথ ≤1e-6 গেট পাস; স্বতন্ত্র numeric ~3e-3 (নিউট্রিনো-আসন্নীকরণ, নথিভুক্ত); PM ভর-সংরক্ষণ/গতি, 1LPT/2LPT টেস্ট
- [x] সলভার-মনোনয়ন সারণি: `cosmos/engine/SOLVERS.md` + ADR-0003 (প্রতি কাজে একটি প্রাথমিক)
- [x] On-the-fly light-cone writer (PM-step হুক, snapshot-interpolation নিষিদ্ধ C-23) + repetition-detector
- [~] পর্যায় ৫ গেট (টয়-স্কেলে): independent σ₈/PS/Tinker HMF, PM 2/4/8 time-step convergence ও generated-IC ensemble P(k) recovery পাস; low-mode shell-এ fixed tolerance নয়, auditable per-shell 3σ ensemble error budget ব্যবহৃত। প্রকৃত spatial P(k)/HMF ≤১–২%, COLA-তুলনা ও ×2/4/8 spatial ladder উৎপাদন রানে (ক্লাস্টার)
- [x] পর্যায় ৬ কাঠামো: S0–S7 শেল (continuity টেস্ট), HOD/SAM রেফারেন্স, CMB HEALPix মডিউল (healpy ঐচ্ছিক), mock-observation জব
- [!] পর্যায় ৭–৮: AREPO/GIZMO hydro zoom, BORG Twin Mode, Z7 hero run, Z8 GRMHD/MESA — HPC বরাদ্দ-নির্ভর (Q4)। প্রস্তাব-রূপরেখা, Docker/Apptainer recipe ও `cosmos/tools/hpc_readiness.py` প্রস্তুত; এই মেশিনে executable না থাকায় readiness `false`/exit 2 (বানানো pass নয়)
- [x] C++20/CUDA সলভার সচেতনভাবে পিছিয়ে; external solver adapters (CLASS/CAMB/MUSIC/COLA/FASTPM/GADGET/AREPO/GIZMO/ROCKSTAR/BORG) executable detection + fail-closed invocation; ML emulator holdout gate (held-out >১–২% হলে FAIL, EMU provenance tag বাধ্যতামূলক)

## G. ভ্যালিডেশন (ট্র্যাক V)
- [~] ছয়-ধাপের সিঁড়ি: ধাপ ১–২ বাস্তবায়িত (unit/manufactured + analytic/astropy/independent numerical references); ধাপ ৩–৬ উৎপাদন solver/data/ভবিষ্যৎ observation-নির্ভর — R-20 pre-registration CLI ও R-21 provenance প্রস্তুত
- [x] ১০টি পাইপলাইন-চেক অটোমেশন — `cosmos/validation/pipeline/checks.py` ১০/১০ PASS
- [~] Numerical validation: independent σ₈/PS/Tinker HMF, executed PM 2/4/8 time-step ladder, generated-IC ensemble P(k) recovery ও EMU holdout gate-সহ local numerical suite ২৮/২৮ PASS; solver detection কেবল report করে — production phase-5/7 spatial/solver gates স্পষ্টভাবে UNAVAILABLE
- [x] COSMOS 0.1-এর ১০টি গ্রহণযোগ্যতা-পরীক্ষা — `cosmos/validation/acceptance/test_acceptance.py` ১০/১০ PASS

## H. নিষেধাজ্ঞা (সর্বদা প্রযোজ্য)
- [x] Tier A চেষ্টা নিষিদ্ধ — নীতিগতভাবে অসম্ভব ঘোষিত
- [x] সাজসজ্জার তারা / বানানো ± নিষিদ্ধ; ডেটা না থাকলে "অজানা/পরিমাপ নেই" (ingest-গেট ও UI-তে কার্যকর)
- [x] Φ7/Φ8 নিয়ে দাবি নিষিদ্ধ — শুধু `hypothesis` ট্যাগ
- [x] বড় বাক্সে full hydro নিষিদ্ধ — baryonification+HOD/SAM; delayed-cooling নিষিদ্ধ
