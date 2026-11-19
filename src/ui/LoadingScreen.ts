/**
 * Full-screen cinematic loading screen with progress bar.
 */
export class LoadingScreen {
  private el: HTMLElement | null;
  private bar: HTMLElement | null;
  private label: HTMLElement | null;

  constructor() {
    this.el = document.getElementById('loading-screen');
    this.bar = document.getElementById('loading-bar');
    this.label = document.getElementById('loading-label');
  }

  public setProgress(pct: number, text?: string): void {
    if (this.bar) this.bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    if (this.label && text) this.label.textContent = text;
  }

  public hide(): void {
    if (!this.el) return;
    this.el.style.opacity = '0';
    this.el.style.pointerEvents = 'none';
    window.setTimeout(() => {
      this.el?.remove();
    }, 650);
  }
}
