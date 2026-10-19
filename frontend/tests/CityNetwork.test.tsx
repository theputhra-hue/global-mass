import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ArticleAtlas from '../src/features/graph/components/ArticleAtlas';
import { buildCityScene, parseCityView, percentile95, prioritizeCityEdges, sizeRadius, visibleCityEdges } from '../src/features/graph/lib/cityScene';
import { loadCityNetwork, type CitySummary, type CompleteCity } from '../src/shared/api/cityNetwork';
import type { AtlasArticle, AtlasSummary } from '../src/shared/api/articleMap';
import { jsonResponse, mockApi, renderWithClient } from './helpers';

const articles: AtlasArticle[] = ['First report', 'Second report', 'Third report'].map((title, i) => ({ id: `article-${i}`, title, domain: 'example.test', topic_id: `topic-${i < 2 ? 0 : 1}`, basis: 'title_only', x: i * 5, y: i * -4, duplicate_of: null }));
const map: AtlasSummary = { total_articles: 3, unclassified: 0, topics: [{ id: 'topic-0', label: 'Bridges', keywords: ['bridges'], article_count: 2 }, { id: 'topic-1', label: 'Transport', keywords: ['transport'], article_count: 1 }], coverage: { title_only: 3 }, completed_at: '2026-10-20T00:00:00Z', embedding_model: 'fixture', embedding_revision: 'a'.repeat(40), method: 'fixture', projection: 'fixture', input_sha256: 'b'.repeat(64) };
const summary: CitySummary = { article_ids: articles.map(a => a.id), degree: [2, 2, 2], total_roads: 3, method: 'mutual-cosine-city-v1', calibration: 'exploratory_not_human_validated', neighbor_k: 2, min_similarity: .55, min_highway_support: 2, min_highway_endpoints: 1, highways: [{ a: 'topic-0', b: 'topic-1', support: 2, endpoints_a: 2, endpoints_b: 1 }], themes: [{ id: 'theme-0', label: 'Infrastructure', topics: ['topic-0', 'topic-1'], article_count: 3 }], superways: [], completed_at: map.completed_at, embedding_model: 'fixture', embedding_revision: 'a'.repeat(40), input_sha256: map.input_sha256 };
const city: CompleteCity = { available: true, run_id: 'release-a', summary, roads: [[0, 1, .9], [0, 2, .8], [1, 2, .7]] };
const roadPage = { available: true, run_id: 'release-a', total: 3, offset: 0, next_offset: null, summary, items: city.roads };

describe('semantic city transport', () => {
  it('pins every road page and verifies exact degree totals', async () => {
    const fetch = mockApi(path => path.includes('offset=') ? jsonResponse({ ...roadPage, offset: 2, summary: null, items: city.roads.slice(2) }) : jsonResponse({ ...roadPage, next_offset: 2, items: city.roads.slice(0, 2) }));
    const result = await loadCityNetwork('release-a');
    expect(result.roads).toEqual(city.roads);
    expect(fetch.mock.calls.every(call => String(call[0]).includes('release=release-a'))).toBe(true);
  });
  it.each(['release', 'duplicate', 'incomplete', 'degree', 'endpoint', 'threshold'])('rejects %s corruption', async failure => {
    const data = structuredClone(roadPage);
    if (failure === 'release') data.run_id = 'release-b';
    if (failure === 'duplicate') data.items[1] = data.items[0];
    if (failure === 'incomplete') data.items = data.items.slice(0, 2);
    if (failure === 'degree') data.summary.degree[0] = 1;
    if (failure === 'endpoint') data.items[0][1] = 100;
    if (failure === 'threshold') data.items[0][2] = .1;
    mockApi(() => jsonResponse(data));
    await expect(loadCityNetwork('release-a')).rejects.toThrow();
  });
  it('retains an honest unavailable state for older releases', async () => {
    mockApi(() => jsonResponse({ detail: 'Old endpoint' }, 404));
    expect((await loadCityNetwork('release-a')).available).toBe(false);
  });
});

