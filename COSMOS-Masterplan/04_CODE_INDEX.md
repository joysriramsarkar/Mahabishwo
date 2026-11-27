# কোড-ইনডেক্স (`code/`)

প্রতিটি ফাইলের মূল-সোর্স লাইন (`03_SOURCE_ARCHIVE.md`-এর মূল ফাইল-লাইন-নম্বর), ভূমিকা ও নোট। **১০১টি ফাইল।** ফেন্সড ব্লকের কোড বাইট-অভিন্ন (ফেন্স-লাইন বাদে); ফেন্স-ছাড়া ৯টি অংশ লাইন-সীমা মার্কার দিয়ে উদ্ধারকৃত।

## দ্রুত চালানো

**Digant (শূন্য-নির্ভরতা প্রোটোটাইপ):**
```bash
cd code/digant-prototype && python -m http.server 8000   # → http://localhost:8000
```

**Universe Explorer (production base):**
```bash
cd code/universe-explorer
npm install
npm run dev          # Vite dev server
npm run typecheck && npm test
npm run test:e2e     # Playwright (প্রথমে: npx playwright install)
```

> ⚠️ কোডগুলো সোর্স-উত্তরে যেভাবে ছিল হুবহু; আমি এগুলো **এই সেশনে চালিয়ে পরীক্ষা করিনি** (npm install/Playwright সহ)। Phase ০ গেটের প্রথম কাজ: CI-তে বিল্ড ও টেস্ট চালিয়ে ফাটল-তালিকা তৈরি।

## ভূমিকার অর্থ
- **production-frontend-base** — Phase ০–৪-এর ভিত্তি
- **prototype** — ধারণা-যাচাই; কৃত্রিম ডেটা
- **archived-prototype** — ইতিহাস
- **reference-code** — আচরণ-স্পেক/শিক্ষামূলক; production = C++/CUDA/MPI (ভাগ ১০.২)
- **reference** — ডায়াগ্রাম, ট্রি, স্কিমা, UI-স্কেচ

## সম্পূর্ণ তালিকা

