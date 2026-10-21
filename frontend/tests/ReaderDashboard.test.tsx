import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReaderDashboard } from '../src/features/articles/pages/ReaderDashboard';
import { MockPublicationProvider } from '../src/shared/runtime/publicationRuntime';
import { jsonResponse, mockApi, renderWithClient, zeroDashboard } from './helpers';

describe('reader dashboard', () => {
  it('opens article search and real collection results directly on home', async () => {
    mockApi(endpoint => endpoint === '/dashboard' ? jsonResponse({ ...zeroDashboard, articles_total: 12, claims_total: 21 }) : jsonResponse({ total: 1, items: [{ id: 'one', title: 'A report ready to read', domain: 'example.com', url: 'https://example.com/story', published_at: null }] }));
    renderWithClient(<ReaderDashboard />);
    expect(screen.getByRole('textbox', { name: 'Search article titles or authors' })).toBeTruthy();
    expect(await screen.findByRole('link', { name: 'A report ready to read' })).toBeTruthy();
    expect(screen.getByText('21')).toBeTruthy();
  });
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
  it('preserves the source filter and published release when opening an article', async () => {
    const release = '11111111-1111-1111-1111-111111111111';
    const article = '22222222-2222-2222-2222-222222222222';
    window.history.replaceState(null, '', '/#/dashboard/browse?q=flood&domain=example.com&offset=6');
    const fetch = mockApi(() => jsonResponse({ run_id: release, total: 13, items: [{ id: article, title: 'Filtered source report', domain: 'example.com', url: 'https://example.com/story', published_at: null }] }));
    renderWithClient(<MockPublicationProvider mode="published"><ReaderDashboard view="browse" /></MockPublicationProvider>);
    const details = await screen.findByRole('link', { name: 'Open details' });
    const params = new URLSearchParams(details.getAttribute('href')!.split('?')[1]);
    expect(params.get('release')).toBe(release);
    expect(params.get('back')).toBe('#/dashboard/browse?q=flood&domain=example.com&offset=6');
    expect(fetch.mock.calls.some(([url]) => new URL(String(url), 'http://localhost').searchParams.get('domain') === 'example.com')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Next articles' }));
    await waitFor(() => expect(window.location.hash).toBe('#/dashboard/browse?q=flood&domain=example.com&offset=12'));
  });
});
