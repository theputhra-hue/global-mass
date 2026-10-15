import { screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FullCorpusGraph from '../src/components/FullCorpusGraph';
import { GraphVisualizer } from '../src/components/GraphVisualizer';
import { clearSelectedArticle, useSelectedArticle } from '../src/lib/useSelectedArticle';
import { jsonResponse, mockApi, renderWithClient } from './helpers';

const articleId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const claimId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const articleGraph = { nodes: [{ id: articleId, title: 'Actual corpus article', domain: 'source.example', url: 'https://source.example/a', deg: 0 }], edges: [], counts: { nodes: 1, edges: 0 } };

// The selected article hook is exercised by the actual TimelineTunnel tests;
// here the real node selector drives the cross-tab store, without canvas hit mocks.
describe('graph article identity drill-down', () => {
  it('renders shared articles once and preserves links between cluster hubs', async () => {
    const navigate = vi.fn();
    const common = { domain: 'source.example', url: 'https://source.example/article', score: 0.9 };
    const a = { ...common, id: 'hub-a', title: 'Hub A' };
    const b = { ...common, id: 'hub-b', title: 'Hub B' };
    const shared = { ...common, id: 'shared', title: 'Shared article' };
    mockApi(() => jsonResponse({ clusters: [
      { ...a, deg: 2, mass: 1, neighbors: [b, shared] },
      { ...b, deg: 2, mass: 1, neighbors: [a, shared] },
    ] }));
    const { container } = renderWithClient(<GraphVisualizer setActiveTab={navigate} />);
    await screen.findByText('Neo4j snapshot · 3 articles · 3 similarity edges');
    expect(screen.getAllByRole('button', { name: 'Inspect Shared article' })).toHaveLength(1);
    expect(container.querySelectorAll('svg line')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Open full corpus graph' }));
    expect(navigate).toHaveBeenCalledWith('fullgraph');
  });

  it('routes a claim node using article_id, never the claim UUID', async () => {
    const navigate = vi.fn();
    mockApi((endpoint) => jsonResponse(endpoint === '/graph/claims'
      ? { nodes: [{ id: claimId, article_id: articleId, title: 'Actual extracted claim', domain: 'source.example', verdict: 'SUPPORTED', prob: 0 }], edges: [], counts: { nodes: 1, edges: 0 } }
      : articleGraph));
    renderWithClient(<FullCorpusGraph setActiveTab={navigate} />);
    await screen.findByRole('option', { name: 'Actual corpus article' });
    fireEvent.click(screen.getByRole('button', { name: 'Claims' }));
    await screen.findByRole('option', { name: 'Actual extracted claim' });
    fireEvent.change(screen.getByLabelText('Inspect a node (keyboard alternative)'), { target: { value: claimId } });
    expect(screen.getByRole('link', { name: /Open article details/ }).getAttribute('href')).toContain(`/articles/${articleId}/overview`);
    fireEvent.click(screen.getByRole('button', { name: /View in Timeline/ }));
    expect(navigate).toHaveBeenCalledWith('timeline');
  });

  it('disables unsupported claim timeline navigation when article_id is absent', async () => {
    const navigate = vi.fn();
    mockApi((endpoint) => jsonResponse(endpoint === '/graph/claims'
      ? { nodes: [{ id: claimId, title: 'Claim with no article mapping', domain: 'source.example' }], edges: [], counts: { nodes: 1, edges: 0 } }
      : articleGraph));
    renderWithClient(<FullCorpusGraph setActiveTab={navigate} />);
    await screen.findByRole('option', { name: 'Actual corpus article' });
    fireEvent.click(screen.getByRole('button', { name: 'Claims' }));
    await screen.findByRole('option', { name: 'Claim with no article mapping' });
    fireEvent.change(screen.getByLabelText('Inspect a node (keyboard alternative)'), { target: { value: claimId } });
    const timeline = screen.getByRole('button', { name: /View in Timeline/ });
    expect(timeline.hasAttribute('disabled')).toBe(true);
    expect(timeline.title).toContain('no article_id');
    fireEvent.click(timeline);
    expect(navigate).not.toHaveBeenCalled();
    clearSelectedArticle();
  });

  it('opens an outlet, clears an empty search, and returns to the complete overview', async () => {
    mockApi(() => jsonResponse(articleGraph));
    renderWithClient(<FullCorpusGraph />);
    await screen.findByRole('option', { name: 'Actual corpus article' });
    expect(screen.getByText('The corpus at a glance')).toBeTruthy();
    expect((screen.getByRole('checkbox', { name: 'Show all connections' }) as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /source.example/ }));
    expect(screen.getByRole('button', { name: 'Back to outlet overview' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Graph title search'), { target: { value: 'no matching title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search graph titles' }));
    expect(screen.getByText('No articles match these filters.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('The corpus at a glance')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Actual corpus article' })).toBeTruthy();
  });
});

void useSelectedArticle;
