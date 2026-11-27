/**
 * Master UI Manager
 * Glues HUD, Controls, InfoPanel, Timeline, Minimap, Search, Help,
 * LabelsLayer, Bottom Navigation Bar, Photo Mode and Keyboard Shortcuts.
 */
import { AppState, ScaleLevel, SCALE_CONFIGS } from '../core/types';
import { CameraController } from '../core/CameraController';
import { SceneManager } from '../core/SceneManager';
import { HUD } from './HUD';
import { ControlsPanel } from './ControlsPanel';
import { InfoPanel } from './InfoPanel';
import { TimelinePanel } from './TimelinePanel';
import { Minimap } from './Minimap';
import { SearchOverlay } from './SearchOverlay';
import { HelpOverlay } from './HelpOverlay';
import { CompareOverlay } from './CompareOverlay';
import { ScaleVisualizer } from './ScaleVisualizer';
import { LabelsLayer } from './LabelsLayer';
import { Toasts } from './Toasts';
import { Tour } from './Tour';
import { STAR_SYSTEMS_CATALOG } from '../data/cosmicData';
import { buildShareUrl, syncDeepLink } from '../core/deepLink';
import { eventBus } from '../core/EventBus';

export class UIManager {
  private state: AppState;
  private sceneManager: SceneManager;
  private cameraCtrl: CameraController;

  public hud: HUD;
  public controlsPanel: ControlsPanel;
  public infoPanel: InfoPanel;
  public timelinePanel: TimelinePanel;
  public minimap: Minimap;
  public searchOverlay: SearchOverlay;
  public helpOverlay: HelpOverlay;
  public compareOverlay: CompareOverlay;
  public scaleVisualizer: ScaleVisualizer;
  public labelsLayer: LabelsLayer;
  public tour: Tour;

  constructor(state: AppState, sceneManager: SceneManager, cameraCtrl: CameraController) {
    this.state = state;
    this.sceneManager = sceneManager;
    this.cameraCtrl = cameraCtrl;

    this.hud = new HUD(state, cameraCtrl, sceneManager);
    this.controlsPanel = new ControlsPanel(state, sceneManager);
    this.infoPanel = new InfoPanel(state, cameraCtrl, sceneManager);
    this.timelinePanel = new TimelinePanel(state);
    this.minimap = new Minimap(state, cameraCtrl);
    this.searchOverlay = new SearchOverlay(state, cameraCtrl, sceneManager);
    this.helpOverlay = new HelpOverlay(state);
    this.compareOverlay = new CompareOverlay(state, cameraCtrl, sceneManager);
    this.scaleVisualizer = new ScaleVisualizer(state, cameraCtrl, sceneManager);
    this.labelsLayer = new LabelsLayer(state, sceneManager, cameraCtrl);
    this.tour = new Tour((preset) => this.applyPreset(preset));

    this.renderBottomNav();
    this.renderZoomControl();
    this.renderPhotoActions();
    this.bindToolbarEvents();
    this.bindKeyboardShortcuts();
    this.labelsLayer.rebuild();
    this.syncPanels();
    this.hud.update();

    eventBus.on('OBJECT_SELECT', (event) => {
      if (event.type !== 'OBJECT_SELECT') return;
      this.labelsLayer.rebuild();
      this.infoPanel.update();
      syncDeepLink(this.state);
    });
  }

