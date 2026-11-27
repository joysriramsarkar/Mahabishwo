# সলভার মনোনয়ন সারণি (ভাগ ৮.১ / ADR-0003)

নীতি N12: নিজে নতুন সলভার লেখার আগে বিদ্যমান বৈজ্ঞানিক কোড যুক্ত করো। প্রতি কাজে **একটি প্রাথমিক** সলভার; বিকল্প শুধু তুলনা/ভ্যালিডেশনের জন্য।

| ধাপ | কাজ | প্রাথমিক (production) | রেফারেন্স/শিক্ষামূলক (এই রিপো) | অবস্থা |
|---|---|---|---|---|
| G0 | Background cosmology | **astropy** (`Planck18`) — 1e-6 গেট এই পথেই | `cosmos_engine.Cosmology` (স্বতন্ত্র numeric, ~1e-3) | ✅ দুটোই টেস্টকৃত |
| G0b | Boltzmann / transfer | **CLASS** (বিকল্প তুলনায় CAMB) | EH98 fit (`ic.transfer_eh98`) | ⚠️ CLASS বাইন্ডিং পর্যায় ৫ |
| G1 | Initial conditions | **MUSIC** / genetIC; Twin-এ BORG | `ic.gaussian_field` + 1LPT/2LPT | ✅ রেফারেন্স টেস্টকৃত |
| G2 | Gravity (বড় বাক্স) | **COLA/FastPM → TreePM (GADGET-4 শ্রেণি)** | `pm.run_pm` (PM + KDK) | ✅ রেফারেন্স; উৎপাদন পর্যায় ৫ |
| G3 | Hydro/MHD | **AREPO/GIZMO** (zoom), RAMSES/Enzo (AMR বিকল্প) | নেই — সচেতনভাবে পিছিয়ে | [!] HPC পর্যায় ৭ |
| G4 | Subgrid | কাস্টম রেসিপি (SF mechanical feedback; delayed-cooling নিষিদ্ধ) | `hod` toy প্যারামিটার | ✅ কাঠামো |
| G5 | Radiation/chemistry | M1 RT + CVODE | নেই | [!] পর্যায় ৭ |
| G6 | Halo/galaxy catalogue | **ROCKSTAR** + ConsistentTrees; HOD/SAM (L-Galaxies শ্রেণি) | `hod.hod_zheng07`, `paint_galaxies` | ✅ রেফারেন্স |
| G7 | Light-cone / mock obs | on-the-fly writer + **FSPS/SKIRT** | `lightcone.LightconeWriter`, Arrow schema | ✅ রেফারেন্স (healpy ঐচ্ছিক) |
| G7b | CMB maps | CLASS C_l + LensPix শ্রেণি | `cmb` (healpy synfast, Born toy) | ✅ healpy থাকলে |
| G8 | UQ / emulator | ensemble + GP/PyTorch (EMU ট্যাগ, held-out >1–2% হলে নিষিদ্ধ) | orchestration manifest | ✅ কাঠামো |

C++20/CUDA উৎপাদন সলভার: সচেতনভাবে পিছিয়ে (পর্যায় ৫+, HPC বরাদ্দ Q4-এর পর)।
