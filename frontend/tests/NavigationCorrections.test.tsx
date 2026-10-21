import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/app/App';
import { TOOL_REGISTRY, findTool } from '../src/shared/navigation/registry';
import { navigateHash } from '../src/shared/navigation/articleRoutes';
import { MockPublicationProvider } from '../src/shared/runtime/publicationRuntime';
import { emptyDashboardApi, jsonResponse, mockApi, renderWithClient, signInFixture } from './helpers';

const articleId = '11111111-1111-1111-1111-111111111111';
const claimId = '22222222-2222-2222-2222-222222222222';
const title = 'A source report with recorded evidence';

function fixture(mode: 'local' | 'published' = 'local', calls: string[] = [], allowed = false) {
  signInFixture({ role: 'admin' });
  mockApi(endpoint => {
    calls.push(endpoint);
    if (endpoint === '/publications/access') return jsonResponse({ allowed, mode: 'staging', max_bytes: 10485760 });
    if (endpoint === '/publications/runs') return jsonResponse({ items: [] });
    if (endpoint.startsWith('/corpus/articles?')) return jsonResponse({ total: 13, limit: 6, offset: 0, domains: [], items: [{ id: articleId, title, domain: 'news.example' }] });
    if (endpoint.includes(`/articles/${articleId}/claims?`)) {
      const offset = Number(new URL(endpoint, 'http://fixture').searchParams.get('offset') || 0);
      return jsonResponse({ article_id: articleId, total: 41, items: [{ id: claimId, text: `Recorded statement at offset ${offset}`, article_id: articleId, entities: [] }], selected: null, limit: 20, offset });
    }
    if (endpoint === `/corpus/articles/${articleId}`) return jsonResponse({ id: articleId, title, domain: 'news.example', claims_total: 41 });
    if (endpoint.startsWith('/corpus/claims?')) return jsonResponse({ total: 1, items: [{ id: claimId, article_id: articleId, text: 'Recorded water statement', title, domain: 'news.example', verdict: 'UNSUPPORTED', verdict_probability: 0.29 }] });
    return emptyDashboardApi(endpoint);
  });
  return renderWithClient(<MockPublicationProvider mode={mode}><App /></MockPublicationProvider>);
}

function visit(hash: string) { act(() => navigateHash(hash)); }