| ফাইল (`code/…`) | মূল লাইন | ভূমিকা | নোট |
|---|---|---|---|
| `universe-explorer/_patches/AppShell.mobile.patch.tsx` | 17306–17308 | production-frontend-base |  (86 B) |
| `universe-explorer/_patches/tailwind.screens.patch.ts` | 17295–17302 | production-frontend-base |  (76 B) |
| `universe-explorer/e2e/explorer.spec.ts` | 17251–17261 | production-frontend-base |  (509 B) |
| `universe-explorer/index.html` | 14955–14972 | production-frontend-base |  (739 B) |
| `universe-explorer/package.json` | 14792–14839 | production-frontend-base | Vite+React+TS+R3F+Zustand+Tailwind (1,235 B) |
| `universe-explorer/playwright.config.ts` | 17265–17272 | production-frontend-base |  (232 B) |
| `universe-explorer/postcss.config.js` | 14949–14951 | production-frontend-base |  (67 B) |
| `universe-explorer/src/App.tsx` | 17128–17135 | production-frontend-base |  (199 B) |
| `universe-explorer/src/components/compare/CompareView.tsx` | 17068–17096 | production-frontend-base |  (940 B) |
| `universe-explorer/src/components/layout/AppShell.tsx` | 15802–15849 | production-frontend-base |  (1,705 B) |
| `universe-explorer/src/components/layout/ErrorBoundary.tsx` | 17190–17220 | production-frontend-base |  (997 B) |
| `universe-explorer/src/components/layout/NavRail.tsx` | 15944–15996 | production-frontend-base |  (1,962 B) |
| `universe-explorer/src/components/layout/StatusBar.tsx` | 16000–16025 | production-frontend-base |  (973 B) |
| `universe-explorer/src/components/layout/TopBar.tsx` | 15853–15940 | production-frontend-base |  (3,042 B) |
| `universe-explorer/src/components/panels/InfoPanel.tsx` | 16670–16783 | production-frontend-base |  (5,216 B) |
| `universe-explorer/src/components/panels/LayerPanel.tsx` | 16537–16662 | production-frontend-base |  (4,695 B) |
| `universe-explorer/src/components/panels/SearchPanel.tsx` | 16906–16964 | production-frontend-base |  (2,474 B) |
| `universe-explorer/src/components/panels/TimeController.tsx` | 16791–16898 | production-frontend-base |  (4,083 B) |
| `universe-explorer/src/components/ui/Badge.tsx` | 15632–15659 | production-frontend-base |  (898 B) |
| `universe-explorer/src/components/ui/Slider.tsx` | 15704–15739 | production-frontend-base |  (1,109 B) |
| `universe-explorer/src/components/ui/Switch.tsx` | 15663–15700 | production-frontend-base |  (1,127 B) |
| `universe-explorer/src/components/ui/Tooltip.tsx` | 15743–15765 | production-frontend-base |  (773 B) |
| `universe-explorer/src/components/ui/__tests__/Switch.test.tsx` | 17230–17247 | production-frontend-base |  (561 B) |
| `universe-explorer/src/components/viewport/SceneSetup.tsx` | 16200–16254 | production-frontend-base |  (1,617 B) |
| `universe-explorer/src/components/viewport/Viewport.tsx` | 16033–16049 | production-frontend-base |  (547 B) |
| `universe-explorer/src/components/viewport/Viewport3D.tsx` | 16053–16196 | production-frontend-base |  (5,045 B) |
| `universe-explorer/src/components/viewport/ViewportSky.tsx` | 16972–17029 | production-frontend-base |  (2,250 B) |
| `universe-explorer/src/components/viewport/ViewportSlice.tsx` | 17033–17060 | production-frontend-base |  (919 B) |
| `universe-explorer/src/components/viewport/layers/CMBSphere.tsx` | 16500–16529 | production-frontend-base |  (890 B) |
| `universe-explorer/src/components/viewport/layers/ClusterLayer.tsx` | 16377–16433 | production-frontend-base |  (2,086 B) |
| `universe-explorer/src/components/viewport/layers/FilamentLayer.tsx` | 16437–16475 | production-frontend-base |  (1,328 B) |
| `universe-explorer/src/components/viewport/layers/GalaxyLayer.tsx` | 16258–16373 | production-frontend-base |  (3,238 B) |
| `universe-explorer/src/components/viewport/layers/VoidLayer.tsx` | 16479–16496 | production-frontend-base |  (555 B) |
| `universe-explorer/src/data/layers.ts` | 15211–15231 | production-frontend-base |  (2,691 B) |
| `universe-explorer/src/data/mock.ts` | 15421–15539 | production-frontend-base |  (4,542 B) |
| `universe-explorer/src/data/queries.ts` | 15543–15624 | production-frontend-base |  (2,675 B) |
| `universe-explorer/src/hooks/useKeyboard.ts` | 17143–17164 | production-frontend-base |  (911 B) |
| `universe-explorer/src/hooks/useReducedMotion.ts` | 17168–17182 | production-frontend-base |  (446 B) |
| `universe-explorer/src/lib/format.ts` | 15769–15794 | production-frontend-base |  (859 B) |
| `universe-explorer/src/main.tsx` | 17104–17124 | production-frontend-base |  (523 B) |
| `universe-explorer/src/state/explorer.ts` | 15239–15413 | production-frontend-base |  (4,947 B) |
| `universe-explorer/src/styles/base.css` | 15050–15076 | production-frontend-base |  (741 B) |
| `universe-explorer/src/styles/tokens.css` | 14980–15046 | production-frontend-base |  (1,686 B) |
| `universe-explorer/src/types/api.ts` | 15183–15207 | production-frontend-base |  (591 B) |
| `universe-explorer/src/types/cosmos.ts` | 15084–15179 | production-frontend-base |  (1,965 B) |
| `universe-explorer/tailwind.config.ts` | 14896–14945 | production-frontend-base |  (1,421 B) |
| `universe-explorer/tsconfig.json` | 14873–14892 | production-frontend-base |  (436 B) |
| `universe-explorer/vite.config.ts` | 14843–14869 | production-frontend-base |  (629 B) |
| `digant-prototype/app.js` | 13536–14619 | prototype | 16,000 synthetic demo objects, NOT real catalogue (28,013 B) |
| `digant-prototype/index.html` | 12176–12580 | prototype | canonical zero-dependency UI prototype (16,398 B) |
| `digant-prototype/styles.css` | 12588–13519 | prototype |  (13,944 B) |
| `engine-reference/web/lightcone_view_threejs.js` | 3546–3617 | prototype | Three.js lightcone viewer skeleton (3,878 B) |
| `legacy/universe-explorer-singlefile-v1.html` | 3766–5441 | archived-prototype | প্রথম অনিয়ন্ত্রিত (fence-ছাড়া) সম্পূর্ণ HTML। দ্বিতীয় কপি (L5443-7118) বাইট-অভিন্ন → একটিই রাখা (111,502 B) |
| `engine-reference/c/particle_structs.c` | 1480–1539 | reference-code | DM/gas/star/BH particle structs (2,916 B) |
| `engine-reference/c/soa_particle_arrays.c` | 1565–1572 | reference-code | SoA layout (102 B) |
| `engine-reference/python/01_background_cosmology.py` | 3148–3196 | reference-code | educational; production = C++/CUDA/MPI (1,868 B) |
| `engine-reference/python/02_gaussian_ic_2lpt.py` | 3200–3268 | reference-code | educational; production = C++/CUDA/MPI (2,782 B) |
| `engine-reference/python/03_pm_nbody_cola.py` | 3272–3326 | reference-code | educational; production = C++/CUDA/MPI (2,228 B) |
| `engine-reference/python/04_lightcone_shell_writer.py` | 3332–3371 | reference-code | educational; production = C++/CUDA/MPI (1,969 B) |
| `engine-reference/python/05_hod_photometry.py` | 3375–3424 | reference-code | educational; production = C++/CUDA/MPI (2,330 B) |
| `engine-reference/python/06_cmb_lensing_tsz_healpy.py` | 3430–3466 | reference-code | educational; production = C++/CUDA/MPI (1,865 B) |
| `engine-reference/python/07_transient_sampling.py` | 3470–3487 | reference-code | educational; production = C++/CUDA/MPI (839 B) |
| `engine-reference/python/08_data_service_api_fastapi.py` | 3491–3542 | reference-code | educational; production = C++/CUDA/MPI (2,267 B) |
| `engine-reference/python/10_observer_frame_astropy.py` | 9138–9185 | reference-code | fence-ছাড়া কোড/ডায়াগ্রাম, লাইন-সীমা মার্কার দিয়ে উদ্ধার (1,280 B) |
| `engine-reference/python/11_api_main_fastapi_minimal.py` | 9190–9224 | reference-code | fence-ছাড়া কোড/ডায়াগ্রাম, লাইন-সীমা মার্কার দিয়ে উদ্ধার (940 B) |
| `engine-reference/python/12_simulation_orchestration_pseudocode.py` | 9243–9272 | reference-code | fence-ছাড়া কোড/ডায়াগ্রাম, লাইন-সীমা মার্কার দিয়ে উদ্ধার (1,161 B) |
| `engine-reference/python/lightcone_record_schema.py` | 3099–3125 | reference-code | educational; production = C++/CUDA/MPI (1,221 B) |
| `universe-explorer/src/UniverseViewer.concept.tsx` | 9277–9386 | reference-code | fence-ছাড়া কোড/ডায়াগ্রাম, লাইন-সীমা মার্কার দিয়ে উদ্ধার (3,030 B) |
| `config/example-run-config.yaml` | 9051–9126 | reference | fence-ছাড়া কোড/ডায়াগ্রাম, লাইন-সীমা মার্কার দিয়ে উদ্ধার (1,543 B) |
| `digant-prototype/RUN-URL.txt` | 12164–12166 | reference |  (22 B) |
| `digant-prototype/RUN.sh` | 12158–12160 | reference |  (27 B) |
| `docs/api/production-api-endpoints.txt` | 9228–9238 | reference | fence-ছাড়া কোড/ডায়াগ্রাম, লাইন-সীমা মার্কার দিয়ে উদ্ধার (322 B) |
| `docs/diagrams/cmb-sky-pipeline.txt` | 3004–3014 | reference |  (669 B) |
| `docs/diagrams/extragalactic-architecture-flow.txt` | 8590–8623 | reference | fence-ছাড়া কোড/ডায়াগ্রাম, লাইন-সীমা মার্কার দিয়ে উদ্ধার (1,735 B) |
| `docs/diagrams/impossibility-summary.txt` | 615–628 | reference |  (880 B) |
| `docs/diagrams/math-architecture-box.txt` | 430–448 | reference |  (1,467 B) |
| `docs/diagrams/mock-observation-pipeline.txt` | 1713–1725 | reference |  (371 B) |
| `docs/diagrams/mpi-domain-decomposition.txt` | 1654–1660 | reference |  (195 B) |
| `docs/diagrams/nested-domain-coupling.txt` | 1195–1203 | reference |  (222 B) |
| `docs/diagrams/operator-splitting-order.txt` | 1619–1629 | reference |  (283 B) |
| `docs/diagrams/scene-graph-address-tree.txt` | 2217–2232 | reference |  (1,111 B) |
| `docs/diagrams/spacetime-grid-levels.txt` | 491–500 | reference |  (312 B) |
| `docs/diagrams/ui-perf-architecture-v2.txt` | 10162–10175 | reference |  (941 B) |
| `docs/diagrams/ui-perf-architecture.txt` | 3689–3697 | reference |  (582 B) |
| `docs/repo-trees/cosmos-local-universe-tree.txt` | 11874–11936 | reference |  (1,348 B) |
| `docs/repo-trees/cosmos-platform-tree.txt` | 8030–8092 | reference |  (1,343 B) |
| `docs/repo-trees/digant-files.txt` | 12149–12154 | reference |  (71 B) |
| `docs/repo-trees/lightcone-data-layout.txt` | 3084–3095 | reference |  (464 B) |
| `docs/repo-trees/universe-explorer-tree.txt` | 14717–14784 | reference |  (2,158 B) |
| `docs/repo-trees/universe-sim-codebase-tree.txt` | 1816–1881 | reference |  (2,547 B) |
| `docs/schemas/cosmic-object-registry-schema.json.txt` | 11650–11703 | reference |  (840 B) |
| `docs/schemas/example-lightcone-galaxy-object.json` | 8890–8925 | reference | fence-ছাড়া কোড/ডায়াগ্রাম, লাইন-সীমা মার্কার দিয়ে উদ্ধার (835 B) |
| `docs/ui/layout-digant-desktop.txt` | 12071–12098 | reference |  (3,966 B) |
| `docs/ui/layout-explorer-desktop.txt` | 9429–9450 | reference |  (3,315 B) |
| `docs/ui/layout-extragalactic-ui.txt` | 8940–8957 | reference | fence-ছাড়া কোড/ডায়াগ্রাম, লাইন-সীমা মার্কার দিয়ে উদ্ধার (2,017 B) |
| `docs/ui/layout-lightcone-ui-v2.txt` | 9970–10004 | reference |  (4,160 B) |
| `docs/ui/layout-lightcone-ui.txt` | 3632–3661 | reference |  (3,488 B) |
| `docs/ui/redshift-slider-rules.txt` | 14649–14653 | reference |  (167 B) |
| `docs/ui/scale-ruler-sketch.txt` | 9583–9596 | reference |  (414 B) |
| `docs/ui/search-sketch.txt` | 9631–9636 | reference |  (210 B) |
| `docs/ui/source-badges.txt` | 14691–14696 | reference |  (368 B) |
