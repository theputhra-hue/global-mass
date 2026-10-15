import { describe, expect, it } from 'vitest';
import type { FullGraph, GraphNode } from '../src/api/graph';
import { articleScene, filterGraph, fitScene, groupOutlets, outletColor, overviewScene, UNKNOWN_OUTLET } from '../src/lib/corpusGraph';

const node = (id: string, domain: string | null = 'www.thehindu.com', title = id): GraphNode => ({ id, domain, title });
const graph = (nodes: GraphNode[], edges: FullGraph['edges'] = []): FullGraph => ({ nodes, edges, counts: { nodes: nodes.length, edges: edges.length } });

describe('corpus graph progressive disclosure', () => {
  it('accounts for every article, including unknown outlets, and distinguishes internal links', () => {
    const data = graph([node('a'), node('b', 'thehindu.com'), node('c', 'www.nytimes.com'), node('d', null)], [
      { src: 'a', dst: 'b', score: 1 }, { src: 'a', dst: 'c', score: 0.9 }, { src: 'b', dst: 'c', score: 0.8 },
    ]);
    const groups = groupOutlets(data);
    expect(groups.outlets.reduce((sum, outlet) => sum + outlet.count, 0)).toBe(4);
    expect(groups.outlets.find((outlet) => outlet.id === 'thehindu.com')).toEqual({ id: 'thehindu.com', count: 2, internalLinks: 1 });
    expect(groups.outlets.find((outlet) => outlet.id === UNKNOWN_OUTLET)?.count).toBe(1);
    expect(groups.edges).toEqual([{ a: 'nytimes.com', b: 'thehindu.com', weight: 2 }]);
    expect(outletColor('www.theverge.com')).toBe(outletColor('theverge.com'));
    expect(overviewScene(groups).nodes.reduce((sum, item) => sum + item.count!, 0)).toBe(4);
  });

  it('searches one hop from original matches regardless of edge order', () => {
    const data = graph([node('a', null, 'Election'), node('b'), node('c'), node('d')], [
      { src: 'a', dst: 'b', score: 1 }, { src: 'b', dst: 'c', score: 1 }, { src: 'c', dst: 'd', score: 1 },
    ]);
    expect(filterGraph(data, '', ' election ').nodes.map((item) => item.id)).toEqual(['a', 'b']);
    expect(filterGraph({ ...data, edges: [...data.edges].reverse() }, '', 'election')).toEqual(filterGraph(data, '', 'election'));
    expect(filterGraph(data, UNKNOWN_OUTLET, '').nodes.map((item) => item.id)).toEqual(['a']);
    expect(filterGraph(data, '', 'no match').counts).toEqual({ nodes: 0, edges: 0 });
  });

  it('keeps a dense clique separated and fits every node inside the viewport', () => {
    const nodes = Array.from({ length: 100 }, (_, i) => node(String(i)));
    const edges = nodes.flatMap((a, i) => nodes.slice(i + 1).map((b) => ({ src: a.id, dst: b.id, score: 1 })));
    const data = graph([...nodes, node('isolated')], edges);
    const scene = articleScene(data);
    expect(scene.nodes).toHaveLength(101);
    expect(scene.edges).toHaveLength(edges.length);
    expect(articleScene(data)).toEqual(scene);
    for (let i = 0; i < scene.nodes.length; i++) {
      for (const b of scene.nodes.slice(i + 1)) {
        const a = scene.nodes[i];
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.radius + b.radius);
      }
    }
    const view = fitScene(scene.nodes, 900, 570, false);
    for (const n of scene.nodes) {
      expect(450 + view.ox + n.x * view.scale).toBeGreaterThan(0);
      expect(450 + view.ox + n.x * view.scale).toBeLessThan(900);
      expect(285 + view.oy + n.y * view.scale).toBeGreaterThan(0);
      expect(285 + view.oy + n.y * view.scale).toBeLessThan(570);
    }
    expect(fitScene([], 0, 0, true)).toEqual({ ox: 0, oy: 0, scale: 1 });
  });
});