  private renderZoomControl(): void {
    const host = document.getElementById('zoom-control');
    if (!host) return;
    host.innerHTML = `
      <div class="glass-panel rounded-2xl px-2 py-3 flex-col items-center gap-2 flex pointer-events-auto">
        <button id="btn-zoom-in" type="button" title="জুম ইন" aria-label="জুম ইন"
          class="w-8 h-8 rounded-xl bg-sky-500/25 border border-sky-400/40 text-white text-base font-bold hover:bg-sky-500/40 transition">+</button>
        <input id="zoom-slider" type="range" min="0" max="600" step="1" value="0" aria-label="ক্রমাগত জুম লেভেল"
          class="zoom-vertical h-36 cursor-pointer" />
        <button id="btn-zoom-out" type="button" title="জুম আউট" aria-label="জুম আউট"
          class="w-8 h-8 rounded-xl bg-white/5 border border-white/15 text-white text-base font-bold hover:bg-white/15 transition">−</button>
        <div id="zoom-readout" aria-live="off" class="text-[9px] font-semibold text-sky-200 text-center leading-tight max-w-[52px]">
          মহাবিশ্ব
        </div>
      </div>
    `;

    const slider = host.querySelector('#zoom-slider') as HTMLInputElement;
    slider?.addEventListener('input', () => {
      const level = (parseFloat(slider.value) / 600) * 6;
      this.cameraCtrl.zoomToLevel(level, 0.35);
    });

    host.querySelector('#btn-zoom-in')?.addEventListener('click', () => {
      this.cameraCtrl.zoomToLevel(Math.min(6, this.state.zoomLevel + 0.7), 0.7);
    });
    host.querySelector('#btn-zoom-out')?.addEventListener('click', () => {
      this.cameraCtrl.zoomToLevel(Math.max(0, this.state.zoomLevel - 0.7), 0.7);
    });
  }

  private renderPhotoActions(): void {
    const host = document.getElementById('photo-actions');
    if (!host) return;
    host.innerHTML = `
      <div class="glass-panel rounded-2xl px-2 py-2 flex items-center gap-1.5 shadow-2xl">
        <button id="photo-screenshot" type="button"
          class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-500/25 border border-sky-400/45 text-sky-50 hover:bg-sky-500/40 transition flex items-center gap-1.5">
          <span aria-hidden="true">📸</span> স্ক্রিনশট <span class="kbd">P</span>
        </button>
        <button id="photo-exit" type="button"
          class="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-slate-200 hover:bg-white/15 transition flex items-center gap-1.5">
          <span aria-hidden="true">✕</span> ফিরে যান <span class="kbd">F</span>
        </button>
      </div>
    `;

    host.querySelector('#photo-screenshot')?.addEventListener('click', () => this.captureScreenshot());
    host.querySelector('#photo-exit')?.addEventListener('click', () => {
      if (this.state.photoMode) this.togglePhotoMode();
    });
  }

