# Deployment ও HPC readiness

এই রিপো container/Apptainer recipes ও fail-closed readiness report দেয়; এই ডেভেলপমেন্ট মেশিনে Docker/Apptainer/Slurm নেই, তাই image build বা HPC run **করা হয়নি**।

## Local API + PostgreSQL
রিপো রুট থেকে:
```powershell
$env:POSTGRES_PASSWORD="..."
docker compose -f cosmos/deploy/docker-compose.yml up --build
```
`postgres` service `001_initial.sql` দিয়ে ১৮-টেবিল schema initialize করে; API `/v1/health`-এ থাকবে।

## Apptainer (HPC)
`cosmos/deploy/` থেকে:
```bash
apptainer build cosmos.sif cosmos.def
apptainer run cosmos.sif
```
`%test` engine import ও pytest চালায়। বাস্তব solver executables এই image-এ নেই —phase 5/7-এ site-provided modules লাগবে।

## Solver/HPC readiness
```powershell
python cosmos/tools/hpc_readiness.py phase5 hpc
```
Exit `0` = সব executable পাওয়া গেছে; exit `2` = অনুপস্থিত। এটি scientific validation pass নয় — R-20 pre-registration, R-21 provenance ও phase gate এখনও বাধ্যতামূলক।

## L0 handoff
Explorer-এর Local Scope-এ lazy iframe আছে। root app চালু করুন (`npm run dev`, port 3000), অথবা `VITE_LOCAL_APP_URL` দিয়ে deployed URL দিন।
