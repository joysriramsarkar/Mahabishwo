/**
 * Logarithmic Cosmic Scale Visualizer (স্কেল ভিজুয়ালাইজার)
 * Plots every cosmic domain from 10^6 m (Surface) to 10^26 m (Observable Universe)
 * and shows live camera depth with one-click jump navigation.
 */
import { AppState, ScaleLevel, SCALE_CONFIGS } from '../core/types';
import { CameraController } from '../core/CameraController';
import { SceneManager } from '../core/SceneManager';
import { focusSoon, rememberFocus, restoreFocus, trapFocus } from '../utils/a11y';

const LOG_METERS: Record<ScaleLevel, { exp: string; exampleBn: string; color: string }> = {
  [ScaleLevel.OBSERVABLE_UNIVERSE]: {
    exp: '10²⁶ মিটার',
    exampleBn: '~৯৩ বিলিয়ন আলোকবর্ষ (মহাজাগতিক দিগন্ত ও CMB)',
    color: '#38bdf8',
  },
  [ScaleLevel.COSMIC_WEB]: {
    exp: '10²⁴ – 10²⁵ মিটার',
    exampleBn: '~৫০ কোটি আলোকবর্ষ (ল্যানিয়াকিয়া ও কসমিক ফিলামেন্ট)',
    color: '#a855f7',
  },
  [ScaleLevel.GALAXY_CLUSTER]: {
    exp: '10²² – 10²³ মিটার',
    exampleBn: '~১ কোটি আলোকবর্ষ (লোকাল গ্রুপ ও M31–আকাশগঙ্গা)',
    color: '#818cf8',
  },
  [ScaleLevel.GALAXY]: {
    exp: '10²¹ মিটার',
    exampleBn: '~১ লক্ষ আলোকবর্ষ (সর্পিল বাহু ও কেন্দ্রীয় ব্ল্যাক হোল)',
    color: '#60a5fa',
  },
  [ScaleLevel.STAR_SYSTEM]: {
    exp: '10¹² – 10¹⁶ মিটার',
    exampleBn: '~১০০ AU – ওর্ট ক্লাউড (গ্রহ, কুইপার বেল্ট, ধূমকেতু)',
    color: '#fbbf24',
  },
  [ScaleLevel.PLANET]: {
    exp: '10⁷ মিটার',
    exampleBn: '~১২,৭৪২ কিমি (পৃথিবী ও উপগ্রহ ব্যবস্থা)',
    color: '#34d399',
  },
  [ScaleLevel.SURFACE]: {
    exp: '10⁶ মিটার',
    exampleBn: '~১,০০০ কিমি (মেঘ, রাতের শহর, বায়ুমণ্ডলীয় বিক্ষেপণ)',
    color: '#2dd4bf',
  },
};

export class ScaleVisualizer {
  private el: HTMLElement;
  private state: AppState;
  private cameraCtrl: CameraController;
  private sceneManager: SceneManager;
  private previousFocus: HTMLElement | null = null;

  constructor(state: AppState, cameraCtrl: CameraController, sceneManager: SceneManager) {
    this.state = state;
    this.cameraCtrl = cameraCtrl;
    this.sceneManager = sceneManager;
    this.el = document.getElementById('scale-viz-panel')!;
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });
    this.el.addEventListener('keydown', (e) => trapFocus(this.el, e));
  }

  public open(): void {
    if (!this.state.scaleVizOpen) {
      this.previousFocus = rememberFocus();
      this.state.scaleVizOpen = true;
      this.el.classList.remove('hidden');
      this.el.setAttribute('aria-hidden', 'false');
    }
    this.render();
    focusSoon(this.el.querySelector<HTMLElement>('#btn-close-scale-viz'));
  }

  public close(): void {
    if (!this.state.scaleVizOpen) return;
    this.state.scaleVizOpen = false;
    this.el.classList.add('hidden');
    this.el.setAttribute('aria-hidden', 'true');
    restoreFocus(this.previousFocus);
    this.previousFocus = null;
  }

  public toggle(): void {
    if (this.state.scaleVizOpen) this.close();
    else this.open();
  }

  private render(): void {
    const activeScale = this.state.collisionMode
      ? ScaleLevel.GALAXY_CLUSTER
      : this.state.currentScale;

    const rowsHtml = SCALE_CONFIGS.map((cfg, idx) => {
      const meta = LOG_METERS[cfg.level];
      const isCurrent = !this.state.collisionMode && activeScale === cfg.level;
      const widthPct = Math.round(100 - idx * 12);

      return `
        <button type="button" data-scale-jump="${cfg.level}"
          class="scale-row-btn w-full text-left rounded-xl p-2.5 border transition ${
            isCurrent
              ? 'bg-sky-500/25 border-sky-400/60 shadow-lg shadow-sky-500/10'
              : 'bg-white/5 border-white/10 hover:bg-white/10'
          }">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${meta.color}; box-shadow:0 0 8px ${meta.color}"></span>
              <span class="text-xs font-bold text-white truncate">${cfg.nameBn}</span>
              ${
                isCurrent
                  ? '<span class="px-1.5 py-0.5 rounded bg-sky-400/25 text-sky-100 text-[9px] font-semibold shrink-0">বর্তমান</span>'
                  : ''
              }
            </div>
            <span class="font-mono text-[10px] text-amber-200 shrink-0">${meta.exp}</span>
          </div>
          <div class="mt-1.5 h-1.5 w-full rounded-full bg-slate-900 overflow-hidden">
            <div class="h-full rounded-full" style="width:${widthPct}%; background:linear-gradient(90deg, ${meta.color}, #f8fafc44)"></div>
          </div>
          <div class="mt-1 text-[10px] text-slate-300 truncate">${meta.exampleBn}</div>
        </button>
      `;
    }).join('');

    this.el.innerHTML = `
      <div class="glass-panel w-full max-w-xl rounded-2xl p-5 shadow-2xl border border-sky-400/25 max-h-[90vh] overflow-y-auto custom-scroll">
        <div class="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 id="scale-viz-title" class="text-base font-bold text-white">📏 লগারিদমিক স্কেল ভিজুয়ালাইজার</h3>
            <p class="text-[11px] text-slate-400">২০টি অর্ডার অব ম্যাগনিচিউড জুড়ে মহাবিশ্ব (10⁶ মি → 10²⁶ মি) — ক্লিক করে যেকোনো স্তরে যান</p>
          </div>
          <button id="btn-close-scale-viz" type="button" aria-label="স্কেল ভিজুয়ালাইজার বন্ধ করুন"
            class="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 text-sm">✕</button>
        </div>

        <div class="mt-3 space-y-2">${rowsHtml}</div>
      </div>
    `;

    this.el.querySelector('#btn-close-scale-viz')?.addEventListener('click', () => this.close());
    this.el.querySelectorAll<HTMLElement>('.scale-row-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const level = Number(btn.dataset.scaleJump) as ScaleLevel;
        this.close();
        if (level === ScaleLevel.PLANET || level === ScaleLevel.SURFACE) {
          this.sceneManager.flyToPlanet(this.state.activeSystemId || 'solar', this.state.activePlanetId || 'earth');
        } else {
          this.sceneManager.transitionToScale(level);
          this.cameraCtrl.goToScale(level);
        }
      });
    });
  }
}
