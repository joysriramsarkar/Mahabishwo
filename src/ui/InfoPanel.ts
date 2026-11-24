/**
 * Right Info Panel — rich scientific telemetry, descriptions,
 * clickable child objects and NASA/ESA references.
 */
import { AppState, ScaleLevel, StatItem } from '../core/types';
import { CameraController } from '../core/CameraController';
import { SceneManager } from '../core/SceneManager';
import { SUPERCLUSTERS, GALAXIES, STAR_SYSTEMS_CATALOG } from '../data/cosmicData';
import { toBn } from '../utils/math';

export class InfoPanel {
  private container: HTMLElement;
  private state: AppState;
  private cameraCtrl: CameraController;
  private sceneManager: SceneManager;

  constructor(state: AppState, cameraCtrl: CameraController, sceneManager: SceneManager) {
    this.container = document.getElementById('info-panel')!;
    this.state = state;
    this.cameraCtrl = cameraCtrl;
    this.sceneManager = sceneManager;
    this.update();
  }

  public update(): void {
    let title = '';
    let subtitle = '';
    let desc = '';
    let accent = '#38bdf8';
    let stats: StatItem[] = [];
    let listTitle = '';
    let listItems: Array<{ label: string; color: string; onClick: () => void }> = [];
    let sourceName = 'NASA Astrophysics';
    let sourceUrl = 'https://science.nasa.gov/universe/';

    switch (this.state.currentScale) {
      case ScaleLevel.OBSERVABLE_UNIVERSE:
        title = 'পর্যবেক্ষণযোগ্য মহাবিশ্ব';
        subtitle = 'Observable Universe • God’s Eye View';
        desc =
          'প্রায় ৯৩ বিলিয়ন আলোকবর্ষ ব্যাসবিশিষ্ট আমাদের দৃশ্যমান মহাবিশ্ব—যাতে রয়েছে ২ ট্রিলিয়নেরও বেশি ছায়াপথ, কসমিক ওয়েব ফিলামেন্ট এবং বিগ ব্যাং-এর অবশিষ্ট আলো (CMB)।';
        stats = [
          { label: 'ব্যাস', value: '~৯৩ বিলিয়ন আলোকবর্ষ' },
          { label: 'বয়স', value: '১৩.৮ বিলিয়ন বছর' },
          { label: 'ছায়াপথ সংখ্যা', value: '~২ ট্রিলিয়ন+' },
          { label: 'ডার্ক এনার্জি', value: '~৬৮%' },
        ];
        listTitle = 'প্রধান সুপারক্লাস্টার';
        listItems = SUPERCLUSTERS.map((sc) => ({
          label: sc.nameBn,
          color: sc.color,
          onClick: () => {
            this.sceneManager.transitionToScale(ScaleLevel.COSMIC_WEB);
            this.cameraCtrl.animateTo(0.55, 0.96, 170, sc.position);
          },
        }));
        sourceName = 'ESA Planck Mission';
        sourceUrl = 'https://www.esa.int/Science_Exploration/Space_Science/Planck';
        break;

      case ScaleLevel.COSMIC_WEB:
        title = 'কসমিক ওয়েব ও সুপারক্লাস্টার';
        subtitle = 'Large-Scale Structure • ~500 Million Light-Years';
        desc =
          'মহাকর্ষীয় টানে লক্ষ লক্ষ ছায়াপথ মাকড়সার জালের মতো বিশাল ফিলামেন্টে সজ্জিত, যার কেন্দ্রে রয়েছে ল্যানিয়াকিয়া ও শ্যাপলি সুপারক্লাস্টার।';
        stats = [
          { label: 'ল্যানিয়াকিয়া ব্যাস', value: '~৫২ কোটি আলোকবর্ষ' },
          { label: 'সদস্য ছায়াপথ', value: '~১,০০,০০০+' },
          { label: 'মহাশূন্যতা', value: 'বুটিস ভয়েড' },
        ];
        listTitle = 'সুপারক্লাস্টারে ফোকাস করুন';
        listItems = SUPERCLUSTERS.map((sc) => ({
          label: sc.nameBn,
          color: sc.color,
          onClick: () => this.cameraCtrl.animateTo(0.55, 0.96, 150, sc.position),
        }));
        break;

      case ScaleLevel.GALAXY_CLUSTER:
        title = 'লোকাল গ্রুপ ছায়াপথ গোষ্ঠী';
        subtitle = 'The Local Group • ~10 Million Light-Years';
        desc =
          '৮০টিরও বেশি ছায়াপথের মহাকর্ষীয় পরিবার—যার দুটি প্রধান দৈত্য হলো আমাদের আকাশগঙ্গা এবং অ্যান্ড্রোমিডা (M31)।';
        stats = [
          { label: 'মোট ছায়াপথ', value: '৮০+ ছায়াপথ' },
          { label: 'বৃহত্তম সদস্য', value: 'অ্যান্ড্রোমিডা (M31)' },
          { label: 'সংঘর্ষ কাল', value: '~৪.৫ বিলিয়ন বছর পর' },
        ];
        listTitle = 'সদস্য ছায়াপথ';
        listItems = GALAXIES.map((g) => ({
          label: g.nameBn,
          color: g.color,
          onClick: () => {
            if (g.id === 'milkyway') {
              this.sceneManager.transitionToScale(ScaleLevel.GALAXY, { galaxyId: 'milkyway' });
              this.cameraCtrl.goToScale(ScaleLevel.GALAXY);
            } else {
              this.sceneManager.transitionToScale(ScaleLevel.GALAXY_CLUSTER, { galaxyId: g.id });
              this.cameraCtrl.animateTo(0.55, 0.96, 130, g.position);
            }
          },
        }));
        break;

      case ScaleLevel.GALAXY: {
        const mw = GALAXIES.find((g) => g.id === this.state.activeGalaxyId) || GALAXIES[0];
        title = mw.nameBn;
        subtitle = `${mw.name} • ${mw.type === 'barred-spiral' ? 'Barred Spiral' : mw.type === 'spiral' ? 'Spiral Galaxy' : mw.type === 'irregular' ? 'Irregular Galaxy' : 'Dwarf Galaxy'}`;
        desc = mw.descriptionBn;
        accent = mw.color;
        stats = [
          { label: 'ব্যাস', value: `${toBn(mw.diameterKly)},০০০ আলোকবর্ষ` },
          { label: 'নক্ষত্র সংখ্যা', value: `${toBn(mw.starCountBillions)} বিলিয়ন+` },
          { label: 'কেন্দ্রীয় ব্ল্যাক হোল', value: mw.hasBlackHole ? (mw.id === 'milkyway' ? 'স্যাজিটেরিয়াস এ*' : 'আছে') : 'নেই / অজানা' },
          { label: 'বয়স', value: `${toBn(mw.ageBillionYears)} বিলিয়ন বছর` },
        ];
        listTitle = mw.id === 'milkyway' ? 'ছায়াপথের গুরুত্বপূর্ণ স্থান' : 'নেভিগেশন';
        listItems = mw.id === 'milkyway' ? [
          {
            label: 'স্যাজিটেরিয়াস এ* (ব্ল্যাক হোল)',
            color: '#fbbf24',
            onClick: () => this.cameraCtrl.animateTo(0.45, 1.12, 68, [0, 0, 0]),
          },
          {
            label: '☀️ আমাদের সৌরজগৎ (প্রবেশ করুন)',
            color: '#fde047',
            onClick: () => {
              this.sceneManager.transitionToScale(ScaleLevel.STAR_SYSTEM, { systemId: 'solar' });
              this.cameraCtrl.animateTo(0.85, 1.02, 44, [0, 0, 0]);
            },
          },
          {
            label: '🔴 প্রক্সিমা সেন্টরি মণ্ডল',
            color: '#fb7185',
            onClick: () => {
              this.sceneManager.transitionToScale(ScaleLevel.STAR_SYSTEM, { systemId: 'proxima' });
              this.cameraCtrl.animateTo(0.65, 1.0, 40, [0, 0, 0]);
            },
          },
        ] : [
          {
            label: 'ছায়াপথ কেন্দ্রে ফোকাস করুন',
            color: mw.color,
            onClick: () => this.cameraCtrl.animateTo(0.55, 0.96, 68, [0, 0, 0]),
          },
          {
            label: '✨ আকাশগঙ্গা ছায়াপথে যান',
            color: '#93c5fd',
            onClick: () => {
              this.sceneManager.transitionToScale(ScaleLevel.GALAXY, { galaxyId: 'milkyway' });
              this.cameraCtrl.goToScale(ScaleLevel.GALAXY);
            },
          },
          {
            label: '☀️ আমাদের সৌরজগৎ (প্রবেশ করুন)',
            color: '#fde047',
            onClick: () => {
              this.sceneManager.transitionToScale(ScaleLevel.STAR_SYSTEM, { systemId: 'solar' });
              this.cameraCtrl.animateTo(0.85, 1.02, 44, [0, 0, 0]);
            },
          },
        ];
        break;
      }

      case ScaleLevel.STAR_SYSTEM: {
        const sys = STAR_SYSTEMS_CATALOG[this.state.activeSystemId || 'solar'];
        title = sys.nameBn;
        subtitle = sys.subtitleBn;
        desc = sys.descriptionBn;
        accent = sys.star.color;
        stats = sys.stats;
        sourceName = sys.sourceName;
        sourceUrl = sys.sourceUrl;
        listTitle = 'গ্রহসমূহ (ক্লিক করে কাছে যান)';
        listItems = sys.planets.map((p) => ({
          label: p.nameBn,
          color: p.color,
          onClick: () => this.sceneManager.flyToPlanet(sys.id, p.id),
        }));
        break;
      }

      case ScaleLevel.PLANET:
      case ScaleLevel.SURFACE: {
        const sys = STAR_SYSTEMS_CATALOG[this.state.activeSystemId || 'solar'];
        const p = sys?.planets.find((pl) => pl.id === this.state.activePlanetId) || sys.planets[0];
        title = p.nameBn;
        subtitle = p.subtitleBn;
        desc = p.descriptionBn;
        accent = p.color;
        stats = p.stats;
        sourceName = p.sourceName;
        sourceUrl = p.sourceUrl;
        listTitle = `${sys.nameBn}-এর অন্যান্য গ্রহ`;
        listItems = sys.planets.map((pl) => ({
          label: pl.nameBn,
          color: pl.color,
          onClick: () => this.sceneManager.flyToPlanet(sys.id, pl.id),
        }));
        break;
      }
    }

    const statsHtml = stats
      .map(
        (s) => `
        <div class="bg-white/5 border border-white/10 rounded-xl px-2.5 py-2">
          <div class="text-[10px] text-slate-400">${s.label}</div>
          <div class="text-xs font-semibold text-white mt-0.5">${s.value}</div>
        </div>
      `
      )
      .join('');

    const listHtml = listItems
      .map(
        (item, idx) => `
        <button type="button" data-idx="${idx}"
          class="info-list-btn w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/5 text-left text-xs text-slate-200 hover:text-white transition">
          <span class="w-2 h-2 rounded-full shrink-0" style="background:${item.color}; box-shadow:0 0 8px ${item.color}"></span>
          <span class="truncate">${item.label}</span>
          <span class="ml-auto text-slate-500 text-[10px]">›</span>
        </button>
      `
      )
      .join('');

    this.container.innerHTML = `
      <div class="flex items-start justify-between gap-2 pb-2.5 border-b border-white/10">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${accent}; box-shadow:0 0 10px ${accent}"></span>
            <h2 class="text-sm font-bold text-white truncate">${title}</h2>
          </div>
          <p class="text-[11px] text-sky-300/90 mt-0.5 truncate">${subtitle}</p>
        </div>
        <button id="btn-close-info" type="button" class="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded-lg hover:bg-white/10">✕</button>
      </div>

      <p class="mt-3 text-xs text-slate-300 leading-relaxed">${desc}</p>

      <div class="mt-3 grid grid-cols-2 gap-1.5">${statsHtml}</div>

      ${
        listItems.length > 0
          ? `
        <div class="mt-4 pt-3 border-t border-white/10">
          <div class="text-[11px] font-semibold text-sky-300 mb-2">${listTitle}</div>
          <div class="space-y-1.5 max-h-48 overflow-y-auto custom-scroll pr-0.5">${listHtml}</div>
        </div>
      `
          : ''
      }

      <div class="mt-4 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
        <span class="text-slate-400">তথ্যসূত্র:</span>
        <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer"
          class="text-sky-300 hover:text-sky-200 underline underline-offset-2 truncate max-w-[180px]">
          ${sourceName} ↗
        </a>
      </div>
    `;

    this.container.querySelector('#btn-close-info')?.addEventListener('click', () => {
      this.state.showInfo = false;
      this.container.classList.add('hidden');
    });

    this.container.querySelectorAll('.info-list-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = Number((e.currentTarget as HTMLElement).dataset.idx);
        listItems[idx]?.onClick();
      });
    });
  }
}
