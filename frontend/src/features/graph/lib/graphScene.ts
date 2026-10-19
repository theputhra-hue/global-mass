export const LAYOUT_VERSION = 'recorded-force-v1';
export const LAYOUT_SEED = 104729;
export interface GraphPoint { id: string; title: string; domain: string | null; x: number; y: number; radius: number }
export interface GraphLine { a: string; b: string; weight: number | null; id?: string; directed?: boolean | null }
export interface GraphScene { nodes: GraphPoint[]; edges: GraphLine[]; components: number; isolated: number; ticks: number; settled: boolean }
export function fitScene(nodes: GraphPoint[], width: number, height: number, _overview = false) {
  void _overview; // Retained for callers of the previous layout helper.
  if (!nodes.length || width <= 0 || height <= 0) return { ox: 0, oy: 0, scale: 1 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) { minX = Math.min(minX, node.x - node.radius - 20); maxX = Math.max(maxX, node.x + node.radius + 20); minY = Math.min(minY, node.y - node.radius - 20); maxY = Math.max(maxY, node.y + node.radius + 20); }
  const scale = Math.min(2, Math.max(.001, Math.min(Math.max(1, width - 48) / (maxX - minX), Math.max(1, height - 48) / (maxY - minY))));
  return { ox: -(minX + maxX) / 2 * scale, oy: -(minY + maxY) / 2 * scale, scale };
}
