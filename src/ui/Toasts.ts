/**
 * Lightweight bottom-center toast notifications.
 */
export class Toasts {
  private static container: HTMLElement | null = null;

  private static getContainer(): HTMLElement | null {
    if (!this.container) this.container = document.getElementById('toast-container');
    return this.container;
  }

  public static show(message: string, duration = 2600): void {
    const host = this.getContainer();
    if (!host) return;

    // Keep the stack short so it never covers the navigation bar.
    while (host.children.length >= 3) {
      host.firstElementChild?.remove();
    }

    const item = document.createElement('div');
    item.className = 'toast-item glass-panel px-4 py-2 rounded-full text-xs font-medium text-sky-100';
    item.textContent = message;
    host.appendChild(item);

    requestAnimationFrame(() => item.classList.add('show'));

    window.setTimeout(() => {
      item.classList.remove('show');
      window.setTimeout(() => item.remove(), 300);
    }, duration);
  }
}
