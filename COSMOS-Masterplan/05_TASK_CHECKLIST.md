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
- [x] ADR প্রক্রিয়া (`cosmos/docs/adr/`: টেমপ্লেট + ADR-0001–0003)
- [x] Python প্যাকেজিং: `cosmos-engine 0.1.0` pyproject, ফেন্স-মুক্ত পরিচ্ছন্ন মডিউল, সত্যিকারের Arrow স্কিমা — pytest ২৩/২৩

## C. Explorer ফ্রন্টএন্ড (ট্র্যাক X)
- [x] Mock-ডেটা → বাস্তব API-ক্লায়েন্ট (`VITE_COSMOS_API`; backend OBS/REC + SIM ডেমো মার্জ; অফলাইনে evidence-লেবেলসহ fallback)। ডেমো গ্যালাক্সির আগের ভুল `observed` লেবেল সংশোধন করে `SIM` করা হয়েছে
- [x] ৯টি ভিউ-মোড (3D, Sky, Wedge+BAO/RSD, Slice, Comoving+ব্যানার, Time Lab, Obs Comparison+χ², Statistics ξ(r)/ভর-ফাংশন, Model Lab) — কীবোর্ড ১–৯, Playwright ৫/৫
- [x] Dual-Scope সুইচ (Extragalactic ব্যাজ / Local Scope ভিউ + রুট L0 অ্যাপে 1 Mpc handoff লিঙ্ক)
- [x] Caveat সিস্টেম: ⚠ কাউন্টার (StatusBar), "Why is this here?" (InfoPanel), ৫টি ট্রিগার — ইউনিট টেস্টসহ
- [~] ফ্রেম-টগল Observed ⇄ Comoving-now: অবস্থান (1+z) রূপান্তর হয়; ~১ সেকেন্ডের মসৃণ অ্যানিমেশন বাকি
- [~] পারফরম্যান্স: WebGL2/R3F পথ বিদ্যমান; cone-query < ২ s API-টেস্টে যাচাই; HEALPix-টাইল LOD ও ৫–১০M পয়েন্টে ৬০ fps উৎপাদন-পর্যায়ের (পর্যায় ৬)
- [x] Playwright e2e সম্প্রসারণ (৫ স্পেক) + CI-তে chromium
- [~] WCAG AA আংশিক: ব্যাজে আইকন+টেক্সট, aria লেবেল/pressed, `prefers-reduced-motion` CSS; মোবাইল bottom-sheet বাকি

## D. ব্যাকএন্ড ও Knowledge Core (ট্র্যাক K)
- [x] FastAPI: ভাগ ৯.৬-এর সব এন্ডপয়েন্ট + DuckDB টাইল-সার্ভার (Arrow IPC) — pytest ও লাইভ uvicorn যাচাইকৃত
- [x] API লক্ষ্য (সিড-স্কেলে): cone < ২ s (টেস্টে assert), mock-job তাৎক্ষণিক, statistics cached — উৎপাদন-লোডে পুনঃযাচাই প্রয়োজন
- [x] Orchestrator: SimulationRun + job DAG + অবস্থা-মেশিন (queued→running→checkpointed→complete→validated)
- [x] Provenance-ম্যানিফেস্ট (seed, IC-hash, code-commit, লাইব্রেরি-সংস্করণ, হ্যাশ) R-21
- [x] Pre-registration: HMAC-signed criteria, ট্যাম্পার-প্রমাণ (R-20); git-tag ধাপ রিলিজ-প্রক্রিয়ায়

