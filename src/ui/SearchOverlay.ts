/**
 * Command-palette Search Overlay across every scale.
 */
import { AppState, ScaleLevel } from '../core/types';
import { CameraController } from '../core/CameraController';
import { SceneManager } from '../core/SceneManager';
import { SearchEngine, SearchItem } from '../data/searchIndex';
import { SUPERCLUSTERS, GALAXIES, STAR_SYSTEMS_CATALOG } from '../data/cosmicData';

export class SearchOverlay {
  private overlay: HTMLElement;
  private input: HTMLInputElement;
  private resultsEl: HTMLElement;
  private state: AppState;
  private cameraCtrl: CameraController;
  private sceneManager: SceneManager;
  private currentResults: SearchItem[] = [];
  private selectedIndex = 0;

  constructor(state: AppState, cameraCtrl: CameraController, sceneManager: SceneManager) {
    this.state = state;
    this.cameraCtrl = cameraCtrl;
    this.sceneManager = sceneManager;

    this.overlay = document.getElementById('search-overlay')!;
    this.input = document.getElementById('search-input') as HTMLInputElement;
    this.resultsEl = document.getElementById('search-results')!;

    SearchEngine.initialize();
    this.bindEvents();
  }

  private bindEvents(): void {
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.input.addEventListener('input', () => {
      this.selectedIndex = 0;
      this.renderResults(this.input.value);
    });

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = Math.min(this.currentResults.length - 1, this.selectedIndex + 1);
        this.renderResults(this.input.value);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.renderResults(this.input.value);
      } else if (e.key === 'Enter' && this.currentResults[this.selectedIndex]) {
        e.preventDefault();
        this.navigateTo(this.currentResults[this.selectedIndex]);
      }
    });
  }

  public open(): void {
    this.state.searchOpen = true;
    this.overlay.classList.remove('hidden');
    this.input.value = '';
    this.selectedIndex = 0;
    this.renderResults('');
    window.setTimeout(() => this.input.focus(), 30);
  }

  public close(): void {
    this.state.searchOpen = false;
    this.overlay.classList.add('hidden');
  }

  private renderResults(query: string): void {
    this.currentResults = SearchEngine.search(query);
    if (this.currentResults.length === 0) {
      this.resultsEl.innerHTML = `<div class="py-6 text-center text-xs text-slate-400">কোনো ফলাফল পাওয়া যায়নি</div>`;
      return;
    }

    this.resultsEl.innerHTML = this.currentResults
      .map(
        (item, idx) => `
        <button type="button" data-idx="${idx}"
          class="search-result-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
            idx === this.selectedIndex ? 'bg-sky-500/25 border border-sky-400/40' : 'hover:bg-white/10 border border-transparent'
          }">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${item.color}; box-shadow:0 0 8px ${item.color}"></span>
          <div class="min-w-0 flex-1">
            <div class="text-xs font-semibold text-white truncate">${item.nameBn}</div>
            <div class="text-[11px] text-slate-400 truncate">${item.name}</div>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-sky-200 shrink-0">${item.categoryBn}</span>
        </button>
      `
      )
      .join('');

    this.resultsEl.querySelectorAll('.search-result-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = Number((e.currentTarget as HTMLElement).dataset.idx);
        if (this.currentResults[idx]) this.navigateTo(this.currentResults[idx]);
      });
    });
  }

  private navigateTo(item: SearchItem): void {
    this.close();

    switch (item.scaleLevel) {
      case ScaleLevel.COSMIC_WEB: {
        const sc = SUPERCLUSTERS.find((s) => s.id === item.id);
        this.sceneManager.transitionToScale(ScaleLevel.COSMIC_WEB);
        this.cameraCtrl.animateTo(0.55, 0.96, 155, sc ? sc.position : [0, 0, 0]);
        break;
      }
      case ScaleLevel.GALAXY_CLUSTER:
        this.sceneManager.transitionToScale(ScaleLevel.GALAXY_CLUSTER, { clusterId: item.clusterId });
        this.cameraCtrl.goToScale(ScaleLevel.GALAXY_CLUSTER);
        break;
      case ScaleLevel.GALAXY: {
        if (item.galaxyId === 'milkyway') {
          this.sceneManager.transitionToScale(ScaleLevel.GALAXY, { galaxyId: 'milkyway' });
          this.cameraCtrl.goToScale(ScaleLevel.GALAXY);
        } else {
          const g = GALAXIES.find((gl) => gl.id === item.galaxyId);
          this.sceneManager.transitionToScale(ScaleLevel.GALAXY_CLUSTER);
          this.cameraCtrl.animateTo(0.55, 0.96, 55, g ? g.position : [0, 0, 0]);
        }
        break;
      }
      case ScaleLevel.STAR_SYSTEM: {
        const sysId = item.systemId || 'solar';
        const sys = STAR_SYSTEMS_CATALOG[sysId];
        this.sceneManager.transitionToScale(ScaleLevel.STAR_SYSTEM, { systemId: sysId });
        this.cameraCtrl.animateTo(
          sys.defaultCamera.theta,
          sys.defaultCamera.phi,
          sys.defaultCamera.radius,
          [0, 0, 0]
        );
        break;
      }
      case ScaleLevel.PLANET:
        this.sceneManager.transitionToScale(ScaleLevel.PLANET, {
          systemId: item.systemId || 'solar',
          planetId: item.planetId || 'earth',
        });
        this.cameraCtrl.animateTo(0.85, 1.2, 8.5, [0, 0, 0]);
        break;
    }
  }
}
