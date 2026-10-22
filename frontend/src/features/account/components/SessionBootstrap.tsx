import { useEffect, useState, type ReactNode } from 'react';
import { restoreSession } from '../../../shared/api/auth';
import { getAccessToken } from '../../../shared/session/session';
import { readReloadSession } from '../../../shared/session/reloadSession';
import { QueryError } from '../../../shared/ui/QueryError';

/** Keep route redirects and protected components unmounted until verification. */
export function SessionBootstrap({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(() => !getAccessToken() && Boolean(readReloadSession()));
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (!pending) return;
    let active = true;
    void restoreSession().catch(failure => { if (active) setError(failure); })
      .finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, [pending]);
  if (pending || error) return <main className="min-h-screen bg-hermes-ink text-hermes-bone font-mono p-6 md:p-10 flex items-center justify-center">
    <section className="card-brutal-dark w-full max-w-lg p-6 md:p-10 space-y-5">
      <p className="text-xs tracking-widest text-hermes-red-bright">GMEE / RESEARCH WORKSPACE</p>
      <h1 className="font-display text-4xl">{pending ? 'Restoring your session…' : 'Please sign in again'}</h1>
      {pending ? <p role="status" className="text-sm text-hermes-bone/70">Checking your account before opening your page. The free data service may take a moment to wake up.</p> : <>
        <QueryError title="We could not restore your sign-in" error={error} />
        <p className="text-sm text-hermes-bone/70">Your requested page is preserved. Sign in again to continue.</p>
        <button className="btn-brutal" onClick={() => setError(null)}>Continue to sign in</button>
      </>}
    </section>
  </main>;
  return children;
}
