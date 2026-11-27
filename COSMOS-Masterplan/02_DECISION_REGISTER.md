# COSMOS সিদ্ধান্ত-রেজিস্টার v1.0

> **অবস্থা (২৭ নভে. ২০২৬):** এই রেজিস্টারটি `01_MASTERPLAN.md` (v1.0)-এর জন্য তৈরি; সক্রিয় ক্যাননিক্যাল নথি এখন `cosmos_unified_masterplan.md` (v2.0, ভাগ ১৯-এ ১৭টি মূল সংঘাতের সূচি)। এই ফাইলের C/R/E এন্ট্রিগুলোই পূর্ণ লগ হিসেবে বৈধ থাকছে। **মালিকের সিদ্ধান্ত Q1–Q5: অনুমোদিত (২৭ নভে. ২০২৬)** — ডিফল্ট মানগুলোই চূড়ান্ত (নাম COSMOS/দিগন্ত, লাইসেন্স Apache-2.0, টিম-অনুমান, HPC-পথ, প্রথম রিলিজ COSMOS 0.1)।

মাস্টারপ্ল্যান (`01_MASTERPLAN.md`)-এর প্রতিটি সংঘাত-মীমাংসা (**C-xx**), অস্পষ্ট-থেকে-কংক্রিট রূপান্তর (**R-xx**) ও সোর্স-সংশোধন (**E-xx**) এখানে। নিয়ম: যেখানে দুই সোর্স শুধু ভিন্ন *সংজ্ঞা/ডেটাসেট* ব্যবহার করেছে, সেখানে "ভুল" ঘোষণা না করে **দুটিই সংরক্ষিত, একটি ডিফল্ট**; যেখানে সত্যিই অসঙ্গতি বা ভুল, সেখানে সংশোধন ও কারণ।

---

## ভাগ I — সংঘাত ও মীমাংসা