  private renderBottomNav(): void {
    const nav = document.getElementById('nav-bar')!;
    const pills = [
      { id: 'god-eye', label: "🌌 God's Eye", cls: 'text-sky-200 hover:bg-sky-500/20 font-semibold', active: true },
      { id: 'cosmic-web', label: '🕸️ কসমিক ওয়েব', cls: 'text-slate-200 hover:bg-white/10' },
      { id: 'local-group', label: '🌀 লোকাল গ্রুপ', cls: 'text-slate-200 hover:bg-white/10' },
      { id: 'collision', label: '💥 গ্যালাক্সি সংঘর্ষ', cls: 'text-fuchsia-200 hover:bg-fuchsia-500/20 font-semibold' },
      { id: 'milky-way', label: '✨ আকাশগঙ্গা', cls: 'text-slate-200 hover:bg-white/10' },
      { id: 'sep', label: '' },
      { id: 'solar', label: '☀️ সৌরজগৎ', cls: 'text-amber-200 hover:bg-amber-500/20 font-semibold' },
      { id: 'earth', label: '🌍 পৃথিবী (HD)', cls: 'text-emerald-200 hover:bg-emerald-500/20 font-semibold' },
      { id: 'earth-gods-eye', label: "👁 গড'স আই ভিউ", cls: 'text-emerald-100 hover:bg-emerald-500/25 font-semibold' },
      { id: 'proxima', label: '🔴 প্রক্সিমা b', cls: 'text-rose-200 hover:bg-rose-500/20' },
      { id: 'trappist', label: '🪐 ট্র্যাপিস্ট-১', cls: 'text-purple-200 hover:bg-purple-500/20' },
      { id: 'kepler186', label: '💠 কেপলার-১৮৬f', cls: 'text-cyan-200 hover:bg-cyan-500/20' },
    ];

    nav.innerHTML = `
      <div class="glass-panel rounded-2xl p-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar shadow-2xl">
        ${pills
          .map((p) =>
            p.id === 'sep'
              ? `<span class="w-px h-5 bg-white/15 mx-0.5 shrink-0"></span>`
              : `<button type="button" data-preset="${p.id}" aria-pressed="${p.active ? 'true' : 'false'}"
                  class="view-pill ${p.active ? 'active' : ''} px-3 py-1.5 rounded-xl border border-transparent text-xs ${p.cls}">
                  ${p.label}
                </button>`
          )
          .join('')}
      </div>
    `;

    nav.querySelectorAll('.view-pill').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const el = e.currentTarget as HTMLElement;
        const preset = el.dataset.preset || 'god-eye';
        this.applyPreset(preset);
      });
    });
  }

  public setActivePill(preset: string): void {
    document.querySelectorAll('#nav-bar .view-pill').forEach((b) => {
      const isActive = (b as HTMLElement).dataset.preset === preset;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', String(isActive));
    });
  }

  public applyPreset(preset: string): void {
    this.state.activePreset = preset;
    this.state.activeSuperclusterId = null;
    this.state.activeMemberClusterId = null;
    this.setActivePill(preset);

    switch (preset) {
      case 'god-eye':
        this.sceneManager.transitionToScale(ScaleLevel.OBSERVABLE_UNIVERSE);
        this.cameraCtrl.goToScale(ScaleLevel.OBSERVABLE_UNIVERSE);
        break;
      case 'cosmic-web':
        this.sceneManager.transitionToScale(ScaleLevel.COSMIC_WEB);
        this.cameraCtrl.goToScale(ScaleLevel.COSMIC_WEB);
        break;
      case 'local-group':
        this.sceneManager.transitionToScale(ScaleLevel.GALAXY_CLUSTER);
        this.cameraCtrl.goToScale(ScaleLevel.GALAXY_CLUSTER);
        break;
      case 'collision':
        this.sceneManager.enterCollisionMode();
        Toasts.show('🧠 ONNX Neural Gravity + Leapfrog সিমুলেশন চালু', 2800);
        break;
      case 'milky-way':
        this.sceneManager.transitionToScale(ScaleLevel.GALAXY, { galaxyId: 'milkyway' });
        this.cameraCtrl.goToScale(ScaleLevel.GALAXY);
        break;
      case 'solar': {
        const sys = STAR_SYSTEMS_CATALOG.solar;
        this.sceneManager.transitionToScale(ScaleLevel.STAR_SYSTEM, { systemId: 'solar' });
        this.cameraCtrl.animateTo(sys.defaultCamera.theta, sys.defaultCamera.phi, sys.defaultCamera.radius, [0, 0, 0]);
        break;
      }
      case 'earth':
        this.sceneManager.flyToPlanet('solar', 'earth');
        break;
      case 'earth-gods-eye':
        this.sceneManager.flyToGodsEye('solar', 'earth');
        Toasts.show("👁 গড'স আই — সম্পূর্ণ আলোকিত পৃথিবী", 2600);
        break;
      case 'proxima':
        this.sceneManager.flyToPlanet('proxima', 'proxima_b');
        break;
      case 'trappist': {
        const sys = STAR_SYSTEMS_CATALOG.trappist;
        this.sceneManager.transitionToScale(ScaleLevel.STAR_SYSTEM, { systemId: 'trappist' });
        this.cameraCtrl.animateTo(sys.defaultCamera.theta, sys.defaultCamera.phi, sys.defaultCamera.radius, [0, 0, 0]);
        break;
      }
      case 'kepler186':
        this.sceneManager.flyToPlanet('kepler186', 'k_f');
        break;
    }

    syncDeepLink(this.state);
    this.infoPanel.update();
    this.labelsLayer.rebuild();
  }

  private setPanelVisibility(panel: 'controls' | 'info' | 'timeline' | 'minimap', open: boolean): void {
    const targets = {
      controls: { host: 'controls-drawer', button: 'btn-toggle-controls', key: 'showControls', expanded: true },
      info: { host: 'info-panel', button: 'btn-toggle-info', key: 'showInfo', expanded: true },
      timeline: { host: 'timeline-panel', button: 'btn-toggle-timeline', key: 'showTimeline', expanded: false },
      minimap: { host: 'minimap-canvas', button: 'btn-toggle-minimap', key: 'showMinimap', expanded: false },
    } as const;

    const target = targets[panel];
    this.state[target.key] = open;
    document.getElementById(target.host)?.classList.toggle('hidden', !open);
    document
      .getElementById(target.button)
      ?.setAttribute(target.expanded ? 'aria-expanded' : 'aria-pressed', String(open));
    if (panel === 'info') {
      document.body.classList.toggle('info-open', open);
    }
  }

  /** Push persisted state into the panel visibility and mode classes. */
  public syncPanels(): void {
    this.setPanelVisibility('controls', this.state.showControls);
    this.setPanelVisibility('info', this.state.showInfo);
    this.setPanelVisibility('timeline', this.state.showTimeline);
    this.setPanelVisibility('minimap', this.state.showMinimap);
    document.getElementById('labels-layer')?.classList.toggle('hidden', !this.state.layers.labels);
    this.applyPhotoModeUi();
  }

  private bindToolbarEvents(): void {
    document.getElementById('btn-search')?.addEventListener('click', () => this.searchOverlay.open());
    document.getElementById('btn-compare')?.addEventListener('click', () => this.compareOverlay.toggle());
    document.getElementById('btn-scale-viz')?.addEventListener('click', () => this.scaleVisualizer.toggle());
    document.getElementById('btn-tour')?.addEventListener('click', () => this.tour.start());
    document.getElementById('btn-share')?.addEventListener('click', () => void this.shareView());

    document.getElementById('btn-toggle-controls')?.addEventListener('click', () => {
      this.setPanelVisibility('controls', !this.state.showControls);
    });

    document.getElementById('btn-toggle-info')?.addEventListener('click', () => {
      this.setPanelVisibility('info', !this.state.showInfo);
    });

    document.getElementById('btn-toggle-timeline')?.addEventListener('click', () => {
      this.setPanelVisibility('timeline', !this.state.showTimeline);
    });

    document.getElementById('btn-toggle-minimap')?.addEventListener('click', () => {
      this.setPanelVisibility('minimap', !this.state.showMinimap);
    });

    document.getElementById('btn-photo-mode')?.addEventListener('click', () => this.togglePhotoMode());
    document.getElementById('btn-help')?.addEventListener('click', () => this.helpOverlay.toggle());
    document.getElementById('btn-reset-view')?.addEventListener('click', () => {
      this.cameraCtrl.reset();
      Toasts.show('↺ ক্যামেরা রিসেট হয়েছে');
    });
  }

  /** Copy/share a deep link to the exact current view. */
  private async shareView(): Promise<void> {
    const url = buildShareUrl(this.state);
    const data = {
      title: 'মহাবিশ্ব সিমুলেশন — My Universe Studio',
      text: 'এই মহাজাগতিক দৃশ্যটি দেখুন',
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      Toasts.show('🔗 ভিউয়ের লিংক কপি হয়েছে');
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(url);
        Toasts.show('🔗 ভিউয়ের লিংক কপি হয়েছে');
      } catch {
        window.prompt('লিংক কপি করুন:', url);
      }
    }
  }

  public captureScreenshot(): void {
    this.sceneManager.engine.captureScreenshot((ok) => {
      Toasts.show(ok ? '📸 স্ক্রিনশট সংরক্ষিত হয়েছে' : '⚠️ স্ক্রিনশট নেওয়া যায়নি');
    });
  }

  private applyPhotoModeUi(): void {
    document.body.classList.toggle('photo-mode', this.state.photoMode);
    document.getElementById('photo-actions')?.classList.toggle('hidden', !this.state.photoMode);
    document.getElementById('btn-photo-mode')?.setAttribute('aria-pressed', String(this.state.photoMode));
  }

  public togglePhotoMode(): void {
    this.state.photoMode = !this.state.photoMode;
    this.applyPhotoModeUi();
    if (this.state.photoMode) {
      Toasts.show('ফটো মোড — P চেপে স্ক্রিনশট নিন, F বা Esc দিয়ে ফিরে আসুন', 3200);
    }
  }

  private bindKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '/') {
        e.preventDefault();
        this.searchOverlay.open();
      } else if (e.key === ' ') {
        // Let a focused button handle Space itself instead of toggling twice.
        if (target && (target.tagName === 'BUTTON' || target.tagName === 'A')) return;
        e.preventDefault();
        this.state.isPlaying = !this.state.isPlaying;
        this.controlsPanel.syncPlayButton();
        Toasts.show(this.state.isPlaying ? '▶ সিমুলেশন চালু' : '⏸ সিমুলেশন বিরতি');
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        this.captureScreenshot();
      } else if (e.key.toLowerCase() === 'f') {
        this.togglePhotoMode();
      } else if (e.key.toLowerCase() === 't') {
        this.setPanelVisibility('timeline', !this.state.showTimeline);
      } else if (e.key.toLowerCase() === 'c') {
        this.compareOverlay.toggle();
      } else if (e.key.toLowerCase() === 'v') {
        this.scaleVisualizer.toggle();
      } else if (e.key.toLowerCase() === 'h' || e.key === '?') {
        this.helpOverlay.toggle();
      } else if (e.key.toLowerCase() === 'r') {
        this.cameraCtrl.reset();
        Toasts.show('↺ ক্যামেরা রিসেট হয়েছে');
      } else if (e.key === 'Escape') {
        if (this.tour.isOpen) return; // Tour owns Escape while it is open.
        if (this.state.searchOpen) this.searchOverlay.close();
        else if (this.state.compareOpen) this.compareOverlay.close();
        else if (this.state.scaleVizOpen) this.scaleVisualizer.close();
        else if (this.state.helpOpen) this.helpOverlay.close();
        else if (this.state.photoMode) this.togglePhotoMode();
        else if (this.state.showControls) this.setPanelVisibility('controls', false);
        else if (this.state.showInfo) this.setPanelVisibility('info', false);
      }
    });
  }

  public onScaleChange(_from: ScaleLevel, to: ScaleLevel): void {
    // A supercluster focus deliberately crosses intermediate scales on its way
    // to the cosmic web; don't drop the selection mid-flight.
    if (to >= ScaleLevel.GALAXY_CLUSTER && !this.cameraCtrl.getIsTransitioning()) {
      this.state.activeSuperclusterId = null;
      this.state.activeMemberClusterId = null;
    }
    this.hud.update();
    this.infoPanel.update();
    this.labelsLayer.rebuild();

    const presetByScale: Partial<Record<ScaleLevel, string>> = {
      [ScaleLevel.OBSERVABLE_UNIVERSE]: 'god-eye',
      [ScaleLevel.COSMIC_WEB]: 'cosmic-web',
      [ScaleLevel.GALAXY_CLUSTER]: 'local-group',
      [ScaleLevel.GALAXY]: 'milky-way',
      [ScaleLevel.STAR_SYSTEM]: this.state.activeSystemId === 'trappist' ? 'trappist' : 'solar',
    };
    if (this.state.collisionMode) {
      this.setActivePill('collision');
    } else if (to === ScaleLevel.PLANET || to === ScaleLevel.SURFACE) {
      if (this.state.godsEye && this.state.activePlanetId === 'earth') {
        this.setActivePill('earth-gods-eye');
      } else if (this.state.activePlanetId === 'earth') this.setActivePill('earth');
      else if (this.state.activePlanetId === 'proxima_b') this.setActivePill('proxima');
      else if (this.state.activePlanetId === 'k_f') this.setActivePill('kepler186');
      else if (this.state.activeSystemId === 'trappist') this.setActivePill('trappist');
      else if (this.state.activeSystemId === 'solar') this.setActivePill('solar');
    } else if (presetByScale[to]) {
      this.setActivePill(presetByScale[to]!);
    }

    syncDeepLink(this.state);
  }

  public update(): void {
    this.minimap.update();
    this.labelsLayer.update();
    this.infoPanel.updateTelemetry();

    // Sync continuous zoom slider & readout
    const cfg = SCALE_CONFIGS[Math.max(0, Math.min(6, Math.round(this.state.zoomLevel)))];
    const slider = document.getElementById('zoom-slider') as HTMLInputElement | null;
    if (slider) {
      if (document.activeElement !== slider) {
        slider.value = String(Math.round((this.state.zoomLevel / 6) * 600));
      }
      slider.setAttribute('aria-valuetext', cfg.shortBn);
    }
    const readout = document.getElementById('zoom-readout');
    if (readout) {
      readout.textContent = cfg.shortBn;
    }
  }
}
