import type { FullGraph, GraphEdge, GraphNode } from '../../../shared/api/graph';

export interface RecordedEdge extends GraphEdge {
  id: string; relationship_type: string; directed: boolean | null;
  raw_score: number | string | null; score_kind: string; score_family: string;
}
export interface RecordedGraph extends FullGraph {
  edges: RecordedEdge[];
  diagnostics: { duplicateNodes: number; duplicateEdges: number; invalidNodes: number; invalidEdges: number; invalidScores: number; selfLinks: number; cappedNodes: number; cappedEdges: number };
}
export const edgeName = (edge: GraphEdge) => ({ SIMILAR: 'Similarity', SIMILAR_TO: 'Similarity', DUPLICATE_OF: 'Duplicate record (duplicate → canonical)', EVOLVED_FROM: 'Candidate evolution (child → parent)' }[edge.relationship_type || ''] || `Unknown relationship (${edge.relationship_type || 'type unavailable'})`);
export const isSimilarity = (edge: GraphEdge) => ['SIMILAR', 'SIMILAR_TO'].includes(edge.relationship_type || '') && edge.score_kind === 'similarity' && Boolean(edge.score_family && edge.score_family !== 'unknown');

/** Treat legacy metadata as unknown. Never infer a relationship type from a score. */
export function normalizeGraph(input: FullGraph): RecordedGraph {
  if (!input || !Array.isArray(input.nodes) || !Array.isArray(input.edges)) throw new Error('Invalid graph response: expected node and relationship arrays.');
  const diagnostics = { duplicateNodes: 0, duplicateEdges: 0, invalidNodes: 0, invalidEdges: 0, invalidScores: 0, selfLinks: 0, cappedNodes: Math.max(0, input.nodes.length - 10000), cappedEdges: Math.max(0, input.edges.length - 40000) };
  const nodes = new Map<string, GraphNode>();
  for (const node of input.nodes.slice(0, 10000)) {
    if (!node || typeof node.id !== 'string' || !node.id || typeof node.title !== 'string') { diagnostics.invalidNodes++; continue; }
    if (nodes.has(node.id)) { diagnostics.duplicateNodes++; continue; }
    nodes.set(node.id, { ...node, domain: typeof node.domain === 'string' ? node.domain : null });
  }
  const edges = new Map<string, RecordedEdge>();
  for (const raw of input.edges.slice(0, 40000)) {
    if (!raw || !nodes.has(raw.src) || !nodes.has(raw.dst)) { diagnostics.invalidEdges++; continue; }
    if (raw.src === raw.dst) { diagnostics.selfLinks++; continue; }
    const type = typeof raw.relationship_type === 'string' && raw.relationship_type ? raw.relationship_type : 'UNKNOWN';
    const directed = ['EVOLVED_FROM', 'DUPLICATE_OF'].includes(type) ? true : ['SIMILAR', 'SIMILAR_TO'].includes(type) ? false : typeof raw.directed === 'boolean' ? raw.directed : null;
    const validScore = typeof raw.score === 'number' && Number.isFinite(raw.score) && raw.score >= 0 && raw.score <= 1;
    if (raw.score != null && !validScore) diagnostics.invalidScores++;
    const score = validScore ? raw.score : null;
    const raw_score = typeof raw.score === 'number' ? Number.isFinite(raw.score) ? raw.score : String(raw.score) : raw.score == null ? null : String(raw.score);
    const [src, dst] = directed === false ? [raw.src, raw.dst].sort() : [raw.src, raw.dst];
    const id = typeof raw.id === 'string' && raw.id ? raw.id : JSON.stringify([src, dst, type, raw.score_family || '', raw_score]);
    if (edges.has(id)) { diagnostics.duplicateEdges++; continue; }
    edges.set(id, { ...raw, id, src, dst, score, raw_score, relationship_type: type, directed,
      score_kind: raw.score_kind || 'unknown', score_family: raw.score_family || 'unknown' });
  }
  const scope = input.scope && Number.isFinite(input.scope.node_limit) && Number.isFinite(input.scope.relationship_limit) ? input.scope : undefined;
  return { ...input, scope, nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)), edges: [...edges.values()].sort((a, b) => a.id.localeCompare(b.id)), counts: { nodes: nodes.size, edges: edges.size }, diagnostics };
}

export function graphDegrees(graph: FullGraph) {
  const neighbors = new Map(graph.nodes.map(node => [node.id, new Set<string>()]));
  for (const edge of graph.edges) { neighbors.get(edge.src)?.add(edge.dst); neighbors.get(edge.dst)?.add(edge.src); }
  return new Map([...neighbors].map(([id, ids]) => [id, ids.size]));
}

/** Filters apply to the fetched graph. Search adds exactly one hop, not a topic classifier. */
export function selectGraph(graph: RecordedGraph, outlet: string, query: string, type = '', threshold = 0, family = ''): RecordedGraph {
  const outletKey = (domain: string | null) => domain?.toLowerCase().replace(/^www\./, '') || '__unknown__';
  let nodes = graph.nodes.filter(node => !outlet || outletKey(node.domain) === outlet);
  let ids = new Set(nodes.map(node => node.id));
  let edges = graph.edges.filter(edge => ids.has(edge.src) && ids.has(edge.dst) && (!type || edge.relationship_type === type)
    && (!family || edge.score_family !== family || (isSimilarity(edge) && edge.score !== null && edge.score >= threshold)));
  if (query.trim()) {
    const term = query.trim().toLowerCase();
    const matches = new Set(nodes.filter(node => node.title.toLowerCase().includes(term)).map(node => node.id));
    ids = new Set(matches);
    for (const edge of edges) { if (matches.has(edge.src)) ids.add(edge.dst); if (matches.has(edge.dst)) ids.add(edge.src); }
    nodes = nodes.filter(node => ids.has(node.id));
    edges = edges.filter(edge => ids.has(edge.src) && ids.has(edge.dst));
  }
  return { ...graph, nodes, edges, counts: { nodes: nodes.length, edges: edges.length } };
}

/** Content key excludes mutable camera state; unchanged refetches do not relayout. */
export function topologyKey(graph: FullGraph, seed: number): string {
  return JSON.stringify([graph.run_id || null, graph.basis || graph.edge_source || 'unversioned', seed, graph.nodes.map(n => [n.id, n.title, n.domain]), graph.edges.map(e => [e.id, e.src, e.dst, e.score, e.relationship_type, e.score_kind, e.score_family, e.directed])]);
}
