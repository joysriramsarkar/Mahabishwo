/**
 * Right Info Panel — rich scientific telemetry, descriptions,
 * clickable child objects and NASA/ESA references.
 */
import { AppState, ScaleLevel, StatItem, SuperclusterData } from '../core/types';
import { CameraController } from '../core/CameraController';
import { SceneManager } from '../core/SceneManager';
import {
  SUPERCLUSTERS,
  GALAXIES,
  STAR_SYSTEMS_CATALOG,
  PLANET_MOONS,
  MoonData,
  SEMI_MAJOR_AU,
  STAR_MASS_SOLAR,
  AU_KM,
  EARTH_MEAN_SPEED_KMS,
} from '../data/cosmicData';
import { toBn } from '../utils/math';
import { eventBus } from '../core/EventBus';

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
    const activeSupercluster = this.state.activeSuperclusterId
      ? SUPERCLUSTERS.find((sc) => sc.id === this.state.activeSuperclusterId)
      : undefined;
    if (activeSupercluster && this.state.currentScale <= ScaleLevel.COSMIC_WEB) {
      this.renderSuperclusterDetail(activeSupercluster);
      return;
    }

    let title = '';
    let subtitle = '';
    let desc = '';
    let accent = '#38bdf8';
    let stats: StatItem[] = [];
    let listTitle = '';
    let listItems: Array<{ label: string; color: string; onClick: () => void }> = [];
    let godsEye: { host: string; planetId: string; color: string } | null = null;
    let moonList: MoonData[] = [];
    let telemetryPlanet: { systemId: string; planetId: string } | null = null;
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
          onClick: () => this.sceneManager.focusSupercluster(sc.id),
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
          onClick: () => this.sceneManager.focusSupercluster(sc.id),
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
        godsEye = { host: sys.id, planetId: p.id, color: p.color };
        moonList = PLANET_MOONS[p.id] ?? [];
        telemetryPlanet = { systemId: sys.id, planetId: p.id };
        listTitle = `${sys.nameBn}-এর অন্যান্য গ্রহ`;
        listItems = sys.planets.map((pl) => ({
          label: pl.nameBn,
          color: pl.color,
          onClick: () => this.sceneManager.flyToPlanet(sys.id, pl.id),
        }));
        break;
      }
    }

    const godsEyeHtml = godsEye
      ? `
        <button type="button" id="btn-gods-eye"
          class="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold
                 bg-gradient-to-r from-emerald-500/30 to-sky-500/30 border border-emerald-400/40 text-emerald-50
                 hover:from-emerald-500/45 hover:to-sky-500/45 transition">
          <span>👁</span><span>গড'স আই ভিউ — সম্পূর্ণ আলোকিত গ্রহ</span>
        </button>`
      : '';

    const moonsHtml =
      moonList.length > 0
        ? `
        <div class="mt-3 pt-3 border-t border-white/10">
          <div class="text-[11px] font-semibold text-sky-300 mb-2">উপগ্রহসমূহ (${toBn(moonList.length)})</div>
          <div class="space-y-1">
            ${moonList
              .map(
                (m) => `
              <div class="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-200">
                <span class="w-2 h-2 rounded-full shrink-0" style="background:${m.color || '#c8c4bc'}; box-shadow:0 0 6px ${m.color || '#c8c4bc'}"></span>
                <span class="truncate">${m.nameBn} <span class="text-slate-500">(${m.name})</span></span>
                <span class="ml-auto text-[10px] text-slate-400 shrink-0">${
                  m.retrograde ? 'পশ্চাৎগামী • ' : ''
                }${toBn(m.periodDays < 10 ? m.periodDays.toFixed(2) : m.periodDays.toFixed(1))} দিন</span>
              </div>`
              )
              .join('')}
          </div>
        </div>`
        : '';

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
        <button id="btn-close-info" type="button" aria-label="তথ্য প্যানেল বন্ধ করুন" class="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded-lg hover:bg-white/10">✕</button>
      </div>

      <p class="mt-3 text-xs text-slate-300 leading-relaxed">${desc}</p>

      ${godsEyeHtml}

      <div class="mt-3 grid grid-cols-2 gap-1.5">${statsHtml}</div>

      ${
        telemetryPlanet
          ? `<div id="live-telemetry"
              class="mt-3 rounded-xl border border-sky-400/25 bg-sky-500/10 px-2.5 py-2 space-y-1 text-[11px] text-slate-200">
              <div class="text-[10px] font-semibold uppercase tracking-wider text-sky-300 mb-0.5">📡 সরাসরি ভৌত টেলিমেট্রি</div>
              <div id="tele-distance" class="flex justify-between"><span class="text-slate-400">নক্ষত্র থেকে দূরত্ব</span><span class="font-semibold text-white">—</span></div>
              <div id="tele-speed" class="flex justify-between"><span class="text-slate-400">কক্ষীয় গতি (vis-viva)</span><span class="font-semibold text-white">—</span></div>
              <div id="tele-clock" class="flex justify-between"><span class="text-slate-400">সিমুলেশন ঘড়ি</span><span class="font-semibold text-white">—</span></div>
            </div>`
          : ''
      }

      ${moonsHtml}

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
      document.body.classList.remove('info-open');
      document.getElementById('btn-toggle-info')?.setAttribute('aria-expanded', 'false');
    });

    this.container.querySelector('#btn-gods-eye')?.addEventListener('click', () => {
      if (godsEye) {
        this.sceneManager.flyToGodsEye(godsEye.host, godsEye.planetId);
      }
    });

    this.container.querySelectorAll('.info-list-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = Number((e.currentTarget as HTMLElement).dataset.idx);
        listItems[idx]?.onClick();
      });
    });
  }

  // ------------------------------------------------------------------
  // Supercluster / member-cluster deep dive
  // ------------------------------------------------------------------
  private renderSuperclusterDetail(sc: SuperclusterData): void {
    const member = this.state.activeMemberClusterId
      ? sc.members.find((m) => m.id === this.state.activeMemberClusterId)
      : undefined;

    const accent = sc.color;
    const title = member ? member.nameBn : sc.nameBn;
    const subtitle = member
      ? `${member.name} • ${toBn(member.distanceMly)} Mly`
      : `${sc.name} • ~${toBn(sc.radiusMly)} Mly`;
    const desc = member ? member.descriptionBn : sc.descriptionBn;

    const stats: StatItem[] = member
      ? [
          { label: 'দূরত্ব', value: `~${toBn(member.distanceMly)} মিলিয়ন আলোকবর্ষ` },
          { label: 'ছায়াপথ', value: `~${toBn(member.galaxyCount.toLocaleString('en-IN'))}` },
          { label: 'ভর', value: `${member.massSOL} সৌরভর` },
          { label: 'সুপারক্লাস্টার', value: sc.nameBn },
        ]
      : [
          { label: 'ব্যাসার্ধ', value: `~${toBn(sc.radiusMly)} মিলিয়ন আলোকবর্ষ` },
          { label: 'ছায়াপথ', value: `~${toBn(sc.galaxyCount.toLocaleString('en-IN'))}` },
          { label: 'ভর', value: `${sc.massSOL} সৌরভর` },
          { label: 'সদস্য ক্লাস্টার', value: toBn(sc.members.length) },
        ];

    const members = member
      ? sc.members.filter((m) => m.id !== member.id)
      : sc.members;
    const listTitle = member
      ? `${sc.nameBn}-এর অন্য সদস্য ক্লাস্টার`
      : 'সদস্য ক্লাস্টার (ক্লিক করে কাছে যান)';
    const backLabel = member ? `← ${sc.nameBn}` : '← পুরো মহাবিশ্বে ফিরুন';

    const statsHtml = stats
      .map(
        (s) => `
        <div class="bg-white/5 border border-white/10 rounded-xl px-2.5 py-2">
          <div class="text-[10px] text-slate-400">${s.label}</div>
          <div class="text-xs font-semibold text-white mt-0.5">${s.value}</div>
        </div>`
      )
      .join('');

    const membersHtml = members
      .map(
        (m, idx) => `
        <button type="button" data-idx="${idx}"
          class="sc-member-btn w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/5 text-left text-xs text-slate-200 hover:text-white transition">
          <span class="w-2 h-2 rounded-full shrink-0" style="background:${accent}; box-shadow:0 0 8px ${accent}"></span>
          <span class="min-w-0 flex-1 truncate">${m.nameBn}</span>
          <span class="text-[10px] text-slate-400 shrink-0">${toBn(m.distanceMly)} Mly</span>
          <span class="text-slate-500 text-[10px]">›</span>
        </button>`
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
        <button id="btn-close-info" type="button" aria-label="তথ্য প্যানেল বন্ধ করুন" class="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded-lg hover:bg-white/10">✕</button>
      </div>

      <button id="btn-sc-back" type="button"
        class="mt-2.5 w-full py-1.5 rounded-xl text-[11px] font-medium bg-white/5 border border-white/10 text-slate-300 hover:bg-white/15 hover:text-white transition">
        ${backLabel}
      </button>

      <p class="mt-3 text-xs text-slate-300 leading-relaxed">${desc}</p>

      <div class="mt-3 grid grid-cols-2 gap-1.5">${statsHtml}</div>

      ${
        members.length > 0
          ? `<div class="mt-4 pt-3 border-t border-white/10">
              <div class="text-[11px] font-semibold text-sky-300 mb-2">${listTitle}</div>
              <div class="space-y-1.5 max-h-48 overflow-y-auto custom-scroll pr-0.5">${membersHtml}</div>
            </div>`
          : ''
      }

      <div class="mt-4 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
        <span class="text-slate-400">তথ্যসূত্র:</span>
        <a href="${sc.sourceUrl}" target="_blank" rel="noopener noreferrer"
          class="text-sky-300 hover:text-sky-200 underline underline-offset-2 truncate max-w-[180px]">
          ${sc.sourceName} ↗
        </a>
      </div>
    `;

    this.container.querySelector('#btn-close-info')?.addEventListener('click', () => {
      this.state.showInfo = false;
      this.container.classList.add('hidden');
      document.body.classList.remove('info-open');
      document.getElementById('btn-toggle-info')?.setAttribute('aria-expanded', 'false');
    });

    this.container.querySelector('#btn-sc-back')?.addEventListener('click', () => {
      if (member) {
        this.state.activeMemberClusterId = null;
        eventBus.emit({
          type: 'OBJECT_SELECT',
          objectId: sc.id,
          scale: this.state.currentScale,
        });
      } else {
        this.state.activeSuperclusterId = null;
        this.state.activeMemberClusterId = null;
        eventBus.emit({
          type: 'OBJECT_SELECT',
          objectId: '',
          scale: this.state.currentScale,
        });
      }
    });

    this.container.querySelectorAll('.sc-member-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = Number((e.currentTarget as HTMLElement).dataset.idx);
        const target = members[idx];
        if (target) this.sceneManager.focusSuperclusterMember(sc.id, target.id);
      });
    });
  }

  // ------------------------------------------------------------------
  // Live orbital telemetry (vis-viva), refreshed ~6x per second.
  // ------------------------------------------------------------------
  private lastTelemetryAt = 0;

  public updateTelemetry(): void {
    const box = this.container.querySelector('#live-telemetry');
    if (!box) return;
    const now = performance.now();
    if (now - this.lastTelemetryAt < 160) return;
    this.lastTelemetryAt = now;

    const sysId = this.state.activeSystemId || 'solar';
    const planetId = this.state.activePlanetId;
    const item = this.sceneManager.starSystem.planets.find(
      (p) => p.data.id === planetId
    );
    const aAU = SEMI_MAJOR_AU[planetId];
    if (!item || !aAU) return;

    // Scene distance from the host star → AU via the planet's drawn orbit.
    const rScene = item.group.position.length();
    const rAU = (rScene / item.data.orbitRadius) * aAU;
    // vis-viva: v = v⊕ · √(M★ · (2/r − 1/a)) — speeds up at perihelion.
    const mStar = STAR_MASS_SOLAR[sysId] ?? 1;
    const speed = EARTH_MEAN_SPEED_KMS * Math.sqrt(mStar * (2 / rAU - 1 / aAU));

    const croreKm = (rAU * AU_KM) / 1e7;
    const distText =
      croreKm >= 1
        ? `${toBn(croreKm < 100 ? croreKm.toFixed(2) : Math.round(croreKm).toLocaleString('en-IN'))} কোটি কিমি (${toBn(rAU.toFixed(rAU < 1 ? 3 : 2))} AU)`
        : `${toBn(((rAU * AU_KM) / 1e5).toFixed(1))} লক্ষ কিমি (${toBn(rAU.toFixed(3))} AU)`;

    const days = this.state.elapsedSimDays;
    const clockText =
      days < 365.25
        ? `${toBn(Math.round(days))} দিন`
        : `${toBn((days / 365.25).toFixed(1))} বছর`;

    const setRow = (id: string, value: string) => {
      const row = box.querySelector(id) as HTMLElement | null;
      if (row) {
        const span = row.querySelector('span:last-child');
        if (span) span.textContent = value;
      }
    };
    setRow('#tele-distance', distText);
    setRow('#tele-speed', `${toBn(speed.toFixed(2))} কিমি/সে`);
    setRow('#tele-clock', clockText);
  }
}
