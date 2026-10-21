import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReaderDashboard } from '../src/features/articles/pages/ReaderDashboard';
import { jsonResponse, mockApi, renderWithClient, zeroDashboard } from './helpers';

describe('reader dashboard', () => {
  it('shows real totals, explains claims, and links to original articles', async () => {
    mockApi(endpoint => endpoint === '/dashboard' ? jsonResponse({ ...zeroDashboard, articles_total: 12, claims_total: 21 }) : jsonResponse({ total: 1, items: [{ id: 'one', title: 'An example report', domain: 'example.com', url: 'https://example.com/story', published_at: null }] }));
    renderWithClient(<ReaderDashboard view="browse" />);
    expect(await screen.findByText('An example report')).toBeTruthy();
    expect(screen.getByText('21')).toBeTruthy();
    expect(screen.getByText('Statements identified in articles, not verified facts.')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Read original source/ }).getAttribute('href')).toBe('https://example.com/story');
    expect(screen.getByText(/Publication date unknown/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Explore all tools & guides' }).getAttribute('href')).toBe('#/dashboard/tools');
  });
  it('searches only after submission and explains empty results', async () => {
    const fetch = mockApi(endpoint => endpoint === '/dashboard' ? jsonResponse(zeroDashboard) : jsonResponse({ total: 0, items: [] }));
    renderWithClient(<ReaderDashboard view="browse" />);
    await screen.findByText('No articles are available yet.');
    fireEvent.change(screen.getByLabelText('Search article titles or authors'), { target: { value: 'flood report' } });
    expect(fetch.mock.calls.some(([url]) => String(url).includes('q=flood'))).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Search articles' }));
    await waitFor(() => expect(fetch.mock.calls.some(([url]) => String(url).includes('q=flood+report'))).toBe(true));
    expect(await screen.findByText('No matching articles. Try a shorter phrase or another author.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Next articles' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('shows a fetch failure instead of an empty collection', async () => {
    mockApi(endpoint => endpoint === '/dashboard' ? jsonResponse(zeroDashboard) : jsonResponse({ detail: 'Service unavailable' }, 503));
    renderWithClient(<ReaderDashboard view="browse" />);
    expect(await screen.findByText('Service unavailable')).toBeTruthy();
    expect(screen.queryByText('No articles are available yet.')).toBeNull();
  });
});
