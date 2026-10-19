import type { AtlasArticle, AtlasSummary } from '../../../shared/api/articleMap';
import type { CompleteCity } from '../../../shared/api/cityNetwork';
import type { GraphEdge } from '../../../shared/api/graph';
import { topicColor } from './articleAtlas';

export type CityNodeKind = 'article' | 'topic' | 'theme';
export type CityEdgeKind = 'street' | 'highway' | 'superway' | 'recorded';
export interface CityNode { id: string; label: string; x: number; y: number; kind: CityNodeKind; value: number; color: string; topic: string | null; members?: string[] }
export interface CityEdge { id: string; a: string; b: string; kind: CityEdgeKind; value: number; score?: number; directed?: boolean | null; recorded?: GraphEdge }
export interface CityScene { nodes: CityNode[]; edges: CityEdge[]; degree: Map<string, number>; isolated: number; unsupported: AtlasArticle[] }
export interface CityView { x: number; y: number; zoom: number }
export function parseCityView(value: string | null): CityView | null {
  if (!value) return null;
  if (value.split(',').some(part => !part.trim())) return null;
  const parts = value.split(',').map(Number);
  if (parts.length !== 3 || parts.some(n => !Number.isFinite(n)) || Math.abs(parts[0]) > 100000 || Math.abs(parts[1]) > 100000 || parts[2] < .35 || parts[2] > 20) return null;
  return { x: parts[0], y: parts[1], zoom: parts[2] };
}

export function sizeRadius(value: number, p95: number, min: number, max: number): number {
  const u = Math.max(0, Math.min(1, Math.log1p(Math.max(0, value)) / Math.log1p(Math.max(1, p95))));
  return Math.sqrt(min * min + u * (max * max - min * min));
}
export function percentile95(values: number[]): number { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(Math.max(0, sorted.length - 1) * .95)] || 1; }
function median(values: number[]): number { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(sorted.length / 2)] || 0; }

