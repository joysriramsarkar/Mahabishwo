/**
 * Top HUD Bar Component
 * Branding, multi-scale breadcrumbs, live telemetry (cosmic age, scale, FPS)
 * and top-right professional action toolbar.
 */
import { AppState, ScaleLevel, SCALE_CONFIGS } from '../core/types';
import { CameraController } from '../core/CameraController';
import { SceneManager } from '../core/SceneManager';
import { STAR_SYSTEMS_CATALOG, GALAXIES } from '../data/cosmicData';
import { toBn } from '../utils/math';

export class HUD {
  private container: HTMLElement;
  private state: AppState;
  private cameraCtrl: CameraController;
  private sceneManager: SceneManager;

  constructor(state: AppState, cameraCtrl: CameraController, sceneManager: SceneManager) {
    this.container = document.getElementById('hud-top')!;
    this.state = state;
    this.cameraCtrl = cameraCtrl;
    this.sceneManager = sceneManager;
    this.render();
  }

  public render(): void {
    this.container.innerHTML = `
      <!-- Brand, Scale Badge & Breadcrumbs -->
      <div class="glass-panel pointer-events-auto rounded-2xl px-3.5 py-2.5 max-w-[72vw] sm:max-w-xl">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-blue-500/30 shrink-0">
            ✦
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h1 class="text-sm sm:text-base font-bold tracking-tight text-white leading-tight truncate">
                মহাবিশ্ব সিমুলেশন <span class="text-[11px] font-medium text-sky-300/90 hidden sm:inline">My Universe Studio</span>
              </h1>
              <span id="scale-badge" class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 border border-sky-400/40 text-sky-200">
                পর্যবেক্ষণযোগ্য মহাবিশ্ব
              </span>
            </div>

            <div id="cosmic-breadcrumbs" class="mt-0.5 flex items-center gap-1 text-[11px] text-slate-300 flex-wrap">
              <button type="button" id="crumb-universe" class="hover:text-white text-sky-300 font-medium transition">মহাবিশ্ব</button>
              <span id="sep-1" class="hidden text-slate-500">›</span>
              <button type="button" id="crumb-galaxy" class="hidden hover:text-white text-indigo-200 font-medium transition">আকাশগঙ্গা</button>
              <span id="sep-2" class="hidden text-slate-500">›</span>
              <button type="button" id="crumb-system" class="hidden hover:text-white text-amber-200 font-medium transition"></button>
              <span id="sep-3" class="hidden text-slate-500">›</span>
              <span id="crumb-planet" class="hidden text-emerald-300 font-semibold"></span>
            </div>
          </div>
        </div>

        <!-- Telemetry -->
        <div class="mt-2 pt-1.5 border-t border-white/10 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-300">
          <div class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span>বয়স: <strong id="hud-cosmic-age" class="text-amber-200 font-semibold">১৩.৮</strong> বিলিয়ন বছর</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="inline-block h-[2px] w-5 bg-sky-300/80 relative">
              <span class="absolute left-0 -top-1 w-[1.5px] h-2 bg-sky-300/80"></span>
              <span class="absolute right-0 -top-1 w-[1.5px] h-2 bg-sky-300/80"></span>
            </span>
            <span id="hud-scale-readout" class="text-sky-200 font-medium">~৯৩ বিলিয়ন আলোকবর্ষ</span>
          </div>
          <div class="hidden sm:flex items-center gap-1 text-slate-400 ml-auto">
            <span id="hud-fps" class="font-mono text-[10px]">60 FPS</span>
          </div>
        </div>
      </div>

      <!-- Action Toolbar -->
      <div class="glass-panel pointer-events-auto rounded-2xl p-1.5 flex items-center gap-1 shrink-0" role="toolbar" aria-label="দ্রুত অ্যাকশন">
        <button id="btn-search" type="button" title="অনুসন্ধান (/)" aria-label="মহাবিশ্বে অনুসন্ধান করুন" aria-haspopup="dialog"
          class="hud-btn px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition flex items-center gap-1">
          <span aria-hidden="true">🔍</span><span class="hidden lg:inline">খুঁজুন</span>
        </button>
        <button id="btn-compare" type="button" title="দুটি বস্তু তুলনা করুন (C)" aria-label="তুলনা মোড" aria-haspopup="dialog"
          class="hud-btn hidden sm:flex px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition items-center gap-1">
          <span aria-hidden="true">⚖️</span><span class="hidden lg:inline">তুলনা</span>
        </button>
        <button id="btn-scale-viz" type="button" title="লগারিদমিক স্কেল ভিজুয়ালাইজার (V)" aria-label="স্কেল ভিজুয়ালাইজার" aria-haspopup="dialog"
          class="hud-btn hidden sm:flex px-2 py-1.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition items-center gap-1">
          <span aria-hidden="true">📏</span>
        </button>
        <button id="btn-tour" type="button" title="গাইডেড ট্যুর" aria-label="গাইডেড ট্যুর শুরু করুন"
          class="hud-btn px-2.5 py-1.5 rounded-xl text-xs font-medium text-amber-100 hover:text-white hover:bg-amber-500/20 transition flex items-center gap-1">
          <span aria-hidden="true">🎬</span><span class="hidden lg:inline">ট্যুর</span>
        </button>
        <button id="btn-share" type="button" title="এই ভিউয়ের লিংক শেয়ার করুন" aria-label="এই ভিউয়ের লিংক শেয়ার করুন"
          class="hud-btn px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition flex items-center gap-1">
          <span aria-hidden="true">🔗</span><span class="hidden lg:inline">শেয়ার</span>
        </button>
        <button id="btn-toggle-sound" type="button" title="মহাজাগতিক শব্দ" aria-label="মহাজাগতিক শব্দ চালু বা বন্ধ করুন"
          aria-pressed="${this.state.soundEnabled}"
          class="hud-btn hidden sm:flex px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition items-center gap-1">
          <span id="hud-sound-icon" aria-hidden="true">🔇</span><span class="hidden lg:inline">শব্দ</span>
        </button>
        <button id="btn-toggle-timeline" type="button" title="টাইমলাইন (T)" aria-label="মহাজাগতিক টাইমলাইন" aria-pressed="${this.state.showTimeline}"
          class="hud-btn hidden sm:flex px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition items-center gap-1">
          <span aria-hidden="true">⏳</span><span class="hidden lg:inline">টাইমলাইন</span>
        </button>
        <button id="btn-toggle-minimap" type="button" title="রাডার মিনিম্যাপ" aria-label="রাডার মিনিম্যাপ" aria-pressed="${this.state.showMinimap}"
          class="hud-btn hidden sm:flex px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition">
          <span aria-hidden="true">🧭</span>
        </button>
        <button id="btn-toggle-controls" type="button" title="নিয়ন্ত্রণ প্যানেল" aria-label="নিয়ন্ত্রণ প্যানেল" aria-expanded="${this.state.showControls}"
          class="hud-btn px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 transition flex items-center gap-1">
          <span aria-hidden="true">⚙️</span><span class="hidden md:inline">নিয়ন্ত্রণ</span>
        </button>
        <button id="btn-toggle-info" type="button" title="তথ্য প্যানেল" aria-label="তথ্য প্যানেল" aria-expanded="${this.state.showInfo}"
          class="hud-btn px-2.5 py-1.5 rounded-xl text-xs font-medium bg-sky-500/20 text-sky-100 hover:bg-sky-500/35 border border-sky-400/30 transition flex items-center gap-1">
          <span aria-hidden="true">ℹ️</span><span class="hidden md:inline">তথ্য</span>
        </button>
        <button id="btn-photo-mode" type="button" title="ফটো মোড (F)" aria-label="ফটো মোড" aria-pressed="${this.state.photoMode}" aria-haspopup="true"
          class="hud-btn px-2 py-1.5 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/10 transition">
          <span aria-hidden="true">📷</span>
        </button>
        <button id="btn-help" type="button" title="গাইড ও শর্টকাট (H)" aria-label="গাইড ও শর্টকাট" aria-haspopup="dialog"
          class="hud-btn px-2 py-1.5 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/10 transition">
          <span aria-hidden="true">?</span>
        </button>
        <button id="btn-reset-view" type="button" title="রিসেট ভিউ (R)" aria-label="ক্যামেরা ভিউ রিসেট করুন"
          class="hud-btn hidden sm:block px-2 py-1.5 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-white/10 transition">
          <span aria-hidden="true">↺</span>
        </button>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    document.getElementById('crumb-universe')?.addEventListener('click', () => {
      this.sceneManager.transitionToScale(ScaleLevel.OBSERVABLE_UNIVERSE);
      this.cameraCtrl.goToScale(ScaleLevel.OBSERVABLE_UNIVERSE);
    });

    document.getElementById('crumb-galaxy')?.addEventListener('click', () => {
      const galaxyId = this.state.activeGalaxyId || 'milkyway';
      this.sceneManager.transitionToScale(ScaleLevel.GALAXY, { galaxyId });
      this.cameraCtrl.goToScale(ScaleLevel.GALAXY);
    });

    document.getElementById('crumb-system')?.addEventListener('click', () => {
      const sysId = this.state.activeSystemId || 'solar';
      const sys = STAR_SYSTEMS_CATALOG[sysId];
      this.sceneManager.transitionToScale(ScaleLevel.STAR_SYSTEM, { systemId: sysId });
      this.cameraCtrl.animateTo(
        sys.defaultCamera.theta,
        sys.defaultCamera.phi,
        sys.defaultCamera.radius,
        [0, 0, 0]
      );
    });

    document.getElementById('btn-reset-view')?.addEventListener('click', () => {
      this.cameraCtrl.reset();
    });
  }

  public updateFps(fps: number): void {
    const el = document.getElementById('hud-fps');
    if (el) el.textContent = `${Math.round(fps)} FPS`;
  }

  public update(): void {
    const badge = document.getElementById('scale-badge');
    const readout = document.getElementById('hud-scale-readout');
    const ageEl = document.getElementById('hud-cosmic-age');
    const sep1 = document.getElementById('sep-1');
    const cGal = document.getElementById('crumb-galaxy');
    const sep2 = document.getElementById('sep-2');
    const cSys = document.getElementById('crumb-system');
    const sep3 = document.getElementById('sep-3');
    const cPlan = document.getElementById('crumb-planet');

    const cfg = SCALE_CONFIGS[this.state.currentScale];
    const activeGal =
      !this.state.collisionMode && this.state.currentScale === ScaleLevel.GALAXY
        ? GALAXIES.find((g) => g.id === (this.state.activeGalaxyId || 'milkyway'))
        : undefined;
    if (badge) {
      badge.textContent = this.state.collisionMode
        ? 'গ্যালাক্সি সংঘর্ষ (ONNX AI)'
        : activeGal
          ? activeGal.nameBn
          : cfg.nameBn;
      badge.classList.remove('scale-flash');
      void badge.offsetWidth;
      badge.classList.add('scale-flash');
    }
    if (readout) {
      readout.textContent = this.state.collisionMode
        ? '~২.৫ লক্ষ আলোকবর্ষ • Leapfrog + MLP'
        : activeGal
          ? `~${toBn(activeGal.diameterKly)},০০০ আলোকবর্ষ`
          : cfg.readoutBn;
    }
    if (ageEl) ageEl.textContent = toBn(this.state.cosmicAge.toFixed(1));

    const srStatus = document.getElementById('sr-status');
    if (srStatus) {
      srStatus.textContent = this.state.collisionMode
        ? 'বর্তমান দৃশ্য: আকাশগঙ্গা ও অ্যান্ড্রোমিডা গ্যালাক্সি সংঘর্ষ সিমুলেশন।'
        : `বর্তমান স্কেল: ${cfg.nameBn}। ${cfg.readoutBn}।`;
    }

    const showGal = !this.state.collisionMode && this.state.currentScale >= ScaleLevel.GALAXY;
    const showSys = !this.state.collisionMode && this.state.currentScale >= ScaleLevel.STAR_SYSTEM;
    const showPlan = !this.state.collisionMode && this.state.currentScale >= ScaleLevel.PLANET;

    sep1?.classList.toggle('hidden', !showGal);
    cGal?.classList.toggle('hidden', !showGal);
    if (showGal && cGal) {
      const gal = GALAXIES.find((g) => g.id === (this.state.activeGalaxyId || 'milkyway'));
      cGal.textContent = gal ? gal.nameBn.replace(/\s*ছায়াপথ.*/, '') : 'আকাশগঙ্গা';
    }

    sep2?.classList.toggle('hidden', !showSys);
    cSys?.classList.toggle('hidden', !showSys);
    if (showSys && cSys) {
      const sys = STAR_SYSTEMS_CATALOG[this.state.activeSystemId || 'solar'];
      cSys.textContent = sys?.nameBn || '';
    }

    sep3?.classList.toggle('hidden', !showPlan);
    cPlan?.classList.toggle('hidden', !showPlan);
    if (showPlan && cPlan) {
      const sys = STAR_SYSTEMS_CATALOG[this.state.activeSystemId || 'solar'];
      const p = sys?.planets.find((pl) => pl.id === this.state.activePlanetId);
      cPlan.textContent = p?.nameBn || '';
    }
  }
}
