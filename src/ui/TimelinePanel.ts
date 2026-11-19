/**
 * Cosmic Timeline Panel — 0 to 13.8 billion years since the Big Bang.
 */
import { AppState } from '../core/types';
import { COSMIC_ERAS } from '../data/cosmicData';
import { toBn } from '../utils/math';

export class TimelinePanel {
  private container: HTMLElement;
  private state: AppState;

  constructor(state: AppState) {
    this.container = document.getElementById('timeline-panel')!;
    this.state = state;
    this.render();
  }

  private render(): void {
    const eraChips = COSMIC_ERAS.map(
      (era) => `
        <button type="button" data-age="${era.startBya}"
          class="era-chip px-2 py-1 rounded-lg text-[10px] border border-white/10 bg-white/5 hover:bg-white/15 text-slate-200 transition">
          <span class="inline-block w-1.5 h-1.5 rounded-full mr-1" style="background:${era.color}"></span>${era.nameBn.split(' ')[0]}
        </button>
      `
    ).join('');

    this.container.innerHTML = `
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-xs font-semibold text-amber-200">⏳ মহাজাগতিক টাইমলাইন</span>
        <span id="tl-age" class="text-[11px] font-semibold text-white">১৩.৮ বিলিয়ন বছর</span>
      </div>

      <input id="tl-slider" type="range" min="0" max="13.8" step="0.05" value="${this.state.cosmicAge}"
        class="w-full h-1.5 rounded-lg cursor-pointer" />

      <div id="tl-era-title" class="mt-2 text-xs font-semibold text-emerald-300">বর্তমান নক্ষত্রময় যুগ (আজকে)</div>
      <p id="tl-era-desc" class="mt-0.5 text-[11px] text-slate-300 leading-relaxed">
        ১৩.৮ বিলিয়ন বছর বয়সে আজকের সমৃদ্ধ মহাবিশ্ব—নক্ষত্র ও গ্রহে পূর্ণ।
      </p>

      <div class="mt-2.5 flex flex-wrap gap-1">${eraChips}</div>
    `;

    const slider = this.container.querySelector('#tl-slider') as HTMLInputElement;
    slider?.addEventListener('input', () => {
      this.setAge(parseFloat(slider.value));
    });

    this.container.querySelectorAll('.era-chip').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const age = parseFloat((e.currentTarget as HTMLElement).dataset.age || '13.8');
        if (slider) slider.value = String(Math.min(13.8, age));
        this.setAge(Math.min(13.8, age));
      });
    });
  }

  private setAge(age: number): void {
    this.state.cosmicAge = age;
    const ageEl = this.container.querySelector('#tl-age');
    const hudAge = document.getElementById('hud-cosmic-age');
    const formatted = toBn(age.toFixed(1));
    if (ageEl) ageEl.textContent = `${formatted} বিলিয়ন বছর`;
    if (hudAge) hudAge.textContent = formatted;

    let active = COSMIC_ERAS[COSMIC_ERAS.length - 1];
    for (const era of COSMIC_ERAS) {
      if (age >= era.startBya && age <= era.endBya) {
        active = era;
        break;
      }
    }
    const titleEl = this.container.querySelector('#tl-era-title') as HTMLElement | null;
    const descEl = this.container.querySelector('#tl-era-desc');
    if (titleEl) {
      titleEl.textContent = active.nameBn;
      titleEl.style.color = active.color;
    }
    if (descEl) descEl.textContent = active.descriptionBn;
  }
}
