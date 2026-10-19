import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArticleInvestigation } from '../src/features/articles/pages/ArticleInvestigation';
import { articleHref, navigateHash, parseArticleRoute, safeReturn } from '../src/shared/navigation/articleRoutes';
import { getAccessToken } from '../src/shared/session/session';
import { jsonResponse, mockApi, renderWithClient, signInFixture } from './helpers';

const id = '11111111-1111-1111-1111-111111111111';
const claimId = '22222222-2222-2222-2222-222222222222';
const other = '33333333-3333-3333-3333-333333333333';
const detail = { id, title: 'River levels rise', domain: 'example.org', url: 'https://example.org/report', author: null,
  published_at: '2026-10-01T10:00:00Z', collected_at: '2026-10-02T10:00:00Z', processed_at: null,
  body: 'Available report text', body_source: 'content', content_completeness: 'unknown', claims_total: 1,
  processing_status: 'processed', nlp_status: 'completed', language: 'en', word_count: 3 };
const claim = { id: claimId, article_id: id, text: 'River levels rose by two metres.', extracted_at: '2026-10-02T11:00:00Z', confidence: .6, verdict: null, verdict_probability: null, verdict_rationale: null, verdict_evidence: null, entities: [] };
const connections = { article_id: id, basis: 'stored_postgres_claim_relationships', total_edges: 1, limit: 100, truncated: false,
  articles: [detail, { ...detail, id: other, title: 'Earlier coverage', published_at: '2026-09-30T10:00:00Z' }],
  edges: [{ id: 'edge', from_article_id: id, to_article_id: other, from_claim_id: claimId, to_claim_id: other, from_text: claim.text, to_text: 'Earlier river level report', relationship_type: 'EVOLVED_FROM', score: .91, mutation_evidence: null }] };
function fixture(endpoint: string) {
  if (endpoint.includes('/claims?')) return jsonResponse({ article_id: id, total: 1, items: [claim], selected: endpoint.includes('selected=') ? claim : null, limit: 20, offset: 0 });
  if (endpoint.includes('/connections?')) return jsonResponse(connections);
  return jsonResponse(detail);
}
function route(tab = 'overview', query = '') { return parseArticleRoute(`dashboard/articles/${id}/${tab}${query}`)!; }

