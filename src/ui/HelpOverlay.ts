/**
 * Keyboard shortcuts & navigation guide modal.
 */
import { AppState } from '../core/types';
import { focusSoon, rememberFocus, restoreFocus, trapFocus } from '../utils/a11y';

export class HelpOverlay {
  private el: HTMLElement;
  private state: AppState;
  private previousFocus: HTMLElement | null = null;

  constructor(state: AppState) {
    this.state = state;
    this.el = document.getElementById('help-overlay')!;
    this.render();
  }

  private render(): void {
    this.el.innerHTML = `
      <div class="glass-panel w-full max-w-lg rounded-2xl p-5 shadow-2xl border border-blue-400/25">
        <div class="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 id="help-title" class="text-base font-bold text-white">নিয়ন্ত্রণ ও শর্টকাট গাইড</h3>
            <p class="text-[11px] text-slate-400">Navigation & Keyboard Shortcuts</p>
          </div>
          <button id="btn-close-help" type="button" aria-label="গাইড বন্ধ করুন" class="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 text-sm">✕</button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs">
          <div class="space-y-2">
            <div class="text-[11px] font-semibold text-sky-300 uppercase tracking-wider">মাউস / টাচ</div>
            <div class="flex justify-between text-slate-300"><span>বাম ড্র্যাগ</span><span class="text-slate-400">ঘোরান (Orbit)</span></div>
            <div class="flex justify-between text-slate-300"><span>ডান ড্র্যাগ / Shift</span><span class="text-slate-400">সরান (Pan)</span></div>
            <div class="flex justify-between text-slate-300"><span>স্ক্রল / পিঞ্চ</span><span class="text-slate-400">জুম ইন/আউট</span></div>
            <div class="flex justify-between text-slate-300"><span>গ্রহে ক্লিক</span><span class="text-slate-400">ক্লোজ-আপ ভিউ</span></div>
          </div>

          <div class="space-y-2">
            <div class="text-[11px] font-semibold text-sky-300 uppercase tracking-wider">কীবোর্ড</div>
            <div class="flex justify-between text-slate-300"><span>বিরতি / চালু</span><span class="kbd">Space</span></div>
            <div class="flex justify-between text-slate-300"><span>অনুসন্ধান</span><span class="kbd">/</span></div>
            <div class="flex justify-between text-slate-300"><span>ফটো মোড</span><span class="kbd">F</span></div>
            <div class="flex justify-between text-slate-300"><span>স্ক্রিনশট</span><span class="kbd">P</span></div>
            <div class="flex justify-between text-slate-300"><span>টাইমলাইন</span><span class="kbd">T</span></div>
            <div class="flex justify-between text-slate-300"><span>তুলনা মোড</span><span class="kbd">C</span></div>
            <div class="flex justify-between text-slate-300"><span>স্কেল ভিজুয়ালাইজার</span><span class="kbd">V</span></div>
            <div class="flex justify-between text-slate-300"><span>রিসেট ক্যামেরা</span><span class="kbd">R</span></div>
            <div class="flex justify-between text-slate-300"><span>গাইড</span><span class="kbd">H</span></div>
            <div class="flex justify-between text-slate-300"><span>বন্ধ করুন</span><span class="kbd">Esc</span></div>
          </div>
        </div>

        <p class="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400">
          টিপ: উপরের <span class="text-amber-200 font-medium">🎬 ট্যুর</span> বাটনে ক্লিক করে প্রতিটি স্কেলের গাইডেড ভ্রমণ শুরু করুন।
        </p>
      </div>
    `;

    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });
    this.el.addEventListener('keydown', (e) => trapFocus(this.el, e));
    this.el.querySelector('#btn-close-help')?.addEventListener('click', () => this.close());
  }

  public open(): void {
    if (this.state.helpOpen) return;
    this.previousFocus = rememberFocus();
    this.state.helpOpen = true;
    this.el.classList.remove('hidden');
    this.el.setAttribute('aria-hidden', 'false');
    focusSoon(this.el.querySelector<HTMLElement>('#btn-close-help'));
  }

  public close(): void {
    if (!this.state.helpOpen) return;
    this.state.helpOpen = false;
    this.el.classList.add('hidden');
    this.el.setAttribute('aria-hidden', 'true');
    restoreFocus(this.previousFocus);
    this.previousFocus = null;
  }

  public toggle(): void {
    if (this.state.helpOpen) this.close();
    else this.open();
  }
}
