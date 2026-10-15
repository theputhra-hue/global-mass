import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicationsApi, type UploadReceipt } from '../api/publications';
import { AccountPanel } from '../components/AccountPanel';
import { QueryError } from '../components/QueryError';
import { useSession } from '../lib/session';

export function DeveloperUpload() {
  const { user, revision } = useSession();
  const access = useQuery({ queryKey: ['publication-access', user?.id, revision], queryFn: publicationsApi.access, retry: false });
  const history = useQuery({ queryKey: ['publication-history', user?.id, revision], queryFn: publicationsApi.list, enabled: access.data?.allowed === true });
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<UploadReceipt | null>(null);

  async function upload() {
    if (!file || !access.data?.allowed) return;
    setPending(true); setError(null); setResult(null);
    try {
      if (file.size > access.data.max_bytes) throw new Error('Choose a file smaller than 10 MiB.');
      const data: unknown = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Choose a publication JSON object.');
      const receipt = await publicationsApi.upload(data);
      setResult(receipt);
      await history.refetch();
    } catch (failure) { setError(failure); }
    finally { setPending(false); }
  }
  return <main className="min-h-screen bg-hermes-ink text-hermes-bone font-mono p-4 md:p-8">
    <header className="flex flex-wrap justify-between items-center gap-4 border-b border-hermes-bone/20 pb-5">
      <a href="#/dashboard" className="btn-outline-dark">Back to dashboard</a><AccountPanel />
    </header>
    <div className="max-w-3xl mx-auto py-10 space-y-6">
      <p className="text-xs uppercase tracking-widest text-hermes-red-bright">Developer workspace</p>
      <h1 className="font-display text-4xl">Upload analysis</h1>
      {access.isLoading && <p role="status">Checking developer access…</p>}
      {access.isError && <QueryError title="Cannot check developer access" error={access.error} onRetry={() => access.refetch()} />}
      {access.data && !access.data.allowed && <p role="alert">This account does not have developer upload access. Only approved developer accounts can upload.</p>}
      {access.data?.allowed && <>
        <p className="text-sm text-hermes-bone/70">Choose the publication JSON exported from your local analysis. The server validates it and stores a separate release.</p>
        <p className="border border-hermes-bone/25 p-4 text-sm">Uploads are saved for staging. They do not yet replace the website’s current data. Public release activation is being built separately.</p>
        <section className="card-brutal-dark p-6 space-y-4">
          <label htmlFor="publication-file" className="block">1. Choose your analysis file</label>
          <input id="publication-file" type="file" accept=".json,application/json" disabled={pending} className="field-brutal w-full" onChange={event => { setFile(event.target.files?.[0] ?? null); setError(null); setResult(null); }} />
          <p className="text-xs text-hermes-bone/60">Publication format v1 · maximum 10 MiB · JSON only</p>
          {file && <p className="text-sm break-all">Selected: {file.name}</p>}
          <button type="button" className="btn-brutal" disabled={!file || pending} onClick={() => void upload()}>{pending ? 'Validating and uploading…' : '2. Validate and upload'}</button>
        </section>
        {error != null && <QueryError title="Upload failed" error={error} />}
        {result && <div role="status" className="card-brutal-dark p-5">{result.replayed ? 'Already uploaded. No duplicate created.' : 'Upload saved successfully.'} {result.articles} articles · {result.claims} claims · {result.relationships} relationships. Status: staged.</div>}
        <section className="space-y-3"><h2 className="font-display text-2xl">Recent uploads</h2>
          {history.isLoading && <p>Loading uploads…</p>}
          {history.isError && <QueryError title="Upload history unavailable" error={history.error} onRetry={() => history.refetch()} />}
          {history.data?.items.length === 0 && <p className="text-sm">No uploads yet.</p>}
          {history.data?.items.map(item => <article key={item.run_id} className="card-brutal-dark p-4 text-sm space-y-2"><p>{new Date(item.uploaded_at).toLocaleString()} · Staged</p><p>{item.articles} articles · {item.claims} claims · {item.relationships} relationships</p><p className="break-all text-xs text-hermes-bone/60">Run: {item.run_id}</p></article>)}
        </section>
      </>}
    </div>
  </main>;
}
