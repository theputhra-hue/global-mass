import { act, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/app/App';
import { clearSession } from '../src/shared/session/session';
import { mockApi, renderWithClient, signInFixture } from './helpers';
vi.mock('../src/features/articles/pages/ReaderDashboard', () => ({ ReaderDashboard: ({ view }: { view: string }) => <div>Private dashboard: reader {view}</div> }));
vi.mock('../src/features/investigations/components/Casebook', () => ({ Casebook: () => <div>Private dashboard</div> }));
vi.mock('../src/features/operations/pages/SystemHealth', () => ({ SystemHealth: () => <div>Private dashboard</div> }));
describe('dashboard sign-in boundary', () => {
  it('redirects signed-out deep links before mounting data panels', async () => {
    const fetch = mockApi(() => { throw new Error('Data must not be requested'); });
    window.history.replaceState(null, '', '/#/dashboard/masala');
    renderWithClient(<App />);
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeTruthy();
    expect(screen.queryByText('Private dashboard')).toBeNull();
    await waitFor(() => expect(window.location.hash).toBe(`#/signin?next=${encodeURIComponent('#/dashboard/masala')}`));
    expect(fetch).not.toHaveBeenCalled();
  });
  it('opens data after sign-in and removes it when the session ends', async () => {
    window.history.replaceState(null, '', '/#/signin');
    renderWithClient(<App />);
    act(() => signInFixture());
    expect(await screen.findByText('Private dashboard: reader browse')).toBeTruthy();
    await waitFor(() => expect(window.location.hash).toBe('#/dashboard/browse'));
    act(() => clearSession());
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeTruthy();
    expect(screen.queryByText('Private dashboard')).toBeNull();
  });
  it('restores the requested article deep link after sign-in', async () => {
    const requested = '#/dashboard/articles/11111111-1111-1111-1111-111111111111/claims?claim=22222222-2222-2222-2222-222222222222';
    mockApi(() => new Response(JSON.stringify({ detail: 'Article not found' }), { status: 404 }));
    window.history.replaceState(null, '', `/#/signin?next=${encodeURIComponent(requested)}`);
    renderWithClient(<App />);
    act(() => signInFixture());
    await waitFor(() => expect(window.location.hash).toBe(requested));
    expect(await screen.findByText('Article not found')).toBeTruthy();
  });
  it.each(['project', 'casebook'])('keeps the new %s workspace behind the existing sign-in boundary', async tab => {
    const fetch = mockApi(() => { throw new Error('Data must not be requested'); });
    window.history.replaceState(null, '', `/#/dashboard/${tab}`);
    renderWithClient(<App />);
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeTruthy();
    await waitFor(() => expect(window.location.hash).toBe(`#/signin?next=${encodeURIComponent(`#/dashboard/${tab}`)}`));
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['project', 'casebook'])('opens the %s advanced workspace for a signed-in account', tab => {
    signInFixture();
    window.history.replaceState(null, '', `/#/dashboard/${tab}`);
    renderWithClient(<App />);
    expect(screen.getByText('Private dashboard')).toBeTruthy();
    expect(screen.queryByText(/Private dashboard: reader/)).toBeNull();
  });
  it.each(['browse', 'compare', 'check'])('preserves the guided reader %s route', tab => {
    signInFixture();
    window.history.replaceState(null, '', `/#/dashboard/${tab}`);
    renderWithClient(<App />);
    expect(screen.getByText(`Private dashboard: reader ${tab}`)).toBeTruthy();
  });
  it('opens the tools directory while keeping operational tools out of the reader navigation', () => {
    signInFixture();
    window.history.replaceState(null, '', '/#/dashboard/tools');
    renderWithClient(<App />);
    expect(screen.getByRole('heading', { name: 'Research tools' })).toBeTruthy();
    const homeLinks = screen.getAllByRole('link', { name: 'Find articles' });
    expect(homeLinks.length).toBeGreaterThan(0);
    expect(homeLinks[0].getAttribute('href')).toBe('#/dashboard/browse');
  });
});
