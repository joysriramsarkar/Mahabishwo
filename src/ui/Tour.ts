/**
 * Guided cinematic tour — a short, hand-authored journey through every scale.
 * The card is intentionally non-modal so the user can keep orbiting while
 * reading; keyboard and progress dots make it fully navigable.
 */
import { focusSoon, rememberFocus, restoreFocus } from '../utils/a11y';

interface TourStep {
  preset: string;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    preset: 'god-eye',
    title: 'পর্যবেক্ষণযোগ্য মহাবিশ্ব',
    body: 'আমরা শুরু করছি ৯৩ বিলিয়ন আলোকবর্ষ ব্যাসের দৃশ্যমান মহাবিশ্ব থেকে — যেখানে দুই ট্রিলিয়নেরও বেশি ছায়াপথ কসমিক জালের সূক্ষ্ম ফিলামেন্টে সাজানো।',
  },
  {
    preset: 'cosmic-web',
    title: 'কসমিক ওয়েব',
    body: 'নিচে নামলে দেখা যায় সুপারক্লাস্টার আর বিশাল শূন্যতার জাল। ল্যানিয়াকিয়া এই অঞ্চলের মহাকর্ষীয় কেন্দ্র, যার দিকে লক্ষ লক্ষ ছায়াপথ ছুটে চলেছে।',
  },
  {
    preset: 'local-group',
    title: 'লোকাল গ্রুপ',
    body: 'আমাদের ছায়াপথীয় পরিবার — আকাশগঙ্গা, অ্যান্ড্রোমিডা ও আরও ৮০টিরও বেশি ছোট-বড় ছায়াপথ, মহাকর্ষে বাঁধা এক দলের সদস্য।',
  },
  {
    preset: 'milky-way',
    title: 'আকাশগঙ্গা',
    body: 'আমাদের নিজের ছায়াপথ — ১ লাখ আলোকবর্ষ বিস্তৃত, কেন্দ্রে স্যাজিটেরিয়াস এ* নামের সুপারম্যাসিভ ব্ল্যাক হোল। সৌরজগৎ এখানে কেন্দ্র থেকে প্রায় ২৬,০০০ আলোকবর্ষ দূরে।',
  },
  {
    preset: 'solar',
    title: 'সৌরজগৎ',
    body: 'আটটি গ্রহ তাদের প্রকৃত Kepler কক্ষপথে ঘুরছে। সময়ের গতি বাড়িয়ে দেখুন — বুধের ৮৮ দিনের বছর থেকে নেপচুনের ১৬৫ বছরের কক্ষপথ, সবই একই ভৌত ঘড়িতে চলে।',
  },
  {
    preset: 'earth-gods-eye',
    title: 'পৃথিবী — গড’স আই ভিউ',
    body: 'শেষে আমাদের ঘর। সূর্যের আলোয় সম্পূর্ণ আলোকিত পৃথিবী, চারপাশে ঘুরছে চাঁদ — আর পেছনে পুরো মহাবিশ্ব। এখান থেকেই আপনি নিজের ইচ্ছেমতো জুম করে যেকোনো জায়গায় যেতে পারেন।',
  },
];

export class Tour {
  private host: HTMLElement | null;
  private navigate: (preset: string) => void;
  private index = 0;
  private open = false;
  private restoreTo: HTMLElement | null = null;

  constructor(navigate: (preset: string) => void) {
    this.navigate = navigate;
    this.host = document.getElementById('tour-panel');
    window.addEventListener('keydown', this.handleKeydown);
  }

  public get isOpen(): boolean {
    return this.open;
  }

  public start(): void {
    if (!this.host) return;
    this.restoreTo = rememberFocus();
    this.open = true;
    this.index = 0;
    this.host.classList.remove('hidden');
    this.render();
    this.applyStep();
    focusSoon(this.host.querySelector<HTMLElement>('#tour-next'));
  }

  public close(): void {
    if (!this.open) return;
    this.open = false;
    this.host?.classList.add('hidden');
    restoreFocus(this.restoreTo);
    this.restoreTo = null;
  }

  public next(): void {
    if (!this.open) return;
    if (this.index >= STEPS.length - 1) {
      this.close();
      return;
    }
    this.index += 1;
    this.render();
    this.applyStep();
  }

  public prev(): void {
    if (!this.open || this.index === 0) return;
    this.index -= 1;
    this.render();
    this.applyStep();
  }

  private applyStep(): void {
    this.navigate(STEPS[this.index].preset);
  }

  private render(): void {
    if (!this.host) return;
    const step = STEPS[this.index];
    const total = STEPS.length;
    const isLast = this.index === total - 1;

    this.host.innerHTML = `
      <div class="glass-panel rounded-2xl p-4 shadow-2xl border border-sky-400/25">
        <div class="flex items-center justify-between gap-3 pb-2 border-b border-white/10">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-base" aria-hidden="true">🎬</span>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-sky-300">গাইডেড ট্যুর</span>
            <span class="text-[10px] text-slate-400">ধাপ ${this.index + 1} / ${total}</span>
          </div>
          <button id="tour-close" type="button" aria-label="ট্যুর বন্ধ করুন"
            class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-xs">✕</button>
        </div>

        <div aria-live="polite">
          <h2 id="tour-title" class="mt-2.5 text-sm font-bold text-white">${step.title}</h2>
          <p class="mt-1 text-xs text-slate-300 leading-relaxed">${step.body}</p>
        </div>

        <div class="mt-3 flex items-center gap-2">
          <div class="flex items-center gap-1.5" role="group" aria-label="ট্যুরের ধাপ">
            ${STEPS.map(
              (s, i) => `
              <button type="button" data-step="${i}"
                aria-label="ধাপ ${i + 1}: ${s.title}" ${i === this.index ? 'aria-current="step"' : ''}
                class="tour-dot w-2.5 h-2.5 rounded-full transition ${
                  i === this.index ? 'bg-sky-400 scale-125' : 'bg-white/25 hover:bg-white/50'
                }"></button>`
            ).join('')}
          </div>

          <div class="ml-auto flex items-center gap-1.5">
            <button id="tour-prev" type="button" ${this.index === 0 ? 'disabled' : ''}
              class="px-2.5 py-1.5 rounded-xl text-[11px] font-medium border transition
                ${this.index === 0
                  ? 'bg-white/5 border-white/5 text-slate-500 cursor-not-allowed'
                  : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/15'}">
              ← আগের
            </button>
            <button id="tour-next" type="button"
              class="px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition
                bg-sky-500/25 border-sky-400/50 text-sky-50 hover:bg-sky-500/40">
              ${isLast ? 'শেষ করুন' : 'পরের →'}
            </button>
          </div>
        </div>
      </div>
    `;

    this.host.querySelector('#tour-close')?.addEventListener('click', () => this.close());
    this.host.querySelector('#tour-prev')?.addEventListener('click', () => this.prev());
    this.host.querySelector('#tour-next')?.addEventListener('click', () => this.next());
    this.host.querySelectorAll<HTMLElement>('.tour-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        const target = Number(dot.dataset.step);
        if (!Number.isFinite(target) || target === this.index) return;
        this.index = Math.max(0, Math.min(STEPS.length - 1, target));
        this.render();
        this.applyStep();
      });
    });
  }

  private handleKeydown = (event: KeyboardEvent): void => {
    if (!this.open) return;
    const target = event.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.close();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.next();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.prev();
    }
  };
}
