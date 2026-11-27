# HPC বরাদ্দ প্রস্তাব — রূপরেখা (Q4, পর্যায় ৫–৮)

অবস্থা: **[!] বাহ্যিক বরাদ্দ-নির্ভর** — এই নথি প্রস্তাবের কাঠামো; বরাদ্দ ছাড়া পর্যায় ৭–৮-এর কাজ শুরু হবে না, এবং বানানো ফল দেখানো হবে না।

## পথ (Q4 অনুমোদিত)
- পর্যায় ৫–৬: বিশ্ববিদ্যালয়/আঞ্চলিক ক্লাস্টার — মাঝারি N-body (10⁹–10¹⁰ কণা), COLA ensemble, zoom DM-only, emulator প্রশিক্ষণ।
- পর্যায় ৭–৮: জাতীয় এক্সাস্কেল HPC প্রস্তাব — পূর্ণ hydro zoom (AREPO/GIZMO), BORG Twin Mode, Z7 আকাশগঙ্গা hero run (~10⁷–10⁸ GPU-ঘণ্টা), Z8 on-demand (GRMHD/MESA)।

## প্রস্তাবে যা থাকবে
1. বৈজ্ঞানিক লক্ষ্য: Tier B ensemble + Twin Mode (≥5 Mpc), Tier A দাবি নয় (ভাগ ১৩.১)।
2. গণনা-বাজেট: ডোমেইন মেমরি ~500 TB–1 PB (ভাগ ৯.৫); hero run ১টি, বাকি emulator + low-res ensemble।
3. কোড-প্রস্তুতি প্রমাণ: এই রিপোর রেফারেন্স ইঞ্জিন, ভ্যালিডেশন সিঁড়ি ধাপ ১–২, pre-registration (R-20) ও provenance (R-21) ব্যবস্থা।
4. ডেটা-ব্যবস্থাপনা: HDF5/Zarr/Parquet, লাইসেন্স-ম্যানিফেস্ট, DVC।
5. মাইলস্টোন-গেট: P(k)/HMF ≤1–2%, COLA বনাম full N-body ≤2–5%, convergence ×2/4/8 (পর্যায় ৫ গেট)।

## Deployment ও readiness (২৭ নভে. ২০২৬)
- Docker API/PostgreSQL: `cosmos/deploy/docker-compose.yml`
- Apptainer definition + `%test`: `cosmos/deploy/cosmos.def`
- Fail-closed checker: `python cosmos/tools/hpc_readiness.py phase5 hpc`
- এই ডেভেলপমেন্ট মেশিনে Docker/Apptainer/Slurm ও phase-5/7 solver executable নেই; checker `ready: false`, exit 2 দিয়েছে। কোনো HPC run বা scientific pass দাবি করা হচ্ছে না।

## ভবিষ্যৎ ডেটা-রিলিজ (পর্যায় ৮)
Gaia DR4 (২ ডিসে. ২০২৬) — বেগ-ক্ষেত্র তুলনা; পূর্ণ ডাউনলোড নয়, ESA TAP/ADQL অঞ্চল-কোয়েরি।
ট্র্যাকার: `cosmos/datasets/release-tracker.json` ও adapter-scoped `cosmos/datasets/adapters/releases.json`।
