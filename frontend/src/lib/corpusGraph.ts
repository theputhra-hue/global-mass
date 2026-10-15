import type { FullGraph, GraphEdge, GraphNode } from '../api/graph';

export const UNKNOWN_OUTLET = '__unknown__';
export const outletKey = (domain?: string | null) => domain?.toLowerCase().replace(/^www\./, '') || UNKNOWN_OUTLET;

const OUTLETS: Record<string, [string, string]> = {
  'thehindu.com': ['The Hindu', '#F07178'],
  'theguardian.com': ['The Guardian', '#83B4F5'],
  'aljazeera.com': ['Al Jazeera', '#F4A275'],
  'ndtv.com': ['NDTV', '#A6D89A'],
  'bbc.co.uk': ['BBC', '#BDA0EF'],
  'bbc.com': ['BBC', '#BDA0EF'],
  'nytimes.com': ['The New York Times', '#DAD9D4'],
  'timesofindia.indiatimes.com': ['Times of India', '#DCC477'],
  'wired.com': ['Wired', '#7ACDC1'],
  'techcrunch.com': ['TechCrunch', '#8AC19D'],
  'npr.org': ['NPR', '#E7ABC1'],
  'theverge.com': ['The Verge', '#D79CC9'],
  'news.sky.com': ['Sky News', '#92A4E7'],
  'cnn.com': ['CNN', '#E58E82'],
};

export const outletName = (domain?: string | null) => OUTLETS[outletKey(domain)]?.[0]
  ?? (outletKey(domain) === UNKNOWN_OUTLET ? 'Unknown outlet' : outletKey(domain));
export const outletColor = (domain?: string | null) => OUTLETS[outletKey(domain)]?.[1] ?? '#B7A6A0';

export interface GraphPoint {
  id: string;
  domain: string | null;
  title: string;
  x: number;
  y: number;
  radius: number;
  count?: number;
}

export interface GraphLine { a: string; b: string; weight: number }
export interface GraphScene { nodes: GraphPoint[]; edges: GraphLine[] }

export function groupOutlets(graph: FullGraph) {
  const groups = new Map<string, { id: string; count: number; internalLinks: number }>();
  const domains = new Map<string, string>();
  for (const node of graph.nodes) {
    const id = outletKey(node.domain);
    domains.set(node.id, id);
    const group = groups.get(id) ?? { id, count: 0, internalLinks: 0 };
    group.count++;
    groups.set(id, group);
  }
  const links = new Map<string, GraphLine>();
  for (const edge of graph.edges) {
    const src = domains.get(edge.src), dst = domains.get(edge.dst);
    if (!src || !dst) continue;
    if (src === dst) {
      groups.get(src)!.internalLinks++;
      continue;
    }
    const [a, b] = [src, dst].sort();
    const key = JSON.stringify([a, b]);
    const link = links.get(key) ?? { a, b, weight: 0 };
    link.weight++;
    links.set(key, link);
  }
  return {
    outlets: [...groups.values()].sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)),
    edges: [...links.values()],
  };
}

export function overviewScene(groups: ReturnType<typeof groupOutlets>, availableWidth = 1000): GraphScene {
  const columns = Math.max(1, Math.min(availableWidth < 480 ? 2 : availableWidth < 740 ? 3 : 4, Math.ceil(Math.sqrt(groups.outlets.length * 1.3))));
  const rows = Math.ceil(groups.outlets.length / columns);
  const largest = groups.outlets[0]?.count ?? 1;
  return {
    nodes: groups.outlets.map((group, i) => {
      const row = Math.floor(i / columns);
      const inRow = Math.min(columns, groups.outlets.length - row * columns);
      return {
        id: group.id, domain: group.id, title: outletName(group.id), count: group.count,
        x: (i % columns - (inRow - 1) / 2) * 190 + (row % 2 ? 18 : -18),
        y: (row - (rows - 1) / 2) * 145,
        radius: 23 + Math.sqrt(group.count / largest) * 17,
      };
    }),
    edges: groups.edges,
  };
}

