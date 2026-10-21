import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/app/App';
import { AccountApprovals } from '../src/features/developer/components/AccountApprovals';
import { MockPublicationProvider, PublicationProvider } from '../src/shared/runtime/publicationRuntime';
import { emptyDashboardApi, accountFixture, jsonResponse, mockApi, renderWithClient, signInFixture } from './helpers';

const pending = { ...accountFixture, role: 'viewer', full_name: 'New Visitor', access_status: 'pending' as const };
const request = { id: accountFixture.id, email: accountFixture.email, full_name: 'New Visitor',
  access_status: 'pending', revision: 1, role: 'viewer', is_active: true, created_at: '2026-10-21T10:00:00Z', reviewed_at: null };

describe('visitor approval workflow', () => {
  it('registers a named visitor and shows the waiting page without requesting corpus data', async () => {
    window.location.hash = '#/signin';
    const fetch = mockApi(endpoint => endpoint === '/auth/register'
      ? jsonResponse({ access_token: 'pending-token', refresh_token: 'pending-refresh' }, 201)
      : endpoint === '/auth/me' ? jsonResponse(pending) : jsonResponse({ detail: 'Unexpected data read' }, 403));
    renderWithClient(<MockPublicationProvider mode="published"><App /></MockPublicationProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'New to GMEE? Create an account' }));
    expect(screen.getByLabelText('Full name').hasAttribute('required')).toBe(true);
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: ' New Visitor ' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: accountFixture.email } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'visitor-password-test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Request access' }));
    await screen.findByRole('heading', { name: 'Your account is awaiting approval.' });
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({ full_name: 'New Visitor', email: accountFixture.email, password: 'visitor-password-test' });
    expect(fetch.mock.calls.every(([url]) => /\/auth\/(register|me)$/.test(String(url)))).toBe(true);
    expect(screen.queryByRole('heading', { name: 'Find an article.' })).toBeNull();
  });
  it('blocks deep links for a pending user and enters viewing mode after checking approval', async () => {
    window.location.hash = '#/dashboard/atlas';
    signInFixture(pending);
    let approved = false;
    mockApi(endpoint => endpoint === '/auth/me' ? jsonResponse({ ...pending, access_status: approved ? 'approved' : 'pending' }) : jsonResponse({ available: false, reason: 'No fixture map' }));
    renderWithClient(<MockPublicationProvider mode="published"><App /></MockPublicationProvider>);
    await screen.findByRole('heading', { name: 'Your account is awaiting approval.' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Check approval' }).hasAttribute('disabled')).toBe(false));
    expect(screen.queryByRole('region', { name: 'Complete collection map' })).toBeNull();
    approved = true;
    fireEvent.click(screen.getByRole('button', { name: 'Check approval' }));
    await screen.findByText('Viewer account · Read-only access to published data. Analysis and editing are disabled.');
    expect(screen.queryByRole('heading', { name: 'Your account is awaiting approval.' })).toBeNull();
  });
  it('does not fetch publication metadata while anonymous or awaiting approval', async () => {
    signInFixture(pending);
    const fetch = mockApi(() => jsonResponse({ mode: 'published' }));
    renderWithClient(<PublicationProvider><p>Public page</p></PublicationProvider>);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(String(fetch.mock.calls[0][0])).toContain('/capabilities');
  });
  it('shows a rejected request without giving access to workspace pages', async () => {
    window.location.hash = '#/dashboard/browse';
    signInFixture({ ...pending, access_status: 'rejected' });
    mockApi(() => jsonResponse({ ...pending, access_status: 'rejected' }));
    renderWithClient(<MockPublicationProvider mode="published"><App /></MockPublicationProvider>);
    await screen.findByRole('heading', { name: 'Your request was not approved.' });
    expect(screen.queryByRole('textbox', { name: 'Search article titles or authors' })).toBeNull();
  });
  it('allows developers to grant viewing access without exposing passwords or roles to edit', async () => {
    signInFixture({ role: 'admin', id: 'developer-admin' });
    let reviewed = false;
    const fetch = mockApi((endpoint, init) => {
      if (endpoint === '/publications/access') return jsonResponse({ allowed: true });
      if (init?.method === 'POST') { reviewed = true; return jsonResponse({ ...request, access_status: 'approved', revision: 2 }); }
      return jsonResponse({ items: reviewed ? [] : [request], counts: { all: 1, pending: reviewed ? 0 : 1, approved: reviewed ? 1 : 0, rejected: 0 }, total: reviewed ? 0 : 1, limit: 20, offset: 0 });
    });
    renderWithClient(<AccountApprovals />);
    await screen.findByRole('heading', { name: 'All accounts' });
    fireEvent.change(screen.getByLabelText('Show'), { target: { value: 'pending' } });
    fireEvent.click(await screen.findByRole('button', { name: `Allow viewing for ${accountFixture.email}` }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm allow viewing' }));
    await screen.findByText(`${accountFixture.email}: approved for viewing only.`);
    expect(JSON.parse(String(fetch.mock.calls.find(([, init]) => init?.method === 'POST')?.[1]?.body))).toEqual({ action: 'allow', expected_revision: 1 });
    expect(screen.queryByRole('textbox')).toBeNull();
    await screen.findByText('No accounts are waiting for approval.');
  });
  it('defaults to every account, shows roles and disabled identities, and only reviews active pending viewers', async () => {
    signInFixture({ role: 'admin', id: 'developer-admin' });
    const accounts = [request,
      { ...request, id: 'admin', email: 'developer@example.com', role: 'admin', full_name: 'Developer', access_status: 'approved' },
      { ...request, id: 'researcher', email: 'researcher@example.com', role: 'researcher', full_name: 'Researcher', access_status: 'approved' },
      { ...request, id: 'disabled', email: 'disabled@example.com', full_name: 'Disabled Viewer', is_active: false },
      { ...request, id: 'user', email: 'user@example.com', role: 'user', full_name: 'Legacy User', access_status: 'approved' }];
    const fetch = mockApi(endpoint => endpoint === '/publications/access' ? jsonResponse({ allowed: true })
      : jsonResponse({ items: accounts, counts: { all: 5, pending: 2, approved: 3, rejected: 0 }, total: 5, limit: 20, offset: 0 }));
    renderWithClient(<AccountApprovals />);
    await screen.findByText('developer@example.com');
    for (const account of accounts) expect(screen.getByText(account.email)).toBeTruthy();
    expect(screen.getByText('Role: Developer / admin')).toBeTruthy();
    expect(screen.getByText('Role: Researcher')).toBeTruthy();
    expect(screen.getByText('Disabled account · Sign-in unavailable')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Allow viewing for / })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Ban developer@example.com' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ban researcher@example.com' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ban disabled@example.com' })).toBeNull();
    expect(screen.getAllByRole('button', { name: /^Decline / })).toHaveLength(1);
    expect(fetch.mock.calls.some(([url]) => String(url).includes('access_status=all'))).toBe(true);
    fireEvent.change(screen.getByLabelText('Show'), { target: { value: 'approved' } });
    await waitFor(() => expect(fetch.mock.calls.some(([url]) => String(url).includes('access_status=approved'))).toBe(true));
  });
  it('paginates the complete directory rather than silently limiting displayed emails', async () => {
    signInFixture({ role: 'admin', id: 'developer-admin' });
    const fetch = mockApi(endpoint => endpoint === '/publications/access' ? jsonResponse({ allowed: true })
      : jsonResponse({ items: [request], counts: { all: 21, pending: 21, approved: 0, rejected: 0 }, total: 21, limit: 20, offset: 0 }));
    renderWithClient(<AccountApprovals />);
    fireEvent.click(await screen.findByRole('button', { name: 'Next accounts' }));
    await waitFor(() => expect(fetch.mock.calls.some(([url]) => String(url).includes('offset=20'))).toBe(true));
    fireEvent.change(screen.getByLabelText('Show'), { target: { value: 'pending' } });
    await waitFor(() => expect(fetch.mock.calls.some(([url]) => String(url).includes('access_status=pending&offset=0'))).toBe(true));
  });
  it('keeps a failed stale decision visible and never repeats the mutation automatically', async () => {
    signInFixture({ role: 'admin', id: 'developer-admin' });
    const fetch = mockApi((endpoint, init) => endpoint === '/publications/access' ? jsonResponse({ allowed: true })
      : init?.method === 'POST' ? jsonResponse({ detail: 'Request changed. Refresh the list.' }, 409)
        : jsonResponse({ items: [request], counts: { all: 1, pending: 1, approved: 0, rejected: 0 }, total: 1, limit: 20, offset: 0 }));
    renderWithClient(<AccountApprovals />);
    fireEvent.click(await screen.findByRole('button', { name: 'Decline New Visitor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm decline request' }));
    await screen.findByText('Request changed. Refresh the list.');
    expect(fetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  });
  it.each(['pause', 'ban', 'allow'] as const)('confirms %s for the exact account and permits cancellation without a mutation', async action => {
    signInFixture({ role: 'admin', id: 'developer-admin' });
    const account = { ...request, access_status: action === 'allow' ? 'paused' : 'approved' };
    const fetch = mockApi((endpoint, init) => endpoint === '/publications/access' ? jsonResponse({ allowed: true })
      : init?.method === 'POST' ? jsonResponse({ ...account, revision: 2 })
        : jsonResponse({ items: [account], counts: { all: 1, pending: 0, approved: 1, rejected: 0, paused: 0, banned: 0 }, total: 1, limit: 20, offset: 0 }));
    renderWithClient(<AccountApprovals />);
    const buttonName = action === 'allow' ? `Allow viewing for ${accountFixture.email}` : `${action === 'pause' ? 'Pause' : 'Ban'} ${accountFixture.email}`;
    fireEvent.click(await screen.findByRole('button', { name: buttonName }));
    expect(screen.getByRole('dialog').textContent).toContain(accountFixture.email);
    expect(fetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(fetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: buttonName }));
    fireEvent.click(screen.getByRole('button', { name: action === 'allow' ? 'Confirm allow viewing' : action === 'pause' ? 'Confirm pause access' : 'Confirm ban account' }));
    await waitFor(() => expect(fetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1));
    const mutation = fetch.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(String(mutation?.[0])).toContain(`/developer/accounts/${accountFixture.id}/control`);
    expect(JSON.parse(String(mutation?.[1]?.body))).toEqual({ action, expected_revision: 1 });
  });
  it.each([['paused', 'Your data access is paused.'], ['banned', 'Your account is banned.']] as const)('blocks the workspace for a %s identity', async (status, heading) => {
    window.location.hash = '#/dashboard/atlas';
    signInFixture({ ...pending, access_status: status });
    mockApi(() => jsonResponse({ ...pending, access_status: status }));
    renderWithClient(<MockPublicationProvider mode="published"><App /></MockPublicationProvider>);
    await screen.findByRole('heading', { name: heading });
    expect(screen.queryByRole('region', { name: 'Complete collection map' })).toBeNull();
  });
  it('removes an idle reader workspace after its session is revoked', async () => {
    window.location.hash = '#/dashboard/browse';
    signInFixture({ role: 'viewer', access_status: 'approved' });
    mockApi(endpoint => ['/auth/me', '/auth/refresh'].includes(endpoint) ? jsonResponse({ detail: 'Session revoked' }, 401) : emptyDashboardApi(endpoint));
    vi.useFakeTimers();
    try {
      renderWithClient(<MockPublicationProvider mode="published"><App /></MockPublicationProvider>);
      expect(screen.getByRole('heading', { name: 'Find an article.' })).toBeTruthy();
      await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
      expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeTruthy();
      expect(screen.queryByRole('heading', { name: 'Find an article.' })).toBeNull();
    } finally { vi.useRealTimers(); }
  });
  it('does not fetch or show developer account controls for visitors', () => {
    signInFixture({ role: 'viewer', access_status: 'approved' });
    const fetch = mockApi(() => jsonResponse({ detail: 'Forbidden' }, 403));
    renderWithClient(<AccountApprovals />);
    expect(screen.queryByRole('region', { name: 'Account management' })).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
