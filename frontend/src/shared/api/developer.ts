import { apiClient } from './client';

export type PipelineStage = 'collection' | 'preprocessing' | 'nlp' | 'evolution';
export interface DeveloperOverview {
  pipeline_enabled: boolean;
  nlp_cycle_limit?: number;
  counts: { articles: number; claims: number; relationships: number };
  processing: Record<string, number>; nlp: Record<string, number>;
  sources: Array<{ id: string; name: string; type: string; enabled: boolean; last_collected_at: string | null }>;
  jobs: Array<{ id: string; type: string; status: string; started_at: string; finished_at: string | null; heartbeat_at: string | null; lease_expires_at: string; has_error: boolean }>;
}
export interface DeveloperRunResult {
  job_id?: string;
  summary?: { total_processed?: number; claims_extracted?: number; status_counts?: Record<string, number> };
  result?: { status?: string; clusters_found?: number; relationships_detected?: number; neo4j_sync_success?: boolean };
}
export const developerApi = {
  overview: () => apiClient.get<DeveloperOverview>('/developer/overview', { authenticated: true }),
  run: (stage: PipelineStage) => apiClient.post<DeveloperRunResult>(`/${stage}/trigger`, {}, { authenticated: true, timeoutMs: 120_000, refreshOnUnauthorized: false }),
  source: (id: string, enabled: boolean) => apiClient.post(`/developer/sources/${encodeURIComponent(id)}`, { enabled }, { authenticated: true }),
};
