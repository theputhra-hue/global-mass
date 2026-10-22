import { useSyncExternalStore } from 'react';
import { clearReloadSession, RELOAD_SESSION_MAX_AGE_MS, saveReloadSession, type ReloadSession } from './reloadSession';

export interface AccountUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  access_status?: 'pending' | 'approved' | 'rejected' | 'paused' | 'banned';
}

export interface SessionTokens {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
}

interface SessionSnapshot {
  user: AccountUser | null;
  revision: number;
}

// Access tokens and identity stay in memory. Only a bounded rotating refresh
// token can survive a reload in this tab; it never supplies a trusted identity.
let tokens: SessionTokens | null = null;
let reloadExpiresAt: number | null = null;
let snapshot: SessionSnapshot = { user: null, revision: 0 };
const listeners = new Set<() => void>();

function publish(next: SessionSnapshot): void {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getAccessToken = (): string | undefined => tokens?.access_token;
export const getRefreshToken = (): string | undefined => tokens?.refresh_token;
export const getSessionRevision = (): number => snapshot.revision;

export function setSessionTokens(next: SessionTokens): void {
  tokens = { ...next };
  if (reloadExpiresAt !== null) saveReloadSession(tokens.refresh_token, reloadExpiresAt);
}

export function prepareSessionRestore(saved: ReloadSession): void {
  clearReloadSession(); // Never replay a rotation interrupted by another reload.
  reloadExpiresAt = saved.expiresAt;
  tokens = { access_token: '', refresh_token: saved.refreshToken };
}

export function setSessionUser(user: AccountUser): void {
  reloadExpiresAt ??= Date.now() + RELOAD_SESSION_MAX_AGE_MS;
  saveReloadSession(tokens?.refresh_token, reloadExpiresAt);
  const changed = snapshot.user?.id !== user.id || snapshot.user?.role !== user.role || snapshot.user?.access_status !== user.access_status;
  publish({ user, revision: snapshot.revision + (changed ? 1 : 0) });
}

export function clearSession(): void {
  tokens = null;
  reloadExpiresAt = null;
  clearReloadSession();
  publish({ user: null, revision: snapshot.revision + 1 });
}

export function useSession(): SessionSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}
