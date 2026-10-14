import { act, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { clearSession } from '../src/lib/session';
import { mockApi, renderWithClient, signInFixture } from './helpers';
vi.mock('../src/pages/ReaderDashboard', () => ({ ReaderDashboard: () => <div>Private dashboard</div> }));
vi.mock('../src/pages/SystemHealth', () => ({ SystemHealth: () => <div>Private dashboard</div> }));
describe('dashboard sign-in boundary', () => {
  it('redirects signed-out deep links before mounting data panels', async () => {
    const fetch = mockApi(() => { throw new Error('Data must not be requested'); });
    window.history.replaceState(null, '', '/#/dashboard/masala');
    renderWithClient(<App />);
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeTruthy();
    expect(screen.queryByText('Private dashboard')).toBeNull();
    await waitFor(() => expect(window.location.hash).toBe('#/signin'));
    expect(fetch).not.toHaveBeenCalled();
  });
  it('opens data after sign-in and removes it when the session ends', async () => {
    window.history.replaceState(null, '', '/#/signin');
    renderWithClient(<App />);
    act(() => signInFixture());
    expect(await screen.findByText('Private dashboard')).toBeTruthy();
    await waitFor(() => expect(window.location.hash).toBe('#/dashboard'));
    act(() => clearSession());
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeTruthy();
    expect(screen.queryByText('Private dashboard')).toBeNull();
  });
});
