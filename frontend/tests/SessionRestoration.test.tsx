import { StrictMode } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/app/App';
import { SessionBootstrap } from '../src/features/account/components/SessionBootstrap';
import { authApi, restoreSession } from '../src/shared/api/auth';
import { clearSession, getAccessToken, getRefreshToken, setSessionTokens, setSessionUser } from '../src/shared/session/session';
import { readReloadSession, RELOAD_SESSION_MAX_AGE_MS, saveReloadSession } from '../src/shared/session/reloadSession';
import { accountFixture, emptyDashboardApi, jsonResponse, mockApi, renderWithClient } from './helpers';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

function savedSession() {
  const expiresAt = Date.now() + RELOAD_SESSION_MAX_AGE_MS - 1000;
  saveReloadSession('saved-refresh', expiresAt);
  return expiresAt;
}

describe('reload session recovery', () => {
  it('keeps the deep link and protected UI closed until rotation and /me verification finish, even in StrictMode', async () => {
    const hash = '#/dashboard/browse?q=ram&domain=news.example&offset=6';
    window.history.replaceState(null, '', `/${hash}`);
    const expiresAt = savedSession();
    const refresh = deferred<Response>();
    const me = deferred<Response>();
    const fetch = mockApi(endpoint => {
      if (endpoint === '/auth/refresh') return refresh.promise;
      if (endpoint === '/auth/me') return me.promise;
      return emptyDashboardApi(endpoint);
    });
    renderWithClient(<StrictMode><App /></StrictMode>);
    expect(screen.getByRole('heading', { name: 'Restoring your session…' })).toBeTruthy();
    expect(window.location.hash).toBe(hash);
    expect(screen.queryByLabelText('Password')).toBeNull();
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual(['/api/v1/auth/refresh']);
    refresh.resolve(jsonResponse({ access_token: 'fresh-access', refresh_token: 'fresh-refresh' }));
    await waitFor(() => expect(fetch.mock.calls).toHaveLength(2));
    expect(screen.queryByRole('textbox', { name: 'Search article titles or authors' })).toBeNull();
    expect(readReloadSession()).toEqual({ refreshToken: 'fresh-refresh', expiresAt });
    me.resolve(jsonResponse(accountFixture));
    await screen.findByRole('textbox', { name: 'Search article titles or authors' });
    expect(window.location.hash).toBe(hash);
    expect(getAccessToken()).toBe('fresh-access');
    expect(fetch.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))).toHaveLength(1);
    expect(new Headers(fetch.mock.calls[1][1]?.headers).get('Authorization')).toBe('Bearer fresh-access');
  });

  it('does not trust cached account roles, and pending accounts remain on the approval screen', async () => {
    savedSession();
    window.history.replaceState(null, '', '/#/dashboard/developer');
    mockApi(endpoint => endpoint === '/auth/refresh'
      ? jsonResponse({ access_token: 'pending-access', refresh_token: 'pending-refresh' })
      : jsonResponse({ ...accountFixture, role: 'viewer', access_status: 'pending' }));
    renderWithClient(<App />);
    expect(await screen.findByRole('heading', { name: /approval/i })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'All accounts' })).toBeNull();
  });

  it.each([401, 403, 503])('clears a failed restoration (%s), makes no automatic retry, and preserves the return page', async status => {
    const hash = '#/dashboard/atlas?release=315d6109-57bf-4cb1-9395-261825f633da&view=1%2C2%2C3';
    window.history.replaceState(null, '', `/${hash}`);
    savedSession();
    const fetch = mockApi(() => jsonResponse({ detail: 'Verification unavailable' }, status));
    renderWithClient(<App />);
    await screen.findByRole('button', { name: 'Continue to sign in' });
    expect(getAccessToken()).toBeUndefined();
    expect(getRefreshToken()).toBeUndefined();
    expect(readReloadSession()).toBeNull();
    expect(fetch.mock.calls).toHaveLength(1);
    expect(window.location.hash).toBe(hash);
    fireEvent.click(screen.getByRole('button', { name: 'Continue to sign in' }));
    await screen.findByRole('button', { name: 'Sign in' });
    expect(new URLSearchParams(window.location.hash.split('?')[1]).get('next')).toBe(hash);
  });

  it('handles an uncertain refresh timeout without replaying the consumed credential', async () => {
    savedSession();
    vi.useFakeTimers();
    const fetch = mockApi(() => new Promise<Response>(() => {}));
    const result = expect(restoreSession()).rejects.toMatchObject({ kind: 'timeout' });
    await vi.advanceTimersByTimeAsync(60_000);
    await result;
    expect(readReloadSession()).toBeNull();
    expect(getRefreshToken()).toBeUndefined();
    expect(fetch.mock.calls).toHaveLength(1);
  });

  it.each([401, 403])('does not render protected content when /me rejects the rotated session (%s)', async status => {
    savedSession();
    const fetch = mockApi(endpoint => endpoint === '/auth/refresh'
      ? jsonResponse({ access_token: 'rotated-access', refresh_token: 'rotated-refresh' })
      : jsonResponse({ detail: 'Account access denied' }, status));
    renderWithClient(<SessionBootstrap><p>Protected data</p></SessionBootstrap>);
    await screen.findByRole('button', { name: 'Continue to sign in' });
    expect(screen.queryByText('Protected data')).toBeNull();
    expect(readReloadSession()).toBeNull();
    expect(getAccessToken()).toBeUndefined();
    expect(fetch.mock.calls).toHaveLength(2);
  });

  it('clears the recovery credential as soon as logout starts, even before its response', async () => {
    setSessionTokens({ access_token: 'access', refresh_token: 'refresh' });
    setSessionUser(accountFixture);
    const response = deferred<Response>();
    mockApi(() => response.promise);
    const logout = authApi.logout();
    expect(readReloadSession()).toBeNull();
    response.resolve(new Response(null, { status: 204 }));
    await logout;
    expect(getAccessToken()).toBeUndefined();
  });

  it('rejects expired, malformed, oversized and out-of-bound saved sessions without a network request', async () => {
    savedSession();
    const key = window.sessionStorage.key(0)!;
    const fetch = mockApi(() => jsonResponse({}));
    for (const value of ['bad JSON', '{}', JSON.stringify({ refreshToken: 'x', expiresAt: Date.now() - 1 }),
      JSON.stringify({ refreshToken: 'x'.repeat(513), expiresAt: Date.now() + 1000 }),
      JSON.stringify({ refreshToken: 'x', expiresAt: Date.now() + RELOAD_SESSION_MAX_AGE_MS * 2 })]) {
      window.sessionStorage.setItem(key, value);
      await restoreSession();
      expect(window.sessionStorage.getItem(key)).toBeNull();
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses the already verified in-memory account without another refresh on remount', async () => {
    setSessionTokens({ access_token: 'active-access', refresh_token: 'active-refresh' });
    setSessionUser(accountFixture);
    const fetch = mockApi(() => jsonResponse({}));
    renderWithClient(<SessionBootstrap><p>Verified workspace</p></SessionBootstrap>);
    expect(screen.getByText('Verified workspace')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not resurrect or overwrite a newer account after a late restoration result', async () => {
    savedSession();
    const refresh = deferred<Response>();
    mockApi(() => refresh.promise);
    const result = expect(restoreSession()).rejects.toMatchObject({ status: 401 });
    clearSession();
    setSessionTokens({ access_token: 'new-access', refresh_token: 'new-refresh' });
    setSessionUser({ ...accountFixture, id: 'new-account' });
    refresh.resolve(jsonResponse({ access_token: 'stale-access', refresh_token: 'stale-refresh' }));
    await result;
    expect(getAccessToken()).toBe('new-access');
    expect(readReloadSession()?.refreshToken).toBe('new-refresh');
  });

  it('stays usable when browser storage is disabled', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    mockApi(endpoint => endpoint === '/auth/login'
      ? jsonResponse({ access_token: 'memory-access', refresh_token: 'memory-refresh' }) : jsonResponse(accountFixture));
    await authApi.login({ email: accountFixture.email, password: 'fixture-password' });
    expect(getAccessToken()).toBe('memory-access');
    expect(readReloadSession()).toBeNull();
  });
});
