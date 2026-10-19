import { forceSimulation, forceLink, forceManyBody, forceCollide, forceCenter, type SimulationNodeDatum } from 'd3-force';
import type { FullGraph, GraphEdge } from '../../../shared/api/graph';
import { graphDegrees, isSimilarity, normalizeGraph } from './graphModel';

import { LAYOUT_SEED, type GraphPoint, type GraphScene } from './graphScene';
export { LAYOUT_SEED, LAYOUT_VERSION, fitScene } from './graphScene';
export type { GraphPoint, GraphScene } from './graphScene';
interface Particle extends SimulationNodeDatum { id: string; radius: number; x: number; y: number }

export function preferredDistance(edge: GraphEdge): number {
  if (isSimilarity(edge) && edge.score !== null && Number.isFinite(edge.score)) return 45 + 150 * (1 - Math.max(0, Math.min(1, edge.score)));
  return edge.relationship_type === 'DUPLICATE_OF' ? 55 : 100;
}
function randomSource(seed: number) { let state = seed >>> 0; return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296); }

/** Finite generator: the worker (or fallback adapter) yields between small batches. */
export function* layoutSteps(graph: FullGraph, seed = LAYOUT_SEED): Generator<number, GraphScene> {
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  const adjacency = new Map(graph.nodes.map(node => [node.id, new Set<string>()]));
  for (const edge of graph.edges) { adjacency.get(edge.src)?.add(edge.dst); adjacency.get(edge.dst)?.add(edge.src); }
  const degrees = graphDegrees(graph), visited = new Set<string>();
  const components: string[][] = [];
  for (const id of [...byId.keys()].sort()) {
    if (visited.has(id) || !adjacency.get(id)?.size) continue;
    const stack = [id], component: string[] = []; visited.add(id);
    while (stack.length) { const next = stack.pop()!; component.push(next); for (const neighbor of [...adjacency.get(next)!].sort()) if (!visited.has(neighbor)) { visited.add(neighbor); stack.push(neighbor); } }
    components.push(component.sort());
  }
  components.sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
  const componentIndex = new Map(components.flatMap((members, i) => members.map(id => [id, i] as const)));
  const edgesByComponent: GraphEdge[][] = components.map(() => []);
  for (const edge of graph.edges) { const i = componentIndex.get(edge.src); if (i !== undefined) edgesByComponent[i].push(edge); }
  const boxes: { points: GraphPoint[]; width: number; height: number }[] = [];
  let totalTicks = 0, settled = true;
  for (let c = 0; c < components.length; c++) {
    const members = components[c], random = randomSource(seed + c);
    const particles: Particle[] = members.map(id => ({ id, radius: 4 + Math.min(3, Math.log2(1 + (degrees.get(id) || 0)) * .55), x: (random() - .5) * Math.sqrt(members.length) * 60, y: (random() - .5) * Math.sqrt(members.length) * 60 }));
    // Multiple evidence records do not multiply attraction. One preferred length
    // per pair/type; unlike types share an average constraint, not a mixed score.
    const types = new Map<string, Map<string, number>>();
    for (const edge of edgesByComponent[c]) {
      const pair = JSON.stringify([edge.src, edge.dst].sort()), type = edge.relationship_type || 'UNKNOWN';
      const values = types.get(pair) || new Map<string, number>();
      values.set(type, Math.min(values.get(type) ?? Infinity, preferredDistance(edge))); types.set(pair, values);
    }
    // Link endpoints and preferred lengths need distinct property names.
    const links = [...types].sort(([a], [b]) => a.localeCompare(b)).map(([pair, values]) => { const ids = JSON.parse(pair) as string[]; return { source: ids[0], target: ids[1], distance: [...values.values()].reduce((a, b) => a + b, 0) / values.size }; });
    const simulation = forceSimulation(particles).stop().randomSource(random).alphaDecay(1 - Math.pow(.001, 1 / 180)).velocityDecay(.4)
      .force('link', forceLink<Particle, typeof links[number]>(links).id(node => node.id).distance(link => link.distance).strength(.25))
      .force('charge', forceManyBody<Particle>().strength(-65).theta(members.length > 2000 ? 1.1 : .9))
      .force('collision', forceCollide<Particle>().radius(node => node.radius + 3).iterations(members.length > 2000 ? 1 : 2))
      .force('center', forceCenter(0, 0));
    const tickLimit = members.length > 2000 ? 32 : members.length > 500 ? 100 : 180;
    for (let tick = 0; tick < tickLimit; tick++) { simulation.tick(); totalTicks++; if (tick % 5 === 4) yield (c + (tick + 1) / tickLimit) / components.length; }
    settled = settled && particles.every(node => Math.hypot(node.vx || 0, node.vy || 0) < .5);
    simulation.stop();
    const minX = Math.min(...particles.map(n => n.x - n.radius - 12)), maxX = Math.max(...particles.map(n => n.x + n.radius + 12));
    const minY = Math.min(...particles.map(n => n.y - n.radius - 12)), maxY = Math.max(...particles.map(n => n.y + n.radius + 12));
    boxes.push({ points: particles.map(node => ({ id: node.id, title: byId.get(node.id)!.title, domain: byId.get(node.id)!.domain, x: node.x - minX, y: node.y - minY, radius: node.radius })), width: maxX - minX, height: maxY - minY });
  }
  // Shelf packing of disconnected components: whitespace has no semantic meaning.
  const shelfWidth = Math.max(1, Math.sqrt(boxes.reduce((sum, box) => sum + (box.width + 80) * (box.height + 80), 0)));
  let x = 0, y = 0, rowHeight = 0;
  const nodes: GraphPoint[] = [];
  for (const box of boxes) { if (x && x + box.width > shelfWidth) { y += rowHeight + 80; x = 0; rowHeight = 0; } nodes.push(...box.points.map(node => ({ ...node, x: node.x + x, y: node.y + y }))); x += box.width + 80; rowHeight = Math.max(rowHeight, box.height); }
  return { nodes, edges: graph.edges.map(e => ({ a: e.src, b: e.dst, weight: e.score, id: e.id, directed: e.directed })), components: components.length, isolated: graph.nodes.length - nodes.length, ticks: totalTicks, settled };
}

export function articleScene(graph: FullGraph): GraphScene { const steps = layoutSteps(normalizeGraph(graph)); let next = steps.next(); while (!next.done) next = steps.next(); return next.value; }
