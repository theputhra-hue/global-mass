import { apiClient, type ApiRequestOptions } from './client';
import type { MutationComparison, MutationComparisonInput } from './features';

export interface CaseSummary {
  id: string; title: string; notes: string; status: 'open' | 'reviewed' | 'archived'; revision: number;
  created_at: string; updated_at: string; snapshot_sha256: string;
}
export interface CaseDetail extends CaseSummary {
  snapshot: { schema_version: string; captured_at: string; inputs: MutationComparisonInput; analysis: MutationComparison['analysis']; interpretation: string };
}
export const casebookApi = {
  list: (q: string, archived: boolean, offset: number, options?: ApiRequestOptions) => apiClient.get<{items: CaseSummary[]; total: number}>(`/casebook?q=${encodeURIComponent(q)}&archived=${archived}&offset=${offset}&limit=20`, { ...options, authenticated: true }),
  get: (id: string, options?: ApiRequestOptions) => apiClient.get<CaseDetail>(`/casebook/${encodeURIComponent(id)}`, { ...options, authenticated: true }),
  create: (input: {title: string; notes: string; comparison: MutationComparisonInput}) => apiClient.post<CaseDetail>('/casebook', input, { authenticated: true }),
  review: (id: string, input: Pick<CaseSummary, 'notes' | 'status' | 'revision'>) => apiClient.post<CaseDetail>(`/casebook/${encodeURIComponent(id)}/review`, input, { authenticated: true }),
};
