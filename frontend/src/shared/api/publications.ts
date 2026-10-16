import { apiClient } from './client';

export interface UploadReceipt {
  run_id: string; sha256: string; uploaded_at: string;
  status: 'staged'; replayed: boolean;
  articles: number; claims: number; relationships: number;
}
export interface PublicationStatus {
  mode: 'published'; revision: number; run_id: string | null;
  published_at: string | null; generated_at: string | null; analysis_completed_at: string | null;
  sha256: string | null; counts: { articles: number; claims: number; relationships: number };
}
export interface PublicationReview extends UploadReceipt {
  generated_at: string; provenance: Record<string, unknown>;
  sample_articles: Array<{ id: string; title: string; domain: string; url: string }>;
  sample_claims: Array<{ id: string; text: string }>;
  current: PublicationStatus;
}
export const publicationsApi = {
  access: () => apiClient.get<{ allowed: boolean; max_bytes: number; mode: string }>('/publications/access', { authenticated: true }),
  list: () => apiClient.get<{ items: UploadReceipt[] }>('/publications', { authenticated: true }),
  upload: (data: unknown) => apiClient.post<UploadReceipt>('/publications/upload', data, { authenticated: true, timeoutMs: 60_000 }),
  status: () => apiClient.get<PublicationStatus>('/publications/status'),
  review: (id: string) => apiClient.get<PublicationReview>(`/publications/${encodeURIComponent(id)}/review`, { authenticated: true }),
  publish: (review: PublicationReview) => apiClient.post<PublicationStatus>(`/publications/${encodeURIComponent(review.run_id)}/publish`, {
    sha256: review.sha256, expected_revision: review.current.revision, reviewed: true,
  }, { authenticated: true, timeoutMs: 120_000 }),
};
