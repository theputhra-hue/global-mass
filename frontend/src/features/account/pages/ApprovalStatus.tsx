import { useQuery } from '@tanstack/react-query';
import { authApi } from '../../../shared/api/auth';
import { useSession } from '../../../shared/session/session';
import { AccountPanel } from '../components/AccountPanel';
import { QueryError } from '../../../shared/ui/QueryError';

export function ApprovalStatus() {
  const { user, revision } = useSession();
  const check = useQuery({ queryKey: ['account-approval', user?.id, revision], queryFn: authApi.me,
    refetchInterval: user?.access_status === 'pending' ? 15_000 : false, retry: false });
  const rejected = user?.access_status === 'rejected';
  return <main className="min-h-screen bg-hermes-ink text-hermes-bone font-mono p-6 md:p-10 flex items-center justify-center">
    <section className="card-brutal-dark p-6 md:p-10 max-w-xl space-y-6" aria-label="Account approval status">
      <p className="text-xs tracking-widest text-hermes-red-bright">GMEE / VISITOR ACCESS</p>
      <h1 className="font-display text-4xl">{rejected ? 'Your request was not approved.' : 'Your account is awaiting approval.'}</h1>
      <p className="text-sm leading-relaxed text-hermes-bone/70">{rejected ? 'Please contact the developers if you believe this decision needs a review.' : 'Your account has been created. A developer will review your request. Once approved, you can view articles, saved analysis and graphs. Editing and analysis actions stay disabled.'}</p>
      <dl className="text-sm space-y-3"><div><dt className="text-hermes-bone/50">Name</dt><dd>{user?.full_name}</dd></div><div><dt className="text-hermes-bone/50">Email</dt><dd className="break-all">{user?.email}</dd></div><div><dt className="text-hermes-bone/50">Status</dt><dd>{rejected ? 'Not approved' : 'Pending developer review'}</dd></div></dl>
      {check.isError && <QueryError title="Unable to check approval" error={check.error} />}
      <div className="flex flex-wrap gap-3"><button type="button" className="btn-outline-dark" disabled={check.isFetching} onClick={() => void check.refetch()}>{check.isFetching ? 'Checking…' : 'Check approval'}</button><AccountPanel /></div>
      {!rejected && <p className="text-xs text-hermes-bone/55">This page checks for approval automatically. You can also sign in again later.</p>}
    </section>
  </main>;
}
