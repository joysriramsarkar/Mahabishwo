# ADR-0001 — ক্যাননিক্যাল নথি, কপি ও মনোরিপো

- অবস্থা: accepted
- তারিখ: 2026-11-27
- রেফ: Q1–Q5, মাস্টারপ্ল্যান ভাগ ০.৩, ১৪.৪, ১৯.১

## প্রসঙ্গ
তিনটি "চূড়ান্ত" মাস্টারপ্ল্যান ও প্রতিটি কোডবেসের দুটি করে কপি ছিল; কোনটি প্রামাণ্য বোঝা যাচ্ছিল না।

## সিদ্ধান্ত
1. ক্যাননিক্যাল নথি: `COSMOS-Masterplan/cosmos_unified_masterplan.md` (v2.0)। `01_MASTERPLAN.md` ও `মাস্টারপ্লান.md` ঐতিহাসিক প্যারেন্ট।
2. একীভূত মনোরিপো `cosmos/` (ভাগ ১৪.৪): Explorer → `cosmos/explorer/`, দিগন্ত → `cosmos/prototypes/dighonto/`, স্কেল-কনসোল → `cosmos/prototypes/cosmos-engine/`, Python রেফারেন্স → `cosmos/engine/reference-python/` (প্যাকেজ `cosmos_engine`)।
3. `COSMOS-Masterplan/code/` = সোর্স-হুবহু সংরক্ষণ, সম্পাদনা নয়। `annex/` = লিগ্যাসি ডুপ্লিকেট।
4. রুটের সৌরজগৎ-অ্যাপ (`src/`) Local Scope-এর L0 মডিউল হিসেবে রুটেই থাকে (নিজস্ব MIT লাইসেন্সসহ); COSMOS-এর নিজস্ব কোড Apache-2.0 (`cosmos/LICENSE`)।
5. নাম: প্ল্যাটফর্ম COSMOS, Explorer কোডনেম দিগন্ত (Dighonto) — Q1.

## পরিণতি
সব নতুন কাজ `cosmos/`-এ। পুরনো পাথের রেফারেন্স পেলে এই ADR দেখাতে হবে।

# ADR-0002 — ParameterSet ও দ্বৈত H₀ ensemble

- অবস্থা: accepted · তারিখ: 2026-11-27 · রেফ: ভাগ ৩.৪, U15

## সিদ্ধান্ত
একটিমাত্র `ParameterSet` অবজেক্ট; ডিফল্ট Planck18। H₀-এর বিকল্প মান হার্ডকোড নয় — নামযুক্ত সেট।
স্থানীয় দূরত্বের ফলাফলে Planck18 (67.7) ও SH0ES (73.0) দুই ensemble-ই বাধ্যতামূলক।

## পরিণতি
Explorer-এ H₀ নব ও ±7% caveat এই সিদ্ধান্ত থেকেই আসে। ভিন্ন সেটে একই কোড চলা pipeline-check 4।

# ADR-0003 — Tier ও সলভার মনোনয়ন

- অবস্থা: accepted · তারিখ: 2026-11-27 · রেফ: ভাগ ১, ৮.১, ১৩.১

## সিদ্ধান্ত
লক্ষ্য Tier B statistical + সীমিত Tier C (Twin ≥5 Mpc)। Tier A নিষিদ্ধ।
প্রতি কাজে একটি প্রাথমিক বিদ্যমান সলভার: G0 = astropy/CLASS, G1 = MUSIC/2LPT (রেফারেন্স), G2 = COLA/FastPM → TreePM (উৎপাদন), G6 = ROCKSTAR + HOD/SAM। নিজস্ব C++ সলভার সচেতনভাবে পিছিয়ে।
বড় বাক্সে full hydro নয় — baryonification + HOD/SAM। Delayed-cooling feedback নিষিদ্ধ। ML emulator: held-out error >1–2% হলে নিষিদ্ধ, `EMU` ট্যাগ বাধ্যতামূলক।

## পরিণতি
রেফারেন্স Python প্যাকেজ আচরণগত স্পেসিফিকেশন মাত্র; উৎপাদন-দাবি করা যাবে না।
