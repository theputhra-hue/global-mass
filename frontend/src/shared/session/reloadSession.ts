// Tab-scoped convenience only: the server must rotate and verify before access.
// Never persist an access token, password, account profile or query data here.
const API = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
const KEY = `gmee:reload-session:v1:${API}`;
export const RELOAD_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

export interface ReloadSession { refreshToken: string; expiresAt: number }

export function clearReloadSession(): void {
  try { window.sessionStorage.removeItem(KEY); } catch { /* Storage may be disabled. */ }
}

export function readReloadSession(): ReloadSession | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    if (raw.length > 2048) { clearReloadSession(); return null; }
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === 'object' && 'refreshToken' in value && 'expiresAt' in value
      && typeof value.refreshToken === 'string' && value.refreshToken.length > 0 && value.refreshToken.length <= 512
      && typeof value.expiresAt === 'number' && Number.isFinite(value.expiresAt)
      && value.expiresAt > Date.now() && value.expiresAt <= Date.now() + RELOAD_SESSION_MAX_AGE_MS) {
      return { refreshToken: value.refreshToken, expiresAt: value.expiresAt };
    }
  } catch { /* Invalid or inaccessible storage cannot authenticate a user. */ }
  clearReloadSession();
  return null;
}

export function saveReloadSession(refreshToken: string | undefined, expiresAt: number): void {
  clearReloadSession();
  if (!refreshToken || refreshToken.length > 512 || expiresAt <= Date.now()) return;
  try { window.sessionStorage.setItem(KEY, JSON.stringify({ refreshToken, expiresAt })); }
  catch { /* The current in-memory login still works when storage is blocked. */ }
}
