import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../../shared/api/client';
import { usePublicationRuntime } from '../../../shared/runtime/publicationRuntime';
import { QueryError } from '../../../shared/ui/QueryError';

interface Hints {
  source_commit: string;
  config_sha256: string;
  model_revisions: Record<string, string>;
  notice: string;
}

export function LocalPublicationExport() {
  const runtime = usePublicationRuntime();
  const isLocal = runtime.mode === 'local';
  const hints = useQuery({
    queryKey: ['export-hints'],
    queryFn: () => apiClient.get<Hints>('/developer/export-hints', { authenticated: true }),
    enabled: isLocal,
    retry: false,
  });

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);

  async function download(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hints.data || pending) return;
    const values = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setDone(false);

    try {
      const provenance = {
        analysis_started_at: new Date(String(values.get('start'))).toISOString(),
        analysis_completed_at: new Date(String(values.get('end'))).toISOString(),
        source_commit: String(values.get('commit')).trim(),
        config_sha256: String(values.get('config')).trim(),
        model_revisions: JSON.parse(String(values.get('models'))) as unknown,
      };

      const file = await apiClient.downloadPost(
        '/developer/export',
        { provenance, reviewed: true },
        { authenticated: true, timeoutMs: 120_000 }
      );
      const url = URL.createObjectURL(file.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch (failure) {
      setError(failure);
    } finally {
      setPending(false);
    }
  }

  function getErrorMessage(err: unknown): string | null {
    if (err instanceof ApiError) {
      if (err.status === 409) {
        return 'An active processing job is running. Wait for all pipeline jobs to finish and refresh status before exporting.';
      }
      if (err.status === 422) {
        return 'No completed claims found in the selected extraction window or provenance values are invalid. Check dates.';
      }
      if (err.status === 413) {
        return 'Exported dataset exceeds the 10 MiB publication limit. Narrow the extraction window if needed.';
      }
      if (err.status === 401 || err.status === 403) {
        return 'Developer authorization is required to export.';
      }
    }
    return null;
  }

  const customErrorExplanation = getErrorMessage(error);

  if (!isLocal) {
    return (
      <section className="card-brutal-dark p-6 space-y-4">
        <h2 className="font-display text-3xl">Export reviewed analysis</h2>
        <p className="text-sm text-hermes-bone/70">
          Publication exports can only be generated from the local analysis environment where the raw corpus and models reside.
        </p>
      </section>
    );
  }

  return (
    <section className="card-brutal-dark p-6 space-y-5">
      <h2 className="font-display text-3xl">Export reviewed analysis</h2>

      <div className="space-y-3 text-sm text-hermes-bone/75">
        <p>
          Select the claim extraction window. Only completed claims extracted within this period and their eligible owning
          articles will be exported.
        </p>
        <p className="border-l-2 border-amber-300/60 pl-3 text-xs text-hermes-bone/80">
          <strong>Important:</strong> These timestamps select completed claims by extraction time, not article publication
          dates. Raw un-extracted articles are not exported.
        </p>
        <p className="border-l-2 border-hermes-red-bright/60 pl-3 text-xs text-hermes-bone/80">
          <strong>Complete replacement release (10 MiB max):</strong> Each publication file replaces the live cloud collection
          in its entirety. To keep older coverage visible to readers, choose a cumulative extraction window covering all
          desired completed claims. Never split a dataset into multiple partial uploads.
        </p>
        <p className="text-xs text-hermes-bone/60">
          The export excludes passwords, accounts, sessions, full source text, private annotations, and embeddings. Review the
          derived claims before uploading.
        </p>
      </div>

      {hints.isPending && <p role="status">Loading local provenance…</p>}
      {hints.error && <QueryError title="Export setup unavailable" error={hints.error} />}

      {hints.data && (
        <form onSubmit={(event) => void download(event)} className="space-y-4">
          <div className="bg-hermes-panel/40 border border-hermes-bone/15 p-3 text-xs text-amber-200">
            <p className="font-bold mb-1">Configuration Notice:</p>
            <p>{hints.data.notice}</p>
            <p className="mt-1 text-hermes-bone/60">
              Current hints describe the server&apos;s active environment, not verified historical execution provenance. The
              operator must verify these values match the actual run.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-sm">
              Claim extraction started
              <input
                name="start"
                aria-label="Claim extraction started"
                type="datetime-local"
                required
                className="field-brutal w-full mt-2"
              />
            </label>
            <label className="text-sm">
              Claim extraction completed
              <input
                name="end"
                aria-label="Claim extraction completed"
                type="datetime-local"
                required
                className="field-brutal w-full mt-2"
              />
            </label>
          </div>

          <label className="block text-sm">
            Analysis source commit
            <input
              name="commit"
              aria-label="Analysis source commit"
              required
              pattern="[0-9a-f]{40}"
              defaultValue={hints.data.source_commit}
              className="field-brutal w-full mt-2"
            />
          </label>

          <label className="block text-sm">
            Analysis configuration SHA-256
            <input
              name="config"
              aria-label="Analysis configuration SHA-256"
              required
              pattern="[0-9a-f]{64}"
              defaultValue={hints.data.config_sha256}
              className="field-brutal w-full mt-2"
            />
          </label>

          <label className="block text-sm">
            Actual model revisions (JSON)
            <textarea
              name="models"
              aria-label="Actual model revisions (JSON)"
              required
              rows={5}
              defaultValue={JSON.stringify(hints.data.model_revisions, null, 2)}
              className="field-brutal w-full mt-2"
            />
          </label>

          <label className="flex gap-3 text-sm items-start cursor-pointer">
            <input type="checkbox" required className="mt-1" />
            <span>I reviewed these results and verified that this provenance matches the selected analysis.</span>
          </label>

          <button className="btn-brutal" disabled={pending}>
            {pending ? 'Preparing export…' : 'Download publication file'}
          </button>
        </form>
      )}

      {error != null && (
        <div className="space-y-2">
          <QueryError title="Export failed" error={error} />
          {customErrorExplanation && (
            <p role="alert" className="text-xs border border-hermes-red-bright/40 p-2 text-hermes-red-bright">
              {customErrorExplanation}
            </p>
          )}
        </div>
      )}

      {done && (
        <p role="status" className="border border-hermes-bone/30 p-3 text-sm">
          File downloaded. Keep the exact file for retries. Upload it on the live website, review the release, then click
          Publish.
        </p>
      )}
    </section>
  );
}
