import type { FullGraph } from '../../../shared/api/graph';

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
export const outletColor = (domain?: string | null) => {
  const key = outletKey(domain), known = OUTLETS[key]?.[1];
  if (known || key === UNKNOWN_OUTLET) return known || '#B7A6A0';
  let hash = 0; for (const character of key) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
  return ['#83B4F5', '#F4A275', '#A6D89A', '#BDA0EF', '#E7ABC1', '#7ACDC1'][hash % 6];
};

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

// The old spiral/hex-slot solver is replaced by a finite weighted layout.
export { fitScene } from './graphScene';
