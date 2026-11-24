/**
 * Left Controls Drawer — simulation playback, speed, layer toggles,
 * HDR bloom, rendering quality and cinematic auto-rotation.
 */
import { AppState, DensityLevel, LayerVisibility, QualityLevel } from '../core/types';
import { SceneManager } from '../core/SceneManager';
import { toBn } from '../utils/math';
import { SIM_DAYS_PER_SECOND } from '../data/cosmicData';

/** Slider raw (0..50) → time scale. 0 stops time; 10 → 1×; every +10 → ×10. */
function rawToSpeed(raw: number): number {
  return raw <= 0.5 ? 0 : Math.pow(10, (raw - 10) / 10);
}

function speedToRaw(speed: number): number {
  if (speed <= 0) return 0;
  return Math.min(50, Math.max(1, 10 + 10 * Math.log10(speed)));
}

/** Bengali readout of the physical clock: what one real second equals. */
function formatSimSpeed(speed: number): string {
  if (speed <= 0) return 'সময় থামা';
  const days = speed * SIM_DAYS_PER_SECOND;
  if (days < 365) return `১ সে = ${toBn(days < 10 ? days.toFixed(1) : Math.round(days))} দিন`;
  const years = days / 365.25;
  if (years < 10) return `১ সে = ~${toBn(years.toFixed(1))} বছর`;
  return `১ সে = ~${toBn(Math.round(years))} বছর`;
}

export class ControlsPanel {
  private container: HTMLElement;
  private state: AppState;
  private sceneManager: SceneManager;

  constructor(state: AppState, sceneManager: SceneManager) {
    this.container = document.getElementById('controls-drawer')!;
    this.state = state;
    this.sceneManager = sceneManager;
    this.render();
  }

