# COSMOS মাস্টারপ্ল্যান v1.0
### মহাবিশ্ব-সিমুলেশন + বৈজ্ঞানিক জ্ঞানভান্ডার + এক্সপ্লোরার — ১৯টি উত্তরের একীভূত নকশা

**তৈরি:** ২৬ নভেম্বর ২০২৬ · **সোর্স:** `প্ল্যান.txt` (১৭,৬৯০ লাইন, ১৯টি পৃথক উত্তর P01–P19) · **ভাষা:** বাংলা, পারিভাষিক শব্দ ইংরেজিতে

---

## ভাগ ০ — এই নথি কীভাবে কাজ করে (এবং "কিছু বাদ যায়নি" কীভাবে নিশ্চিত)

| স্তর | ফাইল | কাজ |
|---|---|---|
| ১. **মাস্টারপ্ল্যান** | `01_MASTERPLAN.md` (এটি) | একীভূত সিদ্ধান্ত, সংখ্যা, স্পেক, রোডম্যাপ |
| ২. **সিদ্ধান্ত-রেজিস্টার** | `02_DECISION_REGISTER.md` | প্রতিটি সংঘাত: কোন পক্ষ কেন জিতল; প্রতিটি অস্পষ্ট ধারণা কীভাবে কংক্রিট হলো |
| ৩. **সোর্স আর্কাইভ** | `03_SOURCE_ARCHIVE.md` | মূল লেখার প্রতিটি লাইন **হুবহু** (১০০% কভারেজ, স্ক্রিপ্ট দিয়ে যাচাই) |
| ৪. **কোড-লাইব্রেরি** | `code/` + `04_CODE_INDEX.md` | সব ১০১টি কোড-ফাইল আসল পাথে, সোর্স-লাইন-ম্যাপসহ |

**কভারেজ-প্রমাণ:** মূল ফাইলের ১৭,৬৯০ লাইনের ০টি অনাচ্ছাদিত। ৯২টি ইউনিক ফেন্সড কোড-ব্লক + ফেন্স-ছাড়া ৯টি উদ্ধারকৃত কোড/ডায়াগ্রাম অংশ = ১০১ ফাইল; ফেন্স-ছাড়া দুটি ১১১ KB HTML বাইট-অভিন্ন, তাই একটি রাখা হয়েছে।

**সংকেত:** 🟢 প্রতিষ্ঠিত/আজই সম্ভব · 🟡 আংশিক/মডেল-নির্ভর · 🔴 তত্ত্বই নেই · ✅ এই মাস্টারপ্ল্যানের সিদ্ধান্ত · `[P05 ভাগ২]` = সোর্স-রেফারেন্স।

### সোর্স-মানচিত্র: কোন উত্তর মাস্টারপ্ল্যানের কোথায় গেছে

| ID | বিষয় | মাস্টারপ্ল্যানে |
|---|---|---|
| P01 | সংজ্ঞা, বিজ্ঞান, ইঞ্জিন, বাস্তব পথ | ভাগ ১, ৩, ৪, ৬ |
| P02 | ভৌত স্তর, গাণিতিক কাঠামো, চাহিদা, সীমা | ভাগ ৩, ৪ |
| P03 | Tier A/B/C, বাজেট, L0–L8 মডিউল, টাইমলাইন | ভাগ ১, ৩, ৪, ৮, ৯ |
| P04 | কোর ইঞ্জিন, ইমার্জেন্স, রেন্ডারিং কৌশল, bug তালিকা | ভাগ ২, ৩, ৫ |
| P05 | আকাশগঙ্গা+সুপারক্লাস্টার স্থাপত্য (১৩ ভাগ) | ভাগ ৫, ৭, ৮, ৯, ১০ |
| P06 | আকাশগঙ্গা ও আশপাশ (ভাষ্য) | ভাগ ৫, ১১ |
| P07 / P08 | গঠন-বৃক্ষ ও ডেটা-স্পেক (P08 = P07-এর দ্বিতীয় কপি) | ভাগ ৫, ৬, ৮ |
| P09 | আকাশগঙ্গা-বাদে দৃশ্যমান মহাবিশ্ব: shells, লাইট-কোন, কোড | ভাগ ৫, ৬, ৭, ১১ |
| P10 / P11 | COSMOS: ৭ স্তর, ৮ পর্যায়, ৩ মোড, MVP | ভাগ ১, ১০, ১২ |
| P12 | ডেটা-মডেল, YAML/Python/React উদাহরণ | ভাগ ৬, ১০ |
| P13 / P14 | UI/UX নকশা (দুটি) | ভাগ ১১ |
| P15 | Local Universe: ডাটাবেস, ইঞ্জিন, মাইলস্টোন | ভাগ ৫, ৬, ১২ |
| P16 / P17 | "দিগন্ত" প্রোটোটাইপ; Vite/React/R3F অ্যাপ | ভাগ ১১ + `code/` |
| P18 / P19 | সম্পূর্ণ রূপরেখা; পর্ব ২ (আমাদের মহল্লা) | ভাগ ১, ৩, ৫, ১৪ |

---

## ভাগ ১ — মিশন ও সংজ্ঞা (সংঘাত মীমাংসিত)

### ১.১ "সম্পূর্ণ সিমুলেশন" কী — ✅ চূড়ান্ত সংজ্ঞা

সোর্সে "সম্পূর্ণ"-এর তিনটি আলাদা তিন-ধাপী সংজ্ঞা ছিল (P01: পরিসংখ্যানগত/পুনর্নির্মাণ/প্রতিটি কণা; P03: Tier A/B/C; P18: পর্যবেক্ষণ/তাত্ত্বিক/চূড়ান্ত)। সব একই সিঁড়ির তিন ধাপ। একীভূত রূপ:

| ধাপ | সংজ্ঞা | আমাদের সিদ্ধান্ত |
|---|---|---|
| **Tier A — Ontological** | প্রতিটি কোয়ান্টাম ডিগ্রি-অব-ফ্রিডম, হুবহু একই ইতিহাস (পাঠকসহ) | ❌ **কখনোই নয়** — নীতিগতভাবে অসম্ভব (ভেতর থেকে) |
| **Tier B — Statistical** | একই নিয়ম, একই পরিসংখ্যানগত প্রাথমিক শর্ত, ভিন্ন seed → ভিন্ন কিন্তু পরিসংখ্যানগত অভিন্ন মহাবিশ্ব | ✅ **মূল লক্ষ্য** — আজই আংশিক সম্ভব |
| **Tier C — Phenomenological** | ভেতরের পর্যবেক্ষকের কাছে যা মাপা যায় তা সঠিক | ✅ **ডেলিভারি স্তর** — light-cone, mock observation, lazy/LOD |
| **Constrained Tier B** | আজকের পর্যবেক্ষণ থেকে পিছনে হিসাব করে *আমাদের* প্রতিবেশ (≳৫ Mpc) | ✅ **Twin Mode** (নিচে) |

> ✅ **শিরোনাম-দাবি:** আমরা বানাচ্ছি "একটি পরীক্ষাযোগ্য, বহু-স্কেল, সম্ভাবনাভিত্তিক ডিজিটাল মহাবিশ্ব, যা প্রতিটি আউটপুটের সঙ্গে নিজের অনিশ্চয়তাও জানায়" [P01 §৯]। "আমাদের মহাবিশ্বের হুবহু প্রতিলিপি" — এই দাবি কোথাও করা হবে না।

### ১.২ তিন পণ্য ✅ [P10/P11]

| পণ্য | কাজ | ভিত্তি |
|---|---|---|
| **COSMOS Knowledge** | তত্ত্ব, সমীকরণ, ধ্রুবক, পর্যবেক্ষণ, প্রতিটি পরিমাপের উৎস/একক/অনিশ্চয়তা/ডেটা-নির্ভরযোগ্যতা | ভাগ ৬ |
| **COSMOS Engine** | প্রকৃত পদার্থবিজ্ঞান-সিমুলেশন (cosmology → N-body → hydro → on-demand sub-sim) | ভাগ ৭ |
| **COSMOS Explorer** | ৩D/আকাশ/লাইট-কোন/টাইমলাইন UI — গণনার ফল প্রদর্শনের মাধ্যম, লক্ষ্য নয় | ভাগ ১১ |

> **অগ্রাধিকার-নীতি:** COSMOS-এর সাফল্য "কত সুন্দর দেখায়" নয়, "কতটা নির্ভুল গণনা করে ও কতটা সৎভাবে অনিশ্চয়তা বলে" [P11]।

### ১.৩ দুই আউটপুট-পণ্য ✅ [P09 ভাগ০]
- **A. Volume Realization:** পুরো comoving বাক্সের পরিসংখ্যানগতভাবে সঠিক ইতিহাস — স্থানাঙ্ক $(\vec x, t)$।
- **B. Light-cone Realization:** পর্যবেক্ষকের (আকাশগঙ্গা) দিকে আসা সব সংকেত — গ্যালাক্সি, CMB, পটভূমি, transient, GW — স্থানাঙ্ক $(\hat n, z)$।
- কেন: ২৮.৫ Gpc ব্যাসের আয়তন galaxy-scale রেজোলিউশনে ভরা অসম্ভব (ভাগ ৪); কিন্তু আলোক-শঙ্কু একটি পাতলা খোলস, তাই "onion-shell" নীতি কাজ করে।

### ১.৪ দুই রান-মোড ✅
| মোড | অর্থ | সোর্সে নাম |
|---|---|---|
| **Statistical Mode** | যেকোনো সাধারণ মহাবিশ্ব; সস্তা; ensemble-এর জন্য | "পরিসাংখ্যিক মোড" [P19] |
| **Twin Mode** | constrained simulation: Cosmicflows-4 + 2MRS/SDSS/DESI থেকে আমাদের প্রতিবেশ | "জেমিনি মোড" [P19] — ✅ নাম বদলে **Twin** (Gemini অন্য ব্র্যান্ডের নাম; অর্থ "যমজ" একই থাকছে) |

### ১.৫ তিন ব্যবহার-মোড ✅ [P10 §১৮]
1. **Scientific Reality Mode:** শুধু পর্যবেক্ষণ-সমর্থিত বস্তু (আবিষ্কৃত গ্যালাক্সি, পরিচিত গ্রহ-উপগ্রহ, CMB-র প্রকৃত পর্যবেক্ষণ)। কোনো বস্তু পর্যবেক্ষিত না হলে স্পষ্ট চিহ্ন।
2. **Theoretical Universe Mode:** আলাদা মহাবিশ্ব — ΛCDM, Evolving Dark Energy ($w_0w_a$), Warm DM, Modified Gravity, Alternative Inflation; প্রতিটির নিজস্ব প্রাথমিক শর্ত ও ভবিষ্যদ্বাণী।
3. **Experimental Universe Mode (Model Lab):** ব্যবহারকারী বৈজ্ঞানিক প্যারামিটার বদলান (যেমন $G$ কমালে গ্যাস-সংকোচন/নক্ষত্রজন্ম কেমন হবে)। ✅ কংক্রিট: প্যারামিটার-স্কিমা, অনুমোদিত পরিসর ও "এই মানে মহাবিশ্ব ভাঙে" সতর্কতাসহ (রেজিস্টার R-17)। ফলের পাশে সঙ্গে সঙ্গে দেখাবে: কোনটি **robust**, কোনটি **parameter-sensitive**, কোনটি **মৌলিকভাবে অজানা** [P12 §৭.২]।

---

## ভাগ ২ — অপরিবর্তনীয় নকশা-নীতি (সব সোর্সের নীতির ইউনিয়ন)

| # | নীতি | উৎস |
|---|---|---|
| N1 | **কোনো Planck-grid নয়।** দৃশ্যমান মহাবিশ্বে ~$10^{185}$ Planck-ঘনক × ~$10^{61}$ Planck-সময় ⇒ ~$10^{246}$ অপারেশন; প্রকৃতি নিজেই ~$10^{120}$-এ চলছে। RG/EFT-ভিত্তিক সংকোচনই একমাত্র বৈধ পথ। | P03 §১, §৫ |
| N2 | সিমুলেশন শুরু হবে **পরিচিত গরম Big Bang পর্যায়ের শুরু থেকে**, পরম $t=0$ দাবি ছাড়া; inflation = ইনপুট ($A_s, n_s, r$); L0 (quantum gravity) = প্যারামিটারাইজড placeholder। | P01 §ঘ, P03 L0 |
| N3 | Tier B-ই লক্ষ্য; Tier A-র বাধা প্রতিটি স্তরে চিহ্নিত থাকবে। | P03 |
| N4 | **Ensemble, trajectory নয়।** বিশৃঙ্খল স্তরে "একটি ফল" অর্থহীন; ১০০০ seed চালিয়ে *বণ্টন* রিপোর্ট। | P03 §৫, P05 §১২.৩ |
| N5 | **Provenance সর্বত্র:** প্রতিটি বস্তু জানে সে কোন shell/seed/মডেল/কোড-কমিট থেকে এসেছে। ট্যাগ: `OBS` `REC` `SIM` `MOCK` `UNC`। | P09, P12, P13 |
| N6 | **দুটি ফ্রেম সর্বদা আলাদা:** Observed (light-cone) বনাম Comoving-now; Evolution mode বনাম Observer mode। | P09, P12, P14 |
| N7 | প্রতিটি সংখ্যা অনিশ্চয়তাসহ (statistical, numerical, model, observational)। | P05 §১০.৪ |
| N8 | **Calibration ও Validation আলাদা।** যা দিয়ে tune করা হয়েছে তা পুনরুৎপাদন "সাফল্য" নয়; ব্যর্থতার মানদণ্ড ও প্রত্যাখ্যান-শর্ত আগে লিখে রাখা হবে (pre-registration)। | P03 §৬, P18 স্তর৮ |
| N9 | Hierarchical power-of-two timestep; কোথাও সার্বজনীন Planck-ধাপ নয়। | P05 §৩.৩ |
| N10 | অতি-ব্যয়বহুল ফিজিক্স **on-demand sub-simulation** (GRMHD, MESA, ফুল-নেটওয়ার্ক)। পূর্ণ সময়ে নয়; ফলাফল effective feedback-table হয়ে উপরের স্তরে ফেরে। | P05 §৩.৩, §৮.৪ |
| N11 | **তথ্য-সম্পূর্ণতা ≠ সিমুলেশন-রেজোলিউশন।** হাজার হাজার গ্যালাক্সির ক্যাটালগ বাস্তবসম্মত; প্রতিটির অভ্যন্তরীণ ফিজিক্স একই রেজোলিউশনে সিমুলেট নয়। | P15 শেষ |
| N12 | **বিদ্যমান সফটওয়্যার আগে** (CLASS, CAMB, GADGET-4, AREPO, Einstein Toolkit…); নিজস্ব C++ solver পরে। | P10 §১১ |
| N13 | কাজের ক্রম: **মানচিত্র → ভৌত বৈশিষ্ট্য → গতিবিদ্যা → পূর্ণ সিমুলেশন।** | P15 §১৮ |
| N14 | UI কখনো সীমা লুকাবে না (Caveat সিস্টেম); অজানা জায়গা "ফাঁকা ঘর" হিসেবে দৃশ্যমান। | P09, P18 স্তর৫ |
| N15 | Reproducibility: seed, IC-hash, code-commit, সংস্করণ, লাইসেন্স সংরক্ষিত; একই সেটিংসে একই গণনাগত ফল। | P12, P15 §১৭ |
| N16 | কোড-ডেমো ≠ বৈজ্ঞানিক ফল। প্রোটোটাইপের কৃত্রিম ডেটা সর্বদা চিহ্নিত। | P16 |

