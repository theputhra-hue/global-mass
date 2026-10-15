import { apiClient } from './client';

export interface UploadReceipt {
  run_id: string; sha256: string; uploaded_at: string;
  status: 'staged'; replayed: boolean;
  articles: number; claims: number; relationships: number;
}
export const publicationsApi = {
  access: () => apiClient.get<{ allowed: boolean; max_bytes: number; mode: string }>('/publications/access', { authenticated: true }),
  list: () => apiClient.get<{ items: UploadReceipt[] }>('/publications', { authenticated: true }),
  upload: (data: unknown) => apiClient.post<UploadReceipt>('/publications/upload', data, { authenticated: true, timeoutMs: 60_000 }),
};