| ID | বিষয় | বিরোধী অবস্থান (সোর্স) | ✅ সিদ্ধান্ত | কেন |
|---|---|---|---|---|
| C-01 | "সম্পূর্ণ সিমুলেশন"-এর সংজ্ঞা | তিন-ধাপী ত্রয়ী ৩ রকম: পরিসংখ্যানগত/পুনর্নির্মাণ/প্রতিটি কণা (P01); Tier A/B/C (P03); পর্যবেক্ষণ/তাত্ত্বিক/চূড়ান্ত (P18) | একই সিঁড়ি ধরে একীভূত; Tier B মূল, Tier C ডেলিভারি, Tier A অসম্ভব; Twin Mode যোগ | তিনটি আসলে একই ধারণার ভিন্ন নাম (মাস্টারপ্ল্যান ১.১) |
| C-02 | Planck-grid ও শুরুর বিন্দু | "Planck-ঘনক/Planck-ধাপ থেকে শুরু" (P03 §১ আলোচনা/P02 তুলনা) বনাম "কখনো না" (P01, P03 §৫, P05) | **Planck-grid প্রত্যাখ্যাত**; শুরু = post-inflation/hot-Big-Bang; Φ0 placeholder | ~$10^{246}$ ops বনাম প্রকৃতির ~$10^{120}$; RG/EFT-ই বৈধ |
| C-03 | "L-স্তর" নাম | P05: L0–L8 (বড় = সূক্ষ্ম); P07: L0–L12 (বড় = স্থূল); P10: L0–L6 ফিজিক্স-স্কেল; P15: Level 0–5; P19: ১–৮ জুম-পিরামিড | **চার আলাদা অক্ষ:** Φ (ভৌত), D (স্থানিক), S (redshift shell), G (ইঞ্জিন-স্তর); Rosetta-সারণি (মাস্টারপ্ল্যান ৫.১) | একই "L" ভিন্ন জিনিস বোঝালে ডেটা-মডেলে ভুল হয়। ⚠️ P07-এর L↔D ম্যাপিং স্কেল-মিলিয়ে করা (আনুমানিক) |
| C-04 | বাক্সের আকার | ২ Gpc/$h$ (P05); ৪ Gpc/$h$ (P09); ২০০০ Mpc/$h$ (P12 YAML); ৭৪০ Mpc (MTNG, রেফারেন্স) | D1-Lightcone **৪ Gpc/$h$**; D1-Twin parent **২ Gpc/$h$**; YAML = MVP/উদাহরণ | লাইট-কোন $z\le1.2$ বাক্স-পুনরাবৃত্তি-বিহীন লাগে (বড়); Twin-parent-এ zoom-ভর-অনুপাত কম (ছোট) |
| C-05 | শুরুর redshift | $z=127$ অথবা ৪৯ (P05) | **১২৭**; ৪৯ কেবল স্বল্প-রেজ বাক্সে | ছোট-স্কেল non-linear-ত্রুটি কম |
| C-06 | $H_0$ | ৬৭.৪ (Planck); ৬৭.৬৬ (astropy-Planck18); ৭৩.০৪ (SH0ES); ~৬৯.৮ | ডিফল্ট ৬৭.৬৬; **দুই ensemble বাধ্যতামূলক (৬৭.৭, ৭৩.০)**; তৃতীয় বিকল্প ৬৯.৮ | টেনশন একপক্ষে সমাধান করা বৈজ্ঞানিকভাবে সৎ নয় |
| C-07 | $\Omega_m$ ইত্যাদি | ০.৩১১, ০.৩১৫, ০.৩০৯৭ | `ParameterSet`; ডিফল্ট = astropy `Planck18` | ভিন্ন ডেটা-সমন্বয়; কোড-সামঞ্জস্য |
| C-08 | Local Group → CMB বেগ | ৬২০±১৫ (P05); ৬২৭ (P06/P07); আকাশগঙ্গা ~৫৫২ | ৬২৪±১৫ (Local Group), ~৫৫২ (আকাশগঙ্গা) আলাদা বস্তু | Local Group ≠ আকাশগঙ্গা |
| C-09 | Virgo ভর | ১.২–১.৫×$10^{15}M_\odot$ (P05/P19) বনাম "কয়েক $10^{14}$" (P06) | রেজিস্ট্রিতে `definition` ট্যাগ: $M_{200c}$ (মূল ক্লাস্টার ~কয়েক$\times10^{14}$) বনাম $M_{\rm vir}$/infall-সহ (~১.২–১.৫×$10^{15}$) | ভিন্ন aperture/সংজ্ঞা, বিরোধ নয় |
| C-10 | MW ধ্রুবক | $R_0$: ৮.১২২ / ৮.১৭৮ / ৮.২৭৭ kpc; Sgr A* ভর: ৪.১ (P05 টেবিল) / ৪.২৯৭ / ৪.৩×$10^6M_\odot$; MW ভর ০.৮–১.৫×$10^{12}$ | ডিফল্ট $R_0=8.277$ (সর্বশেষ GRAVITY), $M_{\rm SgrA^*}=4.297\times10^6$, MW $M_{\rm vir}=1.15\times10^{12}$ prior $[0.5,2.5]\times10^{12}$; বাকি মান sensitivity-সেট | সর্বশেষ পরিমাপ ডিফল্ট; বিকল্প সংরক্ষিত |
| C-11 | সুপারক্লাস্টার-আকার | Laniakea ~১৬০ Mpc (~৫২০ Mly) ✓ সঙ্গত; Local/Virgo SC ৩৩–৪৫ Mpc | `boundary_kind` (flow-defined/model-dependent) ফিল্ড; দুটি মানই সংজ্ঞাসহ | সীমানা-সংজ্ঞা-নির্ভর |
| C-12 | নিউট্রিনো-সংখ্যা | P02 সারণি: "~$10^8$" বনাম P18/মোট-যোগ ~$10^{89}$–$10^{90}$ | **$\sim10^{89}$** | $10^8$ স্পষ্ট টাইপো (CνB ~৩৩৬/cm³ × আয়তন) |
| C-13 | Landauer-গণনা | P02: ~$10^{96}$ J | $T=2.7255$ K-এ ≈ $2.6\times10^{99}$ J | সংশোধিত গাণিতিক ফল; উপসংহার একই |
| C-14 | Planck-ধাপ ব্রুট-ফোর্স | $10^{151}$ (কণা-মডেল, P02) বনাম $10^{246}$ (লাটিস, P03) | **দুটিই রাখা**, মডেল-লেবেলসহ | ভিন্ন নিমিত্ত-মডেল; দুটোই অসম্ভব |
| C-15 | MW–M31 সংঘর্ষ | "নিশ্চিত ~৪–৫ Gyr" (পুরনো) বনাম ~৫০% সম্ভাবনা (সাম্প্রতিক ensemble) | ~৫০% সম্ভাবনা-বণ্টন | ensemble-ভিত্তিক সাম্প্রতিক ফল; N4 |
| C-16 | সলভার-স্ট্যাক | D-ভিত্তিক (P05), কোড-নামভিত্তিক (P10), "FIRE/AURIGA" (P19) | একক সারণি (৭.৩): GADGET-4/Abacus, COLA/FastPM, AREPO, FIRE-3, NBODY6++GPU, Einstein Toolkit | তিনটি একই চিত্র; বিকল্প সংরক্ষিত |
| C-17 | টেক-স্ট্যাক | Python-শিক্ষামূলক বনাম C++/CUDA; Qt বনাম ওয়েব; Three.js বনাম WebGPU; Graph-DB বনাম PostgreSQL | ১০.২-র সারণি | ভূমিকা-ভিত্তিক বিভাজন; Qt ও graph-DB পরবর্তী ঐচ্ছিক |
| C-18 | রেপো-ট্রি তিনটি | `universe-sim-codebase` (P05), `cosmos-platform` (P10), `cosmos-local-universe` (P15), `universe-explorer` (P17), Digant-ফাইল (P16) | একীভূত মনোরেপো (১০.৩); মূল ট্রি **হুবহু** `code/docs/repo-trees/` | কোনো ডিরেক্টরি-ধারণা বাদ নেই |
| C-19 | রোডম্যাপ-ক্রম | ইঞ্জিন-ফার্স্ট (P05/P09) বনাম মানচিত্র-ফার্স্ট (P15) বনাম ৮ পর্যায় (P10) | দুই সমান্তরাল ট্র্যাক K/X ও E, V গেট; ১১টি একীভূত পর্যায় (১২.২) | N13: প্রতি স্কেলে মানচিত্র→গতিবিদ্যা |
| C-20 | Sgr A* GRMHD সময় | P05: $10^4GM/c^3$ ≈ ~২৪ ঘণ্টা (P05 ও P05 টেবিলের $t_g\approx20$ s) | $10^4\times21$ s ≈ $2\times10^5$ s ≈ **২.৪ দিন** | সংশোধিত গাণিতিক ফল |
| C-21 | UI-তে আকাশগঙ্গা | "বাদ + ব্যাজ" (P13) বনাম "ডিফল্ট ক্যামেরা + হ্যান্ডঅফ" (P14) | দুই scope (১১.১) | দুটি ভিন্ন ব্যবহার-পরিস্থিতি |
| C-22 | ডিজাইন-টোকেন | Digant (`#050914…`) বনাম Explorer (`#05070D…`) | Explorer canonical | production-base; সম্পূর্ণ semantic palette |
| C-23 | লাইট-কোন পদ্ধতি | snapshot-interpolation বনাম on-the-fly | on-the-fly (৫.৪) | interpolation-ত্রুটি, shell-গ্যাপ এড়ায় |
| C-24 | বৃহৎ-আয়তন hydro | পূর্ণ hydro (FLAMINGO-সীমা) / baryonification / SAM / HOD | S2–S3: baryonification+HOD/SAM; D3–D7: পূর্ণ hydro | খরচ বনাম নির্ভুলতা |
| C-25 | কোয়ান্টাম-ব্যাখ্যা | MWI/Copenhagen/Bohm/GRW (P02, P03, P18) | ব্যাখ্যা-নিরপেক্ষ stub (৩.৪) | Tier B-তে অপ্রাসঙ্গিক; প্লাগ-ইন-সংরক্ষণ |
| C-26 | "জেমিনি মোড" নাম | P19 | **Twin Mode** | ব্র্যান্ড-দ্বন্দ্ব এড়াতে; অর্থ অক্ষুণ্ণ |
| C-27 | সোর্স-পুনরাবৃত্তি | P07 ≈ P08; দুটি অভিন্ন ১১১ KB HTML | সোর্স-আর্কাইভে দুটোই (P08), HTML একটি ফাইল | কোনো বিষয়বস্তু হারায় না |
| C-28 | Supernova-feedback | delayed-cooling / thermal / mechanical (P05) | mechanical momentum default; stochastic thermal ensemble-এ; delayed cooling ✘ | ভৌত ন্যায্যতা |
| C-29 | Registry-কাঠামো | Graph-DB (P15 §১১) বনাম সরল tree vs relational (১২টি টেবিল) | PostgreSQL + `MembershipRelations` | একাধিক সদস্যতা + পরিপক্ক টুলিং |