// Search expands exactly one hop from the original matches, after outlet filtering.
export function filterGraph(graph: FullGraph, outlet: string, query: string): FullGraph {
  let nodes = graph.nodes.filter((node) => !outlet || outletKey(node.domain) === outlet);
  let keep = new Set(nodes.map((node) => node.id));
  let edges = graph.edges.filter((edge) => keep.has(edge.src) && keep.has(edge.dst));
  const term = query.trim().toLowerCase();
  if (term) {
    const matches = new Set(nodes.filter((node) => node.title.toLowerCase().includes(term)).map((node) => node.id));
    keep = new Set(matches);
    for (const edge of edges) {
      if (matches.has(edge.src)) keep.add(edge.dst);
      if (matches.has(edge.dst)) keep.add(edge.src);
    }
    nodes = nodes.filter((node) => keep.has(node.id));
    edges = edges.filter((edge) => keep.has(edge.src) && keep.has(edge.dst));
  }
  return { nodes, edges, counts: { nodes: nodes.length, edges: edges.length } };
}

// Pack connected components into separate, stable regions. No accumulating spring
// forces: even a complete graph keeps its nodes apart instead of becoming a blob.
export function articleScene(graph: FullGraph): GraphScene {
  const adjacency = new Map<string, Set<string>>(graph.nodes.map((node) => [node.id, new Set()]));
  const validEdges: GraphEdge[] = [];
  for (const edge of graph.edges) {
    if (edge.src === edge.dst || !adjacency.has(edge.src) || !adjacency.has(edge.dst)) continue;
    adjacency.get(edge.src)!.add(edge.dst);
    adjacency.get(edge.dst)!.add(edge.src);
    validEdges.push(edge);
  }
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  const components: { members: GraphNode[]; radius: number }[] = [];
  for (const node of graph.nodes) {
    if (visited.has(node.id)) continue;
    const stack = [node.id], members: GraphNode[] = [];
    visited.add(node.id);
    while (stack.length) {
      const id = stack.pop()!;
      members.push(byId.get(id)!);
      for (const neighbor of adjacency.get(id)!) {
        if (!visited.has(neighbor)) { visited.add(neighbor); stack.push(neighbor); }
      }
    }
    members.sort((a, b) => adjacency.get(b.id)!.size - adjacency.get(a.id)!.size || a.id.localeCompare(b.id));
    components.push({ members, radius: members.length === 1 ? 12 : 12 * Math.sqrt(members.length) + 12 });
  }
  components.sort((a, b) => b.radius - a.radius || a.members[0].id.localeCompare(b.members[0].id));
  const width = Math.max(components[0]?.radius * 2 || 1,
    Math.sqrt(components.reduce((area, c) => area + (c.radius * 2 + 18) ** 2, 0) * 1.6));
  const nodes: GraphPoint[] = [];
  let left = 0, top = 0, rowHeight = 0;
  for (const { members, radius } of components) {
    const diameter = radius * 2;
    if (left > 0 && left + diameter > width) { top += rowHeight + 18; left = 0; rowHeight = 0; }
    members.forEach((node, i) => {
      const r = members.length === 1 ? 0 : 12 * Math.sqrt(i);
      const angle = i * Math.PI * (3 - Math.sqrt(5));
      nodes.push({
        id: node.id, domain: node.domain, title: node.title,
        x: left + radius + Math.cos(angle) * r, y: top + radius + Math.sin(angle) * r,
        radius: 2.8 + Math.min(2.2, Math.log2(1 + adjacency.get(node.id)!.size) * 0.35),
      });
    });
    left += diameter + 18;
    rowHeight = Math.max(rowHeight, diameter);
  }
  return { nodes, edges: validEdges.map((edge) => ({ a: edge.src, b: edge.dst, weight: edge.score })) };
}

export function fitScene(nodes: GraphPoint[], width: number, height: number, overview: boolean) {
  if (!nodes.length || width <= 0 || height <= 0) return { ox: 0, oy: 0, scale: 1 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) {
    const padX = overview ? 90 : node.radius + 8;
    minX = Math.min(minX, node.x - padX); maxX = Math.max(maxX, node.x + padX);
    minY = Math.min(minY, node.y - node.radius - 8);
    maxY = Math.max(maxY, node.y + node.radius + (overview ? 42 : 8));
  }
  const scale = Math.min(overview ? 1.4 : 2, Math.max(0.01, Math.min((width - 48) / (maxX - minX), (height - 64) / (maxY - minY))));
  return { ox: -(minX + maxX) / 2 * scale, oy: -(minY + maxY) / 2 * scale, scale };
}