## E. ডেটা-Ingest (M1–M7)
- [~] M1–M2 সিড: MW + উপাদান (বার/ডিস্ক/বাল্জ/বাহু/হ্যালো) + Sgr A* + সৌরজগৎ; R₀=8.277 kpc acceptance-টেস্টে। পূর্ণ Gaia ক্যাটালগ-ingest বাকি (ডেটা-পর্যায়)
- [x] M3–M5 সিড-ক্যাটালগ: Local Group সদস্য, Local Sheet + Council of Giants (১২) + Local Void, Virgo (16.5±0.1 Mpc) + Fornax — সব ভরে definition ট্যাগ
- [~] M6–M7 সিড: Laniakea (flow-defined watershed, LG→CMB 620±15 km/s গেট), Shapley/Perseus–Pisces/Coma/Hercules। পূর্ণ Cosmicflows-4 Wiener পুনর্গঠন ও survey-অ্যাডাপ্টার ডেটা-পর্যায়ে বাকি
- [x] রিলিজ-ট্র্যাকার: `cosmos/datasets/release-tracker.json` + API `/v1/catalogue/releases` (Gaia DR4 ২ ডিসে. ২০২৬ upcoming)
- [x] Ingest-গেট CI-তে: উৎস+অনিশ্চয়তা-নোট+লাইসেন্স+ভর-ট্যাগ ছাড়া ডেটা প্রবেশ নিষিদ্ধ — সিড ক্যাটালগে ০ এরর, ১২টি সৎ সতর্কতা

## F. ইঞ্জিন (ট্র্যাক E)
- [x] রেফারেন্স Python যাচাই: G0 astropy-পথ ≤1e-6 গেট পাস; স্বতন্ত্র numeric ~3e-3 (নিউট্রিনো-আসন্নীকরণ, নথিভুক্ত); PM ভর-সংরক্ষণ/গতি, 1LPT/2LPT টেস্ট
- [x] সলভার-মনোনয়ন সারণি: `cosmos/engine/SOLVERS.md` + ADR-0003 (প্রতি কাজে একটি প্রাথমিক)
- [x] On-the-fly light-cone writer (PM-step হুক, snapshot-interpolation নিষিদ্ধ C-23) + repetition-detector
- [~] পর্যায় ৫ গেট (টয়-স্কেলে): PM step-convergence পাস; প্রকৃত P(k)/HMF ≤১–২% ও COLA-তুলনা উৎপাদন রানে (ক্লাস্টার)
- [x] পর্যায় ৬ কাঠামো: S0–S7 শেল (continuity টেস্ট), HOD/SAM রেফারেন্স, CMB HEALPix মডিউল (healpy ঐচ্ছিক), mock-observation জব
- [!] পর্যায় ৭–৮: AREPO/GIZMO hydro zoom, BORG Twin Mode, Z7 hero run, Z8 GRMHD/MESA — HPC বরাদ্দ-নির্ভর (Q4); প্রস্তাব-রূপরেখা `cosmos/docs/hpc-proposal-outline.md`
- [x] C++20/CUDA সলভার সচেতনভাবে পিছিয়ে (SOLVERS.md); ML emulator নিয়ম (held-out >১–২% হলে নিষিদ্ধ + EMU ট্যাগ) ADR-0003-তে

## G. ভ্যালিডেশন (ট্র্যাক V)
- [~] ছয়-ধাপের সিঁড়ি: ধাপ ১–২ বাস্তবায়িত (unit + analytic/astropy টেস্ট); ধাপ ৩–৬ উৎপাদন রান/ভবিষ্যৎ ডেটা-নির্ভর — pre-registration কাঠামো প্রস্তুত
- [x] ১০টি পাইপলাইন-চেক অটোমেশন — `cosmos/validation/pipeline/checks.py` ১০/১০ PASS
- [x] COSMOS 0.1-এর ১০টি গ্রহণযোগ্যতা-পরীক্ষা — `cosmos/validation/acceptance/test_acceptance.py` ১০/১০ PASS

## H. নিষেধাজ্ঞা (সর্বদা প্রযোজ্য)
- [x] Tier A চেষ্টা নিষিদ্ধ — নীতিগতভাবে অসম্ভব ঘোষিত
- [x] সাজসজ্জার তারা / বানানো ± নিষিদ্ধ; ডেটা না থাকলে "অজানা/পরিমাপ নেই" (ingest-গেট ও UI-তে কার্যকর)
- [x] Φ7/Φ8 নিয়ে দাবি নিষিদ্ধ — শুধু `hypothesis` ট্যাগ
- [x] বড় বাক্সে full hydro নিষিদ্ধ — baryonification+HOD/SAM; delayed-cooling নিষিদ্ধ