describe('article investigation', () => {
  it('shows all-claim assessment totals separately from the bounded overview preview', async () => {
    const fetch = mockApi(endpoint => endpoint.includes('/claims?') ? jsonResponse({ article_id: id, total: 25, items: [
      { ...claim, verdict: 'UNSUPPORTED', verdict_probability: .29, verdict_rationale: 'Stored corpus comparison.' },
    ], selected: null, limit: 20, offset: 0 }) : jsonResponse({ ...detail, claims_total: 25, assessment_counts: { UNSUPPORTED: 24, UNASSESSED: 1 } }));
    renderWithClient(<ArticleInvestigation route={route('overview')} />);
    const analysis = await screen.findByRole('region', { name: 'Saved article analysis' });
    expect(await within(analysis).findByText('Stored corpus comparison.')).toBeTruthy();
    expect(within(analysis).getByText('24')).toBeTruthy();
    expect(within(analysis).getByText('No saved assessment')).toBeTruthy();
    expect(within(analysis).getByText(/Preview: 1 of 25/)).toBeTruthy();
    expect(within(analysis).getByText(/heuristic support score 0.290 \(uncalibrated\)/)).toBeTruthy();
    expect(fetch.mock.calls.every(([, init]) => !init?.method || init.method === 'GET')).toBe(true);
  });
  it('keeps missing overview claims distinct from a failed claims request', async () => {
    mockApi(endpoint => endpoint.includes('/claims?') ? jsonResponse({ detail: 'Saved claim service unavailable' }, 503) : jsonResponse(detail));
    renderWithClient(<ArticleInvestigation route={route('overview')} />);
    expect(await screen.findByText('Saved claim service unavailable')).toBeTruthy();
    expect(screen.queryByText(/This article has no saved extracted/)).toBeNull();
  });
  it('preserves claim, pagination and return state when using the mobile section selector', async () => {
    mockApi(fixture);
    renderWithClient(<ArticleInvestigation route={route('claims', `?claim=${claimId}&offset=20&back=${encodeURIComponent('#/dashboard/browse?q=river')}`)} />);
    await screen.findByRole('heading', { name: detail.title });
    fireEvent.change(screen.getByLabelText('Jump to article section'), { target: { value: 'methods' } });
    const next = parseArticleRoute(window.location.hash.slice(2));
    expect(next).toMatchObject({ tab: 'methods', claim: claimId, offset: 20, back: '#/dashboard/browse?q=river' });
  });
  it('updates and repeats a query route without clearing the memory-only session', () => {
    signInFixture();
    navigateHash('#/dashboard/browse?q=river&offset=6');
    navigateHash('#/dashboard/browse?q=river&offset=6');
    expect(window.location.hash).toBe('#/dashboard/browse?q=river&offset=6');
    expect(getAccessToken()).toBe('test-access');
  });
  it('opens a real detail page with all nine tabs and preserves the source and result query', async () => {
    const fetch = mockApi(fixture);
    renderWithClient(<ArticleInvestigation route={route('overview', `?back=${encodeURIComponent('#/dashboard/browse?q=river&offset=6')}`)} />);
    await screen.findByRole('heading', { name: 'River levels rise' });
    expect(within(screen.getByRole('navigation', { name: 'Article details' })).getAllByRole('link')).toHaveLength(9);
    expect(screen.getByRole('link', { name: /Read original source/ }).getAttribute('href')).toBe(detail.url);
    expect(screen.getByRole('link', { name: /Back to results/ }).getAttribute('href')).toBe('#/dashboard/browse?q=river&offset=6');
    expect(fetch.mock.calls.every(([, init]) => !init?.method || init.method === 'GET')).toBe(true);
    expect(fetch.mock.calls.some(([url]) => String(url).includes('/connections'))).toBe(false);
  });
  it('selects a claim and prefills evidence without automatically running AI', async () => {
    signInFixture(); const fetch = mockApi(fixture);
    renderWithClient(<ArticleInvestigation route={route('evidence', `?claim=${claimId}`)} />);
    expect((await screen.findByLabelText('Claim to check') as HTMLTextAreaElement).value).toBe(claim.text);
    expect(screen.getByText('No stored assessment')).toBeTruthy();
    expect(fetch.mock.calls.every(([, init]) => init?.method === 'GET')).toBe(true);
  });
  it('requires claim selection before offering evidence computation', async () => {
    const fetch = mockApi(fixture);
    renderWithClient(<ArticleInvestigation route={route('evidence')} />);
    expect(await screen.findByText(/Choose a claim above/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Check corpus evidence' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Selected claim'), { target: { value: claimId } });
    expect(window.location.hash).toContain(`claim=${claimId}`);
    expect(fetch.mock.calls.every(([, init]) => init?.method === 'GET')).toBe(true);
  });
  it('prefills recorded parent/child texts in the correct comparison order', async () => {
    signInFixture(); mockApi(fixture);
    renderWithClient(<ArticleInvestigation route={route('changes', `?claim=${claimId}`)} />);
    expect((await screen.findByLabelText('Older text') as HTMLTextAreaElement).value).toBe('Earlier river level report');
    expect((screen.getByLabelText('Newer text') as HTMLTextAreaElement).value).toBe(claim.text);
  });
  it('reports a relationship outage independently instead of saying there are no links', async () => {
    mockApi(endpoint => endpoint.includes('/connections?') ? jsonResponse({ detail: 'Relationship store unavailable' }, 503) : fixture(endpoint));
    renderWithClient(<ArticleInvestigation route={route('related')} />);
    expect(await screen.findByText('Relationship store unavailable')).toBeTruthy();
    expect(screen.getByRole('heading', { name: detail.title })).toBeTruthy();
    expect(screen.queryByText(/No cross-article coverage links/)).toBeNull();
  });
  it('keeps every advanced destination and marks provenance unknown', async () => {
    mockApi(fixture); renderWithClient(<ArticleInvestigation route={route('methods')} />);
    expect(await screen.findByText('Not recorded in this article response')).toBeTruthy();
    for (const name of ['Overview Vitals', 'Neo4j Graph Engine', 'Postgres Vector', 'Redis Queue', 'Graph', 'Timeline', 'Masala Lab', 'FactCheck', 'Eval Lab', 'Corpus']) {
      expect(screen.getByRole('heading', { name, exact: true }).closest('a')).toBeTruthy();
    }
  });
  it('orders the focused timeline by publication time and labels the selected article', async () => {
    mockApi(fixture); renderWithClient(<ArticleInvestigation route={route('timeline')} />);
    await screen.findByRole('heading', { name: 'Earlier coverage' });
    const items = screen.getAllByRole('listitem');
    expect(items[0].textContent).toContain('Earlier coverage');
    expect(items[1].textContent).toContain('Selected article');
  });
  it('shows a focused graph with exact claim links and truncation notice', async () => {
    mockApi(endpoint => endpoint.includes('/connections?') ? jsonResponse({ ...connections, truncated: true, total_edges: 150 }) : fixture(endpoint));
    renderWithClient(<ArticleInvestigation route={route('graph')} />);
    expect(await screen.findByRole('img', { name: /Article relationship map/ })).toBeTruthy();
    expect(screen.getByText(/Showing the strongest 1 of 150/)).toBeTruthy();
    expect(screen.getByRole('link', { name: claim.text }).getAttribute('href')).toContain(`claim=${claimId}`);
  });
  it('treats an invalid route as invalid without fetching or falling back to global data', async () => {
    const fetch = mockApi(fixture);
    renderWithClient(<ArticleInvestigation route={parseArticleRoute('dashboard/articles/not-a-uuid/claims')!} />);
    expect(screen.getByText(/This article link is invalid/)).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('shows missing text and zero claims honestly, while unsafe source URLs never become links', async () => {
    mockApi(() => jsonResponse({ ...detail, body: '', url: 'javascript:alert(1)', claims_total: 0 }));
    renderWithClient(<ArticleInvestigation route={route('article')} />);
    expect(await screen.findByText(/No text was stored/)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Read original source/ })).toBeNull();
  });
  it('supports keyboard navigation through the detail sections', async () => {
    mockApi(fixture); renderWithClient(<ArticleInvestigation route={route()} />);
    await screen.findByRole('heading', { name: detail.title });
    const nav = screen.getByRole('navigation', { name: 'Article details' });
    const links = within(nav).getAllByRole('link'); links[0].focus();
    fireEvent.keyDown(nav, { key: 'ArrowRight' }); expect(document.activeElement).toBe(links[1]);
    fireEvent.keyDown(nav, { key: 'End' }); expect(document.activeElement).toBe(links[8]);
  });
  it('round-trips deep link state and blocks external return URLs', () => {
    const href = articleHref(id, 'claims', { claim: claimId, offset: 20, back: '#/dashboard/browse?q=river&offset=6' });
    expect(parseArticleRoute(href.slice(2))).toEqual({ id, tab: 'claims', valid: true, claim: claimId, offset: 20, back: '#/dashboard/browse?q=river&offset=6' });
    expect(safeReturn('https://evil.example')).toBe('#/dashboard/browse');
    expect(safeReturn('#/dashboard/../signin')).toBe('#/dashboard/browse');
  });
  it('keeps an empty graph distinct from an error', async () => {
    mockApi(endpoint => endpoint.includes('/connections?') ? jsonResponse({ ...connections, total_edges: 0, edges: [], articles: [detail] }) : fixture(endpoint));
    renderWithClient(<ArticleInvestigation route={route('graph')} />);
    expect(await screen.findByText('No stored claim links are available for this article.')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Recorded relationships unavailable')).toBeNull());
  });
});
