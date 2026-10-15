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

interface LayoutNode { node: GraphNode; x: number; y: number; vx: number; vy: number; degree: number }

// A finite force pass gives real relationships spatial meaning. The grid bounds
// repulsion work in crowded regions; degree normalization prevents cliques from
// collapsing, and the scene rests once computed (no permanent animation loop).
function arrangeComponent(members: GraphNode[], adjacency: Map<string, Set<string>>, edges: GraphEdge[]): GraphPoint[] {
  const nodes: LayoutNode[] = members.map((node, i) => {
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    const radius = 19 * Math.sqrt(i);
    return { node, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, vx: 0, vy: 0, degree: adjacency.get(node.id)!.size };
  });
  const index = new Map(nodes.map((node) => [node.node.id, node]));
  const springs = edges.map((edge) => ({ a: index.get(edge.src)!, b: index.get(edge.dst)!, score: edge.score }));
  const iterations = nodes.length > 2000 ? 56 : 88;
  const cellSize = 70;
  for (let iteration = 0; iteration < iterations && nodes.length > 1; iteration++) {
    const cells = new Map<string, { members: LayoutNode[]; x: number; y: number }>();
    for (const node of nodes) {
      const key = `${Math.floor(node.x / cellSize)},${Math.floor(node.y / cellSize)}`;
      const cell = cells.get(key) ?? { members: [], x: 0, y: 0 };
      cell.members.push(node); cell.x += node.x; cell.y += node.y;
      cells.set(key, cell);
    }
    const cooling = 1 - iteration / iterations * 0.82;
    for (const node of nodes) {
      const gx = Math.floor(node.x / cellSize), gy = Math.floor(node.y / cellSize);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const cell = cells.get(`${gx + dx},${gy + dy}`);
          if (!cell) continue;
          if (cell.members.length <= 16) {
            for (const other of cell.members) {
              if (other === node) continue;
              const rx = node.x - other.x, ry = node.y - other.y;
              const distance = Math.sqrt(rx * rx + ry * ry + 25);
              const force = 780 / (distance * distance);
              node.vx += rx / distance * force; node.vy += ry / distance * force;
            }
          } else {
            // Aggregate a crowded cell rather than allowing quadratic work.
            const containsNode = dx === 0 && dy === 0;
            const count = cell.members.length - (containsNode ? 1 : 0);
            const rx = node.x - (cell.x - (containsNode ? node.x : 0)) / count;
            const ry = node.y - (cell.y - (containsNode ? node.y : 0)) / count;
            const distance = Math.sqrt(rx * rx + ry * ry + 25);
            const force = 780 * count / (distance * distance);
            node.vx += rx / distance * force; node.vy += ry / distance * force;
          }
        }
      }
    }
    for (const { a, b, score } of springs) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 1;
      const strength = 0.085 / Math.sqrt(Math.max(1, Math.min(a.degree, b.degree)));
      const target = 38 + 12 * (1 - Math.max(0, Math.min(1, Number.isFinite(score) ? score : 0)));
      const force = (distance - target) / distance * strength;
      a.vx += dx * force; a.vy += dy * force;
      b.vx -= dx * force; b.vy -= dy * force;
    }
    for (const node of nodes) {
      node.vx = (node.vx - node.x * 0.0005) * 0.7;
      node.vy = (node.vy - node.y * 0.0005) * 0.7;
      const speed = Math.hypot(node.vx, node.vy) || 1;
      const step = Math.min(1, 18 * cooling / speed);
      node.x += node.vx * step; node.y += node.vy * step;
    }
  }

  // Assign nearby free hexagonal slots after cooling. This guarantees readable
  // spacing even for complete graphs, with bounded local search and a shared
  // fallback cursor instead of repeated unbounded collision resolution.
  const occupied = new Set<string>();
  const spacing = 16, rowHeight = spacing * Math.sqrt(3) / 2;
  const directions = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];
  let fallbackRing = 0, fallbackSide = 0, fallbackStep = 0, fallbackQ = 0, fallbackR = 0;
  const nextFallback = () => {
    const slot = [fallbackQ, fallbackR];
    if (fallbackRing === 0) { fallbackRing = 1; fallbackQ = -1; fallbackR = 0; }
    else {
      fallbackQ += directions[fallbackSide][0]; fallbackR += directions[fallbackSide][1];
      if (++fallbackStep === fallbackRing) {
        fallbackStep = 0;
        if (++fallbackSide === 6) { fallbackSide = 0; fallbackRing++; fallbackQ = -fallbackRing; fallbackR = 0; }
      }
    }
    return slot;
  };
  return nodes.map(({ node, x, y, degree }) => {
    const r = Math.round(y / rowHeight), q = Math.round(x / spacing - r / 2);
    let slot: number[] | undefined;
    if (!occupied.has(`${q},${r}`)) slot = [q, r];
    for (let ring = 1; !slot && ring <= 6; ring++) {
      let cq = q - ring, cr = r;
      for (const [dq, dr] of directions) {
        for (let step = 0; step < ring; step++) {
          if (!occupied.has(`${cq},${cr}`)) { slot = [cq, cr]; break; }
          cq += dq; cr += dr;
        }
        if (slot) break;
      }
    }
    while (!slot) {
      const candidate = nextFallback();
      if (!occupied.has(`${candidate[0]},${candidate[1]}`)) slot = candidate;
    }
    occupied.add(`${slot[0]},${slot[1]}`);
    // Stable, slight offsets avoid an artificial lattice appearance while
    // preserving a minimum 14-unit gap between node centers.
    let hash = 2166136261;
    for (let i = 0; i < node.id.length; i++) hash = Math.imul(hash ^ node.id.charCodeAt(i), 16777619);
    const angle = (hash >>> 0) / 0x100000000 * Math.PI * 2;
    return {
      id: node.id, domain: node.domain, title: node.title,
      x: spacing * (slot[0] + slot[1] / 2) + Math.cos(angle),
      y: rowHeight * slot[1] + Math.sin(angle),
      radius: 2.8 + Math.min(2.2, Math.log2(1 + degree) * 0.35),
    };
  });
}