---

## ভাগ II — অস্পষ্ট ধারণা → কংক্রিট স্পেক

| ID | মূল ধারণা (অস্পষ্ট) | ✅ কংক্রিট রূপ |
|---|---|---|
| R-01 | "Lazy evaluation / লেজি সিমুলেশন" | ৩-স্তর eager/on-demand/cache + latency-নীতি (৫.৭); কোয়ান্টাম-দাবি নয়, LOD-কৌশল |
| R-02 | "Multi-scale / নেস্টেড zoom" | D0–D10, buffer ≥ ৩× ব্যাসার্ধ, এক-মুখী/দ্বিমুখী নিয়ম, contamination-check (৫.৬) |
| R-03 | "AI surrogate" | কাজ-তালিকা, প্রশিক্ষণ-পয়েন্ট ≥ ২০× প্যারামিটার, error-বাজেট (P(k) <১–২%), ট্যাগ EMU (৭.৯) |
| R-04 | "Hybrid quantum" | R&D-ট্র্যাক; substrate-সারণি (৪.৪); মূল ইঞ্জিনে নয় |
| R-05 | "Holographic principle" | R&D; কারণ: Weinberg–Witten, de Sitter ≠ AdS (৪.৩) |
| R-06 | "Emergence-স্তর" | Φ0–Φ8 + প্রতি স্তরে ~$10^3\times$ সরলীকরণ (৩.১) |
| R-07 | "Time travel" | snapshot-সূচক + merger-tree; অতীত সংরক্ষিত, ভবিষ্যৎ ensemble (৮.৪) |
| R-08 | "Future prediction" | সম্ভাবনা-বণ্টন; ~১০³ ensemble (৯.৩) |
| R-09 | "Observer module" | ক্যামেরা + selection function; চেতনা-মডেল ✘ (৩.১ Φ8, ৫.৯) |
| R-10 | "Virtual Observatory" | mock-observation pipeline + `POST /v1/jobs/mock-observation` (৭.৮, ৬.৭) |
| R-11 | "Scientific/Physics Inspector" | **স্কিমা:** `value ± σ, unit, method, equation, assumptions, source(s), data_version, license, confidence(A–E), evidence(OBS/REC/SIM/MOCK/UNC), boundary_kind, alternatives[]` (প্রতিটি পরিমাপে বাধ্যতামূলক) |
| R-12 | "Theory comparison" | একই seed/IC, ভিন্ন `ParameterSet`; তুলনা-মেট্রিক: $P(k)$, HMF, void-function, satellite-সংখ্যা, $\xi(r)$ (৩.২, ১.৫) |
| R-13 | "Cosmic web density map" | density: DTFE/CIC; ওয়েব-শ্রেণি: T-web (tidal-tensor eigenvalue) বা V-web; threshold $\lambda_{\rm th}$ প্যারামিটার (প্রস্তাবিত ডিফল্ট ~০.২, Phase ২ ক্যালিব্রেশনে চূড়ান্ত — **এটি আমার প্রস্তাব, সোর্সে নেই**) |
| R-14 | "Data Confidence System" | গ্রেড A–E সংজ্ঞাসহ (৬.১) |
| R-15 | "সুপারক্লাস্টারের সীমানা" | flow-defined (watershed/Cosmicflows), `boundary_kind` ৩ প্রকার (১১.১, C-11) |
| R-16 | "Unified Simulation Orchestrator" | `SimulationRun`-অবজেক্ট + job-DAG (Snakemake বা Nextflow HPC-তে) + FastAPI job-queue; অবস্থা: queued→running→checkpointed→complete→validated (**বাস্তবায়ন-প্রস্তাব আমার**) |
| R-17 | "Experimental Universe Mode" | প্যারামিটার-স্কিমা: `{name, baseline, min, max, sanity_gate}`; sanity-gate-এর বাইরে ফল "মহাবিশ্ব ভাঙে" সতর্কতাসহ; ফল ট্যাগ: robust / parameter-sensitive / fundamentally-unknown (১.৫) |
| R-18 | "প্রতিটি বস্তু সম্পূর্ণ তথ্যসহ" | তথ্য-সম্পূর্ণতা ≠ রেজোলিউশন (N11) |
| R-19 | "Public API" | OpenAPI + সংস্করণ `/v1`, rate-limit, provenance শিরোনাম (৬.৭) |
| R-20 | "Pre-registration" | গ্রহণযোগ্যতা-শর্ত signed JSON + git-tag, run-এর আগে (৯.৩) |
| R-21 | "Reproducibility" | run-manifest: seed, IC-hash, code-commit, compiler/lib-সংস্করণ, বাইট-হ্যাশ (N15) |
| R-22 | "জীবন/Biology" | Φ7 hypothesis-ট্যাগ; ensemble-only; কোনো দাবি নয় (৩.১) |
| R-23 | "UI খুব মসৃণ/দ্রুত" | ৬০ fps, ৫–১০ M পয়েন্ট, cone-query <২ s, mock <১০ s (১১.৫, ৬.৭) |
| R-24 | "MVP" | COSMOS 0.1 = ১১ ফিচার + ১০ গ্রহণযোগ্যতা-পরীক্ষা (১২.২–১২.৩) |
| R-25 | "বাস্তবসম্মত রেন্ডারিং" | তিন-স্তর: DATA/MODEL/DECORATIVE ট্যাগ (১১.১) |
| R-26 | "Cosmic variance" | mirrored/paired-fixed + ensemble (৯.৩) |