---

## ভাগ ৩ — বিজ্ঞান-কোর

### ৩.১ ভৌত স্তর Φ0–Φ8 (P02-এর স্তর ০–৬, P03-এর L0–L8, P04-এর ইমার্জেন্স-স্তর একীভূত)

> নামকরণ: সোর্সগুলো "L0, L1…" শব্দটি ভিন্ন অর্থে (কখনো ভৌত স্তর, কখনো স্থানিক স্তর) ব্যবহার করেছে। এই নথিতে **Φ = ভৌত স্তর**, **D = স্থানিক ডোমেইন** (ভাগ ৫), **S = redshift shell**, **G = ইঞ্জিন-স্তর**, **O = পর্যবেক্ষক-পণ্য**।

| স্তর | বিষয় | অবস্থা | পদ্ধতি | প্ল্যানে ভূমিকা |
|---|---|---|---|---|
| **Φ0** | Quantum gravity (Planck স্কেল: $\ell_P\approx1.6\times10^{-35}$ m, $t_P\approx5.4\times10^{-44}$ s) | 🔴 তত্ত্ব নেই | String/M, LQG spin-foam, CDT, asymptotic safety, causal set (প্রার্থী) | Placeholder প্যারামিটার; R&D toy-model ট্র্যাক (spin network, "fuzzy spin-2 network"); Wheeler–DeWitt সময়-সমস্যা → relational clock (Page–Wootters) নোট |
| **Φ1** | স্থান-কাল ও মহাকর্ষ (GR) | 🟢 | 3+1, BSSN/CCZ4/Z4c, puncture/excision, AMR, $\Psi_4$; York–Lichnerowicz ID; FLRW + perturbation theory | কেবল Sgr A*, BH/NS merger sub-sim (on-demand); বাকি সর্বত্র Newtonian+expansion |
| **Φ2** | কণা ও ক্ষেত্র (Standard Model) | 🟡 আংশিক | $SU(3)\times SU(2)\times U(1)$, ১৭ কণা (১২ ফার্মিয়ন + ৫ বোসন), ৩ প্রজন্ম; lattice QCD (Wilson/staggered/DW/overlap) | Engine-এ **EoS টেবিল** (QCD transition), BBN; পূর্ণ QFT = R&D ট্র্যাক |
| **Φ3** | প্রাথমিক শর্ত ও মহাজাগতিক পটভূমি | 🟡 | ΛCDM + inflation-input; CLASS/CAMB | Engine-এর প্রথম মডিউল |
| **Φ4** | কসমিক ওয়েব ও গ্যালাক্সি | 🟢 (subgrid-নির্ভর) | N-body, hydro, MHD, RT | Engine-এর মূল |
| **Φ5** | নক্ষত্র, নিউক্লিয়ার, রসায়ন | 🟢 | MESA-ধাঁচ, isotope network, supernova RHD, ISM turbulence | Selected-region sub-sim |
| **Φ6** | গ্রহ ও ভূবিজ্ঞান | 🟢 কিন্তু বিশৃঙ্খল (Lyapunov ~৫ Myr) | accretion, mantle convection, tectonics, climate | **Ensemble-only**; COSMOS Phase 4 |
| **Φ7** | জীবন | 🔴 abiogenesis-এর তত্ত্ব নেই | QM-chem → MD → cell → ecosystem (প্রতি স্তরে ~১০³× সরলীকরণ) | "hypothesis model" ট্যাগে; RNA-world/protocell মডেল; কোনো নিশ্চয়তা-দাবি নয় |
| **Φ8** | পর্যবেক্ষক, মন, পরিমাপ | 🔴 সবচেয়ে গভীর ফাটল | decoherence, einselection, quantum Darwinism | **কোনো "observer মডিউল" নয়** (চেতনার সমর্থিত তত্ত্ব নেই); "observer" = ক্যামেরা + selection function (রেজিস্টার R-09) |

### ৩.২ ধ্রুবক ও পটভূমি — ✅ একক baseline + বিকল্প-তালিকা

সোর্সে একই রাশির একাধিক মান ছিল (যেমন $H_0$: ৬৭.৪ / ৬৭.৬৬ / ৭৩.০৪ / ৬৯.৮; $\Omega_m$: ০.৩১১ / ০.৩১৫)। এগুলো ভিন্ন ডেটাসেট-সমন্বয় থেকে আসা, ভুল নয়। ✅ সিদ্ধান্ত: **`ParameterSet` অবজেক্ট**; ডিফল্ট = astropy-র `Planck18` (কোডের সঙ্গে সামঞ্জস্য), বাকিগুলো নামযুক্ত সেট।

| পরামিতি | Baseline (Planck18) | বিকল্প / মন্তব্য |
|---|---|---|
| $H_0$ | **৬৭.৬৬** km/s/Mpc (±০.৪২) | ৬৭.৪ (Planck বেস); ৭৩.০৪±১.০৪ (SH0ES); ~৬৯.৮ (CCHP/TRGB) → **দুটি ensemble বাধ্যতামূলক: ৬৭.৭ ও ৭৩.০** |
| $\Omega_m$ | ০.৩০৯৭ (astropy) | ০.৩১১±০.০০৬ (TT,TE,EE+lowE+lensing+BAO); ০.৩১৫ |
| $\Omega_\Lambda$ | ০.৬৮৯ | ০.৬৮৫ |
| $\Omega_b h^2$ | ০.০২২৪২±০.০০০১৪ | ব্যারিয়ন ~৪.৯% (তারা মাত্র ~০.৫%) |
| $\Omega_c h^2$ | ০.১১৯৩±০.০০০৯ | DM ~২৬.৮–২৭% |
| $\sigma_8$ | ০.৮১০±০.০০৬ | $S_8$-tension নোট |
| $n_s$ | ০.৯৬৬৫±০.০০৩৮ | ~০.৯৬৫ |
| $A_s$ | ~$2.1\times10^{-9}$ | $r<0.036$ |
| বয়স | ১৩.৭৮৭±০.০২০ Gyr | ১৩.৮ |
| $\tau$ (reionization) | ০.০৫৪±০.০০৭ | midpoint $z\approx7.7$ |
| $\sum m_\nu$ | < ০.১২ eV (৯৫%) | astropy: ০.০৬ eV; $N_{\rm eff}=3.044$ |
| $T_{\rm CMB}$ | ২.৭২৫৫ K | dipole ৩.৩৬ mK |
| $r_d$ (BAO) | ১৪৭.০৯±০.২৬ Mpc | |
| $\vert \Omega_k\vert $ | ≲ ০.০০২ | প্রায় flat |
| $z_{\rm rec}$ / $z_{\rm eq}$ | ~১০৯০ (৩.৮×$10^5$ yr) / ~৩৪০০ | |
| Homogeneity scale | ~২৫০–৩০০ Mpc | "End of Greatness" — প্রাকৃতিক কাট-অফ |
| মৌলিক ধ্রুবক | $c, G, h, e, k_B, \alpha$ … | হার্ডকোডেড global; সামান্য হেরফেরে নক্ষত্র/পরমাণুই তৈরি হবে না (P04) |
| Standard Model | ১৯টি মুক্ত প্যারামিটার (নিউট্রিনো ভর+মিক্সিং ধরলে ~২৬) | হিসাব করা যায় না — **input knob** |

**মহাকাশ-রাশি (সৌর-গতি):** সূর্য→CMB ৩৬৯.৮২±০.১১ km/s (দিক $\ell\approx264°, b\approx48°$); আকাশগঙ্গা→CMB ~৫৫২±৫.৫; **Local Group→CMB ~৬২০–৬২৭ km/s, $(\ell,b)\approx(276°,30°)$** (সোর্সে ৬২০±১৫ ও ৬২৭ — ✅ ব্যবহার: ৬২৪±১৫)।

### ৩.৩ অজানার রেজিস্টার — প্রতিটি অজানা সিমুলেশনে কীভাবে ধরা হবে

| # | অজানা | ✅ হ্যান্ডলিং |
|---|---|---|
| U1 | Quantum gravity | Φ0 placeholder; R&D toy-model; UI-তে "ফাঁকা ঘর" |
| U2 | Dark matter (কণা-পরিচয়) | ডিফল্ট CDM; switch: WDM, SIDM, axion/fuzzy, sterile ν, PBH; DM-ইনপুট ট্যাগ "অনুমান" |
| U3 | Dark energy | ডিফল্ট Λ; branch: $w_0w_a$ (DESI DR2 ইঙ্গিত), quintessence — ভবিষ্যৎ-মডিউলে **দুটি শাখা** |
| U4 | Baryogenesis | $\eta\approx6\times10^{-10}$ ইনপুট; "জানা তত্ত্বে ব্যাখ্যা অপর্যাপ্ত" ট্যাগ |
| U5 | নিউট্রিনো ভর (Dirac/Majorana, hierarchy) | $\sum m_\nu$ প্যারামিটার; linear-response বা particle ν |
| U6 | Inflation-এর ধরন ও potential | মডেল-পরিবার স্ক্যান; ইনপুট $A_s,n_s,r$ |
| U7 | Measurement problem | ব্যাখ্যা-নিরপেক্ষ; ডিফল্ট Born-rule sampling; stub: Many-Worlds (শুধু ক্ষুদ্র সিস্টেম), GRW/CSL (পরীক্ষাযোগ্য stochastic term), Bohmian (non-local guidance) |
| U8 | ধ্রুবকের মান (fine-tuning) | Experimental mode-এর knob |
| U9 | চেতনা / observer | কোনো মডিউল নেই (R-09) |
| U10 | Multiverse / মহাবিশ্বের বাইরে | কোনো দাবি নয়; "বাইরে থেকে দেখা" = শুধু visualisation, লেবেলযুক্ত |
| U11 | JWST $z>10$ অতি-উজ্জ্বল গ্যালাক্সি (৩–১০×) | সমাধান নয়, **প্যারামিটার-স্পেস**: bursty SF, top-heavy IMF, feedback-free starburst, কম ধূলি, AGN-দূষণ, বা cosmology পরিবর্তন |
| U12 | IMF সর্বজনীনতা | Kroupa/Chabrier ডিফল্ট; top-heavy variant |
| U13 | SMBH বীজ | seed scenarios ($10^4$–$10^6\,M_\odot$, $M_h>10^{10}$) |
| U14 | Abiogenesis | Φ7 "hypothesis model" |
| U15 | Hubble tension | রানটাইম প্যারামিটার + দুই ensemble |
| U16 | $S_8$ tension | UQ-তে model-uncertainty |
| U17 | KBC Void / Local Hole (~২ Gly, ~২০% অবঘন; ২০২৫ RAS দাবি H₀-টেনশন ব্যাখ্যা করতে পারে) | UNC-ট্যাগসহ বিকল্প background; সত্য হলে S2–S3 পুনর্গণনা |
| U18 | ছোট-স্কেল ΛCDM সমস্যা (core–cusp, missing satellites, too-big-to-fail, planes of satellites VPOS/GPoA, rotation-curve diversity) | validation-benchmark; "সক্রিয় বিতর্ক" লেবেল |

### ৩.৪ Standard-কোয়ান্টাম-ব্যাখ্যা — আর্কিটেকচারে কী প্রভাব ফেলে
- **Many-Worlds:** শাখা-গাছ ⇒ এক্সপোনেনশিয়াল; শুধু ক্ষুদ্র সিস্টেমে।
- **Copenhagen ("lazy mode"):** শুধু পর্যবেক্ষিত অংশ গণনা। ✅ আমরা এটিকে **পদার্থবিজ্ঞানের দাবি হিসেবে নয়, LOD/lazy-evaluation প্রকৌশল-কৌশল হিসেবে** রাখছি (ভাগ ৫.৭): পর্যবেক্ষক নেই ⇒ মোটা দানা; পর্যবেক্ষক এলে সূক্ষ্ম।
- **Bohmian:** পাইলট-ওয়েভ + foliation পছন্দ।
- **GRW/CSL:** পরীক্ষাযোগ্য stochastic term।
- **True randomness:** pseudo-random seed ⇒ deterministic replay; no-cloning ⇒ আসল কোয়ান্টাম randomness পুনরুৎপাদনযোগ্য নয়। Twin Mode-এ এর অর্থ: "আমাদের" ইতিহাস নয়, "আমাদের-সদৃশ" ইতিহাস।

---

## ভাগ ৪ — তথ্যতত্ত্ব ও গণনার কঠিন দেয়াল (সংখ্যা মিলিয়ে, ভুল সংশোধিত)

### ৪.১ বাজেট-সারণি

| রাশি | মান | উৎস/মন্তব্য |
|---|---|---|
| ব্যারিয়ন (দৃশ্যমান) | ~$10^{80}$ | |
| DM কণা (WIMP ১০০ GeV ধরে) | ~$10^{83}$ | |
| CMB ফোটন | ~$10^{89}$ | |
| নিউট্রিনো | ~$10^{89}$ | ⚠️ P02-এ "$10^8$" লেখা ছিল — স্পষ্ট টাইপো; P18 ও যোগফল ($10^{90}$) অনুযায়ী $10^{89}$ (রেজিস্টার C-12) |
| মোট কণা | ~$10^{90}$; প্রতি কণা ~১০০–১০০০ bit | classical তথ্য ~$10^{92}$ bit |
| পূর্ণ কোয়ান্টাম অবস্থা | ~$10^{(10^{90})}$ bit — এক্সপোনেনশিয়াল | $N$ qubit ⇒ $2^N$ amplitude |
| Bekenstein/holographic সীমা | ~$10^{122}$–$10^{123}$ bit | (P02: $10^{122}$; P03: $A/4\ell_P^2\approx10^{123}$ — একই ক্রম) |
| সব হার্ডডিস্ক | ~$10^{28}$ bit | ফাঁক ~$10^{94}$× |
| Lloyd: মহাবিশ্বের মোট গণনা | ≤ ~$10^{120}$ অপারেশন, ~$10^{90}$ bit-এ | |
| Margolus–Levitin | ≤ $2E/\pi\hbar\approx6\times10^{33}$ ops/s/J; ১ kg "ultimate laptop" ≈ $5.4\times10^{50}$ ops/s | |
| Landauer | $kT\ln2$/bit; $T_{\rm CMB}$-এ ≈ $2.6\times10^{-23}$ J | একমাত্র মুক্তি: reversible computing |
| Landauer × $10^{122}$ bit | **≈ $2.6\times10^{99}$ J** | ⚠️ P02 লিখেছিল ~$10^{96}$ J; $T=2.7255$ K-এ পুনর্গণনায় $10^{99}$। উপসংহার একই — মহাবিশ্বের total mass-energy ~$10^{70}$ J-এর চেয়ে ~২৯ ক্রম বেশি (রেজিস্টার C-13) |
| Exascale ($10^{18}$ ops/s) | $10^{120}$ ops ⇒ ~$10^{94}$ বছর | মহাবিশ্বের বয়সের $10^{84}$× |
| ব্রুট-ফোর্স Planck-লাটিস | ~$10^{185}$ ঘনক × ~$10^{61}$ Planck-সময় ⇒ ~$10^{246}$ ops | [P03] |
| ব্রুট-ফোর্স Planck-ধাপ, কণা-মডেলে | $10^{61}$ ধাপ × $10^{90}$ কণা ⇒ ~$10^{151}$ ops | [P02] — ভিন্ন মডেল, বিরোধ নয়; দুটোই অসম্ভব |
| স্কেল-পরিসর | $10^{-35}$ m → $10^{26}$–$10^{27}$ m ≈ ৬১–৬২ ক্রম; সময়ে ~৬০ ক্রম | |
| Big Bang→আজ | ~$4.35\times10^{17}$ s; ~$10^{61}$ Planck-ধাপ | |