// Connected components keep their own topology at the center. Unlinked articles
// form an organic outer halo rather than dominating the view as a tile matrix.
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
  const components: { members: GraphNode[]; edges: GraphEdge[] }[] = [];
  const componentFor = new Map<string, number>();
  for (const node of [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id))) {
    if (visited.has(node.id)) continue;
    const stack = [node.id], members: GraphNode[] = [];
    visited.add(node.id);
    while (stack.length) {
      const id = stack.pop()!;
      members.push(byId.get(id)!);
      componentFor.set(id, components.length);
      for (const neighbor of adjacency.get(id)!) {
        if (!visited.has(neighbor)) { visited.add(neighbor); stack.push(neighbor); }
      }
    }
    members.sort((a, b) => adjacency.get(b.id)!.size - adjacency.get(a.id)!.size || a.id.localeCompare(b.id));
    components.push({ members, edges: [] });
  }
  for (const edge of validEdges) components[componentFor.get(edge.src)!].edges.push(edge);
  const arranged = components.filter(({ members }) => members.length > 1).map(({ members, edges }) => {
    edges.sort((a, b) => a.src.localeCompare(b.src) || a.dst.localeCompare(b.dst) || a.score - b.score);
    const points = arrangeComponent(members, adjacency, edges);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const point of points) {
      minX = Math.min(minX, point.x - point.radius); minY = Math.min(minY, point.y - point.radius);
      maxX = Math.max(maxX, point.x + point.radius); maxY = Math.max(maxY, point.y + point.radius);
    }
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    let radius = 0;
    for (const point of points) radius = Math.max(radius, Math.hypot(point.x - cx, point.y - cy) + point.radius);
    return { points, cx, cy, radius };
  }).sort((a, b) => b.radius - a.radius || a.points[0].id.localeCompare(b.points[0].id));
  const nodes: GraphPoint[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  let outerRadius = 0, ringRadius = 0, ringMax = 0, firstRadius = 0, previousRadius = 0, angle = 0, phase = 0;
  for (let i = 0; i < arranged.length; i++) {
    const component = arranged[i];
    let cx = 0, cy = 0;
    if (i === 0) outerRadius = component.radius;
    else {
      const step = 2 * Math.asin(Math.min(1, (previousRadius + component.radius + 20) / (2 * ringRadius)));
      const closure = 2 * Math.asin(Math.min(1, (firstRadius + component.radius + 20) / (2 * ringRadius)));
      if (ringRadius === 0 || angle + step + closure > Math.PI * 2) {
        outerRadius = Math.max(outerRadius, ringRadius + ringMax);
        ringRadius = outerRadius + component.radius + 20;
        ringMax = firstRadius = component.radius;
        angle = 0; phase += goldenAngle;
      } else angle += step;
      cx = Math.cos(phase + angle) * ringRadius;
      cy = Math.sin(phase + angle) * ringRadius;
      previousRadius = component.radius;
    }
    for (const node of component.points) nodes.push({ ...node, x: cx + node.x - component.cx, y: cy + node.y - component.cy });
  }
  outerRadius = Math.max(outerRadius, ringRadius + ringMax);
  const innerRadius = arranged.length ? outerRadius + 28 : 0;
  const isolated = components.filter(({ members }) => members.length === 1).map(({ members }) => members[0]);
  // Constant area per article creates an even, spacious annulus; these are
  // individual articles with no inferred edges, never synthetic outlet nodes.
  isolated.forEach((node, i) => {
    const radius = Math.sqrt(innerRadius * innerRadius + 115 * (i + 1));
    const angle = i * goldenAngle;
    nodes.push({ id: node.id, domain: node.domain, title: node.title, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, radius: 2.8 });
  });
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
