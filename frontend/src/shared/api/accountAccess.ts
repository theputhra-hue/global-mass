import { apiClient } from './client';

export type AccessStatus = 'pending' | 'approved' | 'rejected';
export interface VisitorRequest {
  id: string; email: string; full_name: string | null; access_status: AccessStatus;
  revision: number; role: string; created_at: string; reviewed_at: string | null;
}
export const accountAccessApi = {
  list: (status: AccessStatus, offset: number) => apiClient.get<{ items: VisitorRequest[]; counts: Record<AccessStatus, number>; total: number; limit: number; offset: number }>(`/developer/accounts?${new URLSearchParams({ access_status: status, offset: String(offset), limit: '20' })}`, { authenticated: true }),
  review: (account: VisitorRequest, decision: 'approve' | 'reject') => apiClient.post<VisitorRequest>(`/developer/accounts/${encodeURIComponent(account.id)}/review`, { decision, expected_revision: account.revision }, { authenticated: true }),
};
