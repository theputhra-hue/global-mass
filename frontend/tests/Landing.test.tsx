import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Landing } from '../src/pages/Landing';
import { emptyDashboardApi, jsonResponse, mockApi, renderWithClient, zeroDashboard, signInFixture } from './helpers';

describe('honest landing statistics', () => {
  it('keeps signed-out visitors on sign-in links without fetching corpus data', () => {
    const fetch = mockApi(() => { throw new Error('Anonymous landing must not fetch private workspace data'); });
    renderWithClient(<Landing />);
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByText('Sign in to view articles and collection data.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sign in to explore' }).getAttribute('href')).toBe('#/signin');
    expect(screen.queryByText('Connecting to real dashboard metrics…')).toBeNull();
    expect(within(screen.getByText('claims indexed').parentElement!).getByText('—')).toBeTruthy();
  });
  it('renders real zero counts without fabricated hero fallback counts', async () => {
    mockApi(emptyDashboardApi);
    signInFixture();
    renderWithClient(<Landing />);
    const claimLabel = screen.getByText('claims indexed');
    await screen.findByText('3 / 3');
    expect(within(claimLabel.parentElement!).getByText('0')).toBeTruthy();
    expect(within(screen.getByText('graph nodes').parentElement!).getByText('0')).toBeTruthy();
    expect(within(screen.getByText('graph relationships').parentElement!).getByText('0')).toBeTruthy();
    expect(screen.queryByText(/10,000\+|27,132|80,107/)).toBeNull();
    expect(screen.queryByText(/decorative globe/)).toBeNull();
  });

  it('keeps initial/unavailable counts unknown and offers actual retry', async () => {
    let failure = true;
    const fetch = mockApi((endpoint) => endpoint === '/dashboard' ? failure ? jsonResponse({ detail: 'Dashboard unavailable' }, 503) : jsonResponse(zeroDashboard) : emptyDashboardApi(endpoint));
    signInFixture();
    renderWithClient(<Landing />);
    fireEvent.click(screen.getByText('More about the project & technical details'));
    expect(screen.getByText('Connecting to real dashboard metrics…')).toBeTruthy();
    expect(await screen.findByText('Dashboard unavailable')).toBeTruthy();
    expect(within(screen.getByText('claims indexed').parentElement!).getByText('—')).toBeTruthy();
    expect(screen.queryByText('3 / 3')).toBeNull();
    failure = false;
    fireEvent.click(screen.getByRole('button', { name: /Retry dashboard metrics/ }));
    expect(await screen.findByText('3 / 3')).toBeTruthy();
    expect(fetch.mock.calls.filter(([url]) => String(url).endsWith('/dashboard'))).toHaveLength(2);
  });
});