### ৪.২ Tier A-র চারটি "শো-স্টপার" (কেন Tier A নয়)
1. **No-cloning + অনিশ্চয়তা:** প্রাথমিক কোয়ান্টাম অবস্থা "পড়ে" নেওয়া অসম্ভব।
2. **Chaos:** সৌরজগতের Lyapunov সময় ~৫০ লক্ষ বছর; bit-level পরিবর্তনও কয়েক Gyr পরে ভিন্ন গ্যালাক্সি দেয় ⇒ ইতিহাস-পুনরুৎপাদনে অসীম নির্ভুলতা।
3. **Computational irreducibility / no-fast-forward** (Wolfram): অনেক সিস্টেমে $t$-সময়ের ফল পেতে $\Omega(t)$ ধাপ লাগে।
4. **অসীম আয়তন:** $|\Omega_k|\lesssim0.002$; inflation ⇒ মোট মহাবিশ্ব দৃশ্যমানের বহুগুণ, সম্ভবত অসীম। এছাড়া ২০২৫-এর গবেষণা: চারটি ভৌত নিয়ম (সসীম তথ্য-গতি, আকর্ষণীয় মহাকর্ষ, অ-শূন্য সম্প্রসারণ…) মানলে "শক্তিশালী ও মহাজাগতিকভাবে সম্পূর্ণ" সিমুলেশন ভৌতভাবে অসম্ভব।

> **মজার ব্যতিক্রম:** *প্রোগ্রামটি* ছোট (কয়েকটি সমীকরণ + কম-এন্ট্রপির Weyl-curvature প্রাথমিক অবস্থা)। সংক্ষিপ্ত বর্ণনা ≠ সংক্ষিপ্ত রানটাইম।

### ৪.৩ তিনটি প্রমাণিত নির্মাণ-বাধা (যেকোনো substrate-এ)
**Sign problem** (Troyer–Wiese, NP-hard); **chiral gauge theory on lattice** (Nielsen–Ninomiya no-go; পূর্ণ SM-এর non-perturbative lattice সংজ্ঞা অসম্পূর্ণ); **Weinberg–Witten** (emergent gravity-র জন্য অতিরিক্ত মাত্রা/holography লাগে; আমাদের মহাবিশ্ব de Sitter, AdS/CFT সরাসরি খাটে না)।

