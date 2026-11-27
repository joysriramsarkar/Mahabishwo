/**
 * Resolves the URL of the L0 interactive 3D universe application (`src/`).
 * - In unified single-origin mode (`/cosmos/...`), L0 lives on the same origin at `/`.
 * - In standalone Explorer mode (`localhost:4173` / `5173`), falls back to
 *   `VITE_LOCAL_APP_URL` or `http://localhost:3000`.
 */
export function resolveLocalAppUrl(): string {
  const configured = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_LOCAL_APP_URL;
  if (configured) return configured;
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/cosmos')) {
    return '/';
  }
  return 'http://localhost:3000';
}

export function isUnifiedCosmosMount(): boolean {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/cosmos');
}
