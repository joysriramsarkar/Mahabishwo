/**
 * Cosmic Object Comparison Mode (তুলনা মোড)
 * Side-by-side scientific size, distance, mass & stat comparison across
 * planets, galaxies and superclusters.
 */
import { AppState, ScaleLevel } from '../core/types';
import { CameraController } from '../core/CameraController';
import { SceneManager } from '../core/SceneManager';
import { GALAXIES, STAR_SYSTEMS_CATALOG, SUPERCLUSTERS, PLANET_MOONS } from '../data/cosmicData';
import { toBn } from '../utils/math';
import { focusSoon, rememberFocus, restoreFocus, trapFocus } from '../utils/a11y';

interface ComparableObject {
  id: string;
  nameBn: string;
  nameEn: string;
  groupBn: string;
  color: string;
  /** Physical characteristic diameter: km for planets, kly for galaxies, Mly for superclusters. */
  sizeValue: number;
  sizeUnitBn: string;
  metrics: Array<{ label: string; value: string }>;
  navigate: () => void;
}

const PLANET_DIAMETER_KM: Record<string, number> = {
  mercury: 4879,
  venus: 12104,
  earth: 12742,
  mars: 6779,
  jupiter: 139820,
  saturn: 116460,
  uranus: 50724,
  neptune: 49244,
  proxima_d: 10300,
  proxima_b: 13100,
  t1_e: 11720,
  k_f: 14900,
};

function formatRatio(a: number, b: number, unitA: string, unitB: string): string {
  if (unitA !== unitB || b <= 0) return 'ভিন্ন মহাজাগতিক স্কেল';
  const r = a >= b ? a / b : b / a;
  const label = r >= 100 ? Math.round(r).toLocaleString('en-IN') : r.toFixed(2);
  return a >= b
    ? `প্রথমটি দ্বিতীয়টির ~${toBn(label)}× বড়`
    : `দ্বিতীয়টি প্রথমটির ~${toBn(label)}× বড়`;
}

export class CompareOverlay {
  private el: HTMLElement;
  private state: AppState;
  private cameraCtrl: CameraController;
  private sceneManager: SceneManager;
  private items: ComparableObject[] = [];
  private leftId = 'earth';
  private rightId = 'jupiter';
  private previousFocus: HTMLElement | null = null;

