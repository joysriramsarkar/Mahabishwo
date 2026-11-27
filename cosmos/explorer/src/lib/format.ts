export function cn(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(' ');
}

export function formatMpc(v: number): string {
  if (!Number.isFinite(v)) return '—';
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(2)} Gpc`;
  return `${v.toFixed(1)} Mpc`;
}

export function formatCount(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)} M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} K`;
  return n.toString();
}

export function formatMassMsun(m: number): string {
  const e = Math.log10(Math.abs(m));
  if (e >= 15) return `${(m / 1e15).toFixed(1)} × 10¹⁵ M☉`;
  if (e >= 12) return `${(m / 1e12).toFixed(1)} × 10¹² M☉`;
  if (e >= 9) return `${(m / 1e9).toFixed(1)} × 10⁹ M☉`;
  return `${m.toExponential(1)} M☉`;
}