  private render(): void {
    const toggles: Array<{ key: keyof LayerVisibility; label: string }> = [
      { key: 'stars', label: 'নক্ষত্র ও গ্যালাক্সি কণা' },
      { key: 'orbits', label: 'কক্ষপথ রেখা' },
      { key: 'habitableZones', label: 'বাসযোগ্য অঞ্চল (HZ)' },
      { key: 'labels', label: 'নাম ও ল্যান্ডমার্ক পিন' },
      { key: 'cosmicWeb', label: 'কসমিক ওয়েব ফিলামেন্ট' },
      { key: 'dustLanes', label: 'ছায়াপথ ধূলিস্তর' },
      { key: 'halo', label: 'গ্লোবুলার ক্লাস্টার হ্যালো' },
    ];

    const toggleHtml = toggles
      .map(
        (t) => `
        <label class="flex items-center justify-between py-1 cursor-pointer group">
          <span class="text-xs text-slate-200 group-hover:text-white transition">${t.label}</span>
          <input type="checkbox" data-layer="${t.key}" class="layer-toggle switch-input" ${
            this.state.layers[t.key] ? 'checked' : ''
          } />
        </label>
      `
      )
      .join('');

    this.container.innerHTML = `
      <div class="flex items-center justify-between pb-2.5 border-b border-white/10">
        <h2 class="text-sm font-bold text-white">⚙️ নিয়ন্ত্রণ প্যানেল</h2>
        <button id="btn-close-controls" type="button" class="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded-lg hover:bg-white/10">✕</button>
      </div>

      <!-- Playback -->
      <div class="mt-3 space-y-2.5">
        <div class="flex items-center gap-2">
          <button id="btn-play-pause" type="button"
            class="flex-1 py-1.5 rounded-xl text-xs font-semibold bg-sky-500/25 border border-sky-400/40 text-sky-100 hover:bg-sky-500/35 transition">
            ${this.state.isPlaying ? '⏸ বিরতি দিন' : '▶ চালু করুন'}
          </button>
          <button id="btn-auto-rotate" type="button"
            class="px-3 py-1.5 rounded-xl text-xs font-medium border ${
              this.state.autoRotate
                ? 'bg-indigo-500/30 border-indigo-400/50 text-indigo-100'
                : 'bg-white/5 border-white/10 text-slate-300'
            } hover:bg-white/10 transition">
            🔄 অটো
          </button>
        </div>

        <div>
          <div class="flex justify-between text-[11px] text-slate-300 mb-1">
            <span>সময়ের গতি (ভৌত ঘড়ি)</span>
            <span id="ctrl-speed-val" class="font-semibold text-sky-200">${formatSimSpeed(this.state.rotationSpeed)}</span>
          </div>
          <input id="ctrl-speed" type="range" min="0" max="50" step="0.5" value="${speedToRaw(this.state.rotationSpeed)}" class="w-full h-1.5" />
          <div class="flex gap-1 mt-1.5">
            ${[1, 10, 100, 1000, 10000]
              .map(
                (s) => `
              <button type="button" data-speed="${s}"
                class="speed-preset flex-1 py-0.5 rounded-lg text-[10px] border transition ${
                  Math.abs(this.state.rotationSpeed - s) < 0.01
                    ? 'bg-sky-500/30 border-sky-400/60 text-white font-semibold'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }">
                ${toBn(s)}×
              </button>
            `
              )
              .join('')}
          </div>
        </div>
      </div>

      <!-- Visual Layers -->
      <div class="mt-4 pt-3 border-t border-white/10">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-sky-300 mb-1.5">দৃশ্য স্তর</div>
        <div class="space-y-1">${toggleHtml}</div>
      </div>

      <!-- Rendering & Realism -->
      <div class="mt-4 pt-3 border-t border-white/10 space-y-3">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-sky-300">রেন্ডারিং ও বাস্তবতা</div>

        <div>
          <div class="flex justify-between text-[11px] text-slate-300 mb-1">
            <span>HDR ব্লুম (উজ্জ্বলতা)</span>
            <span id="ctrl-bloom-val" class="font-semibold text-amber-200">${toBn(this.state.bloom.toFixed(2))}</span>
          </div>
          <input id="ctrl-bloom" type="range" min="0" max="1.5" step="0.05" value="${this.state.bloom}" class="w-full h-1.5" />
        </div>

        <div>
          <div class="text-[11px] text-slate-300 mb-1.5">নক্ষত্র ঘনত্ব</div>
          <div class="grid grid-cols-3 gap-1">
            ${(['low', 'medium', 'high'] as DensityLevel[])
              .map(
                (d) => `
              <button type="button" data-density="${d}"
                class="density-btn py-1 rounded-lg text-[11px] border transition ${
                  this.state.density === d
                    ? 'bg-sky-500/30 border-sky-400/60 text-white font-semibold'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }">
                ${d === 'low' ? 'কম' : d === 'medium' ? 'মাঝারি' : 'বেশি'}
              </button>
            `
              )
              .join('')}
          </div>
        </div>

        <div>
          <div class="text-[11px] text-slate-300 mb-1.5">গ্রাফিক্স কোয়ালিটি</div>
          <div class="grid grid-cols-3 gap-1">
            ${(['low', 'medium', 'high'] as QualityLevel[])
              .map(
                (q) => `
              <button type="button" data-quality="${q}"
                class="quality-btn py-1 rounded-lg text-[11px] border transition ${
                  this.state.quality === q
                    ? 'bg-indigo-500/30 border-indigo-400/60 text-white font-semibold'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }">
                ${q === 'low' ? 'লো' : q === 'medium' ? 'মিডিয়াম' : 'আল্ট্রা'}
              </button>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.container.querySelector('#btn-close-controls')?.addEventListener('click', () => {
      this.state.showControls = false;
      this.container.classList.add('hidden');
    });

    const playBtn = this.container.querySelector('#btn-play-pause');
    playBtn?.addEventListener('click', () => {
      this.state.isPlaying = !this.state.isPlaying;
      playBtn.textContent = this.state.isPlaying ? '⏸ বিরতি দিন' : '▶ চালু করুন';
    });

    const autoBtn = this.container.querySelector('#btn-auto-rotate');
    autoBtn?.addEventListener('click', () => {
      this.state.autoRotate = !this.state.autoRotate;
      autoBtn.className = `px-3 py-1.5 rounded-xl text-xs font-medium border ${
        this.state.autoRotate
          ? 'bg-indigo-500/30 border-indigo-400/50 text-indigo-100'
          : 'bg-white/5 border-white/10 text-slate-300'
      } hover:bg-white/10 transition`;
    });

    const speedInput = this.container.querySelector('#ctrl-speed') as HTMLInputElement;
    const speedVal = this.container.querySelector('#ctrl-speed-val');
    const syncSpeedUi = (speed: number) => {
      if (speedVal) speedVal.textContent = formatSimSpeed(speed);
      if (speedInput) speedInput.value = String(speedToRaw(speed));
      this.container.querySelectorAll<HTMLButtonElement>('.speed-preset').forEach((btn) => {
        const s = parseFloat(btn.dataset.speed || '0');
        const active = Math.abs(speed - s) < 0.01;
        btn.className = `speed-preset flex-1 py-0.5 rounded-lg text-[10px] border transition ${
          active
            ? 'bg-sky-500/30 border-sky-400/60 text-white font-semibold'
            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
        }`;
      });
    };
    speedInput?.addEventListener('input', () => {
      this.state.rotationSpeed = rawToSpeed(parseFloat(speedInput.value));
      syncSpeedUi(this.state.rotationSpeed);
    });
    this.container.querySelectorAll<HTMLButtonElement>('.speed-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.rotationSpeed = parseFloat(btn.dataset.speed || '1');
        syncSpeedUi(this.state.rotationSpeed);
      });
    });

    const bloomInput = this.container.querySelector('#ctrl-bloom') as HTMLInputElement;
    const bloomVal = this.container.querySelector('#ctrl-bloom-val');
    bloomInput?.addEventListener('input', () => {
      this.state.bloom = parseFloat(bloomInput.value);
      this.sceneManager.engine.pipeline.setBloom(this.state.bloom);
      if (bloomVal) bloomVal.textContent = toBn(this.state.bloom.toFixed(2));
    });

    this.container.querySelectorAll('.layer-toggle').forEach((input) => {
      input.addEventListener('change', (e) => {
        const el = e.currentTarget as HTMLInputElement;
        const key = el.dataset.layer as keyof LayerVisibility;
        this.state.layers[key] = el.checked;
        if (key === 'labels') {
          const labelsEl = document.getElementById('labels-layer');
          labelsEl?.classList.toggle('hidden', !el.checked);
        }
      });
    });

    this.container.querySelectorAll('.density-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const d = (e.currentTarget as HTMLElement).dataset.density as DensityLevel;
        this.state.density = d;
        this.render();
      });
    });

    this.container.querySelectorAll('.quality-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const q = (e.currentTarget as HTMLElement).dataset.quality as QualityLevel;
        this.state.quality = q;
        this.sceneManager.engine.setQuality(q);
        this.render();
      });
    });
  }

  public syncPlayButton(): void {
    const playBtn = this.container.querySelector('#btn-play-pause');
    if (playBtn) playBtn.textContent = this.state.isPlaying ? '⏸ বিরতি দিন' : '▶ চালু করুন';
  }
}
