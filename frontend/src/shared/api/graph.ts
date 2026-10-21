import { apiClient, type ApiRequestOptions } from './client';

export interface GraphNode {
  id: string;
  title: string;
  domain: string | null;
  url?: string | null;
  article_id?: string | null;
  published_at?: string | null;
  deg?: number;
  verdict?: string;
  prob?: number | null;
  kind?: 'article' | 'claim';
}

export interface GraphEdge {
  src: string;
  dst: string;
  score: number | null;
  id?: string;
  relationship_type?: string;
  directed?: boolean | null;
  score_kind?: string;
  score_family?: string;
  score_min?: number | null;
  score_max?: number | null;
  support_count?: number;
  basis?: string;
  references?: Array<{ id: string; from_claim_id: string; to_claim_id: string; from_article_id?: string; to_article_id?: string; score: number }>;
  references_truncated?: boolean;
}

export interface FullGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  counts: { nodes: number; edges: number };
  basis?: string;
  edge_source?: string;
  run_id?: string;
  bounded?: boolean;
  scope?: {
    total_nodes: number | null; total_relationships: number | null;
    relationships_returned: number; within_node_relationships: number;
    node_limit: number; relationship_limit: number; truncated: boolean | null;
    selection: string; aggregation?: string;
  };
}

export interface ClaimGraphNode {
  id: string;
  title: string;
  domain: string | null;
  verdict?: string;
  prob?: number | null;
}

export const graphApi = {
  full: (options?: ApiRequestOptions, release?: string) => apiClient.get<FullGraph>(`/graph/full${release ? '?release=' + encodeURIComponent(release) : ''}`, options),
  claims: (options?: ApiRequestOptions) => apiClient.get<FullGraph>('/graph/claims', options),
};
