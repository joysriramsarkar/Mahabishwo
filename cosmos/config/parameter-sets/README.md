# Parameter Sets

ক্যাননিক্যাল বাস্তবায়ন: `cosmos/engine/reference-python/src/cosmos_engine/parameters.py`
(`ParameterSet.named("Planck18" | "SH0ES" | "CCHP" | "DESI_w0wa")`)।

| সেট | H₀ (km/s/Mpc) | ব্যবহার |
|---|---|---|
| `Planck18` (ডিফল্ট) | 67.66 ± 0.42 | সব রানের বেসলাইন |
| `SH0ES` | 73.04 ± 1.04 | দ্বৈত ensemble-এর দ্বিতীয় সদস্য (বাধ্যতামূলক, U15) |
| `CCHP` | ~69.8 | TRGB বিকল্প চেক |
| `DESI_w0wa` | 67.66 (w₀=-0.827, wₐ=-0.75) | ডার্ক-এনার্জি বিকল্প শাখা (U3) — ডিফল্ট নয় |

নিয়ম: স্থানীয় দূরত্বনির্ভর যেকোনো ফলাফল Planck18 **এবং** SH0ES দুই সেটেই রিপোর্ট করতে হবে;
পার্থক্য ~±7% (Explorer Caveat সিস্টেমের H₀-সতর্কতার ভিত্তি)।