---

## ভাগ III — সোর্স-সংশোধন ও সতর্কতা (যা পেয়ে ঠিক করেছি)

| ID | সংশোধন | স্থান |
|---|---|---|
| E-01 | নিউট্রিনো ~$10^8$ → ~$10^{89}$ (টাইপো) | C-12 |
| E-02 | Landauer × $10^{122}$: $10^{96}$ J → $2.6\times10^{99}$ J | C-13 |
| E-03 | Sgr A* GRMHD $10^4\,GM/c^3$: ~২৪ ঘণ্টা → ~২.৪ দিন | C-20 |
| E-04 | "আকাশগঙ্গা–M31 নিশ্চিত সংঘর্ষ" → ~৫০% | C-15 |
| E-05 | P12-এর কিছু অংশে গাণিতিক সূত্র ফ্ল্যাট/ভাঙা টেক্সটে এসেছিল — আর্কাইভে হুবহু; মাস্টারপ্ল্যানে সঠিক LaTeX-এ পুনর্লিখিত | ৭.২ |

**যাচাই-যোগ্য বহিঃস্থ তথ্য:** Gaia DR4-এর তারিখ (২ ডিসেম্বর ২০২৬), আকার (~২.৮ বিলিয়ন উৎস, ~৫০০ TB, ৬৬ মাস) — ESA Gaia ওয়েবসাইট থেকে আজ যাচাই করা (২৬ নভেম্বর ২০২৬)। অন্য বৈজ্ঞানিক সংখ্যা (ধ্রুবক, ভর, দূরত্ব) সোর্স থেকে নেওয়া; স্বতন্ত্রভাবে পুনঃযাচাই **হয়নি** — প্রতিটি `ParameterSet`/registry-তে `source` ফিল্ডসহ Phase ১-এ যাচাই-গেট রাখা হয়েছে।

## ভাগ IV — যা আমি নিজে যোগ করেছি (সোর্সে নেই; সৎ ঘোষণা)
১. Φ/D/S/G/O নামকরণ-ব্যবস্থা ও Rosetta-সারণি। ২. ১১-পর্যায় একীভূত রোডম্যাপ ও মাস-অনুমান। ৩. Confidence-গ্রেড A–E সংজ্ঞা। ৪. R-13, R-16, R-17-এর বাস্তবায়ন-প্রস্তাব। ৫. লাইসেন্স-সুপারিশ। ৬. "Twin Mode" নাম। — সবগুলো প্রস্তাব; মালিক বদলাতে পারেন (ভাগ ১৫)।