### ৪.৪ Substrate-বিকল্প — কোনটি কোথায় (P03 §২)
| substrate | ✅ প্ল্যানে ভূমিকা |
|---|---|
| ফল্ট-টলারেন্ট কোয়ান্টাম কম্পিউটার (logical:physical ≈ ১:১০০০) | R&D: ক্ষুদ্র গেজ-তত্ত্ব/নিউক্লিয়ার ডাইনামিক্স; $10^{90}$ qubit কল্পনাতীত |
| ক্লাসিক্যাল + tensor network (MPS/MERA) | R&D: কম-entanglement; 3D-এ ব্যর্থ |
| Reversible cellular automaton ('t Hooft) | R&D/দর্শন; Lorentz-symmetry ভাঙে |
| Holographic/matrix models | R&D: SYK, matrix model toy-quantum-gravity (২০৩০-এর দশক) |
| **ক্লাসিক্যাল HPC (GPU exascale)** | ✅ **মূল প্ল্যাটফর্ম** |
| AI/ML surrogate | ✅ subgrid emulator ও UQ-তে |

### ৪.৫ সময় ও real-time
সিমুলেশন real-time হতে হবে না; অভ্যন্তরীণ ঘড়ি বাইরের ঘড়ির সঙ্গে সম্পর্কহীন। Pause/rewind/branching সম্ভব, তবে rewind-এ পুরো অবস্থা + random-ইতিহাসের ফল সংরক্ষণ লাগে (⇒ checkpoint-নীতি, ভাগ ৮)।

---

## ভাগ ৫ — স্থাপত্য: ঠিকানা-বৃক্ষ, ডোমেইন, shells, কাপলিং

### ৫.১ ✅ নামকরণ-সমন্বয় (সবচেয়ে বড় সংঘাত-মীমাংসা)

সোর্সে "L" ভিন্ন অর্থে ছিল (P05: L0–L8, বড় সংখ্যা = সূক্ষ্ম; P07: L0–L12, বড় সংখ্যা = স্থূল; P10: L0–L6 ফিজিক্স-স্কেল; P15: Level 0–5; P19: ১–৮ জুম-পিরামিড)। ✅ **একীভূত স্থানিক ডোমেইন D0–D10 (স্থূল → সূক্ষ্ম):**

| D | অঞ্চল | আকার (ব্যাস) | ভর/একক-রেজোলিউশন | পদ্ধতি | P05 | P07 | P19 | P10 | P15 |
|---|---|---|---|---|---|---|---|---|---|
| **D0** | পুরো দৃশ্যমান মহাবিশ্ব (statistical) | ২৮.৫ Gpc (৯৩ Gly) | বিশ্লেষণাত্মক/ঘনত্ব-ক্ষেত্র | background + পরিসংখ্যানগত মোড | L0 | L12 | ১ | L0 | Level 0 |
| **D1** | বৃহৎ periodic বাক্স | ২–৪ Gpc/$h$ (✅ ৫.২) | $10^{9}$–$10^{10}M_\odot$ | TreePM/COLA | L1 | L12 | ১ | L1 | — |
| **D2** | Laniakea + প্রতিবেশী | ৬০০ Mpc | $10^8M_\odot$ | constrained zoom | L2 | L10 | ২ | L1 | Level 1 |
| **D3** | Laniakea কেন্দ্র | ১৮০ Mpc | $10^6M_\odot$ | পূর্ণ hydro | L3 | L9 | ২ | L1 | Level 1 |
| **D4** | Virgo + Local Supercluster | ৪০ Mpc | $10^4M_\odot$ | hydro+feedback | L4 | L8 | ৩ | L2 | Level 1 |
| **D5** | Local Volume (Local Sheet সহ) | ১২ Mpc | $10^3M_\odot$ | hydro+রসায়ন | L5 | L7/L6 | ৩ | L2 | — |
| **D6** | Local Group | ৩ Mpc | $10$–$10^2M_\odot$ | পূর্ণ ISM | L6 | L5 | ৩ | L2 | — |
| **D7** | আকাশগঙ্গা | ৬০০ kpc | তারা-প্রতি-কণা | star-by-star | L7 | L3 (+L4 উপগোষ্ঠী) | ৪–৫ | L2/L3 | Level 2 |
| **D8** | on-demand উপ-অঞ্চল | pc–AU | MHD+রসায়ন; Sgr A* GRMHD | sub-sim | L8 | L2–L0 | ৬–৭ | L3 | Level 3 |
| **D9** | সৌরজগৎ ও গ্রহ-ব্যবস্থা | AU | কক্ষ-বলবিদ্যা, বায়ুমণ্ডল | COSMOS Phase 4 | — | L0 | ৭–৮ | L4 | Level 4 |
| **D10** | অণু, রসায়ন, জীব | nm–m | specialised solver | COSMOS Phase 5 | — | — | ৮ | L5–L6 | Level 5 |

**স্কেল-অনুপাত:** Laniakea (~১৬০ Mpc) ÷ একক নক্ষত্র (~১ $R_\odot\approx2.3\times10^{-14}$ pc) ≈ $10^{21}$ ⇒ একক grid-এ $10^{63}$ cell ⇒ **nested zoom-in constrained realization** ছাড়া উপায় নেই [P05 ভাগ০]।

**ঠিকানা-বৃক্ষ (scene graph) — ✅ নোডের ক্রম** [P07 §০, P19]: পৃথিবী → সৌরজগৎ → Local Interstellar Cloud (~৩০ ly) → Local Bubble (~১০০০ ly, ~১৪ Myr পুরনো সুপারনোভা-শৃঙ্খল) → Orion Spur → আকাশগঙ্গা → আকাশগঙ্গা-উপগোষ্ঠী (LMC, SMC…) → Local Group → Local Sheet (+Council of Giants, Local Void) → Local Volume → Virgo Supercluster → Laniakea → Pisces–Cetus Supercluster Complex (~১ Gly) → KBC Void/Local Hole → দৃশ্যমান মহাবিশ্ব।

### ৫.২ বাক্সের আকার — সংঘাত ও সিদ্ধান্ত
সোর্সে: ২ Gpc/$h$ (P05 L1), ৪ Gpc/$h$ (P09 S2), ২০০০ Mpc/$h$ (P12 YAML), ৭৪০ Mpc (MillenniumTNG, রেফারেন্স)। ✅ সিদ্ধান্ত:
- **D1-Lightcone বাক্স:** $L=4$ Gpc/$h$ periodic, $10^9M_\odot$, $z\lesssim1.2$ একবারে replication-ছাড়া (Statistical Mode)।
- **D1-Twin parent বাক্স:** ২ Gpc/$h$, $10^{10}M_\odot$/কণা, ~$3\times10^{11}$ কণা (Twin Mode-এ নিচের D2–D8 zoom-এর parent)।
- **MVP বাক্স:** ছোট (ল্যাপটপ-সাধ্য) — ভাগ ১২।
- $z>1.2$ shell-এ বাক্স-পুনরাবৃত্তি **নয়**; ভিন্ন seed-এর স্বাধীন বাক্স; repetition detector বাধ্যতামূলক [P09 §২.১, P12 §৩.১]।

### ৫.৩ ডোমেইন-ডেটা — কণা-সংখ্যা ও ভর-বাজেটের যাচাই [P05 §২.১, P07 D1]
Critical density $\rho_{\rm crit}=2.775\times10^{11}h^2M_\odot{\rm Mpc}^{-3}$; $h=0.674,\Omega_m=0.315\Rightarrow\bar\rho_m\approx3.97\times10^{10}M_\odot{\rm Mpc}^{-3}$।

| ডোমেইন | উপাদান সংখ্যা | বাইট/উপাদান | মোট মেমরি |
|---|---|---|---|
| D1 | ~$3\times10^{11}$ (DM) | ৫৬ | ১৭ TB |
| D2 | ~$5\times10^{11}$ | ~১২০ | ৬০ TB |
| D3 | ~$8\times10^{11}$ (Laniakea ৯০ Mpc গোলক: $M=1.2\times10^{17}M_\odot$ ⇒ $1.2\times10^{11}$ কণা @ $10^6M_\odot$) | ~২০০ | ১৬০ TB |
| D4 | ~$5\times10^{11}$ | ~২৫০ | ১২৫ TB |
| D5 | ~$4\times10^{10}$ | ~৩১০ | ১২ TB |
| D6 | ~$2\times10^{11}$ | ~৩১০ | ৬২ TB |
| D7 | ~$3\times10^{11}$ (নক্ষত্র ~$2\times10^{11}$; গ্যাস $10^{10}$ cell; DM $1.2\times10^{11}$) | ~২০০ | ৬০ TB |
| **যোগফল** | ~$2.3\times10^{12}$ | | ~৫০০ TB; buffer/tree/ghost ×২ ⇒ **~১ PB** |

তুলনা: Frontier ৯.২ PB, Aurora ~১০+ PB, El Capitan ~৫+ PB HBM। সব স্তর একসঙ্গে দ্বিমুখী কাপলিংসহ চালাতে আরও ৫–১০×; তাই **ক্রমানুসারে** চালানো হবে।

**বিকল্প বাজেট-তালিকা [P07 D1]:** পূর্ণ মহাবিশ্ব $10^{10}M_\odot$ ⇒ $4.8\times10^{13}$ কণা ⇒ ~৩ PB; বামন-গ্যালাক্সি ধরতে $10^6M_\odot$ ⇒ $4.8\times10^{17}$ ⇒ ~৩১ EB; Laniakea $10^{11}$ ⇒ ~৬ TB; Local Volume $10^{10}$ ⇒ ~৬০০ GB; Local Group $2\times10^8$ ⇒ ~১৩ GB; আকাশগঙ্গা star-by-star $2\times10^{11}$ ⇒ ~২০ TB; পুরো মহাবিশ্ব star-by-star ~$10^{23}$ কণা — অসম্ভব। রেকর্ড: Aurora ১৩.৪ ট্রিলিয়ন কণা/২৮.৬ Gly/~৫০,০০০ GPU/~৪ দিন/৮৫ PB চেকপয়েন্ট ⇒ পূর্ণ মহাবিশ্ব আজকের রেজোলিউশনে মাত্র ~৩–৪× বড় রান; বামন পর্যন্ত নামলে ~১০,০০০×।

**আকাশগঙ্গা-নোডের রেজোলিউশন-সিঁড়ি [P07 A4]:** DM-only $10^6M_\odot$ ⇒ ১.১৫×$10^6$ কণা (~৭০ MB, ল্যাপটপে আজই); FIRE-ধাঁচ ~$10^3M_\odot$ ⇒ ~$10^9$ (১০০ GB–১ TB); **star-by-star** ~$2\times10^{11}$ (~২০ TB, ~$10^3$ GPU-বছর শুধু মহাকর্ষ; hydro যোগে $10^2$–$10^4$×)। **বাধা স্মৃতি নয়, সময়-ধাপের ডাইনামিক রেঞ্জ (~$10^{14}$×)।**

### ৫.৪ Redshift shells S0–S7 (লাইট-কোন বরাবর) ✅ [P09 ভাগ২]

| Shell | $z$ | $\chi$ | ভর-রেজোলিউশন | পদ্ধতি | দৃশ্যমান বস্তু |
|---|---|---|---|---|---|
| S0 | ০–০.০২ | <৮৫ Mpc | $10^4$–$10^6$ | D3–D5 constrained hydro | Laniakea, Virgo, নক্ষত্র-গুচ্ছ |
| S1 | ০.০২–০.১৫ | ৮৫–৬২০ Mpc | $10^8$ | constrained N-body + SAM (TreePM, $\epsilon\sim5$ kpc) | Shapley, Sloan Great Wall, DESI BGS |
| S2 | ০.১৫–১.০ | ০.৬২–৩.৩ Gpc | $10^9$ | random N-body (TreePM/Abacus-ধরন, $10^{12}$–$10^{13}$ কণা), HOD/SAM | BOSS, ক্লাস্টার, Euclid |
| S3 | ১–৩ | ৩.৩–৬.৪ Gpc | $10^{10}$ | **COLA/FastPM** (১০–৪০ step, 2LPT; ১০০× সস্তা; $k<1h$/Mpc-এ ~২%) + emulator | Cosmic noon, quasar, Ly$\alpha$ |
| S4 | ৩–১০ | ৬.৪–৯.৭ Gpc | $10^{10}$–$10^{11}$ | PM + Lagrangian halo finder (PINOCCHIO-ধরন) বা emulator + semi-numeric reionization | JWST, HII বুদবুদ, 21 cm |
| S5 | ১০–৩০ | ৯.৭–১২ Gpc | semi-numeric | 21cmFAST-ধরন + Pop III zoom | Cosmic dawn |
| S6 | ৩০–১০৯০ | ১২–১৪ Gpc | রৈখিক | Boltzmann (CLASS) | Dark ages, CMB |
| S7 | >১০৯০ | — | ODE | তাপীয় ইতিহাস + BBN | দৃশ্যমান নয় (CνB, GW, মৌল-প্রাচুর্য) |

**Onion-shell নীতি:** $\Delta x_{\rm req}(z)\approx\theta_{\min}D_A(z)$ — JWST ($0.03''$): $z=2$-এ ~২৫০ pc; $z=10$-এ ~৪০০ pc। **Light-cone সময়-নীতি:** snapshot-interpolation নয়, **on-the-fly lightcone writer** — প্রতি step-এ যে কণা $\chi(t)=c\int_t^{t_0}dt'/a$ অতিক্রম করে তাকে সরাসরি catalog-এ লেখা (Fosalba/MICE, Euclid Flagship)।

### ৫.৫ কসমিক কালপঞ্জি — কোন যুগে কোন পদ্ধতি ✅ [P03 §৪, P09 §১.১, P18 স্তর৪]

| যুগ | সময / $z$ | তাপমাত্রা | পদ্ধতি | নিশ্চয়তা |
|---|---|---|---|---|
| Planck | $<10^{-43}$ s | $10^{19}$ GeV | Φ0 placeholder | 🔴 |
| Inflation + reheating | ~$10^{-36}$–$10^{-32}$ s | — | ইনপুট $A_s,n_s,r$ (≈৬০ e-fold) | 🟡 |
| EW transition | ~$10^{-11}$–$10^{-12}$ s | ~১৬০ GeV | সমরূপ ODE | 🟡 |
| QCD transition (কোয়ার্ক→হ্যাড্রন) | ~$10^{-5}$–$10^{-6}$ s | ~১৫০ MeV | ODE + lattice-QCD EoS টেবিল | 🟢 |
| ব্যারিওজেনেসিস | ~$10^{-5}$ s | — | ইনপুট $\eta$ (তত্ত্ব অপর্যাপ্ত) | 🔴 |
| নিউট্রিনো decoupling | ~১ s | ~১ MeV | ODE, $N_{\rm eff}=3.044$ | 🟢 |
| BBN | ৩–২০ মিনিট | ০.১–০.০১ MeV | নিউক্লিয়ার network ODE (D, ³He, ⁴He≈২৫%, ⁷Li) | 🟢 |
| Equality | $z\approx3400$ | ~৯৪০০ K | Boltzmann | 🟢 |
| Recombination/CMB | $z\approx1090$ (৩.৮×$10^5$ yr) | ~৩০০০ K | Boltzmann + HEALPix | 🟢 |
| Dark Ages | $z\sim1090\to30$ | | রৈখিক + 21 cm absorption | 🟢 |
| Cosmic Dawn (Pop III) | $z\sim30\to15$ (১০০–২৫০ Myr) | | semi-numeric + zoom | 🟡 (JWST চাপ) |
| Reionization | $z\sim15\to5.5$ | | RT-coupled / 21cmFAST | 🟡 |
| Cosmic web ও গ্যালাক্সি | ১–১৩.৮ Gyr | | N-body + hydro | 🟢/🟡 |
| Cosmic noon | $z\approx1.5$–৩ (SFR শীর্ষ ~০.১ $M_\odot$/yr/Mpc³) | | | 🟢 |
| Λ-প্রাধান্য / ত্বরণ শুরু | $z\approx0.3$ / $z\approx0.6$ | | | 🟢 |
| সূর্যের জন্ম | মহাবিশ্বের বয়স ~৯ Gyr | | molecular cloud collapse | 🟡 |
| গ্রহ-গঠন | ~৯.২–১০ Gyr+ | | accretion disk + chem network | 🔴/🟡 |
| অ্যাবায়োজেনেসিস | ~১১ Gyr | | hypothesis model | 🔴 |
| ভবিষ্যৎ | $10^{14}\to10^{100}$ yr | → 0 K | ΛCDM extrapolation; heat death / de Sitter | 🟡 |

### ৫.৬ কাপলিং-নিয়ম (D-স্তরের মধ্যে) ✅ [P05 §২.২]
1. **Buffer zone:** প্রতিটি zoom অঞ্চলের চারপাশে ≥ ৩× ব্যাসার্ধের মধ্যবর্তী-রেজোলিউশন খোলস, নইলে ভারী কণা ঢুকে কৃত্রিম heating (zoom contamination); **contamination check প্রতি step-এ**।
2. **এক-মুখী:** D1→D2→D3 (ছোট স্কেল বড়কে প্রভাবিত করে না — Lagrangian PT)। **দ্বিমুখী:** D6↔D7 (LMC আকাশগঙ্গার চাকতি বিকৃত করে; আকাশগঙ্গার জোয়ার LMC ছিঁড়ে), D7↔D8 (supernova feedback উপরে)।
3. **সময়-সমন্বয়:** প্রতি স্তরের নিজস্ব timestep hierarchy, কিন্তু একটি সাধারণ cosmic time $t$; স্তর-সীমানায় প্রতি global sync step-এ সিঙ্ক।

### ৫.৭ LOD ও lazy-evaluation নীতি ✅ [P07 D2, P04, P18]
| ক্যামেরা-দূরত্ব | উপস্থাপনা |
|---|---|
| >৩০০ Mpc | ঘনত্ব-ক্ষেত্র + পরিসংখ্যানগত মোড |
| ১০০–৩০০ Mpc | DM কণা + হ্যালো ক্যাটালগ |
| ১০–১০০ Mpc | হ্যালো + semi-analytic গ্যালাক্সি |
| ১–১০ Mpc | পূর্ণ হাইড্রো গ্যালাক্সি, subgrid |
| ১–১০০ kpc | সমাধানিত ISM, তারা-গুচ্ছ |
| <১ kpc | প্রতিটি নক্ষত্র আলাদা কণা |
| <১ pc | নক্ষত্র-অভ্যন্তর (MESA), ব্যাপক নয় |

**Lazy evaluation (কংক্রিট):** ৩-স্তর — (১) *eager:* D0–D3 পূর্বগণিত; (২) *on-demand:* ব্যবহারকারী/query কোনো অঞ্চলে গভীর zoom করলে সংরক্ষিত snapshot+merger-tree থেকে zoom-in sub-sim কিউ হয়; (৩) *cache:* ফল hash-সহ সংরক্ষিত। **Latency cap:** আলোর গতি $c$ = তথ্য-প্রসারের সীমা ⇒ এক অঞ্চলের অবস্থা তার causal past-এর বাইরের তথ্যে তাৎক্ষণিক বদলায় না (সার্বজনীন নিউটনীয় "এখন" নেই; coordinate time শুধু সুবিধা)।

### ৫.৮ স্থানাঙ্ক ও সময়-ব্যবস্থা ✅ [P05 ভাগ৩]
| স্তর | স্থানাঙ্ক |
|---|---|
| D0–D3 | Comoving Cartesian $\vec x=\vec r/a(t)$; periodic; supercomoving variables |
| D4–D6 | Comoving, বৃহৎ-স্কেল drift সরানো |
| D7 | Physical galactocentric, ডান-হাতি ($x$: সূর্যের বিপরীতে কেন্দ্র থেকে; $z$: উত্তর গ্যালাক্টিক মেরু) |
| D8 | স্থানীয় physical; প্রয়োজনে co-rotating |
| Sgr A* | Kerr–Schild (horizon-penetrating) |

**Output frames:** ICRS(RA,Dec); Galactic $(\ell,b)$; Supergalactic $(SGL,SGB)$; CMB rest frame (dipole-সংশোধিত)।
**সময়-চলক:** $\big(\dot a/a\big)^2=H_0^2[\Omega_ra^{-4}+\Omega_ma^{-3}+\Omega_ka^{-2}+\Omega_\Lambda]$; integration variable $\log a$ (প্রাথমিক) → cosmic time $t$ ($z<1$); **✅ শুরু $z=127$** (P05 "১২৭ অথবা ৪৯" — ১২৭ বেছে নেওয়া; $z=49$ কেবল স্বল্প-রেজোলিউশন বাক্সে অনুমোদিত), শেষ $z=0$ (+ঐচ্ছিক +১০ Gyr ensemble)।

**Timestep:** $\Delta t_i=\min\!\big[\eta\sqrt{\epsilon_i/|\vec a_i|},\ C_{\rm CFL}\Delta x_i/(c_{s,i}+|\vec v_i|),\ u_i/|\dot u_i|,\ t_{\rm cool},\ t_{\rm chem}\big]$, power-of-two bin।
| অঞ্চল | $\Delta t$ |
|---|---|
| D3 void | ~১০ Myr |
| D4 ক্লাস্টার-কেন্দ্র | ~০.১ Myr |
| D7 চাকতি | ১০–১০০ kyr |
| D7 molecular cloud কেন্দ্র | ১০–১০০ yr |
| Sgr A* ISCO | ~১ মিনিট (কক্ষীয় ~৩০ মিনিট) |

Sgr A* ISCO-তে ১৩.৮ Gyr ≈ $2\times10^{14}$ step — অসম্ভব ⇒ **on-demand sub-sim ~$10^4\,GM/c^3$ (Sgr A*-এ $t_g\approx21$ s ⇒ ~$2\times10^5$ s ≈ ২.৪ দিন সিমুলেটেড সময়; P05-এর "~২৪ ঘণ্টা" সংশোধিত — রেজিস্টার C-20)**, ফল feedback-টেবিল।

### ৫.৯ Observer-নোড (আকাশগঙ্গা D0–D2-তে)
"Observer marker": ভেতরে resolve নয়; শুধু অবস্থান, গতি ও foreground extinction/Zone-of-Avoidance mask। ডিফল্ট ক্যামেরা = আকাশগঙ্গা। Handoff: আকাশগঙ্গায় ঢুকলে D7 UI-তে যাবে (ভাগ ১১.২)।

---

## ভাগ ৬ — ডেটা-মডেল, সংরক্ষণ, API

### ৬.১ Provenance ও Confidence ✅
| ট্যাগ | অর্থ |
|---|---|
| `OBS` | সরাসরি পর্যবেক্ষিত |
| `REC` | পর্যবেক্ষণ থেকে reconstructed (Wiener/BORG) |
| `SIM` | সিমুলেশনের ফল |
| `MOCK` | সিমুলেশন + instrument/selection ফরওয়ার্ড-মডেল |
| `UNC` | উল্লেখযোগ্য অনিশ্চয়তা |

**Data Confidence Grade (✅ কংক্রিটকরণ, রেজিস্টার R-14):** **A** সরাসরি পরিমাপ + একাধিক স্বাধীন নিশ্চিতকরণ; **B** পরিমাপ কিন্তু মডেল-নির্ভর (দূরত্ব-মই, ভর-সংজ্ঞা); **C** reconstructed; **D** সিমুলেটেড-ক্যালিব্রেটেড; **E** হাইপোথেটিক্যাল/মডেল-বিকল্প।

### ৬.২ Object Registry (Graph-সমর্থিত) ✅ [P15 §১১]
- কারণ: একই গ্যালাক্সি ঐতিহাসিক ক্যাটালগে এক কাঠামোর সদস্য, আবার flow-model-এ অন্য সীমানায়। ⇒ সরল parent-child tree নয়।
- ✅ বাস্তবায়ন: **PostgreSQL** + `MembershipRelations` টেবিল (সম্পর্ক-প্রতি `model`, `definition`, `confidence`) — একাধিক সদস্যতা-সংজ্ঞা সহাবস্থান করে; ভবিষ্যতে graph-extension ঐচ্ছিক।
- প্রতিটি পরিমাপে নিজস্ব উৎস, একক, অনিশ্চয়তা, সংজ্ঞা (যেমন ভর: $M_{200c}$ বনাম $M_{500c}$, aperture)। উদাহরণ-স্কিমা: `code/docs/schemas/cosmic-object-registry-schema.json.txt`।

**১২টি টেবিল:** CosmicObjects · ObjectProperties · ObjectPositions · Measurements · MembershipRelations · PhysicalModels · ScientificEquations · Catalogues · Publications · UncertaintyRecords · SimulationRuns · SimulationResults।

**Data-Engine-এর প্রতিটি তথ্যে:** উৎস, প্রকাশের তারিখ, পর্যবেক্ষণ-সময়, একক, অনিশ্চয়তা, ব্যবহৃত তত্ত্ব, ডেটা-সংস্করণ, লাইসেন্স, নির্ভরযোগ্যতা-গ্রেড [P10 §৮.৩]।

**Observation-ডোমেইনের বিশদ ডেটা-সেট (SimulationRun, Snapshot, Halo, Galaxy, MergerTree, GasField, LightConeObject, SkyMap, TransientEvent, Provenance, Uncertainty)** [P12 §৬.১]: ক্ষেত্র-তালিকা `03_SOURCE_ARCHIVE.md` P12 §৬.১-এ; উদাহরণ JSON `code/docs/schemas/example-lightcone-galaxy-object.json`।

### ৬.৩ কণা-কাঠামো ও মেমরি-লেআউট ✅ [P05 §৭]
- DM কণা ৫৬ B; গ্যাস/নক্ষত্র/BH কণা ~১২০–৩১০ B গড় (`code/engine-reference/c/particle_structs.c`)।
- **SoA** (SIMD/GPU), **Peano–Hilbert** অর্ডার (cache + MPI), **Mixed precision:** অবস্থান ৬৪-bit বা quantized fixed-point (২ Gpc-এ pc-নির্ভুলতা ⇒ ~$10^9$ পরিসর); বেগ/তাপ/metal ৩২-bit; conservation-সংবেদী সঞ্চয়ক ৬৪-bit + Kahan।
- Output compression: lossy ZFP/SZ (৫–১০×) — **শুধু visualisation tile-এ**, বৈজ্ঞানিক মূল ডেটা lossless।

### ৬.৪ লাইট-কোন ডেটা-মডেল ✅ [P09 §৬]
সূচক: $(\text{HEALPix}_{\rm nest},\,i_z)$ ⇒ "আকাশের অংশ × $z$-পরিসর" query $O(1)$ ফাইল-অ্যাক্সেস। Arrow রেকর্ড ~১৪০ B/গ্যালাক্সি (`engine-reference/python/lightcone_record_schema.py`)।

| উপাদান | সংখ্যা | আকার |
|---|---|---|
| লাইট-কোন গ্যালাক্সি ($M_\star>10^8,z<10$) | ~$5\times10^{11}$ | ~৭০ TB |
| হ্যালো | ~$10^{12}$ | ~৬০ TB |
| CMB + secondary (nside 8192, ~২০ map) | | ~৬০ GB |
| 21 cm cube | | ~৫০ TB |
| $\delta,\vec v$ shells | | ~২০ TB |
| Transient catalog (১০ yr) | ~$10^{10}$ | ~২ TB |
| Volume snapshots (৯টি, S2 বাক্স) | | ~২ PB |
| **UI-সার্ভিসযোগ্য লাইট-কোন মোট** | | **~২০০ TB** |

### ৬.৫ ফাইল-ফরম্যাট ✅
| ডেটা | ফরম্যাট |
|---|---|
| Raw কণা + checkpoint | HDF5 (lossless) |
| বহুমাত্রিক ক্ষেত্র (density/gas/radiation tiles) | Zarr |
| হ্যালো/গ্যালাক্সি ক্যাটালগ | Parquet / Arrow |
| পূর্ণ-আকাশ মানচিত্র | HEALPix |
| বড় snapshot/map | Object storage |
| ইন্টারঅ্যাকটিভ ৩D/আকাশ | octree/quadtree binary tile (Arrow IPC) — JSON নয় |
| মেটাডেটা | PostgreSQL |

### ৬.৬ I/O ও সংরক্ষণ-কৌশল ✅ [P05 §৯.৩]
পূর্ণ snapshot (সব স্তর) ~৫০০ TB × ~২০০টি (log-spaced in $a$) ⇒ ~১০০ PB raw ⇒ lossy-১০× ~১০ PB; লাইট-কোন ~৫ PB; হ্যালো/গ্যালাক্সি ক্যাটালগ+merger tree ~১০০ TB; on-the-fly reduced ~১০ TB। **কৌশল:** পূর্ণ snapshot কম; **in-situ analysis** (ROCKSTAR/VELOCIraptor halo finding, mock observation, পরিসংখ্যান)।

### ৬.৭ API ✅ (`code/docs/api/production-api-endpoints.txt`)
`GET /v1/runs` · `/v1/runs/{run_id}/snapshots` · `/v1/lightcone/tiles/{level}/{tile_id}` · `/v1/objects/{id}` · `/v1/objects/{id}/merger-tree` · `/v1/objects/{id}/spectrum` · `/v1/maps/{map_type}/{healpix_tile}` · `POST /v1/jobs/mock-observation` · `GET /v1/jobs/{job_id}` · `GET /v1/provenance/{run_id}` · প্রোটোটাইপ: `/v1/cosmology/frame?z=`, `/v1/health`। **লক্ষ্য:** ৬০ fps নেভিগেশন; cone query <২ s; mock image <১০ s; statistics panel <৫ s (cached), নতুন নির্বাচনে <৩০ s।

---

## ভাগ ৭ — গাণিতিক ও সংখ্যাগত ইঞ্জিন

### ৭.১ ইঞ্জিন-স্তর G0–G8 ও কার্যক্রম

| G | মডিউল | ইনপুট → আউটপুট | প্রধান টুল |
|---|---|---|---|
| G0 | পটভূমি ও প্যারামিটার | `ParameterSet` → $a(t),H(z),D_C,D_A,D_L,t_{\rm lookback}$, বৃদ্ধি-ফ্যাক্টর | astropy, CLASS, CAMB |
| G1 | প্রাথমিক শর্ত | $P(k)$, seed → Gaussian ক্ষেত্র → 2LPT কণা | MUSIC, NgenIC, genetIC; constrained: BORG, HAMLET, Wiener |
| G2 | মহাকর্ষ | কণা → বল | TreePM (GADGET-4, Abacus), COLA/FastPM, PM |
| G3 | হাইড্রো | গ্যাস → $\rho,u,\vec B$ | SPH (D2–D3), AMR (RAMSES/Enzo, D4–D5), moving-mesh/MFM (AREPO/GIZMO, D6–D7) |
| G4 | Subgrid | cell → SFR, feedback, BH | নিচে ৭.৪ |
| G5 | বিকিরণ ও রসায়ন | $J_\nu$, species | M1/OTVET RT; non-equilibrium network (H, He, H₂, CO, dust); CVODE |
| G6 | Halo/গ্যালাক্সি | snapshot → ক্যাটালগ | ROCKSTAR/VELOCIraptor/SUBFIND, merger-tree (Consistent Trees), SAM/HOD/SHAM |
| G7 | লাইট-কোন ও পর্যবেক্ষক | ইতিহাস → $(\hat n,z)$ ক্যাটালগ + মানচিত্র | on-the-fly writer, HEALPix, mock-observation |
| G8 | UQ ও ভ্যালিডেশন | বহু run → বণ্টন, convergence | ensemble manager, emulator (GP/NN) |

**Operator-splitting (প্রতি সময়-ধাপ; Strang/leapfrog) ✅** [`docs/diagrams/operator-splitting-order.txt`]: gravity half-kick → drift → গ্যাস (Riemann: HLLC/HLLD/Roe) → বিকিরণ → রসায়ন+cooling (stiff, CVODE) → নক্ষত্র-গঠন → feedback → BH → gravity half-kick। সীমাবদ্ধতা: ভারী coupling-এ splitting error — প্রতি স্তরে convergence test (ভাগ ৯)।

### ৭.২ মূল সমীকরণ-সমষ্টি
- **Friedmann:** $H^2(a)=H_0^2[\Omega_ra^{-4}+\Omega_ma^{-3}+\Omega_ka^{-2}+\Omega_\Lambda]$; evolving DE শাখা: $\Omega_{\rm DE}(a)=\Omega_{\rm DE,0}a^{-3(1+w_0+w_a)}e^{-3w_a(1-a)}$।
- **দূরত্ব:** $D_C=\frac{c}{H_0}\int\frac{dz}{E(z)}$, $D_A=D_C/(1+z)$, $D_L=(1+z)D_C$।
- **মহাকর্ষ (comoving):** $\ddot{\vec x}+2H\dot{\vec x}=-\frac{1}{a^2}\nabla\phi$, $\nabla^2\phi=4\pi G a^2\bar\rho\,\delta$; Vlasov–Poisson।
- **Hydro (Euler/MHD):** $\partial_t\rho+\nabla\!\cdot(\rho\vec v)=0$; $\partial_t(\rho\vec v)+\nabla\!\cdot(\rho\vec v\vec v+P)=-\rho\nabla\phi$; শক্তি-সমীকরণ; MHD-তে $\nabla\!\cdot\vec B=0$ (constrained transport/divergence cleaning)।
- **Radiative transfer:** $\frac{1}{c}\partial_tI_\nu+\hat n\!\cdot\!\nabla I_\nu=-\kappa_\nu I_\nu+j_\nu$ (moment/M1 closure)।
- **রসায়ন:** $dn_i/dt=\sum$ গঠন − ধ্বংস (stiff)।
- **GR (Φ1):** $G_{\mu\nu}+\Lambda g_{\mu\nu}=8\pi G\,T_{\mu\nu}/c^4$, 3+1 BSSN/Z4c; GRMHD $\nabla_\mu T^{\mu\nu}=0$।
- **Boltzmann (CMB):** $\Theta,\Phi,\Psi$ hierarchy (CLASS/CAMB); $C_\ell=4\pi\int d\ln k\,\mathcal P(k)\,|\Delta_\ell(k)|^2$।
- **Redshift–লাইট-কোন:** $1+z=a_0/a_e$; কণা-ক্রসিং $\chi(t)=c\int_t^{t_0}dt'/a(t')$।
- **Press–Schechter/Sheth–Tormen** (halo mass-function), **NFW profile** — validation-লক্ষ্য।

