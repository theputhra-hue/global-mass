import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { publicationsApi, type PublicationStatus } from '../api/publications';
import { useSession } from '../session/session';

interface Runtime { mode: 'local' | 'published' | 'connecting' | 'unavailable'; publication?: PublicationStatus }
const RuntimeContext = createContext<Runtime>({ mode: 'local' });
// The hook and provider share one runtime context.
// eslint-disable-next-line react-refresh/only-export-components
export const usePublicationRuntime = () => useContext(RuntimeContext);

export function PublicationProvider({ children }: { children: ReactNode }) {
  const { user, revision } = useSession();
  const approved = Boolean(user && (!user.access_status || user.access_status === 'approved'));
  const client = useQueryClient();
  const capabilities = useQuery({ queryKey: ['capabilities'], queryFn: () => apiClient.get<{ mode: string }>('/capabilities', { timeoutMs: 60_000 }), retry: false, staleTime: Infinity });
  const cloud = capabilities.data?.mode === 'published';
  const status = useQuery({ queryKey: ['publication-status', user?.id, revision, user?.access_status], queryFn: publicationsApi.status, enabled: cloud && approved, refetchInterval: 60_000, retry: false });
  const previous = useRef<number | undefined>();
  useEffect(() => {
    const revision = status.data?.revision;
    if (previous.current !== undefined && revision !== undefined && revision !== previous.current) {
      void client.invalidateQueries({ predicate: query => !['publication-status', 'capabilities'].includes(String(query.queryKey[0])) });
    }
    previous.current = revision;
  }, [client, status.data?.revision]);
  // A failed background refresh must not discard an already validated runtime.
  // Initial failures still use the explicit unavailable/retry screen.
  const mode = capabilities.isPending ? 'connecting' : capabilities.isError && !capabilities.data ? 'unavailable' : cloud ? 'published' : 'local';
  return <RuntimeContext.Provider value={{ mode, publication: status.data }}>{children}</RuntimeContext.Provider>;
}

export function MockPublicationProvider({
  mode = 'local',
  publication,
  children,
}: {
  mode?: 'local' | 'published' | 'connecting' | 'unavailable';
  publication?: PublicationStatus;
  children: ReactNode;
}) {
  return <RuntimeContext.Provider value={{ mode, publication }}>{children}</RuntimeContext.Provider>;
}

export function DataServiceState() {
  const runtime = usePublicationRuntime();
  const client = useQueryClient();
  return <main className="min-h-screen bg-hermes-ink text-hermes-bone font-mono p-8 space-y-5"><h1 className="font-display text-4xl">{runtime.mode === 'connecting' ? 'Connecting to the data service…' : 'Data service unavailable'}</h1><p className="text-sm">The free cloud API may need time to wake up after inactivity. Your published data stays in the managed database.</p><button className="btn-brutal" onClick={() => void client.refetchQueries({ queryKey: ['capabilities'] })}>Retry connection</button><a href="#/" className="btn-outline-dark ml-4">About GMEE</a></main>;
}

export function PublicationNotice() {
  const { mode, publication } = usePublicationRuntime();
  if (mode !== 'published') return null;
  return <aside aria-label="Published data status" className="border-y border-hermes-bone/20 bg-hermes-panel px-4 md:px-8 py-4 text-xs font-mono text-hermes-bone/75">
    <div className="flex flex-wrap items-center justify-between gap-3"><p>{publication?.run_id ? <>Published archive · Updated {new Date(publication.published_at!).toLocaleDateString()}</> : publication ? 'Awaiting the first reviewed publication.' : 'Checking publication details…'}</p><details><summary className="cursor-pointer underline underline-offset-4">About these results</summary><p className="max-w-2xl mt-3 leading-relaxed">{publication?.analysis_completed_at && <>Saved analysis through {new Date(publication.analysis_completed_at).toLocaleString()}. </>}AI analysis runs on the developers’ PC. This website serves saved results independently of that PC. Search uses text matching. Publication dates and analysis dates are different.</p></details></div>
  </aside>;
}
