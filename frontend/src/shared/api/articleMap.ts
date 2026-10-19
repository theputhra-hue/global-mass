import { apiClient } from './client';

export interface AtlasArticle {
  id: string; title: string; domain: string; topic_id: string | null;
  basis: 'stored_text' | 'title_only' | 'unsupported_language' | 'unavailable';
  x: number | null; y: number | null; duplicate_of: string | null;
}
export interface AtlasSummary {
  total_articles: number; unclassified: number; coverage: Record<string, number>;
  topics: Array<{ id: string; label: string; keywords: string[]; article_count: number }>;
  embedding_model: string; embedding_revision: string; completed_at: string;
  method: string; projection: string; input_sha256: string;
}
interface AtlasPage {
  available: boolean; run_id: string | null; reason?: string;
  total: number; offset: number; next_offset: number | null;
  summary: AtlasSummary | null; items: AtlasArticle[];
}
export interface CompleteAtlas { available: boolean; run_id: string | null; reason?: string; summary: AtlasSummary | null; articles: AtlasArticle[] }

export async function loadArticleMap(signal?: AbortSignal, progress?: (loaded: number, total: number) => void, release?: string | null): Promise<CompleteAtlas> {
  let page = await apiClient.get<AtlasPage>(`/graph/atlas?limit=500${release ? '&release=' + encodeURIComponent(release) : ''}`, { signal });
  if (typeof page?.available !== 'boolean') throw new Error('Invalid collection map response.');
  if (!page.available) return { available: false, run_id: page.run_id, reason: page.reason, summary: null, articles: [] };
  const run = page.run_id, total = page.total, summary = page.summary;
  if (!run || !Number.isInteger(total) || total < 0 || total > 20000 || !summary || summary.total_articles !== total || !Array.isArray(summary.topics) || !summary.coverage) throw new Error('Invalid collection map summary.');
  const articles: AtlasArticle[] = [], ids = new Set<string>();
  let expectedOffset = 0;
  for (;;) {
    if (page.run_id !== run || page.total !== total || page.offset !== expectedOffset || !Array.isArray(page.items) || page.items.length > 500) throw new Error('Collection pages changed or are malformed. Refresh the map.');
    for (const item of page.items) {
      if (!item.id || ids.has(item.id) || typeof item.title !== 'string' || (item.x !== null && !Number.isFinite(item.x)) || (item.y !== null && !Number.isFinite(item.y)) || (item.x === null) !== (item.y === null)) throw new Error('Invalid or duplicate article map record.');
      ids.add(item.id); articles.push(item);
    }
    if (articles.length > total) throw new Error('Collection map exceeds declared size.');
    if (!signal?.aborted) progress?.(articles.length, total);
    if (page.next_offset === null) break;
    if (page.next_offset !== articles.length || page.next_offset <= expectedOffset || articles.length >= total) throw new Error('Collection pagination did not advance safely.');
    expectedOffset = page.next_offset;
    page = await apiClient.get<AtlasPage>(`/graph/atlas?limit=500&offset=${expectedOffset}&release=${encodeURIComponent(run)}`, { signal });
  }
  if (articles.length !== total) throw new Error('Collection map is incomplete. No partial map is labelled complete.');
  return { available: true, run_id: run, summary, articles };
}