### ৭.৩ সলভার-নির্বাচন (সংঘাত মীমাংসিত) ✅
সোর্সের তিনটি সেট (D-স্তরভিত্তিক P05; কোড-নামভিত্তিক P10; "FIRE/AURIGA-class" P19) একই চিত্র:

| কাজ | ✅ প্রাথমিক | বিকল্প (সংরক্ষিত) |
|---|---|---|
| বৃহৎ-বাক্স N-body | **GADGET-4 / Abacus** (লাইট-কোন-বাক্স) | PKDGRAV3, HACC, CUBE |
| দ্রুত approximate | **COLA / FastPM** | PINOCCHIO, 2LPT-only |
| Cosmological hydro zoom | **AREPO** (moving mesh) | GIZMO-MFM/MFV, SWIFT (SPH), RAMSES (AMR) |
| গ্যালাক্সি-স্কেল (D7) | **FIRE-3 / AURIGA-ধাঁচ** subgrid + AREPO/GIZMO | GASOLINE2, Enzo, ART |
| তারা-গুচ্ছ/globular (সরাসরি) | **NBODY6++GPU**, Hermite 4th/6th, Ahmad–Cohen | PeTar, KIRA |
| GRMHD | **Einstein Toolkit** (বা HARM/KORAL/iharm) + ipole/grtrans | BHAC, Athena++, GRChombo |
| Boltzmann | **CLASS** | CAMB, HyRec/RECFAST |
| রেডিয়েশন | RAMSES-RT / TRAPHIC / OTVET | |
| 21 cm | **21cmFAST** | |
| Stellar evolution | **MESA** (on-demand) | |

**Hydro-মেথড বেছে নেওয়ার নীতি:** মেনে চলা — SPH (ভর-অভিযোজিত, D2–D3), AMR (shock-ক্ষমতা, D4–D5), moving-mesh/MFM (Galilean-invariant, D6–D7); সঠিক নির্বাচন নির্ভর করে Kelvin–Helmholtz, blob test, Sedov–Taylor ও গ্যালাক্সি-কোড-তুলনা (AGORA, nIFTy) ফলের ওপর।
**Python রেফারেন্স-কোড** (`code/engine-reference/python/`) শিক্ষামূলক; production = C++/CUDA/MPI।

### ৭.৪ Subgrid মডেল (✅ রেসিপি নির্দিষ্টকরণ)

| উপাদান | ✅ ডিফল্ট | sensitivity-পরিসর |
|---|---|---|
| Star formation | self-gravitating + ঘনত্ব-সীমা; $\dot\rho_\star=\epsilon_{\rm ff}\rho_{\rm gas}/t_{\rm ff}$ | $\epsilon_{\rm ff}$: ০.০১–১.০ |
| IMF | Kroupa/Chabrier | top-heavy variant (U12) |
| Supernova feedback | **mechanical/momentum injection** (resolved-cooling-radius-নির্ভর, $\sim10^{51}$ erg/SN) | stochastic thermal (ensemble-এ); delayed cooling ✘ (ভৌত ন্যায্যতা দুর্বল) |
| Stellar wind, radiation pressure, photoionisation | যুক্ত (D7) | |
| Metal enrichment | SN Ia/II, AGB | yield-সেট বিকল্প |
| SMBH seed | $10^4$–$10^6M_\odot$ যখন $M_h>10^{10}$ | scenario ensemble (U13) |
| BH accretion | Bondi–Hoyle (Eddington-সীমাবদ্ধ) | |
| AGN feedback | quasar-mode (thermal/radiative) + radio-mode (জেট) | |
| Sgr A* | RIAF, GRMHD sub-sim থেকে effective table | |

**Calibration-নীতি:** Subgrid-প্যারামিটার (SF, feedback, AGN) **গ্যালাক্সি stellar-mass function ও আকার** দিয়ে calibrate; ক্লাস্টার gas-fraction, $z>10$ UV-LF, তারা-গঠন-ইতিহাস — **validation** হিসেবে সংরক্ষিত (N8)।

**বৃহৎ-বাক্সের হাইড্রো-সমতুল্য (লক্ষ্য-ভিত্তিক বিকল্প):** পূর্ণ hydro (FLAMINGO-সীমা: ২.৮ Gpc, ৩০০ বিলিয়ন কণা) → **baryonification** (DM-only-এর ওপর ব্যারিয়ন-কার্যক্রম, P(k) ঠিক ~১–২%) → SAM/HOD/SHAM। ✅ **S2 ও S3-তে baryonification + HOD/SAM; D3–D7-এ পূর্ণ hydro।**

**নিউট্রিনো:** পূর্ণ বাক্সে রৈখিক-প্রতিক্রিয়া (linear response, $\sum m_\nu$ ছোট); zoom/D1 ভর-সংবেদী কাজে কণা-নিউট্রিনো।
**Modified gravity / alternative DM:** `ParameterSet.gravity_model` ও `dm_model` সুইচ; ডিফল্ট GR + CDM।

### ৭.৫ প্রাথমিক শর্ত ও Constrained Realization (Twin Mode) ✅ [P05 ভাগ৪]

ছয় ধাপ: (১) পর্যবেক্ষণ — Cosmicflows-4 (~৫৬,০০০ গ্যালাক্সি-বেগ), 2MRS, SDSS, DESI, 6dFGS, গ্যালাক্সি-গ্রুপ (Tully 2015), Cepheid/TRGB/SBF দূরত্ব; (২) Gaussian-ক্ষেত্র **Wiener filter / constrained realization (Hoffman–Ribak)** বা **BORG** (Bayesian forward-model, Lagrangian-space MCMC); (৩) **reverse Zel'dovich / Least-Action (NAM)** সীমিত; (৪) ছোট স্কেলে (যেখানে ডেটা নেই) বিশুদ্ধ Gaussian random: $W(k)=P(k)/[P(k)+N(k)]$; (৫) **2LPT/3LPT**, glass/BCC load; (৬) baryon–DM পৃথকীকরণ ($z\sim1000$, $v_{bc}\sim30$ km/s)।

| কী মিলবে | মিলবে না |
|---|---|
| Virgo, Coma, Great Attractor, Local Void, Local Sheet (≳৫ Mpc, ~৫–১০ Mpc রেজোলিউশন) | নির্দিষ্ট গ্যালাক্সির অবস্থান (<৫ Mpc), আকাশগঙ্গার নির্দিষ্ট ইতিহাস, সৌরজগতের অবস্থান |

> **ফলাফল:** "আমাদের-সদৃশ" Local Group (M31+আকাশগঙ্গা+LMC+M33…); ensemble-এর বিস্তার = আমাদের **অজ্ঞতার অনুপাত** [P05 §৪.২]।

