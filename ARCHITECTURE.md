# Architecture & Monorepo Map — Mahabishwo (`My-Universe`) + COSMOS

এই রিপোজিটরি **একটি একীভূত একক-অরিজিন (single-origin) অ্যাপ্লিকেশন ও সায়েন্টিফিক মনোরিপো**। পূর্বে রুট `src/` (Three.js ইন্টার‌্যাক্টিভ মহাবিশ্ব স্টুডিও) ও `cosmos/explorer/` (COSMOS বৈজ্ঞানিক ড্যাশবোর্ড) দুটি আলাদা পোর্ট ও বিল্ডে চলত; এখন দুটিকে একই ব্রাউজার অরিজিন, একই নেভিগেশন এবং একই রুট কন্ট্রোল-প্লেন থেকে পরিচালনা করা হয়।

---

## ১. একীভূত ইউআরএল ও সার্ভার আর্কিটেকচার

| রুট পাথ | অংশ | টেকনোলজি | পোর্ট (ডেভ / প্রিভিউ / প্রোডাকশন) |
|---|---|---|---|
| `/` | **মহাবিশ্ব ৩ডি স্টুডিও (L0)** — ৯৩ বিলিয়ন আলোকবর্ষ থেকে গ্রহপৃষ্ঠ পর্যন্ত লগারিদমিক জুম + ONNX গ্যালাক্সি সংঘর্ষ | Three.js, WebGL2 HDR, Custom GLSL, ONNX Runtime Web, GSAP | `http://localhost:3000/` (`https://mahabishwo.vercel.app/`) |
| `/cosmos/` | **COSMOS · দিগন্ত (Scientific Explorer)** — Redshift/Comoving, Arrow IPC Light-cone টাইলস, H₀ Ensemble Compare, Statistics | React 18, R3F/Drei, Zustand, TanStack Query, Apache Arrow | `http://localhost:3000/cosmos/` (`https://mahabishwo.vercel.app/cosmos/`) |
| `/v1/*` | **COSMOS FastAPI + DuckDB Engine** — Cone Search, Arrow Light-cone Stream, Pre-registration & Mock Observation | Python 3.11+, FastAPI, DuckDB, PyArrow, PostgreSQL | `http://127.0.0.1:8000` (Vite dev server থেকে `/v1/` প্রক্সি) |

### দুই প্রান্তের সংযোগ কীভাবে কাজ করে
1. **৩ডি স্টুডিও থেকে COSMOS ল্যাবে**: টপ HUD টুলবারের `🔬 COSMOS` বাটনে ক্লিক করলে সরাসরি `/cosmos/` খোলে।
2. **COSMOS থেকে ৩ডি স্টুডিওতে**:
   - TopBar-এর `🌌 ৩ডি স্টুডিও` লিংক দিয়ে সরাসরি `/` এ ফেরা যায়।
   - `Local` স্কোপে গেলে `resolveLocalAppUrl()` (`/cosmos/` মাউন্টে থাকলে `'/'`, আলাদা মোডে `http://localhost:3000`) স্বয়ংক্রিয়ভাবে একই অরিজিন থেকে L0 স্টুডিও এম্বেড বা ওপেন করে।
3. **একক বিল্ড আউটপুট (`dist/`)**:
   `npm run build` প্রথমে রুট L0 স্টুডিও `dist/`-এ বিল্ড করে এবং এরপর `scripts/build-unified.mjs` `VITE_BASE=/cosmos/` দিয়ে `cosmos/explorer` বিল্ড করে `dist/cosmos/`-এ যুক্ত করে—ফলে Vercel ও `npm run preview` কোনো বাড়তি পোর্ট ছাড়াই দুটি অংশ পরিবেশন করে।

---

## ২. ক্যাননিক্যাল বনাম লিগ্যাসি ডিরেক্টরি সীমানা

| ডিরেক্টরি | ভূমিকা | স্ট্যাটাস / নীতি |
|---|---|---|
| `src/` | L0 ৩ডি স্টুডিও (`core/`, `physics/`, `universe/`, `render/`, `ui/`, `data/`) | **সক্রিয় ক্যাননিক্যাল উৎস** |
| `tests/` | রুট Vitest ইউনিট ও প্রোভেন্যান্স টেস্ট স্যুইট | **সক্রিয় টেস্ট স্যুইট** |
| `scripts/` | `train_gravity.py` (ONNX মডেল), `build-unified.mjs`, `dev-unified.mjs` | **সক্রিয় বিল্ড/ML স্ক্রিপ্ট** |
| `cosmos/explorer/` | COSMOS Scientific Explorer (React/R3F) | **সক্রিয় ক্যাননিক্যাল উৎস** (নিজস্ব lockfile সহ R3F/Three `0.162` পিনকৃত) |
| `cosmos/services/api/`, `cosmos/engine/`, `cosmos/datasets/`, `cosmos/scientific-knowledge/` | COSMOS Python ইঞ্জিন, API ও যাচাইকৃত ডেটাবেজ স্কিমা | **সক্রিয় ক্যাননিক্যাল ব্যাকএন্ড** |
| `archive/`, `annex/`, `prototypes/`, `cosmos/prototypes/`, `cosmos/legacy/`, `COSMOS-Masterplan/code/` | ঐতিহাসিক আর্কাইভ ও `coverage_verifier.py`-এর রেফারেন্স স্ন্যাপশট (১০১ ফাইল) | **অপরিবর্তনীয় (Read-only)** — সম্পাদনা নিষিদ্ধ (CI যাচাইকৃত) |

> **নোট — ডিপেনডেন্সি বিচ্ছিন্নতা**: রুট স্টুডিও (`three@0.170`, `vite@6`, `vitest@3`) এবং COSMOS Explorer (`three@0.162`, `@react-three/fiber@8`, `vite@5`, `vitest@1`)-এর R3F পিয়ার-ডিপেনডেন্সি ভিন্ন হওয়ায় রুট `package.json` **অর্কেস্ট্রেশন কন্ট্রোল-প্লেন** হিসেবে কাজ করে এবং জোরপূর্বক হোইস্টিং সংঘাত তৈরি না করে নিজ নিজ লকফাইল বজায় রাখে।

---

## ৩. বৈজ্ঞানিক প্রমাণ ও পারফরম্যান্স নীতি

- **Evidence & Uncertainty Disclosure**: `InfoPanel.ts`-এর প্রতিটি দৃশ্য (মহাবিশ্ব, সুপারক্লাস্টার, গ্যালাক্সি, নক্ষত্রমণ্ডল, গ্রহ, নিউরাল সংঘর্ষ) এখন `OBS` / `REC` / `SIM` ট্যাগ, অনিশ্চয়তা (`±σ` / $H_0$ টেনশন / cosine fidelity), ভিজ্যুয়াল-বনাম-ভৌত স্কেল টীকা ও মূল NASA/ESA/Gaia সূত্র প্রদর্শন করে।
- **Adaptive Performance Guardrail**: দুর্বল হার্ডওয়্যারে (`<=4` কোর / মোবাইল) ডিফল্ট `medium` কোয়ালিটি শুরু হয় এবং সিমুলেশন চলাকালে একটানা `FPS < 24` হলে স্বয়ংক্রিয়ভাবে `quality` (`high → medium → low`), DPR ও পোস্ট-প্রসেসিং কমানো হয়।
