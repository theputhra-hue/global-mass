import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { QueryError } from './QueryError';

interface Hints { source_commit: string; config_sha256: string; model_revisions: Record<string, string>; notice: string }
export function LocalPublicationExport() {
  const hints = useQuery({ queryKey: ['export-hints'], queryFn: () => apiClient.get<Hints>('/developer/export-hints', { authenticated: true }), retry: false });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  async function download(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hints.data || pending) return;
    const values = new FormData(event.currentTarget);
    setPending(true); setError(null); setDone(false);
    try {
      const provenance = {
        analysis_started_at: new Date(String(values.get('start'))).toISOString(),
        analysis_completed_at: new Date(String(values.get('end'))).toISOString(),
        source_commit: String(values.get('commit')).trim(), config_sha256: String(values.get('config')).trim(),
        model_revisions: JSON.parse(String(values.get('models'))) as unknown,
      };
      const file = await apiClient.downloadPost('/developer/export', { provenance, reviewed: true }, { authenticated: true, timeoutMs: 120_000 });
      const url = URL.createObjectURL(file.blob); const a = document.createElement('a');
      a.href = url; a.download = file.filename; a.click(); URL.revokeObjectURL(url); setDone(true);
    } catch (failure) { setError(failure); }
    finally { setPending(false); }
  }
  return <section className="card-brutal-dark p-6 space-y-5"><h2 className="font-display text-3xl">Export reviewed analysis</h2>
    <p className="text-sm text-hermes-bone/70">Choose the extraction period. Only completed articles and their claims in this period are exported. Each file is a complete replacement release, not an incremental addition.</p>
    <p className="text-sm text-hermes-bone/70">The export excludes passwords, accounts, sessions, full source text, private annotations and embeddings. Review the derived claim text before uploading.</p>
    {hints.isPending && <p>Loading local provenance…</p>}{hints.error && <QueryError title="Export setup unavailable" error={hints.error} />}
    {hints.data && <form onSubmit={event => void download(event)} className="space-y-4">
      <p className="text-xs text-amber-200">{hints.data.notice}</p>
      <div className="grid md:grid-cols-2 gap-4"><label className="text-sm">Analysis started<input name="start" aria-label="Analysis started" type="datetime-local" required className="field-brutal w-full mt-2" /></label><label className="text-sm">Analysis completed<input name="end" aria-label="Analysis completed" type="datetime-local" required className="field-brutal w-full mt-2" /></label></div>
      <label className="block text-sm">Analysis source commit<input name="commit" required pattern="[0-9a-f]{40}" defaultValue={hints.data.source_commit} className="field-brutal w-full mt-2" /></label>
      <label className="block text-sm">Analysis configuration SHA-256<input name="config" required pattern="[0-9a-f]{64}" defaultValue={hints.data.config_sha256} className="field-brutal w-full mt-2" /></label>
      <label className="block text-sm">Actual model revisions (JSON)<textarea name="models" required rows={5} defaultValue={JSON.stringify(hints.data.model_revisions, null, 2)} className="field-brutal w-full mt-2" /></label>
      <label className="flex gap-3 text-sm"><input type="checkbox" required /> I reviewed these results and verified that this provenance matches the selected analysis.</label>
      <button className="btn-brutal" disabled={pending}>{pending ? 'Preparing export…' : 'Download publication file'}</button>
    </form>}
    {error != null && <QueryError title="Export failed" error={error} />}{done && <p role="status">File downloaded. Keep the exact file for retries. Upload it on the live website, review the release, then click Publish.</p>}
  </section>;
}