### ৭.৬ আদি-মহাবিশ্ব ও CMB পাইপলাইন ✅ [P09 ভাগ৫, P03 §৪]
- **ODE (S7):** প্রজাতি-ভিত্তিক Boltzmann; $N_{\rm eff}=3.044$; BBN-নেটওয়ার্ক।
- **Boltzmann (S6):** CLASS/CAMB → $C_\ell^{TT,EE,TE,BB}$; স্বচ্ছতা: $z\approx1090$, $\tau_{\rm rec}\approx3.8\times10^5$ yr।
- **CMB sky:** Gaussian $a_{\ell m}$ → HEALPix nside 8192 ⇒ ~$8\times10^8$ pixel; কোণীয় রেজোলিউশন ~০.৪′ (`code/docs/diagrams/cmb-sky-pipeline.txt`)।
- **Secondary:** lensing (লাইট-কোনের $\delta$-shell-এর ওপর ray-tracing), tSZ, kSZ, ISW, Rees–Sciama, CIB (`engine-reference/python/06_cmb_lensing_tsz_healpy.py`)।
- Foreground (ধূলি, synchrotron) = **MOCK** স্তরে যোগ, `SIM`-এর সঙ্গে মিশে নয়।

### ৭.৭ On-demand sub-simulation ✅
| মডিউল | ট্রিগার | ফল আপস্ট্রিমে |
|---|---|---|
| **Sgr A* GRMHD** | ব্যবহারকারী Sgr A*-এ যায় / D7 BH-feedback টেবিল | Kerr–Schild, $a_*$ ও SANE/MAD; ~$10^4GM/c^3$; ray-tracing (230 GHz ছায়া ~৫০ μas); অ্যাক্রিশন-হার/জেট-শক্তি টেবিল। (৪.২৯৭×$10^6M_\odot$ ⇒ $GM/c^3\approx21$ s ⇒ $10^4$ এককে ~২.১×$10^5$ s ≈ ২.৪ দিন সিমুলেটেড সময়) |
| **Star formation MHD** | molecular cloud | sink-particle, IMF-নমুনা, feedback-দক্ষতা |
| **MESA stellar evolution** | নির্বাচিত নক্ষত্র | yield, লুমিনোসিটি-ইতিহাস |
| **Supernova RHD** | SN-ঘটনা | momentum/energy টেবিল |
| **Solar-neighbourhood (১০০ pc) ground-truth** | সূর্য-প্রতিবেশ | Gaia-ডেটার বিরুদ্ধে সরাসরি তুলনা |
| **Planetary** (Φ6, D9) | COSMOS Phase 4 | ensemble-only |

### ৭.৮ লাইট-কোন-সংযুক্ত পর্যবেক্ষণ-মডেল (G7) ✅ [P09 ভাগ৩–৫]
- **Galaxy-ক্যাটালগ:** HOD/SAM (L-Galaxies/GALFORM/SAGE/Santa Cruz-ধাঁচ); লুমিনোসিটি (SPS: FSPS/BC03), k-correction, ধূলি, emission lines; পর্যবেক্ষণ-নির্ভর **selection function** (SDSS, DESI, Euclid, Rubin LSST, JWST)।
- **Transients:** Poisson sampling — SNe Ia/II, kilonova, FRB, GRB, TDE, microlensing, GW (BBH/BNS) — হার-ফাংশন $\dot n(z)$ × লাইট-কোন আয়তন ($\sim10^{10}$ ঘটনা/১০ বছর)।
- **Stochastic GW background (PTA):** SMBH binary population থেকে, nHz।
- **Reionization & 21 cm:** 21cmFAST-ধরন semi-numeric; RT-coupled zoom (ছোট বাক্সে)।
- **Lyα forest, quasars, CIB, X-ray, radio:** HOD/AGN-মডেল + ray-tracing।
- **Mock observation pipeline** (`docs/diagrams/mock-observation-pipeline.txt`): ইতিহাস → গ্যালাক্সি-SED → ধূলি → telescope PSF/noise → selection → ক্যাটালগ/ছবি। `POST /v1/jobs/mock-observation`।

### ৭.৯ AI/ML সার্ভেট ✅ (অস্পষ্ট → কংক্রিট)
- **কাজ:** (ক) subgrid emulator (SF/feedback টেবিল), (খ) halo-mass/P(k) emulator (Aemulus/EuclidEmulator-ধরন), (গ) UQ-তে দ্রুত ensemble।
- **নিয়ম:** Latin-hypercube/Sobol প্রশিক্ষণ-পয়েন্ট ≥ ২০×(প্যারামিটার-সংখ্যা); held-out hydro-run-এ error $<$ নির্দিষ্ট বাজেট (যেমন P(k) < ১–২%) না হলে **ব্যবহার নিষিদ্ধ**; উত্তরে "EMU" ট্যাগ; ML কখনো ভৌত-নিয়ম বা conservation লঙ্ঘন করে ডেটা "বানায়" না।

---

## ভাগ ৮ — গণনা, HPC ও কার্যকরণ-মোড

### ৮.১ প্রতি-স্তর হিসাব ✅ [P05 §৬, P07 A4, P10 §১৬]
| হিসাব | ফল |
|---|---|
| D7 আকাশগঙ্গা star-by-star (শুধু মহাকর্ষ ~$3\times10^{20}$ FLOP, ~১.৭ ঘণ্টা Frontier-এ তাত্ত্বিক) | বাস্তবে hydro, feedback, timestep-range, load-imbalance ⇒ **$10^7$–$10^8$ GPU-ঘণ্টা** |
| সব D স্তর মিলে | ~**$10^9$ GPU-ঘণ্টা** একটি কনফিগারেশন |
| UQ (×$10^3$ ensemble) | সরাসরি অসম্ভব ⇒ **emulator + নিম্ন-রেজোলিউশন ensemble + অল্প সংখ্যক হাই-রেজ "hero" run** |

### ৮.২ চালানোর তিন পরিবেশ ✅ [P10 §১৬]
| পরিবেশ | কী চলবে | ✅ কখন |
|---|---|---|
| **Local (PC/laptop)** | Cosmology পটভূমি, CLASS/CAMB, ক্যাটালগ-ভিত্তিক Atlas, ছোট N-body ($\lesssim10^6$ কণা; আকাশগঙ্গা DM-only $10^6M_\odot$ ⇒ ~৭০ MB), UI, mock-observation | Phase 0–3 |
| **Cloud/University cluster** | মাঝারি N-body ($10^9$–$10^{10}$), COLA ensemble, zoom DM-only, emulator-প্রশিক্ষণ | Phase 3–6 |
| **National HPC/Exascale** | পূর্ণ hydro zoom, লাইট-কোন-বাক্স, GRMHD ক্যালিব্রেশন, hero-run | Phase 6–10 (অ্যালোকেশন-প্রস্তাব লাগবে) |

### ৮.৩ প্যারালেলিজম ✅ [P05 §৭.১]
MPI (নোড) + OpenMP/threads + GPU (CUDA/HIP/SYCL); domain decomposition: Peano–Hilbert বা Voronoi; load-balance ওজন $w_i=\sum_{\rm particles}(\text{কণা-খরচ})\times(\Delta t_i)^{-1}$, প্রতি ~১০০ step-এ rebalance (`docs/diagrams/mpi-domain-decomposition.txt`); halo exchange + async communication; hierarchical timestep-এ **GPU-কাজের গ্রুপিং** (ক্ষুদ্র active group GPU-অকার্যকর)।
**Checkpoint:** পূর্ণ-অবস্থা + RNG-অবস্থা + code-hash; log-spaced in $a$; `restart` নির্ভরযোগ্য (N15)।

### ৮.৪ ভবিষ্যৎ-পূর্বাভাস ensemble ✅ (অস্পষ্ট "Time Travel/Future" → কংক্রিট)
- **Time travel:** snapshot-সূচক + progenitor/merger-tree অনুসন্ধান; অতীত = সংরক্ষিত snapshot (interpolation লেবেলযুক্ত); ভবিষ্যৎ = ensemble-এ আগানো।
- **ভবিষ্যৎ ensemble:** আকাশগঙ্গা–M31 সংঘর্ষ **নিশ্চিত নয়** — পর্যবেক্ষণ-নির্ভর ensemble-এ প্রায় ৫০% সম্ভাবনা আগামী ~১০ Gyr-এ (২০২৫-এর Nature Astronomy-ফল; পুরনো "নিশ্চিত ~৪–৫ Gyr" দাবি সংশোধিত); ফল **সম্ভাবনা-বণ্টন** হিসেবে, একটি পরিণতি নয়।

---

## ভাগ ৯ — ভ্যালিডেশন ও অনিশ্চয়তা-পরিমাপ (UQ)