describe('meaningful city geometry', () => {
  it('restores bounded shareable camera state and rejects malformed view links', () => {
    expect(parseCityView('12,-40,2.5')).toEqual({ x: 12, y: -40, zoom: 2.5 });
    for (const value of [null, '', ',,1', 'NaN,0,1', '0,0,Infinity', '0,0,100', '1000000,0,1', '0,0']) expect(parseCityView(value)).toBeNull();
  });
  it('uses bounded area-aware sizes and a stable percentile domain', () => {
    expect(sizeRadius(0, 10, 2.5, 7)).toBe(2.5);
    expect(sizeRadius(10, 10, 2.5, 7)).toBe(7);
    expect(sizeRadius(100, 10, 2.5, 7)).toBe(7);
    expect(sizeRadius(2, 10, 2.5, 7)).toBeLessThan(sizeRadius(5, 10, 2.5, 7));
    expect(percentile95([1, 4, 2, 3])).toBe(3);
    expect(percentile95([])).toBe(1);
  });
  it('keeps major routes and selected streets inside a bounded drawing budget', () => {
    const edges = buildCityScene(articles, map, city).edges;
    const before = structuredClone(edges);
    expect(prioritizeCityEdges(edges, null, null)[0].kind).toBe('highway');
    expect(prioritizeCityEdges(edges, null, 'street:0')[0].id).toBe('street:0');
    expect(edges).toEqual(before);
  });
  it('keeps article coordinates and recorded source data immutable while adding typed hubs', () => {
    const before = structuredClone(articles), scene = buildCityScene(articles, map, city);
    expect(scene.nodes.filter(n => n.kind === 'article').map(n => [n.x, n.y])).toEqual(articles.map(a => [a.x, a.y]));
    expect(scene.nodes.filter(n => n.kind === 'topic')).toHaveLength(2);
    expect(scene.nodes.filter(n => n.kind === 'theme')).toHaveLength(1);
    expect(scene.edges).toHaveLength(4); expect(articles).toEqual(before);
    expect(visibleCityEdges(scene, 'city', 'auto', null)).toHaveLength(1);
    expect(visibleCityEdges(scene, 'city', 'auto', 'article-0')).toHaveLength(3);
    expect(visibleCityEdges(scene, 'article', 'auto', null)).toHaveLength(4);
    expect(visibleCityEdges(scene, 'article', 'off', null)).toHaveLength(1);
  });
  it('does not move unsupported inputs into the semantic city or invent their roads', () => {
    const unsupported = { ...articles[0], id: 'unsupported', basis: 'unsupported_language' as const, x: null, y: null, topic_id: null };
    const scene = buildCityScene([...articles, unsupported], map);
    expect(scene.unsupported).toEqual([unsupported]); expect(scene.nodes.some(n => n.id === 'unsupported')).toBe(false);
    expect(scene.edges).toEqual([]);
    expect(() => buildCityScene([...articles, unsupported], map, city)).toThrow(/index differs/);
  });
  it.each(['highway', 'theme', 'superway', 'model'])('rejects misleading %s metadata', failure => {
    const invalid = structuredClone(city);
    if (failure === 'highway') invalid.summary!.highways[0].support = 99;
    if (failure === 'theme') invalid.summary!.themes[0].article_count = 99;
    if (failure === 'superway') invalid.summary!.superways.push({ a: 'theme-0', b: 'unknown', support: 5, highways: 1 });
    if (failure === 'model') invalid.summary!.embedding_model = 'another-model';
    expect(() => buildCityScene(articles, map, invalid)).toThrow();
  });
});

describe('spacious city investigation', () => {
  it('explains streets, aggregate support and source navigation', async () => {
    window.location.hash = '#/dashboard/atlas';
    mockApi(path => path.includes('/roads?') ? jsonResponse(roadPage) : jsonResponse({ available: true, run_id: 'release-a', offset: 0, total: 3, next_offset: null, summary: map, items: articles }));
    renderWithClient(<ArticleAtlas />);
    expect(await screen.findByText(/3 semantic streets/)).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: 'Select mapped article' }), { target: { value: 'article-0' } });
    const inspector = screen.getByRole('region', { name: 'Selected mapped article' });
    expect(document.activeElement).toBe(inspector);
    expect(within(inspector).getByRole('link', { name: 'Open article details' }).getAttribute('href')).toContain('release-a');
    fireEvent.click(within(inspector).getByRole('button', { name: /Second report/ }));
    expect(screen.getByRole('region', { name: 'Selected map connection' }).textContent).toContain('Cosine similarity 0.900');
    fireEvent.change(screen.getByRole('combobox', { name: 'Select map connection' }), { target: { value: 'highway:topic-0:topic-1' } });
    expect(screen.getByRole('region', { name: 'Selected map connection' }).textContent).toContain('2 matching pairs');
    fireEvent.click(screen.getByRole('button', { name: 'Close map inspector' }));
    expect(screen.queryByRole('region', { name: 'Selected map connection' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('group', { name: 'City relationship map' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Uniform article sizes' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Article street visibility' }), { target: { value: 'all' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fit complete city' }));
  });
});
