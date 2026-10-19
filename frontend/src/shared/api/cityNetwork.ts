import { ApiError, apiClient } from './client';

export type CityRoad = [number, number, number];
export interface CityHighway { a: string; b: string; support: number; endpoints_a: number; endpoints_b: number }
export interface CityTheme { id: string; label: string; topics: string[]; article_count: number }
export interface CitySuperway { a: string; b: string; support: number; highways: number }
export interface CitySummary {
  method: string; calibration: string; article_ids: string[]; degree: number[]; total_roads: number;
  neighbor_k: number; min_similarity: number; min_highway_support: number; min_highway_endpoints: number;
  highways: CityHighway[]; themes: CityTheme[]; superways: CitySuperway[];
  completed_at: string; embedding_model: string; embedding_revision: string; input_sha256: string;
}
interface CityPage { available: boolean; run_id: string; reason?: string; total: number; offset: number; next_offset: number | null; summary: CitySummary | null; items: CityRoad[] }
export interface CompleteCity { available: boolean; run_id: string; reason?: string; summary: CitySummary | null; roads: CityRoad[] }

export async function loadCityNetwork(release: string, signal?: AbortSignal): Promise<CompleteCity> {
  let page: CityPage;
  try { page = await apiClient.get<CityPage>(`/graph/atlas/roads?release=${encodeURIComponent(release)}&limit=2000`, { signal }); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return { available: false, run_id: release, reason: 'This server predates semantic streets.', summary: null, roads: [] }; throw error; }
  if (typeof page?.available !== 'boolean' || page.run_id !== release) throw new Error('Road release differs from this map.');
  if (!page.available) return { available: false, run_id: release, reason: page.reason, summary: null, roads: [] };
  const summary = page.summary, total = page.total;
  if (!summary || !Array.isArray(summary.article_ids) || new Set(summary.article_ids).size !== summary.article_ids.length || summary.article_ids.length > 20000 || !Array.isArray(summary.degree) || summary.degree.length !== summary.article_ids.length || !Number.isInteger(total) || total < 0 || total > 100000 || summary.total_roads !== total || !Array.isArray(summary.highways) || !Array.isArray(summary.themes) || !Array.isArray(summary.superways)) throw new Error('Invalid city network summary.');
  if (!Number.isInteger(summary.neighbor_k) || summary.neighbor_k < 1 || summary.neighbor_k > 20 || !Number.isFinite(summary.min_similarity) || summary.min_similarity < 0 || summary.min_similarity > 1 || !Number.isInteger(summary.min_highway_support) || summary.min_highway_support < 1 || !Number.isInteger(summary.min_highway_endpoints) || summary.min_highway_endpoints < 1 || summary.article_ids.some(id => typeof id !== 'string') || summary.degree.some(d => !Number.isInteger(d) || d < 0)) throw new Error('Invalid city construction metadata.');
  const roads: CityRoad[] = [], degree = summary.article_ids.map(() => 0); let offset = 0, previousA = -1, previousB = -1;
  for (;;) {
    if (page.available !== true || page.run_id !== release || page.total !== total || page.offset !== offset || !Array.isArray(page.items) || page.items.length > 2000) throw new Error('Road pages changed or are malformed.');
    for (const road of page.items) {
      if (!Array.isArray(road) || road.length !== 3) throw new Error('Invalid road record.');
      const [a, b, score] = road;
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || a >= b || b >= degree.length || !Number.isFinite(score) || score < summary.min_similarity || score > 1 || a < previousA || (a === previousA && b <= previousB)) throw new Error('Invalid, duplicate or unsorted road endpoints.');
      previousA = a; previousB = b; degree[a]++; degree[b]++; roads.push(road);
    }
    if (roads.length > total) throw new Error('Road count exceeds declared size.');
    if (page.next_offset === null) break;
    if (page.next_offset !== roads.length || page.next_offset <= offset || roads.length >= total) throw new Error('Road pagination did not advance.');
    offset = page.next_offset;
    page = await apiClient.get<CityPage>(`/graph/atlas/roads?release=${encodeURIComponent(release)}&offset=${offset}&limit=2000`, { signal });
  }
  if (roads.length !== total || degree.some((d, i) => d !== summary.degree[i] || d > summary.neighbor_k)) throw new Error('Road network is incomplete or degree counts differ.');
  return { available: true, run_id: release, summary, roads };
}
