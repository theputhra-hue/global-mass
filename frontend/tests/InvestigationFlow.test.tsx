import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { TopicInvestigation } from '../src/features/articles/pages/TopicInvestigation';
import { ArticleCoverage } from '../src/features/articles/components/ArticleCoverage';
import { ArticleInvestigation } from '../src/features/articles/pages/ArticleInvestigation';
import { MutationComparator } from '../src/features/comparison/components/MutationComparator';
import { SaveComparisonCase } from '../src/features/investigations/components/SaveComparisonCase';
import { parseTopicRoute, topicHref } from '../src/shared/navigation/topicRoutes';
import { articleHref, parseArticleRoute, signInDestination } from '../src/shared/navigation/articleRoutes';
import { ApiError } from '../src/shared/api/client';
import { MockPublicationProvider } from '../src/shared/runtime/publicationRuntime';
import { jsonResponse, mockApi, renderWithClient, signInFixture } from './helpers';

const run = 'aaaaaaaa-1111-1111-1111-111111111111', id = 'bbbbbbbb-1111-1111-1111-111111111111';
const other = 'cccccccc-1111-1111-1111-111111111111', claim = 'dddddddd-1111-1111-1111-111111111111';
const topic = { id: 'topic-1', label: 'River coverage', keywords: ['river'], article_count: 21 };
const back = '#/dashboard/atlas?release=' + run + '&topic=topic-1&cx=1&cy=2&zoom=3';
const coverage = { run_id: run, topic, total: 21, sources: 2, earliest: null, latest: null, offset: 0, next_offset: 20,
  items: [{ id, title: 'River report', domain: 'example.org', published_at: null, url: 'https://example.org/report', basis: 'title_only' }],
  connections: [{ neighbor_id: 'topic-2', neighbor_label: 'Flood reporting', support: 4, endpoints_a: 2, endpoints_b: 3 }], methods: {}, observed_propagation: false };
const context = { run_id: run, article_id: id, topic, basis: 'title_only', network_available: true,
  neighbors: [{ ...coverage.items[0], id: other, title: 'Another source report', score: .8 }], observed_propagation: false };
const topicRoute = (section = 'coverage', query = '') => parseTopicRoute(`dashboard/topics/topic-1/${section}?release=${run}&back=${encodeURIComponent(back)}${query}`)!;

