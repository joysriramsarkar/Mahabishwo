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
import { LabelsLayer } from './LabelsLayer';
import { Toasts } from './Toasts';
import { STAR_SYSTEMS_CATALOG } from '../data/cosmicData';

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
  public labelsLayer: LabelsLayer;

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
    this.labelsLayer = new LabelsLayer(state, sceneManager, cameraCtrl);

    this.renderBottomNav();
    this.renderZoomControl();
    this.bindToolbarEvents();
    this.bindKeyboardShortcuts();
    this.labelsLayer.rebuild();
  }

  private renderZoomControl(): void {
    const host = document.getElementById('zoom-control');
    if (!host) return;
    host.innerHTML = `
      <div class="glass-panel rounded-2xl px-2 py-3 flex-col items-center gap-2 flex pointer-events-auto">
        <button id="btn-zoom-in" type="button" title="জুম ইন"
          class="w-8 h-8 rounded-xl bg-sky-500/25 border border-sky-400/40 text-white text-base font-bold hover:bg-sky-500/40 transition">+</button>
        <input id="zoom-slider" type="range" min="0" max="600" step="1" value="0"
          class="zoom-vertical h-36 cursor-pointer" />
        <button id="btn-zoom-out" type="button" title="জুম আউট"
          class="w-8 h-8 rounded-xl bg-white/5 border border-white/15 text-white text-base font-bold hover:bg-white/15 transition">−</button>
        <div id="zoom-readout" class="text-[9px] font-semibold text-sky-200 text-center leading-tight max-w-[52px]">
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

  private renderBottomNav(): void {
    const nav = document.getElementById('nav-bar')!;
    const pills = [
      { id: 'god-eye', label: "🌌 God's Eye", cls: 'text-sky-200 hover:bg-sky-500/20 font-semibold', active: true },
      { id: 'cosmic-web', label: '🕸️ কসমিক ওয়েব', cls: 'text-slate-200 hover:bg-white/10' },
      { id: 'local-group', label: '🌀 লোকাল গ্রুপ', cls: 'text-slate-200 hover:bg-white/10' },
      { id: 'milky-way', label: '✨ আকাশগঙ্গা', cls: 'text-slate-200 hover:bg-white/10' },
      { id: 'sep', label: '' },
      { id: 'solar', label: '☀️ সৌরজগৎ', cls: 'text-amber-200 hover:bg-amber-500/20 font-semibold' },
      { id: 'earth', label: '🌍 পৃথিবী (HD)', cls: 'text-emerald-200 hover:bg-emerald-500/20 font-semibold' },
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
              : `<button type="button" data-preset="${p.id}"
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
      b.classList.toggle('active', (b as HTMLElement).dataset.preset === preset);
    });
  }

  public applyPreset(preset: string): void {
    this.state.activePreset = preset;
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
  }

  private bindToolbarEvents(): void {
    document.getElementById('btn-search')?.addEventListener('click', () => this.searchOverlay.open());

    document.getElementById('btn-toggle-controls')?.addEventListener('click', () => {
      this.state.showControls = !this.state.showControls;
      document.getElementById('controls-drawer')?.classList.toggle('hidden', !this.state.showControls);
    });

    document.getElementById('btn-toggle-info')?.addEventListener('click', () => {
      this.state.showInfo = !this.state.showInfo;
      document.getElementById('info-panel')?.classList.toggle('hidden', !this.state.showInfo);
    });

    document.getElementById('btn-toggle-timeline')?.addEventListener('click', () => {
      this.state.showTimeline = !this.state.showTimeline;
      document.getElementById('timeline-panel')?.classList.toggle('hidden', !this.state.showTimeline);
    });

    document.getElementById('btn-toggle-minimap')?.addEventListener('click', () => {
      this.state.showMinimap = !this.state.showMinimap;
      document.getElementById('minimap-canvas')?.classList.toggle('hidden', !this.state.showMinimap);
    });

    document.getElementById('btn-photo-mode')?.addEventListener('click', () => this.togglePhotoMode());
    document.getElementById('btn-help')?.addEventListener('click', () => this.helpOverlay.toggle());
  }

  public togglePhotoMode(): void {
    this.state.photoMode = !this.state.photoMode;
    document.body.classList.toggle('photo-mode', this.state.photoMode);
    if (this.state.photoMode) {
      Toasts.show('ফটো মোড চালু — ফিরে আসতে F বা Esc চাপুন', 3000);
    }
  }

  private bindKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.key === '/') {
        e.preventDefault();
        this.searchOverlay.open();
      } else if (e.key === ' ') {
        e.preventDefault();
        this.state.isPlaying = !this.state.isPlaying;
        this.controlsPanel.syncPlayButton();
        Toasts.show(this.state.isPlaying ? '▶ সিমুলেশন চালু' : '⏸ সিমুলেশন বিরতি');
      } else if (e.key.toLowerCase() === 'f') {
        this.togglePhotoMode();
      } else if (e.key.toLowerCase() === 't') {
        this.state.showTimeline = !this.state.showTimeline;
        document.getElementById('timeline-panel')?.classList.toggle('hidden', !this.state.showTimeline);
      } else if (e.key.toLowerCase() === 'h') {
        this.helpOverlay.toggle();
      } else if (e.key.toLowerCase() === 'r') {
        this.cameraCtrl.reset();
        Toasts.show('↺ ক্যামেরা রিসেট হয়েছে');
      } else if (e.key === 'Escape') {
        if (this.state.searchOpen) this.searchOverlay.close();
        else if (this.state.helpOpen) this.helpOverlay.close();
        else if (this.state.photoMode) this.togglePhotoMode();
      }
    });
  }

  public onScaleChange(_from: ScaleLevel, to: ScaleLevel): void {
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
    if (to === ScaleLevel.PLANET || to === ScaleLevel.SURFACE) {
      if (this.state.activePlanetId === 'earth') this.setActivePill('earth');
      else if (this.state.activePlanetId === 'proxima_b') this.setActivePill('proxima');
      else if (this.state.activePlanetId === 'k_f') this.setActivePill('kepler186');
    } else if (presetByScale[to]) {
      this.setActivePill(presetByScale[to]!);
    }
  }

  public update(): void {
    this.minimap.update();
    this.labelsLayer.update();

    // Sync continuous zoom slider & readout
    const slider = document.getElementById('zoom-slider') as HTMLInputElement | null;
    if (slider && document.activeElement !== slider) {
      slider.value = String(Math.round((this.state.zoomLevel / 6) * 600));
    }
    const readout = document.getElementById('zoom-readout');
    if (readout) {
      const cfg = SCALE_CONFIGS[Math.max(0, Math.min(6, Math.round(this.state.zoomLevel)))];
      readout.textContent = cfg.shortBn;
    }
  }
}
