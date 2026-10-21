import { apiClient } from './client';

export type AccessStatus = 'pending' | 'approved' | 'rejected' | 'paused' | 'banned';
export type AccountAction = 'allow' | 'pause' | 'ban';
export type AccountFilter = AccessStatus | 'all';
export interface VisitorRequest {
  id: string; email: string; full_name: string | null; access_status: AccessStatus;
  revision: number; role: string; is_active: boolean; created_at: string; reviewed_at: string | null;
}
export const accountAccessApi = {
  list: (status: AccountFilter, offset: number) => apiClient.get<{ items: VisitorRequest[]; counts: Record<AccountFilter, number>; total: number; limit: number; offset: number }>(`/developer/accounts?${new URLSearchParams({ access_status: status, offset: String(offset), limit: '20' })}`, { authenticated: true }),
  control: (account: VisitorRequest, action: AccountAction) => apiClient.post<VisitorRequest>(`/developer/accounts/${encodeURIComponent(account.id)}/control`, { action, expected_revision: account.revision }, { authenticated: true }),
  review: (account: VisitorRequest, decision: 'approve' | 'reject') => apiClient.post<VisitorRequest>(`/developer/accounts/${encodeURIComponent(account.id)}/review`, { decision, expected_revision: account.revision }, { authenticated: true }),
};