describe('investigation-centered navigation', () => {
  it('starts sign-in at search and round-trips a pinned topic without exposing text in URLs', () => {
    expect(signInDestination('#/signin')).toBe('#/dashboard/browse');
    const href = topicHref(topic.id, run, 'timeline', { back, offset: 20 });
    expect(parseTopicRoute(href.slice(2))).toEqual({ id: topic.id, release: run, section: 'timeline', offset: 20, back, valid: true });
    expect(parseTopicRoute('dashboard/topics/topic-1/coverage')?.valid).toBe(false);
    expect(parseTopicRoute(`dashboard/topics/topic-1/fake?release=${run}`)?.valid).toBe(false);
  });
  it('shows paged topic coverage and preserves the exact release and map return in article links', async () => {
    const fetch = mockApi(() => jsonResponse(coverage));
    renderWithClient(<TopicInvestigation route={topicRoute()} />);
    await screen.findByRole('heading', { name: 'River coverage' });
    const articleLink = screen.getByRole('link', { name: 'Investigate article' }).getAttribute('href')!;
    const article = parseArticleRoute(articleLink.slice(2))!;
    expect(article.release).toBe(run);
    const parent = parseTopicRoute(article.back.slice(2))!;
    expect(parent.back).toBe(back);
    expect(screen.getByRole('link', { name: 'Next articles' }).getAttribute('href')).toContain('offset=20');
    expect(fetch.mock.calls.every(([, init]) => init?.method === 'GET')).toBe(true);
  });
  it('requests oldest-first publication order only for the timeline and explains its limits', async () => {
    const fetch = mockApi(() => jsonResponse(coverage));
    renderWithClient(<TopicInvestigation route={topicRoute('timeline', '&offset=20')} />);
    await screen.findByRole('heading', { name: 'River coverage' });
    expect(String(fetch.mock.calls[0][0])).toContain('order=oldest');
    expect(String(fetch.mock.calls[0][0])).toContain('offset=20');
    expect(screen.getByText(/Publication order does not establish who copied/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Previous articles' }).getAttribute('href')).not.toContain('offset=20');
  });
  it('opens related topics without losing the originating topic workspace', async () => {
    mockApi(() => jsonResponse(coverage));
    renderWithClient(<TopicInvestigation route={topicRoute('connections')} />);
    await screen.findByRole('heading', { name: 'Flood reporting' });
    const neighbor = parseTopicRoute(screen.getByRole('link', { name: 'Explore related topic' }).getAttribute('href')!.slice(2))!;
    expect(neighbor.id).toBe('topic-2');
    expect(neighbor.release).toBe(run);
    expect(parseTopicRoute(neighbor.back.slice(2))?.section).toBe('connections');
    expect(screen.getByText(/not people, readership or verified spread/)).toBeTruthy();
  });
  it('keeps absent topic methods honest and does not invent a model', async () => {
    mockApi(() => jsonResponse(coverage));
    renderWithClient(<TopicInvestigation route={topicRoute('methods')} />);
    expect(await screen.findByText(/have not been validated as event or misinformation labels/)).toBeTruthy();
    expect(screen.getAllByText('Not supplied')).toHaveLength(3);
  });
  it('hides cross-release topic results and rejects malformed topic links without fetching', async () => {
    const fetch = mockApi(() => jsonResponse({ ...coverage, run_id: other }));
    const { rerender, client } = renderWithClient(<TopicInvestigation route={topicRoute()} />);
    expect((await screen.findByRole('alert')).textContent).toContain('release changed');
    expect(screen.queryByRole('link', { name: 'Investigate article' })).toBeNull();
    const count = fetch.mock.calls.length;
    rerender(<QueryClientProvider client={client}><TopicInvestigation route={{ ...topicRoute(), valid: false }} /></QueryClientProvider>);
    expect(screen.getByRole('alert').textContent).toContain('invalid');
    expect(fetch.mock.calls).toHaveLength(count);
  });
  it('shows topic request failures as errors, not zero coverage', async () => {
    mockApi(() => jsonResponse({ detail: 'Topic projection unavailable' }, 503));
    renderWithClient(<TopicInvestigation route={topicRoute()} />);
    expect(await screen.findByText('Topic projection unavailable')).toBeTruthy();
    expect(screen.queryByText(/0 articles/)).toBeNull();
  });
  it('keeps semantic neighbors distinct from recorded claim links and returns to the current article', async () => {
    mockApi(() => jsonResponse(context));
    const parent = articleHref(id, 'related', { release: run, back });
    renderWithClient(<ArticleCoverage id={id} release={run} back={parent} />);
    expect(await screen.findByText('Another source report')).toBeTruthy();
    expect(screen.getByText(/Cosine similarity 0.800/)).toBeTruthy();
    const next = parseArticleRoute(screen.getByRole('link', { name: 'Investigate related article' }).getAttribute('href')!.slice(2))!;
    expect(next.back).toBe(parent);
    expect(next.release).toBe(run);
  });
  it('distinguishes missing semantic analysis from an unclassified article and from a failed request', async () => {
    mockApi(() => jsonResponse({ ...context, topic: null, network_available: false, neighbors: [] }));
    renderWithClient(<ArticleCoverage id={id} release={run} back={back} />);
    expect(await screen.findByText(/No topic was assigned/)).toBeTruthy();
    expect(screen.getByText(/network has not been published/)).toBeTruthy();
  });
  it('keeps a comparison draft when moving among article sections', async () => {
    signInFixture();
    const article = { id, title: 'River report', url: 'https://example.org/report', claims_total: 1, body: '', domain: 'example.org' };
    const fetch = mockApi(endpoint => endpoint.includes('/claims?') ? jsonResponse({ total: 1, items: [{ id: claim, text: 'River rose.', entities: [] }], selected: null })
      : endpoint.includes('/connections?') ? jsonResponse({ total_edges: 0, edges: [], articles: [article] }) : jsonResponse(article));
    const initialRoute = parseArticleRoute(articleHref(id, 'changes', { release: run, against: other, back }).slice(2))!;
    const { rerender, client } = renderWithClient(<ArticleInvestigation route={initialRoute} />);
    fireEvent.change(await screen.findByLabelText('Older text'), { target: { value: 'Unfinished comparison draft' } });
    fireEvent.change(screen.getByLabelText('Newer text'), { target: { value: 'A later draft with additional details' } });
    fireEvent.change(screen.getByLabelText('Context note'), { target: { value: 'Check both original sources before comparing.' } });
    const articleRoute = parseArticleRoute(within(screen.getByRole('navigation', { name: 'Article details' })).getByRole('link', { name: 'Article', exact: true }).getAttribute('href')!.slice(2))!;
    expect(articleRoute).toMatchObject({ tab: 'article', release: run, against: other, back });
    rerender(<QueryClientProvider client={client}><ArticleInvestigation route={articleRoute} /></QueryClientProvider>);
    expect(screen.queryByRole('button', { name: 'Compare mutations' })).toBeNull();
    const articleNav = screen.getByRole('navigation', { name: 'Article details' });
    expect(within(articleNav).getByRole('link', { name: 'Article', exact: true }).getAttribute('aria-current')).toBe('page');
    expect(within(articleNav).getByText('Investigate further').closest('details')?.open).toBe(false);
    fireEvent.click(within(articleNav).getByText('Investigate further'));
    const changesRoute = parseArticleRoute(within(articleNav).getByRole('link', { name: 'Changes' }).getAttribute('href')!.slice(2))!;
    expect(changesRoute).toMatchObject({ tab: 'changes', release: run, against: other, back });
    rerender(<QueryClientProvider client={client}><ArticleInvestigation route={changesRoute} /></QueryClientProvider>);
    expect((screen.getByLabelText('Older text') as HTMLTextAreaElement).value).toBe('Unfinished comparison draft');
    expect((screen.getByLabelText('Newer text') as HTMLTextAreaElement).value).toBe('A later draft with additional details');
    expect((screen.getByLabelText('Context note') as HTMLTextAreaElement).value).toBe('Check both original sources before comparing.');
    const nav = screen.getByRole('navigation', { name: 'Article details' });
    expect(within(nav).getByRole('link', { name: 'Changes' }).getAttribute('aria-current')).toBe('page');
    expect(within(nav).getByText('Investigate further').closest('details')?.open).toBe(true);
    expect(fetch.mock.calls.every(([, init]) => init?.method === 'GET')).toBe(true);
  });
  it('saves a server-computed comparison with source context and private notes only after explicit action', async () => {
    signInFixture();
    const fetch = mockApi(endpoint => jsonResponse(endpoint === '/casebook' ? { id: other } : { analysis: { mutation_types: [], observed_propagation: false } }));
    renderWithClient(<MutationComparator initialOlder="Twelve homes" initialNewer="Eighteen homes" context={{ title: 'River coverage review', source: 'https://example.org/report', note: `Article ${id} · release ${run}` }} />);
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Compare mutations' }));
    const notes = await screen.findByLabelText('Private review notes');
    fireEvent.change(notes, { target: { value: 'Needs source review.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save comparison & notes' }));
    const saved = await screen.findByRole('link', { name: 'Open saved investigation to review or export' });
    expect(saved.getAttribute('href')).toBe(`#/dashboard/casebook?case=${other}`);
    const body = JSON.parse(String(fetch.mock.calls.find(([url]) => String(url).endsWith('/casebook'))![1]?.body));
    expect(body).toMatchObject({ title: 'River coverage review', notes: 'Needs source review.', comparison: { older_text: 'Twelve homes', newer_text: 'Eighteen homes', provenance_url: 'https://example.org/report', context_note: `Article ${id} · release ${run}` } });
    expect(body.analysis).toBeUndefined();
  });
  it('loads a chosen comparison source from the same release and preserves its provenance', async () => {
    signInFixture();
    const article = { id, title: 'River report', url: 'https://example.org/report', claims_total: 1, domain: 'example.org' };
    const fetch = mockApi(endpoint => endpoint.includes(`/articles/${other}/claims?`)
      ? jsonResponse({ total: 1, items: [{ id: claim, text: 'Earlier report: twelve homes.', entities: [] }], selected: null })
      : endpoint.includes('/claims?') ? jsonResponse({ total: 0, items: [], selected: null })
      : endpoint.includes('/connections?') ? jsonResponse({ total_edges: 0, edges: [], articles: [article] })
      : jsonResponse({ ...article, id: endpoint.includes(other) ? other : id }));
    const route = parseArticleRoute(articleHref(id, 'changes', { release: run, against: other, back }).slice(2))!;
    renderWithClient(<MockPublicationProvider mode="published"><ArticleInvestigation route={route} /></MockPublicationProvider>);
    fireEvent.change(await screen.findByLabelText('Passage from the comparison source'), { target: { value: claim } });
    expect((screen.getByLabelText('Older text') as HTMLTextAreaElement).value).toBe('Earlier report: twelve homes.');
    expect((screen.getByLabelText('Context note') as HTMLTextAreaElement).value).toContain(`comparison article ${other}`);
    expect((screen.getByLabelText('Context note') as HTMLTextAreaElement).value).toContain(`comparison claim ${claim}`);
    const requests = fetch.mock.calls.map(([url]) => String(url)).filter(url => url.includes(other));
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.every(url => url.includes(`release=${run}`))).toBe(true);
    expect(parseArticleRoute(screen.getByRole('link', { name: 'Inspect comparison source' }).getAttribute('href')!.slice(2))?.back).toBe(articleHref(id, 'changes', { release: run, against: other, back }));
  });
  it('does not automatically repeat a save whose outcome is uncertain', async () => {
    signInFixture();
    mockApi(() => { throw new ApiError(0, null, 'Uncertain save', 'timeout'); });
    renderWithClient(<SaveComparisonCase input={{ older_text: 'A', newer_text: 'B' }} title="Review" />);
    fireEvent.click(screen.getByRole('button', { name: 'Save comparison & notes' }));
    await waitFor(() => expect(screen.getByText(/Check Saved investigations before/)).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Save comparison & notes' }).hasAttribute('disabled')).toBe(true);
  });
});
