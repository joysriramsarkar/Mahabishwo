# Engine (G0–G8)

বাস্তবায়িত রেফারেন্স কোড: `reference-python/` (প্যাকেজ `cosmos_engine`)। সলভার-মনোনয়ন: `SOLVERS.md`।

| সাবডিরেক্টরি | মডিউল | রেফারেন্স বাস্তবায়ন |
|---|---|---|
| `cosmology/` | G0 background | `cosmos_engine.cosmology` + `observer` (astropy) |
| `ic/` | G1 initial conditions | `cosmos_engine.ic` (EH98, 2LPT) |
| `gravity/` | G2 gravity | `cosmos_engine.pm` (PM/KDK) |
| `hydro/`, `radiation/`, `chemistry/` | G3/G5 | উৎপাদন (AREPO/GIZMO/M1) — HPC পর্যায় ৭, খালি রাখা হয়েছে |
| `subgrid/` | G4 | রেসিপি ADR-0003-তে; HOD অংশ `cosmos_engine.hod` |
| `galaxies/` | G6 | `cosmos_engine.hod` |
| `lightcone/` | G7 | `cosmos_engine.lightcone` + `schema` + `cmb` + `transients` |
| `ondemand/`, `planetary/`, `bio-hypo/` | Z8/D9/D10 | পর্যায় ৮–৯; `bio-hypo` শুধু `hypothesis` ট্যাগে |
| `uq/` | G8 | `cosmos_engine.orchestration` (manifest/pre-registration) |