export function buildCityScene(articles: AtlasArticle[], summary: AtlasSummary, city?: CompleteCity): CityScene {
  const degree = new Map<string, number>(), edges: CityEdge[] = [];
  const ids = new Set(articles.map(a => a.id)), byId = new Map(articles.map(a => [a.id, a]));
  if (city?.available && city.summary) {
    const network = city.summary;
    if (network.article_ids.length !== articles.length || network.article_ids.some(id => !ids.has(id))) throw new Error('City network article index differs from this map.');
    if (network.input_sha256 !== summary.input_sha256 || network.embedding_model !== summary.embedding_model || network.embedding_revision !== summary.embedding_revision) throw new Error('City network input or model differs from this map.');
    const topicCounts = new Map(summary.topics.map(t => [t.id, t.article_count])), membership = new Map<string, string>();
    if (new Set(network.themes.map(t => t.id)).size !== network.themes.length) throw new Error('Duplicate theme IDs.');
    for (const theme of network.themes) {
      if (typeof theme.id !== 'string' || typeof theme.label !== 'string' || !Array.isArray(theme.topics) || !theme.topics.length || theme.topics.some(t => !topicCounts.has(t) || membership.has(t)) || theme.article_count !== theme.topics.reduce((n, t) => n + (topicCounts.get(t) || 0), 0)) throw new Error('Invalid theme membership.');
      theme.topics.forEach(t => membership.set(t, theme.id));
    }
    if (membership.size !== topicCounts.size) throw new Error('Theme membership is incomplete.');
    const support = new Map<string, { a: Set<string>; b: Set<string>; count: number }>();
    for (const [a, b] of city.roads) {
      const left = byId.get(network.article_ids[a]), right = byId.get(network.article_ids[b]);
      if (!left?.topic_id || !right?.topic_id || left.topic_id === right.topic_id) continue;
      const forward = left.topic_id < right.topic_id, key = [left.topic_id, right.topic_id].sort().join('|'), pair = support.get(key) || { a: new Set<string>(), b: new Set<string>(), count: 0 };
      pair.a.add(forward ? left.id : right.id); pair.b.add(forward ? right.id : left.id); pair.count++; support.set(key, pair);
    }
    const qualifying = [...support].filter(([, s]) => s.count >= network.min_highway_support && Math.min(s.a.size, s.b.size) >= network.min_highway_endpoints);
    if (qualifying.length !== network.highways.length || new Set(network.highways.map(h => `${h.a}|${h.b}`)).size !== network.highways.length) throw new Error('Highway support is incomplete or duplicated.');
    const superSupport = new Map<string, { count: number; highways: number }>();
    for (const highway of network.highways) {
      const pair = support.get(`${highway.a}|${highway.b}`);
      if (highway.a >= highway.b || !pair || highway.support !== pair.count || highway.endpoints_a !== pair.a.size || highway.endpoints_b !== pair.b.size || highway.support < network.min_highway_support || Math.min(pair.a.size, pair.b.size) < network.min_highway_endpoints) throw new Error('Highway supporting pairs differ.');
      const [a, b] = [membership.get(highway.a), membership.get(highway.b)].sort();
      if (a && b && a !== b) { const key = `${a}|${b}`, previous = superSupport.get(key) || { count: 0, highways: 0 }; previous.count += highway.support; previous.highways++; superSupport.set(key, previous); }
    }
    if (superSupport.size !== network.superways.length || new Set(network.superways.map(s => `${s.a}|${s.b}`)).size !== network.superways.length || network.superways.some(s => s.a >= s.b || superSupport.get(`${s.a}|${s.b}`)?.count !== s.support || superSupport.get(`${s.a}|${s.b}`)?.highways !== s.highways)) throw new Error('Superway supporting highways differ.');
    network.article_ids.forEach((id, i) => degree.set(id, network.degree[i]));
    city.roads.forEach(([a, b, score], i) => {
      const left = byId.get(network.article_ids[a]), right = byId.get(network.article_ids[b]);
      if (left?.x === null || right?.x === null) throw new Error('Semantic street references unsupported input.');
      edges.push({ id: `street:${i}`, a: network.article_ids[a], b: network.article_ids[b], kind: 'street', value: score, score });
    });
    network.highways.forEach(h => edges.push({ id: `highway:${h.a}:${h.b}`, a: h.a, b: h.b, kind: 'highway', value: h.support }));
    network.superways.forEach(h => edges.push({ id: `superway:${h.a}:${h.b}`, a: h.a, b: h.b, kind: 'superway', value: h.support }));
  }
  const usable = articles.filter(a => a.x !== null);
  const nodes: CityNode[] = usable.map(a => ({ id: a.id, label: a.title, x: a.x!, y: a.y!, kind: 'article', value: degree.get(a.id) || 0, color: topicColor(a.topic_id), topic: a.topic_id }));
  const topicNodes = summary.topics.flatMap(topic => {
    const members = usable.filter(a => a.topic_id === topic.id);
    return members.length ? [{ id: topic.id, label: topic.label, x: median(members.map(a => a.x!)), y: median(members.map(a => a.y!)), kind: 'topic' as const, value: topic.article_count, color: topicColor(topic.id), topic: topic.id, members: members.map(a => a.id) }] : [];
  });
  nodes.push(...topicNodes);
  city?.summary?.themes.forEach(theme => {
    // Single-topic themes add no navigation value; avoid drawing two hubs on top.
    const members = topicNodes.filter(n => theme.topics.includes(n.id));
    if (members.length > 1 || city.summary?.superways.some(s => s.a === theme.id || s.b === theme.id)) nodes.push({ id: theme.id, label: theme.label, x: median(members.map(n => n.x)), y: median(members.map(n => n.y)), kind: 'theme', value: theme.article_count, color: '#e4c49b', topic: null, members: members.flatMap(n => n.members) });
  });
  const shownIds = new Set(nodes.map(n => n.id));
  return { nodes, edges: edges.filter(e => shownIds.has(e.a) && shownIds.has(e.b)), degree, isolated: articles.filter(a => !degree.get(a.id)).length, unsupported: articles.filter(a => a.x === null) };
}

export function visibleCityEdges(scene: CityScene, level: 'city' | 'district' | 'article', streets: 'auto' | 'all' | 'off', selected: string | null): CityEdge[] {
  return scene.edges.filter(e => e.kind !== 'street' || streets === 'all' || (streets === 'auto' && (level !== 'city' || e.a === selected || e.b === selected)));
}

export function prioritizeCityEdges(edges: CityEdge[], selected: string | null, route: string | null): CityEdge[] {
  const rank = (edge: CityEdge) => (edge.id === route || edge.a === selected || edge.b === selected ? 100 : 0) + ({ street: 0, recorded: 1, highway: 2, superway: 3 }[edge.kind]);
  return [...edges].sort((a, b) => rank(b) - rank(a));
}
