# ADR-0004 — Frame transform, animation ও mobile sheets

- অবস্থা: accepted
- তারিখ: 2026-11-27
- রেফ: মাস্টারপ্ল্যান ভাগ ১৫.১–১৫.৩, checklist C

## প্রসঙ্গ
Observed ⇄ Comoving-now টগল আগে শুধু label বদলাত; desktop grid মোবাইলে অপ্রযোজ্য ছিল; reduced-motion CSS-এ সীমাবদ্ধ।

## সিদ্ধান্ত
1. `CosmicObject.positionMpc` সর্বদা source **comoving heliocentric** coordinate। Render transform source mutate করে না।
2. `comoving` = identity; `proper` = χ/(1+z); `lightcone` = known line-of-sight velocity-এর first-order RSD radial shift `dχ ≈ (1+z)v_los/H(z)`। velocity/redshift না থাকলে identity — কোনো মান বানানো হয় না।
3. Frame বদলালে galaxy/cluster/filament/void ~৯০০ ms-এ interpolate হয়; filter/order বদলালে snap (ভিন্ন index-এর ভুল interpolation নিষিদ্ধ)। `prefers-reduced-motion`-এ instant এবং time autoplay বন্ধ।
4. ৯০০px-এর নিচে একই Viewport instance-সহ mobile shell; panelগুলো Radix bottom-sheet (portal, focus trap/restore, Escape, safe-area, ≥৪৪px targets)। Sheet dismiss selection মুছে না।
5. Search results mobile-এ body portal; combobox/listbox/option semantics।
6. Local Scope-এর L0 handoff lazy iframe (`VITE_LOCAL_APP_URL`, default root dev server port 3000)।
7. Masterplan-এর `--text-muted: #6B7894` panel-এ 4.18:1 contrast দিত; WCAG AA-র ≥4.5:1 শর্তকে অগ্রাধিকার দিয়ে `#8290AA` ব্যবহার করা হয়েছে। axe-core desktop/mobile scan দিয়ে যাচাই।
8. Galaxy point color evidence অনুযায়ী (OBS/REC/SIM/MOCK/UNC), তবে color একমাত্র বহক নয় — ID prefix, inspector badge ও legend-তেও evidence থাকে।

## পরিণতি
Production light-cone-এ পূর্ণ observed-z/peculiar-velocity/shell selection প্রয়োজ্য; বর্তমান transform পরীক্ষিত prototype contract, পূর্ণ radiative transfer নয়।
