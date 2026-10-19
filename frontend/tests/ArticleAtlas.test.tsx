import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ArticleAtlas from '../src/features/graph/components/ArticleAtlas';
import { loadArticleMap } from '../src/shared/api/articleMap';
import { atlasScene } from '../src/features/graph/lib/articleAtlas';
import { jsonResponse, mockApi, renderWithClient } from './helpers';

const article = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', title: 'Synthetic bridge report', domain: 'example.test', topic_id: 'topic-0', basis: 'title_only' as const, x: 2, y: 3, duplicate_of: null };
const summary = { total_articles: 1, unclassified: 0, topics: [{ id: 'topic-0', label: 'Synthetic bridges', keywords: ['bridge'], article_count: 1 }], coverage: { title_only: 1 }, completed_at: '2026-10-20T00:00:00Z', embedding_model: 'fixture', embedding_revision: 'a'.repeat(40), method: 'fixture', projection: 'fixture', input_sha256: 'b'.repeat(64) };
const first = { available: true, run_id: 'release-a', offset: 0, total: 1, next_offset: null, summary, items: [article] };

describe('complete collection loading', () => {
  it('uses a requested immutable release on the first page', async () => {
    const fetch = mockApi(() => jsonResponse(first));
    await loadArticleMap(undefined, undefined, 'release-a');
    expect(String(fetch.mock.calls[0][0])).toContain('release=release-a');
  });
  it('pins later pages to the first release and retains records beyond a bounded graph', async () => {
    const fetch = mockApi(path => path.includes('offset=') ? jsonResponse({ ...first, offset: 1, total: 2, summary: null, items: [{ ...article, id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' }] }) : jsonResponse({ ...first, total: 2, summary: { ...summary, total_articles: 2 }, next_offset: 1 }));
    const result = await loadArticleMap();
    expect(result.articles).toHaveLength(2);
    expect(String(fetch.mock.calls[1][0])).toContain('release=release-a');
  });
  it('rejects changed releases, duplicate records and incomplete pages', async () => {
    mockApi(() => jsonResponse({ unexpected: true }));
    await expect(loadArticleMap()).rejects.toThrow(/Invalid collection/);
    mockApi(path => path.includes('offset=') ? jsonResponse({ ...first, run_id: 'release-b', offset: 1, total: 2 }) : jsonResponse({ ...first, total: 2, summary: { ...summary, total_articles: 2 }, next_offset: 1 }));
    await expect(loadArticleMap()).rejects.toThrow(/changed/);
    mockApi(() => jsonResponse({ ...first, total: 2, summary: { ...summary, total_articles: 2 }, items: [article, article] }));
    await expect(loadArticleMap()).rejects.toThrow(/duplicate/);
    mockApi(() => jsonResponse({ ...first, total: 2, summary: { ...summary, total_articles: 2 } }));
    await expect(loadArticleMap()).rejects.toThrow(/incomplete/);
  });
  it('includes every record without fabricating links and keeps unavailable coordinates separate', () => {
    const input = [article, { ...article, id: 'unavailable', x: null, y: null, topic_id: null }];
    const before = structuredClone(input), scene = atlasScene(input);
    expect(scene.nodes).toHaveLength(2); expect(scene.edges).toEqual([]);
    expect(scene.nodes[1].x).toBeGreaterThan(1000); expect(input).toEqual(before);
  });
});

describe('article atlas interface', () => {
  it('explains unavailable topic maps without pretending the archive is empty', async () => {
    mockApi(() => jsonResponse({ available: false, reason: 'Older release', run_id: 'old' }));
    renderWithClient(<ArticleAtlas />);
    expect(await screen.findByText('Article topics have not been published yet.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Browse source articles' })).toBeTruthy();
  });
  it('shows coverage, topic filters, full-title search and source drill-down', async () => {
    window.location.hash = '#/dashboard/atlas';
    mockApi(() => jsonResponse(first));
    renderWithClient(<ArticleAtlas />);
    expect(await screen.findByText(/Complete collection loaded: 1 of 1/)).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: 'Select mapped article' }), { target: { value: article.id } });
    const inspector = screen.getByRole('region', { name: 'Selected mapped article' });
    expect(within(inspector).getByRole('link', { name: 'Open article details' }).getAttribute('href')).toContain('/overview?back=');
    fireEvent.change(screen.getByRole('combobox', { name: 'Topic group' }), { target: { value: '__unclassified' } });
    expect(screen.getByText('No articles match these map filters.')).toBeTruthy();
    expect(window.location.hash).toContain('topic=__unclassified');
    fireEvent.click(screen.getByRole('button', { name: 'Clear map filters' }));
    expect(window.location.hash).toBe('#/dashboard/atlas?release=release-a');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search all mapped articles' }), { target: { value: 'missing topic' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search map' }));
    expect(screen.getByText('No articles match these map filters.')).toBeTruthy();
  });
});