describe('Navigation review regressions', () => {
  it('collapses the desktop sidebar to an accessible rail and remembers the preference', () => {
    window.history.replaceState(null, '', '/#/dashboard');
    fixture('published');
    const sidebar = screen.getByRole('complementary', { name: 'Workspace navigation' });
    fireEvent.click(within(sidebar).getByRole('button', { name: 'Collapse navigation sidebar' }));
    expect(sidebar.getAttribute('data-collapsed')).toBe('true');
    expect(localStorage.getItem('gmee:sidebar-collapsed')).toBe('true');
    expect(within(sidebar).getByRole('link', { name: 'Story map' }).getAttribute('href')).toBe('#/dashboard/atlas');
    expect(within(sidebar).getByRole('button', { name: 'Account' })).toBeTruthy();
    fireEvent.click(within(sidebar).getByRole('button', { name: 'Expand navigation sidebar' }));
    expect(sidebar.getAttribute('data-collapsed')).toBe('false');
    expect(localStorage.getItem('gmee:sidebar-collapsed')).toBe('false');
  });
  it('keeps core destinations visible and specialist routes inside Research tools', async () => {
    window.history.replaceState(null, '', '/#/dashboard');
    fixture('published');
    const nav = screen.getByRole('navigation', { name: 'Primary destinations' });
    const toggle = within(nav).getByRole('button', { name: 'Research tools' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(within(nav).getByRole('link', { name: 'Find articles' })).toBeTruthy();
    expect(within(nav).getByRole('link', { name: 'Story map' })).toBeTruthy();
    expect(within(nav).queryByRole('link', { name: 'Extracted statements' })).toBeNull();
    fireEvent.click(toggle);
    expect(within(nav).getByRole('link', { name: 'Extracted statements' })).toBeTruthy();
    fireEvent.click(toggle);
    visit('#/dashboard/claims');
    await waitFor(() => expect(toggle.getAttribute('aria-expanded')).toBe('true'));
    expect(within(nav).getByRole('link', { name: 'Extracted statements' }).getAttribute('aria-current')).toBe('page');
  });
  it('resolves every canonical ID and href before considering synonyms', () => {
    for (const tool of TOOL_REGISTRY) {
      expect(findTool(tool.id)?.id, tool.id).toBe(tool.id);
      expect(findTool(tool.href)?.id, tool.href).toBe(tool.id);
    }
    expect(findTool('Neo4j Graph Engine')?.id).toBe('graph');
  });

  it.each(['', '/browse', '/compare', '/developer', '/upload'])('renders exactly one shell and content landmark on %s', async path => {
    window.history.replaceState(null, '', `/#/dashboard${path}`);
    fixture('published');
    expect(document.querySelectorAll('main')).toHaveLength(1);
    expect(document.querySelectorAll('#main-content')).toHaveLength(1);
    expect(screen.queryByRole('navigation', { name: 'Workspace' })).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Dashboard sections' })).toBeNull();
    await waitFor(() => expect(within(screen.getByRole('navigation', { name: 'Primary destinations' })).queryByRole('link', { name: 'Manage data' })).toBeNull());
  });

  it('makes search the first authenticated destination without an extra dashboard', async () => {
    window.history.replaceState(null, '', '/#/dashboard');
    const calls: string[] = [];
    fixture('published', calls);
    expect(screen.getByRole('textbox', { name: 'Search article titles or authors' })).toBeTruthy();
    await waitFor(() => expect(window.location.hash).toBe('#/dashboard/browse'));
    expect(calls.some(path => path.startsWith('/corpus/articles?'))).toBe(true);
  });

  it('preserves the bookmarked source filter through pagination, detail and return', async () => {
    const initial = '#/dashboard/browse?q=flood&domain=news.example&offset=6';
    window.history.replaceState(null, '', `/${initial}`);
    const calls: string[] = [];
    fixture('local', calls);
    expect((screen.getByLabelText('Source domain (optional)') as HTMLInputElement).value).toBe('news.example');
    await screen.findByRole('link', { name: title });
    const search = new URL(calls.find(path => path.startsWith('/corpus/articles?'))!, 'http://fixture');
    expect(search.searchParams.get('domain')).toBe('news.example');
    fireEvent.click(screen.getByRole('button', { name: 'Next articles' }));
    await waitFor(() => expect(window.location.hash).toContain('offset=12'));
    const link = await screen.findByRole('link', { name: 'Open details' });
    visit(link.getAttribute('href')!);
    const back = screen.getByRole('link', { name: 'Back to results' }).getAttribute('href')!;
    expect(back).toBe('#/dashboard/browse?q=flood&domain=news.example&offset=12');
    visit(back);
    expect((screen.getByLabelText('Source domain (optional)') as HTMLInputElement).value).toBe('news.example');
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    await waitFor(() => expect(window.location.hash).toBe('#/dashboard/browse?q=&offset=0'));
    expect((screen.getByLabelText('Source domain (optional)') as HTMLInputElement).value).toBe('');
    visit(initial); // Same route event used by browser Back/Forward.
    expect((screen.getByLabelText('Search article titles or authors') as HTMLInputElement).value).toBe('flood');
    expect((screen.getByLabelText('Source domain (optional)') as HTMLInputElement).value).toBe('news.example');
  });

  it('submits local article filtering and restores selection and claim page after a detail visit', async () => {
    window.history.replaceState(null, '', '/#/dashboard/claims');
    const calls: string[] = [];
    fixture('local', calls);
    const filter = screen.getByLabelText('Filter articles by title or author');
    await screen.findByLabelText(/Select an article/);
    const before = calls.length;
    fireEvent.change(filter, { target: { value: 'river basin' } });
    expect(calls).toHaveLength(before);
    fireEvent.click(screen.getByRole('button', { name: 'Find articles' }));
    await waitFor(() => expect(window.location.hash).toContain('articleQuery=river+basin'));
    fireEvent.change(await screen.findByLabelText(/Select an article/), { target: { value: articleId } });
    await screen.findByText('Recorded statement at offset 0');
    fireEvent.click(screen.getByRole('button', { name: 'Next claims' }));
    await screen.findByText('Recorded statement at offset 20');
    const detail = screen.getByRole('link', { name: 'Open full article' }).getAttribute('href')!;
    const expected = `#/dashboard/claims?article=${articleId}&articleQuery=river+basin&offset=20`;
    expect(new URLSearchParams(detail.split('?')[1]).get('back')).toBe(expected);
    visit(detail);
    expect(screen.getByRole('link', { name: 'Back to investigation' }).getAttribute('href')).toBe(expected);
    visit(expected);
    await screen.findByText('Recorded statement at offset 20');
    expect((screen.getByLabelText(/Select an article/) as HTMLSelectElement).value).toBe(articleId);
    expect((screen.getByLabelText('Filter articles by title or author') as HTMLInputElement).value).toBe('river basin');
  });

  it('ignores malformed local article IDs and negative pagination', async () => {
    window.history.replaceState(null, '', '/#/dashboard/claims?article=invalid&offset=-20');
    const calls: string[] = [];
    fixture('local', calls);
    await screen.findByLabelText(/Select an article/);
    expect(calls.some(path => path.includes('/invalid/claims'))).toBe(false);
    expect(screen.queryByRole('link', { name: 'Open full article' })).toBeNull();
  });

  it.each(['overview', 'graph', 'vector'])('names local-only %s correctly in published mode', id => {
    window.history.replaceState(null, '', `/#/dashboard/${id}`);
    fixture('published');
    expect(screen.getByRole('heading', { name: `${findTool(id)?.label} runs on the local analysis PC.` })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'Search article titles or authors' })).toBeNull();
  });

  it('labels the stored support score without implying a truth probability', async () => {
    window.history.replaceState(null, '', '/#/dashboard/claims?q=water');
    fixture('published');
    expect(await screen.findByText('UNSUPPORTED · heuristic support score 0.290 (uncalibrated)')).toBeTruthy();
    expect(screen.queryByText(/29%/)).toBeNull();
  });

  it('shares article metadata with breadcrumbs and identifies the selected tab', async () => {
    window.history.replaceState(null, '', `/#/dashboard/articles/${articleId}/article`);
    const calls: string[] = [];
    fixture('published', calls);
    await screen.findByRole('heading', { name: title });
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByRole('link', { name: title })).toBeTruthy();
    expect(within(breadcrumb).getByText('Article text').getAttribute('aria-current')).toBe('page');
    expect(calls.filter(path => path === `/corpus/articles/${articleId}`)).toHaveLength(1);
  });

  it('portals mobile navigation outside the app, isolates the background and traps both Tab directions', async () => {
    window.history.replaceState(null, '', '/#/dashboard/tools');
    const { container } = fixture('published');
    const opener = screen.getByRole('button', { name: 'Open navigation menu' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Navigation menu' });
    expect(container.contains(dialog)).toBe(false);
    expect(container.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(dialog, { key: 'Tab' });
    const close = within(dialog).getByRole('button', { name: 'Close navigation menu' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    const last = within(dialog).getByRole('link', { name: 'Help & methods' });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(container.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(opener);
  });
});
