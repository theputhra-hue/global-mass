import { articleScene } from '../src/features/graph/lib/graphLayout';
import { describe, expect, it } from 'vitest';
import type { FullGraph, GraphNode } from '../src/shared/api/graph';
import { filterGraph, fitScene, groupOutlets, outletColor, UNKNOWN_OUTLET } from '../src/features/graph/lib/corpusGraph';

const node = (id: string, domain: string | null = 'www.thehindu.com', title = id): GraphNode => ({ id, domain, title });
const graph = (nodes: GraphNode[], edges: FullGraph['edges'] = []): FullGraph => ({ nodes, edges, counts: { nodes: nodes.length, edges: edges.length } });

describe('connected corpus graph', () => {
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
    expect(articleScene(data).nodes.map((item) => item.id).sort()).toEqual(['a', 'b', 'c']);
    expect(articleScene(data).isolated).toBe(1);
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
    expect(scene.nodes).toHaveLength(100);
    expect(scene.isolated).toBe(1);
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

  it('places tightly connected groups together and retains the relationship joining them', () => {
    const nodes = Array.from({ length: 24 }, (_, i) => node(String(i)));
    const edges = nodes.flatMap((a, i) => nodes.slice(i + 1)
      .filter((b) => Math.floor(Number(a.id) / 12) === Math.floor(Number(b.id) / 12))
      .map((b) => ({ src: a.id, dst: b.id, score: 1 })));
    edges.push({ src: '0', dst: '12', score: 0.8 });
    const data = graph(nodes, edges);
    const before = structuredClone(data);
    const scene = articleScene(data);
    const left = scene.nodes.filter((item) => Number(item.id) < 12);
    const right = scene.nodes.filter((item) => Number(item.id) >= 12);
    const center = (points: typeof scene.nodes) => ({
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    });
    const a = center(left), b = center(right);
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    for (const [points, centroid] of [[left, a], [right, b]] as const) {
      const meanRadius = points.reduce((sum, point) => sum + Math.hypot(point.x - centroid.x, point.y - centroid.y), 0) / points.length;
      expect(distance).toBeGreaterThan(meanRadius * 2);
    }
    expect(scene.edges).toContainEqual(expect.objectContaining({ a: '0', b: '12', weight: 0.8 }));
    expect(scene.edges).toHaveLength(edges.length);
    expect(data).toEqual(before);
    expect(articleScene({ ...data, nodes: [...nodes].reverse(), edges: [...edges].reverse() }).nodes).toEqual(scene.nodes);
  });

  it('ignores missing endpoints without inventing or aggregating real nodes', () => {
    const data = graph([node('article-a'), node('article-b'), node('isolated', null)], [
      { src: 'article-a', dst: 'article-b', score: 0.75 },
      { src: 'article-a', dst: 'missing', score: 1 },
      { src: 'article-b', dst: 'article-b', score: 1 },
    ]);
    const scene = articleScene(data);
    expect(scene.nodes.map((item) => item.id).sort()).toEqual(['article-a', 'article-b']);
    expect(scene.isolated).toBe(1);
    expect(scene.edges).toHaveLength(1);
    expect(scene.edges[0]).toMatchObject({ a: 'article-a', b: 'article-b', weight: 0.75 });
  });

  it('keeps unlinked articles out of geometric layout without losing their count', () => {
    const scene = articleScene(graph([node('unlinked-a'), node('unlinked-b')]));
    expect(scene.nodes).toEqual([]);
    expect(scene.isolated).toBe(2);
    expect(scene.ticks).toBe(0);
    const mixed = articleScene(graph([node('a'), node('b'), node('unlinked')], [{ src: 'a', dst: 'b', score: 1 }]));
    expect(mixed.nodes.map(n => n.id).sort()).toEqual(['a', 'b']);
    expect(mixed.isolated).toBe(1);
    expect(mixed.components).toBe(1);
  });

  it('handles a full-size connected corpus with finite positions and no lost relationships', () => {
    const nodes = Array.from({ length: 10_000 }, (_, i) => node(String(i)));
    const edges = nodes.flatMap((item, i) => [1, 3, 71, 497].map((offset) => ({
      src: item.id, dst: String((i + offset) % nodes.length), score: 0.9,
    })));
    const scene = articleScene(graph(nodes, edges));
    expect(scene.nodes).toHaveLength(10_000);
    expect(scene.edges).toHaveLength(40_000);
    expect(new Set(scene.nodes.map((item) => item.id)).size).toBe(10_000);
    expect(scene.nodes.every((item) => Number.isFinite(item.x) && Number.isFinite(item.y))).toBe(true);
    const view = fitScene(scene.nodes, 900, 570, false);
    expect(view.scale).toBeGreaterThan(0);
    expect(scene.nodes.every((item) => {
      const x = 450 + view.ox + item.x * view.scale, y = 285 + view.oy + item.y * view.scale;
      return x > 0 && x < 900 && y > 0 && y < 570;
    })).toBe(true);
  }, 15_000);

  it('retains weighted chains, stars and disconnected components without overlapping component boxes', () => {
    const nodes = Array.from({ length: 16 }, (_, i) => node(String(i)));
    const chain = [0, 1, 2, 3].map(i => ({ src: String(i), dst: String(i + 1), score: .2 + i * .2, relationship_type: 'SIMILAR_TO', score_kind: 'similarity', score_family: 'synthetic_chain' }));
    const star = [6, 7, 8, 9, 10].map(i => ({ src: '5', dst: String(i), score: .9, relationship_type: 'SIMILAR_TO', score_kind: 'similarity', score_family: 'synthetic_star' }));
    const data = graph(nodes, [...chain, ...star]);
    const scene = articleScene(data);
    expect(scene.components).toBe(2);
    expect(scene.isolated).toBe(5);
    expect(scene.edges).toHaveLength(9);
    expect(scene.nodes).toHaveLength(11);
    const box = (ids: string[]) => {
      const points = scene.nodes.filter(n => ids.includes(n.id));
      return { left: Math.min(...points.map(n => n.x - n.radius)), right: Math.max(...points.map(n => n.x + n.radius)), top: Math.min(...points.map(n => n.y - n.radius)), bottom: Math.max(...points.map(n => n.y + n.radius)) };
    };
    const a = box(['0', '1', '2', '3', '4']), b = box(['5', '6', '7', '8', '9', '10']);
    expect(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top).toBe(true);
    expect(articleScene({ ...data, nodes: [...nodes].reverse(), edges: [...data.edges].reverse() })).toEqual(scene);
  });
});
