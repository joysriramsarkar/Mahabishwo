# COSMOS বাকি কাজ — সীমা ও fail-closed অবস্থা

> হালনাগাদ: ২৭ নভেম্বর ২০২৬ · ক্যাননিক্যাল চেকলিস্ট: [`COSMOS-Masterplan/05_TASK_CHECKLIST.md`](../../COSMOS-Masterplan/05_TASK_CHECKLIST.md)

COSMOS 0.1 (মাস্টারপ্ল্যানের পর্যায় ০–৪) **সম্পূর্ণ ও যাচাইকৃত**: ১০টি গ্রহণযোগ্যতা-পরীক্ষা সবুজ, local numerical gates সবুজ, Explorer/API/build/CI সবুজ। নিচের আইটেমগুলোর **কোড scaffold/local অংশ আছে**, কিন্তু scientific pass-এর জন্য প্রয়োজনীয় real dataset, GPU benchmark বা HPC allocation এই মেশিনে নেই। মাস্টারপ্ল্যানের N14/N16 অনুযায়ী এগুলোকে `UNAVAILABLE` রাখা হয়; executable উপস্থিতি বা synthetic fixture কখনো validation pass নয়।

| আইটেম | Locally সম্পন্ন অংশ (PASS) | বাহ্যিক শর্ত | বর্তমান fail-closed প্রমাণ | কী দিলে বন্ধ হবে |
|---|---|---|---|---|
| Explorer performance (HEALPix tile traversal, ৫–১০M points/60 fps) | deterministic LOD (stable-hash bounded top-k), Arrow IPC tile client, cone query < ২ s; unit/e2e pass | real HEALPix-tiled catalogue + GPU/browser frame profile | LOD unit tests; `cosmos/explorer/src/data/lightconeTiles.ts` শুধু SIM tile পড়ে | real 5–10M catalogue tiles + Playwright frame-timing report |
| M1–M2 full Gaia sample | MW/Components/Sgr A*/Solar System seed catalogue; Gaia DR3 bounded regional TAP adapter, 33 ingest tests | Gaia TAP JSON response; DR4 (২ ডিসে. ২০২৬) | `gaia ingest --execute` বর্তমানে upstream HTML (Gaia DR1 portal) পায় → exit 2; কোনো output লেখা হয়নি | working TAP endpoint + validated regional JSON catalogue |
| M6–M7 full flow reconstruction | Laniakea/LG/Shapley/Fornax seed catalogue; Cosmicflows-4 bounded local-table adapter; 620±15 km/s gate | full Cosmicflows-4 table + Wiener/BORG constrained realization | adapter dry-run pass; full Wiener reconstruction run করা হয়নি | real full catalogue + constrained-realization run + provenance |
| Phase-5 production P(k)/HMF/COLA | independent σ₈/PS/Tinker HMF, PM 2/4/8 step ladder, ensemble P(k) with per-shell 3σ audit | real production-volume run, spatial ×2/4/8 ladder, COLA vs full N-body | `python cosmos/validation/pipeline/numerical.py` → local PASS, production gates `UNAVAILABLE` | HPC run with R-20 pre-registration + R-21 provenance |
| Six-step validation ladder, steps 3–6 | steps 1–2 (unit/manufactured + analytic/astropy/independent numerical) pass | production solver/data + future observation comparison | `python cosmos/tools/hpc_readiness.py phase5 hpc` → `ready:false`, exit 2 | completed registered production runs and observation comparisons |
| Phases 7–8 hydro/BORG/Z7/Z8 | proposal outline, Docker/Apptainer recipes, executable detection + fail-closed invocation | AREPO/GIZMO/BORG/MESA/GADGET etc. + HPC allocation | readiness report: all required executables `null`; exit 2 | allocation + solver runs + energy/GPU-hour report |

## যাচাইকরণ কমান্ড

```powershell
# local executable scientific gates
python -m pytest cosmos/tests -q                 # ৯৫/৯৫ PASS
python cosmos/validation/pipeline/checks.py      # ১০/১০ PASS
python cosmos/validation/pipeline/numerical.py   # local PASS; production UNAVAILABLE

# external gates — সৎভাবে fail-closed
python cosmos/tools/hpc_readiness.py phase5 hpc  # ready:false, exit 2
python cosmos/scientific-knowledge/ingest/cli.py ingest gaia `
  --ra 10.6847 --dec 41.2692 --radius-deg 0.1 --limit 5 `
  --execute --output <temp-output.json>          # upstream HTML → exit 2, output লেখা হয় না
```

## নীতি

- ডেটা/সolver না থাকলে ফলাফল **"অজানা / পরিমাপ নেই"** বা `UNAVAILABLE`।
- synthetic fixture কখনো real observation হিসেবে লেবেল করা হয় না; `MOCK`/`SIM` ট্যাগ বাধ্যতামূলক।
- executable detection কেবল report; scientific validation pass নয়।
- production run-এর আগে HMAC-signed pre-registration (`cosmos/tools/preregister_run.py`) ও পরে provenance manifest (`R-21`) বাধ্যতামূলক।
