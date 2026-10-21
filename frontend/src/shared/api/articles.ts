import { apiClient, type ApiRequestOptions } from './client';
import type { CorpusArticle } from './corpus';

export interface ArticleDetail extends CorpusArticle {
  body: string; body_source: string; content_completeness: string;
  collected_at: string; processed_at: string | null; processing_status: string; claims_total: number;
  assessment_counts?: Record<string, number>;
}
export interface ArticleClaim {
  id: string; article_id: string; text: string; extracted_at: string;
  confidence: number | null; verdict: string | null; verdict_probability: number | null;
  verdict_rationale: string | null; entities: { text: string; type: string }[];
  verdict_evidence: Record<string, unknown> | null;
}
export interface ArticleClaims {
  article_id: string; total: number; limit: number; offset: number;
  items: ArticleClaim[]; selected: ArticleClaim | null;
}
export interface ArticleNode { id: string; title: string; domain: string | null; url: string; published_at: string | null }
export interface ConnectionEdge {
  id: string; from_article_id: string; to_article_id: string;
  from_claim_id: string; to_claim_id: string; from_text: string; to_text: string;
  relationship_type: string; score: number; mutation_evidence: Record<string, unknown> | null;
}
export interface ArticleConnections {
  article_id: string; basis: string; total_edges: number; limit: number; truncated: boolean;
  articles: ArticleNode[]; edges: ConnectionEdge[]; observed_propagation: boolean;
}
export const articlesApi = {
  detail: (id: string, options?: ApiRequestOptions, release?: string) => apiClient.get<ArticleDetail>(`/corpus/articles/${encodeURIComponent(id)}${release ? `?release=${encodeURIComponent(release)}` : ''}`, options),
  claims: (id: string, offset: number, selected: string, options?: ApiRequestOptions, release?: string) => {
    const params = new URLSearchParams({ limit: '20', offset: String(offset) });
    if (release) params.set('release', release);
    if (selected) params.set('selected', selected);
    return apiClient.get<ArticleClaims>(`/corpus/articles/${encodeURIComponent(id)}/claims?${params}`, options);
  },
  connections: (id: string, options?: ApiRequestOptions, release?: string) => apiClient.get<ArticleConnections>(`/corpus/articles/${encodeURIComponent(id)}/connections?limit=100${release ? `&release=${encodeURIComponent(release)}` : ''}`, options),
};
