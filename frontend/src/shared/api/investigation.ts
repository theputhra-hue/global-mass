import { apiClient, type ApiRequestOptions } from './client';
export interface Topic { id: string; label: string; keywords: string[]; article_count: number }
export interface CoverageArticle { id: string; title: string; domain: string; published_at: string | null; url: string | null; basis: string }
export interface TopicDetail {
  run_id: string; topic: Topic; total: number; sources: number; earliest: string | null; latest: string | null;
  offset: number; next_offset: number | null; items: CoverageArticle[];
  connections: { neighbor_id: string; neighbor_label: string; support: number; endpoints_a: number; endpoints_b: number }[];
  methods: { method?: string; embedding_model?: string; embedding_revision?: string; completed_at?: string; coverage?: Record<string, number> };
  observed_propagation: false;
}
export interface ArticleContext {
  run_id: string; article_id: string; topic: Topic | null; basis: string; network_available: boolean;
  neighbors: (CoverageArticle & { score: number })[]; observed_propagation: false;
}
export const investigationApi = {
  topic: (id: string, release: string, offset: number, oldest: boolean, options?: ApiRequestOptions) =>
    apiClient.get<TopicDetail>(`/graph/topics/${encodeURIComponent(id)}?${new URLSearchParams({ release, offset: String(offset), limit: '20', order: oldest ? 'oldest' : 'newest' })}`, options),
  context: (id: string, release: string, options?: ApiRequestOptions) =>
    apiClient.get<ArticleContext>(`/graph/articles/${encodeURIComponent(id)}/context?${new URLSearchParams({ release })}`, options),
};
