import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FullGraph } from '../src/shared/api/graph';
import FullCorpusGraph from '../src/features/graph/components/FullCorpusGraph';
import { normalizeGraph, selectGraph, topologyKey } from '../src/features/graph/lib/graphModel';
import { articleScene, preferredDistance } from '../src/features/graph/lib/graphLayout';
import { useGraphLayout } from '../src/features/graph/lib/useGraphLayout';
import { jsonResponse, mockApi, renderWithClient } from './helpers';

const a = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', b = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const nodes = [{ id: a, title: 'Flood levels', domain: 'one.example' }, { id: b, title: 'Earlier reporting', domain: 'two.example' }, { id: 'isolated', title: 'Unlinked report', domain: null }];
const similarity = { id: 'sim', src: a, dst: b, score: .9, relationship_type: 'SIMILAR_TO', score_kind: 'similarity', score_family: 'claims_similarity' };
const evolution = { id: 'evolution', src: b, dst: a, score: .99, relationship_type: 'EVOLVED_FROM', score_kind: 'relationship_strength', score_family: 'claim_evolution' };
const source: FullGraph = { nodes, edges: [similarity, evolution], counts: { nodes: 3, edges: 2 }, run_id: 'fixture-release', basis: 'fixture_recorded_links' };

describe('recorded graph model and layout', () => {
  it('normalizes malformed records without inventing scores, identities or relationship types', () => {
    const result = normalizeGraph({ ...source, nodes: [...nodes, nodes[0], { id: '', title: 'Bad', domain: null }], edges: [similarity, similarity, { ...similarity, id: 'bad', score: NaN }, { src: a, dst: 'missing', score: 1 }, { src: a, dst: a, score: 1 }, { src: b, dst: a, score: .4 }] });
    expect(result.nodes).toHaveLength(3);
    expect(result.diagnostics).toMatchObject({ duplicateNodes: 1, duplicateEdges: 1, invalidNodes: 1, invalidEdges: 1, invalidScores: 1, selfLinks: 1 });
    expect(result.edges.find(e => e.id === 'bad')).toMatchObject({ score: null, raw_score: 'NaN' });
    expect(result.edges.find(e => e.relationship_type === 'UNKNOWN')).toMatchObject({ directed: null, score_kind: 'unknown' });
    expect(JSON.stringify(result)).not.toContain('"score":NaN');
  });
  it('preserves zero scores and applies a threshold only to its comparable family', () => {
    const graph = normalizeGraph({ ...source, edges: [{ ...similarity, score: 0 }, evolution] });
    const filtered = selectGraph(graph, '', '', '', .8, 'claims_similarity');
    expect(graph.edges.find(e => e.id === 'sim')?.score).toBe(0);
    expect(filtered.edges.map(e => e.id)).toEqual(['evolution']);
    expect(filtered.edges[0]).toMatchObject({ src: b, dst: a, directed: true });
  });
  it('keeps search to one hop and never treats an unknown edge as similarity', () => {
    const graph = normalizeGraph({ ...source, edges: [similarity, { src: b, dst: 'isolated', score: .9 }] });
    expect(selectGraph(graph, '', 'Flood').nodes.map(n => n.id).sort()).toEqual([a, b]);
    expect(graph.edges.find(e => e.relationship_type === 'UNKNOWN')?.score_kind).toBe('unknown');
  });
  it('uses stronger comparable scores for shorter preferred and controlled pair distances', () => {
    expect(preferredDistance({ ...similarity, score: 1 })).toBe(45);
    expect(preferredDistance({ ...similarity, score: 0 })).toBe(195);
    expect(preferredDistance({ ...evolution, score: 1 })).toBe(100);
    expect(preferredDistance({ ...similarity, score: null })).toBe(100);
    expect(preferredDistance({ ...similarity, score_family: undefined })).toBe(100);
    const pair = (score: number) => articleScene({ ...source, nodes: nodes.slice(0, 2), edges: [{ ...similarity, score }] });
    const length = (scene: ReturnType<typeof pair>) => Math.hypot(scene.nodes[0].x - scene.nodes[1].x, scene.nodes[0].y - scene.nodes[1].y);
    expect(length(pair(.95))).toBeLessThan(length(pair(.2)));
  });
  it('is reproducible without input mutation, with explicit component packing and isolate counts', () => {
    const before = structuredClone(source), result = articleScene(source);
    expect(articleScene(source)).toEqual(result);
    expect(source).toEqual(before);
    expect(result.nodes).toHaveLength(2);
    expect(result.isolated).toBe(1);
    expect(result.edges).toHaveLength(2);
    expect(result.nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true);
    expect(topologyKey(source, 1)).toBe(topologyKey(structuredClone(source), 1));
    expect(topologyKey(source, 2)).not.toBe(topologyKey(source, 1));
  });
});

