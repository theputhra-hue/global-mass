import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/app/App';
import { AccountApprovals } from '../src/features/developer/components/AccountApprovals';
import { MockPublicationProvider, PublicationProvider } from '../src/shared/runtime/publicationRuntime';
import { accountFixture, jsonResponse, mockApi, renderWithClient, signInFixture } from './helpers';

const pending = { ...accountFixture, role: 'viewer', full_name: 'New Visitor', access_status: 'pending' as const };
const request = { id: accountFixture.id, email: accountFixture.email, full_name: 'New Visitor',
  access_status: 'pending', revision: 1, role: 'viewer', created_at: '2026-10-21T10:00:00Z', reviewed_at: null };

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
    signInFixture({ role: 'admin' });
    let reviewed = false;
    const fetch = mockApi((endpoint, init) => {
      if (endpoint === '/publications/access') return jsonResponse({ allowed: true });
      if (init?.method === 'POST') { reviewed = true; return jsonResponse({ ...request, access_status: 'approved', revision: 2 }); }
      return jsonResponse({ items: reviewed ? [] : [request], counts: { pending: reviewed ? 0 : 1, approved: reviewed ? 1 : 0, rejected: 0 }, total: reviewed ? 0 : 1, limit: 20, offset: 0 });
    });
    renderWithClient(<AccountApprovals />);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve New Visitor for viewing' }));
    await screen.findByText('New Visitor: approved for viewing only.');
    expect(JSON.parse(String(fetch.mock.calls.find(([, init]) => init?.method === 'POST')?.[1]?.body))).toEqual({ decision: 'approve', expected_revision: 1 });
    expect(screen.queryByRole('textbox')).toBeNull();
    await screen.findByText('No accounts are waiting for approval.');
  });
  it('keeps a failed stale decision visible and never repeats the mutation automatically', async () => {
    signInFixture({ role: 'admin' });
    const fetch = mockApi((endpoint, init) => endpoint === '/publications/access' ? jsonResponse({ allowed: true })
      : init?.method === 'POST' ? jsonResponse({ detail: 'Request changed. Refresh the list.' }, 409)
        : jsonResponse({ items: [request], counts: { pending: 1, approved: 0, rejected: 0 }, total: 1, limit: 20, offset: 0 }));
    renderWithClient(<AccountApprovals />);
    fireEvent.click(await screen.findByRole('button', { name: 'Decline New Visitor' }));
    await screen.findByText('Request changed. Refresh the list.');
    expect(fetch.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  });
  it('does not fetch or show developer account controls for visitors', () => {
    signInFixture({ role: 'viewer', access_status: 'approved' });
    const fetch = mockApi(() => jsonResponse({ detail: 'Forbidden' }, 403));
    renderWithClient(<AccountApprovals />);
    expect(screen.queryByRole('region', { name: 'Visitor access requests' })).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