  constructor(state: AppState, cameraCtrl: CameraController, sceneManager: SceneManager) {
    this.state = state;
    this.cameraCtrl = cameraCtrl;
    this.sceneManager = sceneManager;
    this.el = document.getElementById('compare-overlay')!;
    this.buildCatalog();
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });
    this.el.addEventListener('keydown', (e) => trapFocus(this.el, e));
  }

  private buildCatalog(): void {
    const list: ComparableObject[] = [];

    Object.values(STAR_SYSTEMS_CATALOG).forEach((sys) => {
      sys.planets.forEach((p) => {
        const diamKm = PLANET_DIAMETER_KM[p.id];
        if (!diamKm) return;
        const moons = PLANET_MOONS[p.id]?.length ?? 0;
        list.push({
          id: p.id,
          nameBn: p.nameBn,
          nameEn: p.name,
          groupBn: `গ্রহ • ${sys.nameBn}`,
          color: p.color,
          sizeValue: diamKm,
          sizeUnitBn: 'কিমি',
          metrics: [
            { label: 'ব্যাস', value: `${toBn(diamKm.toLocaleString('en-IN'))} কিমি` },
            { label: 'উপগ্রহ', value: moons > 0 ? `${toBn(moons)}টি` : '০ / অজানা' },
            ...p.stats.slice(0, 2),
          ],
          navigate: () => {
            this.close();
            this.sceneManager.flyToPlanet(sys.id, p.id);
          },
        });
      });
    });

    GALAXIES.forEach((g) => {
      list.push({
        id: g.id,
        nameBn: g.nameBn,
        nameEn: g.name,
        groupBn: 'ছায়াপথ',
        color: g.color,
        sizeValue: g.diameterKly,
        sizeUnitBn: 'হাজার আলোকবর্ষ',
        metrics: [
          { label: 'ব্যাস', value: `${toBn(g.diameterKly)},০০০ আলোকবর্ষ` },
          { label: 'নক্ষত্র', value: `${toBn(g.starCountBillions)} বিলিয়ন+` },
          { label: 'বয়স', value: `${toBn(g.ageBillionYears)} বিলিয়ন বছর` },
          { label: 'ব্ল্যাক হোল', value: g.hasBlackHole ? 'উপস্থিত' : 'নেই / অজানা' },
        ],
        navigate: () => {
          this.close();
          this.sceneManager.transitionToScale(ScaleLevel.GALAXY, { galaxyId: g.id });
          this.cameraCtrl.goToScale(ScaleLevel.GALAXY);
        },
      });
    });

    SUPERCLUSTERS.filter((sc) => sc.id !== 'bootes_void').forEach((sc) => {
      list.push({
        id: sc.id,
        nameBn: sc.nameBn,
        nameEn: sc.name,
        groupBn: 'সুপারক্লাস্টার',
        color: sc.color,
        sizeValue: sc.radiusMly * 2,
        sizeUnitBn: 'মিলিয়ন আলোকবর্ষ',
        metrics: [
          { label: 'আনুমানিক ব্যাস', value: `~${toBn(sc.radiusMly * 2)} Mly` },
          { label: 'ছায়াপথ', value: `~${toBn(sc.galaxyCount.toLocaleString('en-IN'))}` },
          { label: 'আনুমানিক ভর', value: `${sc.massSOL} M☉` },
          { label: 'ক্লাস্টার', value: `${toBn(sc.members.length)}টি প্রধান নোড` },
        ],
        navigate: () => {
          this.close();
          this.sceneManager.focusSupercluster(sc.id);
        },
      });
    });

    this.items = list;
  }

  public open(leftId?: string, rightId?: string): void {
    if (leftId) this.leftId = leftId;
    if (rightId) this.rightId = rightId;
    if (!this.state.compareOpen) {
      this.previousFocus = rememberFocus();
      this.state.compareOpen = true;
      this.el.classList.remove('hidden');
      this.el.setAttribute('aria-hidden', 'false');
    }
    this.render();
    focusSoon(this.el.querySelector<HTMLElement>('#btn-close-compare'));
  }

  public close(): void {
    if (!this.state.compareOpen) return;
    this.state.compareOpen = false;
    this.el.classList.add('hidden');
    this.el.setAttribute('aria-hidden', 'true');
    restoreFocus(this.previousFocus);
    this.previousFocus = null;
  }

  public toggle(): void {
    if (this.state.compareOpen) this.close();
    else this.open();
  }

  private renderCard(item: ComparableObject, side: 'left' | 'right'): string {
    return `
      <div class="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="text-[10px] text-slate-400">${item.groupBn}</div>
            <div class="text-xs font-bold text-white truncate">${item.nameBn}</div>
          </div>
          <button type="button" data-go-side="${side}"
            class="px-2 py-1 rounded-lg text-[10px] font-semibold bg-sky-500/20 border border-sky-400/40 text-sky-100 hover:bg-sky-500/35 shrink-0 transition">
            দেখুন ↗
          </button>
        </div>
        <div class="space-y-1">
          ${item.metrics
            .map(
              (m) => `
            <div class="flex justify-between text-[11px] border-b border-white/5 pb-1 last:border-b-0">
              <span class="text-slate-400">${m.label}</span>
              <span class="font-semibold text-white text-right">${m.value}</span>
            </div>`
            )
            .join('')}
        </div>
      </div>
    `;
  }

  private render(): void {
    const a = this.items.find((x) => x.id === this.leftId) || this.items[0];
    const b = this.items.find((x) => x.id === this.rightId) || this.items[4] || this.items[1];

    const sameScale = a.sizeUnitBn === b.sizeUnitBn;
    const maxVal = sameScale ? Math.max(a.sizeValue, b.sizeValue, 1) : 1;
    const rA = sameScale ? Math.max(12, Math.round(52 * (a.sizeValue / maxVal))) : 36;
    const rB = sameScale ? Math.max(12, Math.round(52 * (b.sizeValue / maxVal))) : 36;

    const optionsHtml = (selectedId: string) =>
      this.items
        .map(
          (item) =>
            `<option value="${item.id}" class="bg-slate-900 text-white" ${
              item.id === selectedId ? 'selected' : ''
            }>${item.nameBn} (${item.groupBn})</option>`
        )
        .join('');

    const presets = [
      { label: '🌍 পৃথিবী vs বৃহস্পতি', a: 'earth', b: 'jupiter' },
      { label: '💠 পৃথিবী vs কেপলার-১৮৬f', a: 'earth', b: 'k_f' },
      { label: '🌌 আকাশগঙ্গা vs অ্যান্ড্রোমিডা', a: 'milkyway', b: 'andromeda' },
      { label: '🕸️ ল্যানিয়াকিয়া vs শ্যাপলি', a: 'laniakea', b: 'shapley' },
    ];

    this.el.innerHTML = `
      <div class="glass-panel w-full max-w-2xl rounded-2xl p-5 shadow-2xl border border-sky-400/25 max-h-[90vh] overflow-y-auto custom-scroll">
        <div class="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 id="compare-title" class="text-base font-bold text-white">⚖️ মহাজাগতিক তুলনা মোড</h3>
            <p class="text-[11px] text-slate-400">যেকোনো দুটি গ্রহ, ছায়াপথ বা সুপারক্লাস্টারের সরাসরি তুলনা</p>
          </div>
          <button id="btn-close-compare" type="button" aria-label="তুলনা মোড বন্ধ করুন"
            class="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 text-sm">✕</button>
        </div>

        <div class="mt-3 flex flex-wrap gap-1.5">
          ${presets
            .map(
              (p) => `
            <button type="button" data-cmp-a="${p.a}" data-cmp-b="${p.b}"
              class="cmp-preset-btn px-2.5 py-1 rounded-xl text-[11px] bg-white/5 border border-white/10 text-slate-200 hover:bg-sky-500/20 hover:border-sky-400/40 transition">
              ${p.label}
            </button>`
            )
            .join('')}
        </div>

        <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <select id="cmp-select-a" aria-label="প্রথম বস্তু নির্বাচন করুন"
            class="w-full rounded-xl bg-slate-900/90 border border-white/15 px-3 py-2 text-xs text-white outline-none focus:border-sky-400">
            ${optionsHtml(a.id)}
          </select>
          <select id="cmp-select-b" aria-label="দ্বিতীয় বস্তু নির্বাচন করুন"
            class="w-full rounded-xl bg-slate-900/90 border border-white/15 px-3 py-2 text-xs text-white outline-none focus:border-sky-400">
            ${optionsHtml(b.id)}
          </select>
        </div>

        <!-- Visual scale diagram -->
        <div class="mt-3 rounded-xl border border-white/10 bg-slate-950/60 p-3 flex flex-col items-center">
          <div class="flex items-center justify-around w-full py-2">
            <div class="flex flex-col items-center gap-1.5 min-w-[90px]">
              <div class="flex items-center justify-center h-28">
                <span class="rounded-full inline-block shadow-lg transition-all"
                  style="width:${rA * 2}px; height:${rA * 2}px; background:radial-gradient(circle at 35% 35%, #ffffff, ${a.color}); box-shadow:0 0 18px ${a.color}66;"></span>
              </div>
              <span class="text-[11px] font-semibold text-white">${a.nameBn}</span>
              <span class="text-[10px] text-slate-400">${toBn(a.sizeValue.toLocaleString('en-IN'))} ${a.sizeUnitBn}</span>
            </div>

            <span class="text-xs font-bold text-slate-500">VS</span>

            <div class="flex flex-col items-center gap-1.5 min-w-[90px]">
              <div class="flex items-center justify-center h-28">
                <span class="rounded-full inline-block shadow-lg transition-all"
                  style="width:${rB * 2}px; height:${rB * 2}px; background:radial-gradient(circle at 35% 35%, #ffffff, ${b.color}); box-shadow:0 0 18px ${b.color}66;"></span>
              </div>
              <span class="text-[11px] font-semibold text-white">${b.nameBn}</span>
              <span class="text-[10px] text-slate-400">${toBn(b.sizeValue.toLocaleString('en-IN'))} ${b.sizeUnitBn}</span>
            </div>
          </div>
          <div class="text-[11px] font-semibold text-amber-200 bg-amber-500/10 border border-amber-400/25 rounded-lg px-3 py-1">
            ${formatRatio(a.sizeValue, b.sizeValue, a.sizeUnitBn, b.sizeUnitBn)}
          </div>
        </div>

        <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${this.renderCard(a, 'left')}
          ${this.renderCard(b, 'right')}
        </div>
      </div>
    `;

    this.el.querySelector('#btn-close-compare')?.addEventListener('click', () => this.close());
    this.el.querySelectorAll<HTMLElement>('.cmp-preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.leftId = btn.dataset.cmpA || 'earth';
        this.rightId = btn.dataset.cmpB || 'jupiter';
        this.render();
      });
    });

    const selA = this.el.querySelector('#cmp-select-a') as HTMLSelectElement | null;
    const selB = this.el.querySelector('#cmp-select-b') as HTMLSelectElement | null;
    selA?.addEventListener('change', () => {
      this.leftId = selA.value;
      this.render();
    });
    selB?.addEventListener('change', () => {
      this.rightId = selB.value;
      this.render();
    });
    this.el.querySelector('[data-go-side="left"]')?.addEventListener('click', () => a.navigate());
    this.el.querySelector('[data-go-side="right"]')?.addEventListener('click', () => b.navigate());
  }
}