describe('recorded graph interface', () => {
  it('shows an honest zero-edge state and paginates all unlinked records without a canvas', async () => {
    mockApi(() => jsonResponse({ ...source, nodes: Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, title: `Report ${i}`, domain: null })), edges: [] }));
    const { container } = renderWithClient(<FullCorpusGraph />);
    await screen.findByRole('heading', { name: 'No recorded connections in this snapshot' });
    expect(container.querySelector('canvas')).toBeNull();
    expect(within(screen.getByRole('region', { name: 'Graph records' })).getAllByRole('article')).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: 'Next records' }));
    expect(screen.getByText('13–24 of 30 records')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include unlinked records in lists' }));
    expect(screen.getByRole('button', { name: 'Show unlinked records' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show unlinked records' }));
    expect(screen.getByText('1–12 of 30 records')).toBeTruthy();
  });
  it('shows typed directions and exact neighbors without calling inference', async () => {
    const fetch = mockApi(() => jsonResponse(source));
    renderWithClient(<FullCorpusGraph />);
    await screen.findByRole('option', { name: 'Earlier reporting' });
    fireEvent.change(screen.getByLabelText('Inspect a node (keyboard alternative)'), { target: { value: b } });
    const inspector = screen.getByRole('region', { name: 'Selected graph record' });
    expect(within(inspector).getByText(/Candidate evolution \(child → parent\) · Outgoing to parent/)).toBeTruthy();
    expect(within(inspector).getByText(/Similarity · Undirected/)).toBeTruthy();
    expect(fetch.mock.calls.every(([, init]) => !init?.method || init.method === 'GET')).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Selected graph record' })).toBeNull();
  });
  it('clears a selected node when filtering removes it and retains unknown metadata explanations', async () => {
    mockApi(() => jsonResponse(source));
    renderWithClient(<FullCorpusGraph />);
    await screen.findByRole('option', { name: 'Earlier reporting' });
    fireEvent.change(screen.getByLabelText('Inspect a node (keyboard alternative)'), { target: { value: b } });
    fireEvent.change(screen.getByLabelText('Graph title search'), { target: { value: 'no title matches' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search graph titles' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Selected graph record' })).toBeNull());
    expect(screen.getByText(/Selection limits and whole-corpus totals are unavailable/)).toBeTruthy();
  });
  it('distinguishes invalid graph payloads and API failure from legitimate no links', async () => {
    mockApi(() => jsonResponse({ detail: 'Store unavailable' }, 503));
    const rendered = renderWithClient(<FullCorpusGraph />);
    expect(await screen.findByText('Store unavailable')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'No recorded connections' })).toBeNull();
    rendered.unmount();
    mockApi(() => jsonResponse({ nodes: 'bad', edges: [] }));
    renderWithClient(<FullCorpusGraph />);
    expect(await screen.findByText('Invalid graph response')).toBeTruthy();
  });
  it('exports a reproducible displayed snapshot without arbitrary private node fields', async () => {
    const create = vi.fn(() => 'blob:graph-fixture'), revoke = vi.fn();
    const OriginalURL = URL;
    vi.stubGlobal('URL', class extends OriginalURL { static createObjectURL = create; static revokeObjectURL = revoke; });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    mockApi(() => jsonResponse({ ...source, nodes: source.nodes.map(node => ({ ...node, raw_metadata: 'SECRET_NOT_EXPORT' })) }));
    renderWithClient(<FullCorpusGraph />);
    const button = await screen.findByRole('button', { name: 'Export displayed graph' });
    await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false));
    fireEvent.click(button);
    expect(create).toHaveBeenCalledTimes(1);
    const file = create.mock.calls[0][0] as Blob;
    const text = await new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsText(file); });
    const output = JSON.parse(text);
    expect(output.layout.version).toBe('recorded-force-v1');
    expect(output.layout.positions).toHaveLength(2);
    expect(output.nodes).toHaveLength(3);
    expect(output.edges).toHaveLength(2);
    expect(text).not.toContain('SECRET_NOT_EXPORT');
    expect(revoke).toHaveBeenCalledWith('blob:graph-fixture');
  });
  it('preserves current graph filters and selected claim in article return links', async () => {
    window.history.replaceState(null, '', '/#/dashboard/fullgraph');
    mockApi(() => jsonResponse({ ...source, nodes: source.nodes.map(node => ({ ...node, article_id: a })) }));
    renderWithClient(<FullCorpusGraph />);
    fireEvent.click(screen.getByRole('button', { name: 'Claims' }));
    await screen.findByRole('option', { name: 'Flood levels' });
    fireEvent.change(screen.getByLabelText('Graph title search'), { target: { value: 'Flood' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search graph titles' }));
    fireEvent.change(screen.getByLabelText('Inspect a node (keyboard alternative)'), { target: { value: b } });
    const link = within(screen.getByRole('region', { name: 'Selected graph record' })).getByRole('link', { name: 'Open article details' });
    const params = new URLSearchParams(link.getAttribute('href')!.split('?')[1]);
    expect(params.get('claim')).toBe(b);
    const back = params.get('back')!;
    expect(back).toContain('mode=claims');
    expect(back).toContain('q=Flood');
    expect(back).toContain(`node=${b}`);
  });
});

describe('worker lifecycle', () => {
  it('does not relayout identical refetches and cancels obsolete work before accepting a new result', async () => {
    const workers: FakeWorker[] = [];
    class FakeWorker {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      onerror: (() => void) | null = null;
      terminate = vi.fn(); postMessage = vi.fn();
      constructor() { workers.push(this); }
    }
    vi.stubGlobal('Worker', FakeWorker);
    function Harness({ data }: { data: FullGraph }) { const layout = useGraphLayout(normalizeGraph(data), 1, true); return <p>{layout.scene ? 'Layout ready' : 'Working'}</p>; }
    const rendered = render(<Harness data={source} />);
    expect(workers).toHaveLength(1);
    expect(workers[0].postMessage.mock.calls[0][0].graph.edges[0].references).toBeUndefined();
    rendered.rerender(<Harness data={structuredClone(source)} />);
    expect(workers).toHaveLength(1);
    rendered.rerender(<Harness data={{ ...source, edges: [similarity] }} />);
    expect(workers[0].terminate).toHaveBeenCalled();
    expect(workers).toHaveLength(2);
    act(() => workers[0].onmessage?.({ data: { scene: articleScene(source) } }));
    expect(screen.queryByText('Layout ready')).toBeNull();
    act(() => workers[1].onmessage?.({ data: { scene: articleScene({ ...source, edges: [similarity] }), elapsedMs: 12 } }));
    expect(screen.getByText('Layout ready')).toBeTruthy();
    rendered.unmount();
    expect(workers[1].terminate).toHaveBeenCalled();
  });
});