### ৯.১ ছয়-ধাপ সিঁড়ি ✅ [P03 §৬]
1. **কোড-নির্ভুলতা:** unit test, ম্যানুফ্যাকচার্ড সলিউশন, ঐতিহাসিক benchmark (Sedov–Taylor, Kelvin–Helmholtz, Zel'dovich pancake, Santa Barbara cluster)।
2. **বিশ্লেষণাত্মক:** Friedmann, linear growth ($D(a)$), Press–Schechter, NFW, ফোটন-ব্যাকগ্রাউন্ড।
3. **কোড-তুলনা:** AGORA, nIFTy, Euclid-code-comparison; GADGET-4 বনাম AREPO বনাম SWIFT।
4. **পর্যবেক্ষণ-ক্যালিব্রেশন:** subgrid-প্যারামিটার ≤ ৫–৬টি পরিমাপে tune।
5. **Hold-out পর্যবেক্ষণ বনাম ভবিষ্যদ্বাণী:** tune-না-করা পরিমাপ (ক্লাস্টার gas-fraction, $z>10$ UV-LF, কেন্দ্রীয় BH-ভর-সম্পর্ক, Lyα-বন) — **ব্যর্থতা-মানদণ্ড আগে লিখিত**।
6. **নতুন ভবিষ্যদ্বাণী:** পরে-আসা ডেটার (Euclid, Rubin LSST, Roman, DESI DR3+, SKA, JWST ডিপ-ফিল্ড) বিরুদ্ধে।

### ৯.২ স্তরভিত্তিক পরীক্ষা (গ্রহণযোগ্যতা-সারণি) ✅ [P05 §১০.২, P15 §১৬–১৭, P10 §১০]

| স্তর | পরীক্ষা | গ্রহণযোগ্যতা |
|---|---|---|
| D1–D3 | halo mass function (Tinker), $P(k)$, 2-pt $\xi(r)$, void-size, $\sigma_8$, bias | ≤ ১–২% ($k<1h$/Mpc); COLA vs full N-body ≤ ২–৫% |
| D3–D4 | Virgo/Coma/Shapley ভর, Local Void, বেগ-ক্ষেত্র, cluster scaling relation | ২–৩σ-এর মধ্যে |
| D5–D6 | Local Group: LMC/SMC-সদৃশ উপস্থিতি, M31–MW বেগ, satellite-সংখ্যা, VPOS | পরিসংখ্যানগত |
| D7 | আকাশগঙ্গা: ভর-ঘনত্ব, rotation curve, বার/সর্পিল, নক্ষত্র-বয়স-metallicity, Gaia (DR3 → **DR4**) বেগ-ক্ষেত্র | |
| ইঞ্জিন | কণা-সংখ্যা, ভর, শক্তি সংরক্ষণ; timestep-convergence; resolution-convergence ($\times$২, ৪, ৮); box-size dependence; seed-variance | |
| Lightcone | ক্যাটালগ ও σ ঠিক; repetition-detector; selection-function-পুনরুৎপাদন | |
| UI | `vitest` (ইউনিট), `playwright` (E2E), a11y, performance-bench | ভাগ ১১ |

### ৯.৩ UQ-কাঠামো ✅ [P05 §১০.৪]
পাঁচ উৎস: পরিসংখ্যানগত (seed), সংখ্যাগত (resolution/solver), মডেল (subgrid), পর্যবেক্ষণ (ডেটার ত্রুটি), cosmological ($H_0$, $\sigma_8$, $\Omega_m$)।
- **Ensemble:** মাঝারি রেজোলিউশনে ১০০০ seed; **mirrored runs** (paired-fixed: প্রাথমিক $\delta$ ও $-\delta$) দিয়ে cosmic-variance হ্রাস; **blinding** (ডেটার ওপর আগে ফল দেখা নিষিদ্ধ)।
- **Resolution-ladder:** একই seed ভিন্ন ভর-রেজোলিউশনে (convergence-order)।
- **Pre-registration:** বৈধতা/প্রত্যাখ্যান-সীমা কোড-কমিটের আগে সংরক্ষিত।
- **"তুচ্ছ মিল" সতর্কতা:** মিল ≠ সত্য — কয়েকটি subgrid-knob দিয়ে অনেক ডেটা ফিট করা যায়।

### ৯.৪ ১০টি পাইপলাইন-চেক (P19) — একত্রিত ✅
(১) ইউনিট-সামঞ্জস্য; (২) coordinate-transform রাউন্ড-ট্রিপ; (৩) $h$-নির্ভরতা পরীক্ষা; (৪) Planck vs SH0ES সেটে একই কোড; (৫) shell-সীমায় ধারাবাহিকতা (density, বেগ, galaxy luminosity-function); (৬) wedge-plot ও আকাশ-মানচিত্রের পরিসংখ্যানগত সঙ্গতি; (৭) repetition detector; (৮) পুনরুৎপাদন (একই seed ⇒ একই hash); (৯) conservation (ভর/শক্তি/ভরবেগ); (১০) provenance-সম্পূর্ণতা (প্রতিটি বস্তুতে `run_id`)।

---

## ভাগ ১০ — সফটওয়্যার-স্থাপত্য ও টেক-স্ট্যাক (মীমাংসিত)

### ১০.১ সার্ভিস-প্রবাহ [P12 §২, `docs/diagrams/extragalactic-architecture-flow.txt`]
**পর্যবেক্ষণ-ডেটা + প্যারামিটার → IC → Engine (snapshots, merger trees, zoom) → লাইট-কোন বিল্ডার → Mock-observation → tile/map/catalog → API (FastAPI) → Explorer UI।** Knowledge DB পাশে: সব পর্যায় `provenance` লেখে।

### ১০.২ টেক-স্ট্যাক — সংঘাত মীমাংসা ✅

| উপাদান | সংঘাত | ✅ সিদ্ধান্ত |
|---|---|---|
| Engine ভাষা | Python (শিক্ষামূলক) বনাম C++/Fortran/CUDA | **C++20 + CUDA/HIP/SYCL + MPI** production; **Python** ওর্কেস্ট্রেশন/বিশ্লেষণ/prototype; Fortran শুধু legacy (RAMSES) |
| সহায়ক লাইব্রেরি | — | HDF5, FFTW/cuFFT, GSL, healpy/HEALPix, astropy, NumPy/SciPy, CVODE |
| API | FastAPI বনাম C++ backend | **FastAPI** (HTTP/WS) → C++ solver-এ নয় — সংরক্ষিত batch/job-কিউ; ভারী কাজ job হিসেবে |
| ডাটাবেস | Graph vs relational vs Parquet | **PostgreSQL** (মেটাডেটা+registry+membership); **Parquet/Arrow** (বড় ক্যাটালগ; DuckDB query); **Zarr/HDF5** (ক্ষেত্র/কণা); graph = ঐচ্ছিক ভবিষ্যৎ |
| Frontend 3D | Three.js বনাম WebGPU বনাম R3F বনাম Qt | ✅ **React + TypeScript + React-Three-Fiber/three.js**, **WebGPU প্রাথমিক, WebGL2 fallback**; Qt-ডেস্কটপ = ঐচ্ছিক Phase ১০-পর wrapper |
| State | — | Zustand (store: `src/state/explorer.ts`) |
| Styling | — | Tailwind + CSS tokens |
| Build/Test | — | Vite, vitest, Playwright |
| Fast prototype | — | `digant-prototype/` (শূন্য-নির্ভরতা HTML/CSS/JS) |
| Container/CI | — | Docker/Apptainer (HPC), GitHub Actions (unit+E2E), ডেটা-ভার্সনিং (DVC বা রিলিজ-ম্যানিফেস্ট) |
| Provenance-লগ | — | JSON-LD বা Parquet ম্যানিফেস্ট; `code_commit`, `ic_hash`, `seed` |
| লাইসেন্স | — | ✅ নিজস্ব কোড: Apache-2.0 বা MIT; GADGET-4/AREPO (GPL) ডিপেন্ডেন্সি আলাদা প্রক্রিয়া/নেটওয়ার্ক-সীমানায় রাখা; ডেটার লাইসেন্স-ফিল্ড বাধ্যতামূলক |

### ১০.৩ একীভূত মনোরেপো ✅ (তিনটি সোর্স-ট্রি `code/docs/repo-trees/` একত্র)

```
cosmos/
├─ docs/                  # ভাগ ১–১৪, ADR, scientific-references
├─ config/                # run-config YAML (example-run-config.yaml), parameter-sets
├─ knowledge/             # COSMOS Knowledge: schema, loaders, ক্যাটালগ-ingest
│  ├─ schema/             # PostgreSQL DDL (১২ টেবিল)
│  ├─ ingest/             # Cosmicflows-4, 2MRS, SDSS, DESI, Gaia (DR3→DR4), Planck
│  └─ provenance/
├─ engine/                # COSMOS Engine
│  ├─ cosmology/          # G0: background, CLASS/CAMB wrapper
│  ├─ ic/                 # G1: MUSIC/BORG adapters, 2LPT
│  ├─ gravity/ hydro/ subgrid/ radiation/ chemistry/   # G2–G5
│  ├─ galaxies/           # G6: halo finder, merger trees, SAM/HOD
│  ├─ lightcone/          # G7: on-the-fly writer, mock-observation
│  ├─ ondemand/           # GRMHD, MESA, SN-RHD, star-formation
│  ├─ uq/                 # G8: ensemble, emulator
│  └─ reference-python/   # = code/engine-reference/python
├─ services/api/          # FastAPI (/v1/…)
├─ explorer/              # = code/universe-explorer (Vite/React/R3F)
├─ prototypes/digant/     # = code/digant-prototype
├─ tests/                 # unit, convergence, validation, e2e
└─ tools/                 # data-fetch, checksum, report generators
```

> মূল তিন ট্রি (P05 §৭: `universe-sim-codebase-tree`; P10: `cosmos-platform-tree`; P15: `cosmos-local-universe-tree`) হুবহু `code/docs/repo-trees/`-তে — উপরেরটি তাদের সংযুক্তি; কোনো ডিরেক্টরি-ধারণা বাদ নেই (রেজিস্টার C-18)।

---

## ভাগ ১১ — Explorer: UI/UX স্পেক (P06, P09, P12–P14, P16–P17 একীভূত)

### ১১.১ নকশা-নীতি (ইউনিয়ন) ✅
1. **স্কেল সর্বদা দৃশ্যমান** — ক্যামেরা-দূরত্ব, redshift, comoving/proper/light-travel দূরত্ব, আলাদা চিহ্নিত।
2. **পর্যবেক্ষণ বনাম মডেল বনাম অজানা** প্রতি পিক্সেলে পৃথক — রং ছাড়াও আকৃতি/টেক্সট/ডটেড-সীমা।
3. **দুটি ফ্রেম:** Observed (light-cone: যা আমরা এখন দেখি) বনাম Comoving-now (মডেল-অনুমিত "এখনকার" বিন্যাস)।
4. **অনিশ্চয়তা দৃশ্যমান:** ± , confidence-ব্যান্ড, সীমানার ধরন (`physical` / `model-dependent` / `flow-defined`)।
5. **কোনো সাজসজ্জা-তারা নয়** — না থাকা ডেটা বানানো হয় না; কৃত্রিম রেন্ডারিং লেবেলযুক্ত "DECORATIVE"।
6. **জুম-সম্পূর্ণতা:** এক স্কেল থেকে আরেকটিতে নিরবচ্ছিন্ন নেভিগেশন (যেমন Laniakea → Local Group → আকাশগঙ্গা); পথে প্রতিটি নোড ঠিকানা-বৃক্ষে (ভাগ ৫.১)।
7. **সীমা লুকানো নয়** — Caveat সিস্টেম (১১.৭)।
8. **ব্যবহারকারী-শ্রেণি:** (ক) কৌতূহলী দর্শক (খ) ছাত্র/শিক্ষক (গ) গবেষক। ডিফল্ট সরল; "Scientific Inspector" পূর্ণ বিবরণ দেয়।

> **ক্ষেত্র-সংঘাত মীমাংসা ✅:** P13 "আকাশগঙ্গা চিরতরে বাদ (ব্যাজসহ)" বনাম P14 "ডিফল্ট ক্যামেরা আকাশগঙ্গায়, হ্যান্ডঅফ"। ⇒ UI-তে **দুই scope**: **Extragalactic scope** (আকাশগঙ্গা = observer marker, ব্যাজ "আকাশগঙ্গা: বাদ") ও **Local Universe scope** (পূর্ণ আকাশগঙ্গা মডিউল)। হোম-ক্যামেরা = পর্যবেক্ষক (আকাশগঙ্গা-অবস্থান)।

### ১১.২ লেআউট ✅ (Explorer টোকেন অনুযায়ী মাপ)
```
┌ Topbar 56px: লোগো · সার্চ · scope (Extragalactic/Local) · ফ্রেম(Observed/Comoving) · মোড(Evolution/Observer) · সেটিংস
├ Navrail 64px │ Left panel 272px (Layers, Filters)  │ Viewport (কেন্দ্র)  │ Info panel 352px (Inspector)
├ Timebar 104px: Redshift/lookback slider · play · প্রধান যুগ-চিহ্ন
└ Statusbar 28px: scale ruler · FPS · রান-ID · provenance-সারাংশ
```
**Navrail (৮টি):** Cosmic Web 3D · Sky Atlas (Mollweide/HEALPix) · Light-cone wedge · Slice · Object Inspector · Time Lab · Observation Comparison · Model Lab।
**COSMOS-এর অতিরিক্ত ভিউ (একই নেভিগেশনে ম্যাপ):** Universe Explorer ⊂ Cosmic Web 3D; Cosmic Timeline ⊂ Time Lab; Local System Explorer ⊂ Local-scope; Physics Inspector ⊂ Object Inspector; Virtual Observatory ⊂ Observation Comparison; Milky Way/Local Group/Supercluster Explorer = Local-scope-এর তিনটি ডোমেইন-ভিউ; Cosmic Web Density Map ⊂ Slice; Scientific Inspector = Info panel।
**Redshift-স্লাইডার নিয়ম** (`docs/ui/redshift-slider-rules.txt`) ও **source-badge** (`docs/ui/source-badges.txt`) বাধ্যতামূলক।

### ১১.৩ ইন্টারঅ্যাকশন
Orbit/pan/zoom (log-স্কেল); fly-to; বস্তু-সার্চ (নাম/কোঅর্ডিনেট); ক্যামেরা-ইতিহাস (back/forward); GPU picking; hover-কার্ড → click-inspector; কিবোর্ড-ম্যাপ `src/hooks/useKeyboard.ts`; `prefers-reduced-motion` সমর্থন (`useReducedMotion.ts`); "Why is this here?" বোতাম প্রতিটি বস্তুতে (উৎস-ব্যাখ্যা); স্কেল-রুলার (`docs/ui/scale-ruler-sketch.txt`); সার্চ-স্কেচ (`docs/ui/search-sketch.txt`)।

### ১১.৪ ডিজাইন-টোকেন — সংঘাত মীমাংসা ✅
দুই প্রোটোটাইপে দুটি টোকেন-সেট (Digant: `--bg #050914, --accent #55dfd3, --warning #ffc77c…`; Explorer: `--bg-base #05070D, --accent-primary #56D4E8…`)। ✅ **Explorer-এর সেট canonical** (production base; সম্পূর্ণ semantic palette + evidence-ম্যাপিং + ডার্ক-মোড), Digant-সেট প্রোটোটাইপ-সীমাবদ্ধ।

| টোকেন | মান |
|---|---|
| surface | base `#05070D` · panel `#0D1320` · panel-2 `#131B2E` · elevated `#1A2238` |
| border | subtle `#1E2942` · strong `#2B3A5C` |
| text | primary `#F2F5FA` · secondary `#A2AEC0` · muted `#6B7894` |
| accent | primary `#56D4E8` (observed/নির্বাচন) · model `#A78BFA` (reconstructed) · uncertainty `#F0B35A` (unknown) · danger `#FF7373` · success `#6EE7A7` · simulated `#7DD3FC` |
| radius | ৪/৮/১২/১৬ px |
| ফন্ট | UI: Inter + Noto Sans Bengali; mono: JetBrains Mono |
| layout | topbar ৫৬ · navrail ৬৪ · panel ২৭২ · info ৩৫২ · timebar ১০৪ · statusbar ২৮ |
| evidence-রং | observed→cyan · reconstructed→violet · simulated→light-sky · unknown→amber |

**নিয়ম:** শুধু রঙে অর্থ বহন নয় (colour-blind); অনিশ্চয়তা = ডটেড/হ্যাচড + আইকন + টেক্সট।

### ১১.৫ রেন্ডারিং ও পারফরম্যান্স ✅ [P09 §৮, P14]
- **WebGPU প্রাথমিক**, WebGL2 fallback; লক্ষ্য ৬০ fps; একসঙ্গে ~৫–১০ M পয়েন্ট।
- **Octree/quadtree LOD** + HEALPix tiles; **camera-relative origin rebasing** (বিশাল স্কেলে float32 ত্রুটি এড়াতে); GPU-ইনস্ট্যান্সিং; web-worker; frustum/occlusion culling।
- সার্ভার-সাইড reduction (heatmap/aggregation); বাইনারি tile (Arrow IPC), JSON নয়।
- ডিফল্ট কণা-বিন্দু + additive blend; জ্যোতির্বিজ্ঞানী-মোডে সম্পূর্ণ পরিসংখ্যানগত ছবি (density/σ)।

### ১১.৬ অবস্থা-পরিচালনা ও রেসপন্সিভ
Loading/empty/error/"তথ্য নেই = অজানা" — আলাদা ভিজ্যুয়াল। **Desktop** পূর্ণ লেআউট; **Tablet** panel কলাপ্স; **Mobile** bottom-sheet + আইকন-নেভ (`_patches/AppShell.mobile.patch.tsx`, `_patches/tailwind.screens.patch.ts`)। Accessibility: ফোকাস-রিং, ARIA-লেবেল, কিবোর্ড-সম্পূর্ণ, কন্ট্রাস্ট ≥ ৪.৫:১, reduced-motion।

### ১১.৭ Caveat সিস্টেম ✅ (অস্পষ্ট "সততা" → কংক্রিট) [P09 §৮.৬, P14]
- প্রতিটি বস্তু-কার্ডে **Source badge** + **Confidence grade (A–E)** + **Boundary-kind** + "Caveats" তালিকা।
- স্থায়ী সংক্ষিপ্ত ব্যানার: "ডেমো ডেটা/মডেল-ভিত্তিক" যখন `MOCK`/`SIM`।
- Caveat কাউন্টার (টপবারে); অতিরঞ্জিত প্রতীক (যেমন Local Group-এর গ্যালাক্সি তারার মতো আঁকা) আইকন-ট্যাগে।
- **অক্ষম নিয়ন্ত্রণ-নীতি:** ডেটা-অনুপলব্ধ কন্ট্রোল disabled + কারণ-টুলটিপ (মিথ্যা প্রতিশ্রুতি নয়)।

### ১১.৮ UI যা করবে না ✅ [P14 §১০]
ডেটা বানাবে না (সাজসজ্জা বাদে লেবেলযুক্ত); একক-গণনাকে "চূড়ান্ত সত্য" বলবে না; অনিশ্চয়তা গোপন করবে না; Hubble-টেনশন একপক্ষে সমাধান দেখাবে না (দুই ensemble পাশাপাশি); আকাশগঙ্গার ভেতরের অংশ extragalactic scope-এ আঁকবে না।

### ১১.৯ প্রোটোটাইপ ও কোড-তালিকা (ভূমিকা নির্ধারণ) ✅
| কোড | ভূমিকা |
|---|---|
| `code/digant-prototype/` | **P0 প্রোটোটাইপ:** শূন্য-নির্ভরতা, ১৬,০০০ কৃত্রিম বস্তু — *কোনো প্রকৃত ক্যাটালগ নয়* (N16); UX-আইডিয়া যাচাই |
| `code/universe-explorer/` | **Production frontend base:** Vite+React+TS+R3F+Zustand+Tailwind; টেস্ট (vitest, Playwright) সহ; mock ডেটা `src/data/mock.ts` → Phase 1-এ বাস্তব API-তে |
| `code/legacy/universe-explorer-singlefile-v1.html` | আর্কাইভ: প্রথম একক-ফাইল সংস্করণ (বিবর্তন-নথি) |
| `code/engine-reference/` | শিক্ষামূলক/স্পেক-ভেরিফিকেশন কোড (production-এর behavioural-spec) |
| `code/config/example-run-config.yaml` | রান-কনফিগ স্কিমার নমুনা |

---

## ভাগ ১২ — রোডম্যাপ (তিনটি সোর্স-রোডম্যাপ একীভূত)

### ১২.১ সংঘাত ও সমাধান
- **COSMOS (P10):** ৮ পর্যায় — Scientific Foundation → Universe Structure → Astrophysics → Planetary → Chemistry/Biology → Observational Universe → Advanced Physics → Complete Platform।
- **Local Universe (P15):** ৮ মাইলস্টোন — Milky Way Catalogue → MW 3D → Local Group → Local Sheet → Virgo → Laniakea → Neighbouring SC → Unified Local Universe।
- **P05/P09:** ইঞ্জিন-ফার্স্ট (IC→N-body→hydro→light-cone→UQ)।
- **সংঘাত:** "ইঞ্জিন আগে" বনাম "মানচিত্র আগে"। ✅ **সমাধান: দুই সমান্তরাল ট্র্যাক** — **K (Atlas/Knowledge)** ও **X (Explorer)** প্রথমে ভারী; **E (Engine)** প্রথমে হালকা (cosmology core, ছোট N-body), পরে ভারী। **V (Validation)** প্রতিটি পর্যায়ে গেট। নীতি N13 অক্ষুণ্ণ: "মানচিত্র → বৈশিষ্ট্য → গতিবিদ্যা → পূর্ণ সিমুলেশন" **প্রতিটি স্কেলে**।

### ১২.২ একীভূত পর্যায়-সারণি ✅

> সময়সীমা = অনুমান: ১–৩ ডেভেলপার + একজন জ্যোতির্পদার্থবিদ-উপদেষ্টা; HPC-পর্ব বরাদ্দ-নির্ভর। ক্যালেন্ডার নয়, **গেট-নির্ভর**।

| পর্যায় | সময় | ট্র্যাক | ডেলিভারি | গেট (শেষ-শর্ত) | সোর্স-ম্যাপ |
|---|---|---|---|---|---|
| **০ ভিত্তি** | ২ মাস | সব | মনোরেপো, CI, `ParameterSet`, PostgreSQL স্কিমা (১২ টেবিল), লাইসেন্স, ADR, Explorer প্রোটোটাইপ চালু, ডেটা-ingest-ফ্রেম | CI সবুজ; `pytest`/`vitest` চলে; স্কিমা মাইগ্রেশন-পরীক্ষিত | নতুন |
| **১ Scientific Foundation + MW** | ৪ মাস | K,E,X | ΛCDM background (astropy/CLASS), কসমিক টাইমলাইন (S7→আজ), সৌর-মডেল; MW ক্যাটালগ (M1) + MW 3D মডেল (M2); Explorer-এ বাস্তব API | $D_L,D_A$ বনাম astropy ≤ $10^{-6}$; MW: Solar-position/rotation-curve মিল (R₀=৮.২৭৭ kpc ডিফল্ট; ৮.১২২/৮.১৭৮ সংবেদনশীলতা) | COSMOS-১; Local M1–M2 |
| **২ Local Atlas** | ৪ মাস | K,X | Local Group (M3), Local Sheet+Council of Giants+Local Void (M4), Virgo+Fornax (M5); McConnachie/Karachentsev ক্যাটালগ ingest | Local Group সদস্য-অবস্থান ও দূরত্ব; Virgo ভর-সংজ্ঞা-ট্যাগ (৫.১ রেজিস্টার C-09) | Local M3–M5 |
| **৩ Laniakea ও প্রতিবেশী Atlas + পর্যবেক্ষণ-ডেটা** | ৪ মাস | K,X | Laniakea flow-model (Cosmicflows-4, Wiener), Hydra–Centaurus, Norma, Pavo–Indus (M6); Perseus–Pisces, Coma, Hercules, Shapley, Apus, Lepus (M7); Planck/Gaia/DESI/Euclid/JWST/LIGO adapter | Laniakea flow-based সীমানা; ডেটা-ইন্টিগ্রিটি (সব পরিমাপে উৎস+অনিশ্চয়তা) | Local M6–M7; COSMOS-৬ |
| **৪ Unified Local Universe = COSMOS 0.1** | ৩ মাস | সব | M8: একত্র ৩D নেভিগেশন, Scientific Inspector, Timeline, ভ্যালিডেশন; **MVP ফিচার-সেট**: ১৩.৮ Gyr টাইমলাইন, ΛCDM, সম্প্রসারণ-গ্রাফ, প্রাথমিক DM গঠন, ছোট N-body, ইন্টারঅ্যাকটিভ ৩D Cosmic Web, ডেটাবেস, সৌরজগৎ-মডেল, Theory & Uncertainty Inspector, পর্যবেক্ষণ-তুলনা | **১০টি গ্রহণযোগ্যতা-পরীক্ষা** (১২.৩) সব পাস; **প্রথম প্রকাশ** | Local M8; COSMOS MVP |
| **৫ Engine Core — Universe Structure** | ৬ মাস | E,V | G1–G2, G6 হ্যালো-ফাইন্ডার, on-the-fly lightcone writer, COLA→TreePM; Local→Cloud | $P(k)$, HMF ≤ ১–২%; COLA vs N-body ≤ ২–৫%; convergence ($\times2,4,8$) | COSMOS-২; P05 |
| **৬ Light-cone ও Mock** | ৬ মাস | E,X,V | S0–S7, HOD/SAM, CMB HEALPix, transient, mock-obs; API tiles | repetition-detector; selection-function-পুনরুৎপাদন | P09 |
| **৭ Astrophysics + Twin Mode** | ৯ মাস | E,V | G3–G5 hydro zoom; subgrid ডিফল্ট; **BORG constrained realization** D2–D6; AURIGA/HESTIA-ধাঁচ তুলনা; নক্ষত্র/SN/BH মডিউল | Virgo/Coma/Great Attractor/Local Void পুনরুৎপাদন (২–৩σ); LG-ensemble: ~৫০% merger বণ্টন | COSMOS-৩; P05 |
| **৮ আকাশগঙ্গা ও on-demand** | ৯ মাস | E,V | D7 star-by-star (hero run) ও D8: GRMHD Sgr A*, MESA, SN-RHD; **Gaia DR4** বেগ-ক্ষেত্র-তুলনা | ভ্যালিডেশন-ধাপ ১–৫ | P05 L7–L8 |
| **৯ Planetary + Chem/Bio** | ৯ মাস | E,K | D9 সৌরজগৎ/exoplanet; D10 রসায়ন, abiogenesis-"hypothesis" মডেল (ensemble-only) | নির্ধারিত benchmark; "hypothesis" ট্যাগ বাধ্যতামূলক | COSMOS-৪–৫ |
| **১০ Advanced Physics + Complete Platform** | ১২ মাস | সব | Numerical relativity, বিকল্প cosmology (WDM, $w_0w_a$, modified gravity), UQ ensemble (~১০³), Model Lab, Public API, Virtual Observatory, Future-prediction | ছয়-ধাপ ভ্যালিডেশন সম্পূর্ণ; pre-registered failure-মানদণ্ড | COSMOS-৭–৮ |
| **সমাপ্তির পর** | — | R&D | Qt-ডেস্কটপ wrapper; graph-DB; quantum/tensor-network সংবেদী মডেল; SYK/matrix toy-gravity | — | P03 §২ |

মোট ~৬৮ মাস (≈ ৫.৭ বছর) অনুমান; পর্যায় ০–৪ (~১৭ মাস) **ব্যক্তিগত কম্পিউটারেই সম্ভব** — প্রথম প্রকাশযোগ্য পণ্য এখানেই।

### ১২.৩ COSMOS 0.1 গ্রহণযোগ্যতা-পরীক্ষা (১০টি) ✅ [P15 §১৭]
| পরীক্ষা | সফলতার শর্ত |
|---|---|
| Milky Way Geometry | প্রধান অংশের সঠিক অবস্থান ও অনুপাত |
| Galactic Rotation | পর্যবেক্ষণ-রোটেশন-কার্ভের সঙ্গে তুলনা |
| Solar Position | বাস্তব গ্যালাক্টিক অবস্থানের সঙ্গে মিল |
| Local Group | সদস্য-অবস্থান ও দূরত্ব |
| Galaxy Cluster | Virgo ও অন্যান্য ক্লাস্টারের কাঠামো |
| Laniakea | Flow-based সীমানা প্রদর্শন |
| Cosmic Web | Filament ও Void-এর ঘনত্ব-ভিত্তিক মডেল |
| Data Integrity | প্রতিটি পরিমাপের উৎস ও অনিশ্চয়তা |
| Navigation | এক স্তর থেকে অন্য স্তরে সঠিক Zoom |
| Reproducibility | একই সেটিংসে একই গণনাগত ফল |

### ১২.৪ সময়-সংবেদনশীল কাজ (আজ থেকে)
- **Gaia DR4:** ESA-র ঘোষণা (মে ২০২৬) অনুযায়ী **২ ডিসেম্বর ২০২৬**; ~২.৮ বিলিয়ন উৎস, ৬৬ মাসের ডেটা, ~১৪০+ টেবিল, ~৫০০ TB। ✅ পরিকল্পনা: পূর্ণ ডাউনলোড নয়; **ESA Archive TAP/ADQL** দিয়ে অঞ্চল-ভিত্তিক কোয়েরি (MW সৌর-প্রতিবেশ ১০০ pc ও ২–৩ প্রতিনিধিত্বমূলক পাশ) — Phase ১ MW ক্যাটালগে DR3→DR4 তুলনা-টেবিল; Phase ৮-এ বেগ-ক্ষেত্রের মূল ভ্যালিডেশন।
- **DESI DR2 / $w_0w_a$** ও **Euclid, Rubin LSST, Roman** ডেটা-রিলিজ-ট্র্যাকার `knowledge/ingest/`-এ আপডেট-নোট (ডেটা-সংস্করণ ফিল্ড বাধ্যতামূলক)।

---

## ভাগ ১৩ — সৎ সীমা: কী হবে, কী হবে না

| প্রশ্ন | উত্তর |
|---|---|
| হুবহু আমাদের মহাবিশ্ব? | ❌ (Tier A) |
| পরিসংখ্যানগতভাবে সঠিক মহাবিশ্ব + আমাদের প্রতিবেশের "যমজ"? | ✅ (Tier B, Twin ≳৫ Mpc) |
| প্রতিটি নক্ষত্র/গ্রহ আমাদের গ্যালাক্সির ঠিক অবস্থানে? | ❌ (ensemble-এ "সদৃশ"); পর্যবেক্ষণ-ক্যাটালগ ✅ (Gaia ইত্যাদি) |
| পুরো মহাবিশ্ব star-by-star? | ❌ (~$10^{23}$ কণা) |
| Planck-স্কেল থেকে বাস্তব? | ❌ (Φ0 placeholder) |
| প্রাণের উৎপত্তি সিমুলেটেড? | ❌ নিশ্চিত নয়; "hypothesis model" |
| ভবিষ্যৎ (যেমন আকাশগঙ্গা–M31) | ✅ সম্ভাবনা-বণ্টন; ~৫০% (নিশ্চিত নয়) |
| UI-তে যা দেখি তা প্রকৃত? | প্রতিটি বস্তুর ব্যাজ বলে (OBS/REC/SIM/MOCK/UNC) |

**ঝুঁকি-রেজিস্টার ✅**
| ঝুঁকি | প্রশমন |
|---|---|
| বড় স্কোপ ⇒ কখনো শেষ হবে না | পর্যায়-গেট; পর্যায় ০–৪ নিজেই পূর্ণ পণ্য; N13 |
| HPC-অ্যালোকেশন না পাওয়া | Local/Cloud-সীমায় বৈজ্ঞানিকভাবে সম্পূর্ণ (ছোট বাক্স, COLA, emulator) |
| ডেটা-লাইসেন্স | প্রতিটি ডেটাসেটে লাইসেন্স-ফিল্ড; ম্যানিফেস্টে উৎস |
| Subgrid-tuning-কে "ভবিষ্যদ্বাণী" বলা | N8, pre-registration |
| ডেমো-ডেটা বৈজ্ঞানিক ফল হিসেবে ছড়ানো | N16; ব্যানার |
| Hubble/$S_8$/KBC বিতর্কে একপক্ষ নেওয়া | দুই ensemble পাশাপাশি; UNC |
| ML-emulator অন্ধ বিশ্বাস | ৭.৯-র error-বাজেট নিয়ম |
| একক বিকাশকারী-নির্ভরতা | ADR, টেস্ট, ডক, ছোট মডিউল |
| তাত্ত্বিক/নৈতিক ভুল-ব্যাখ্যা | ১৪ ভাগ |

---

## ভাগ ১৪ — দর্শন ও নৈতিক পরিশিষ্ট (P18, P03, P02-র সংরক্ষিত বিষয়)

1. **সিমুলেশন-অনুমান:** এই প্রকল্প তা প্রমাণ/অপ্রমাণ করে না। আমাদের সিমুলেশন মহাবিশ্বের "নকল" দাবি করে না; একটি মডেল।
2. **Gödel/অসম্পূর্ণতা:** আমাদের নিজের সিমুলেশন নিয়ে প্রশ্ন — একটি সিস্টেম নিজেকে পূর্ণরূপে সিমুলেট করতে পারে না (Lloyd সীমা); বিতর্ক সক্রিয়, প্ল্যান স্টেটমেন্ট নেয় না।
3. **কেন Tier A নয়, কিন্তু কেন Tier B অর্থপূর্ণ:** পরিসংখ্যানগত অভিন্নতা বৈজ্ঞানিক সংজ্ঞার জন্য যথেষ্ট; ইতিহাসের অনন্যতা নয়।
4. **চেতনা/পর্যবেক্ষক:** কোনো মডেল নেই (Φ8); "observer" = দৃষ্টিকোণ + selection function। চেতনা-সম্পর্কিত দাবি UI/ডকে করা হবে না।
5. **নৈতিকতা:** (ক) মডেলের ভেতরে "প্রাণ"-সদৃশ নিয়মের ক্ষেত্রে কোনো সংবেদনশীলতা-দাবি নয়; (খ) ডেটা-সততা (সৎ অনিশ্চয়তা); (গ) ওপেন-সোর্স, পুনরুৎপাদনযোগ্য; (ঘ) পরিবেশ-ব্যয় (GPU-ঘণ্টা ও শক্তি) প্রতিবেদনে — কম রেজোলিউশন-ensemble ও emulator আগে।
6. **Experimental Universe Mode-এ নৈতিক-জ্ঞানতাত্ত্বিক সতর্কতা:** "$G$ বদলালে কী হবে" ফলাফল *মডেল-ফল*, অন্য মহাবিশ্ব নয়।

---

## ভাগ ১৫ — মালিকের অনুমোদনযোগ্য বাকি সিদ্ধান্ত

কোনোটিই কাজ আটকায় না; ডিফল্ট দেওয়া আছে।
| # | প্রশ্ন | ডিফল্ট |
|---|---|---|
| Q1 | প্রকল্পের নাম | প্ল্যাটফর্ম **COSMOS**, Explorer-এর কোডনেম **দিগন্ত** |
| Q2 | লাইসেন্স | Apache-2.0 (কোড); ডেটা পৃথক |
| Q3 | বিকাশকারী/বিজ্ঞানী-সম্পদ | ১–৩ ডেভ + ১ উপদেষ্টা ধরে সময় |
| Q4 | HPC-অ্যালোকেশনের পথ | পর্যায় ৫-এ ইউনিভার্সিটি/আঞ্চলিক ক্লাস্টার; ৭–৮-এ জাতীয় |
| Q5 | প্রথম প্রকাশ-পরিধি | COSMOS 0.1 (পর্যায় ৪) |
