import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { accountAccessApi, type AccountFilter, type VisitorRequest } from '../../../shared/api/accountAccess';
import { publicationsApi } from '../../../shared/api/publications';
import { useSession } from '../../../shared/session/session';
import { QueryError } from '../../../shared/ui/QueryError';

export function AccountApprovals() {
  const { user, revision } = useSession();
  const client = useQueryClient();
  const access = useQuery({ queryKey: ['publication-access', user?.id, revision], queryFn: publicationsApi.access, enabled: user?.role === 'admin', retry: false });
  const [status, setStatus] = useState<AccountFilter>('all'), [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState<unknown>(null), [notice, setNotice] = useState('');
  const requests = useQuery({ queryKey: ['developer-accounts', user?.id, revision, status, offset], queryFn: () => accountAccessApi.list(status, offset), enabled: access.data?.allowed === true, retry: false, refetchInterval: 30_000 });
  async function review(account: VisitorRequest, decision: 'approve' | 'reject') {
    if (busy) return;
    setBusy(account.id); setError(null); setNotice('');
    try {
      await accountAccessApi.review(account, decision);
      setNotice(`${account.full_name || account.email}: ${decision === 'approve' ? 'approved for viewing only' : 'request declined'}.`);
      await client.invalidateQueries({ queryKey: ['developer-accounts'] });
    } catch (failure) { setError(failure); }
    finally { setBusy(null); }
  }
  if (!access.data?.allowed) return null;
  return <section className="card-brutal-dark p-5 md:p-7 space-y-5 max-w-4xl" aria-label="Account management">
    <header className="space-y-3"><p className="text-xs tracking-widest text-hermes-red-bright">ACCOUNT MANAGEMENT</p><h2 className="font-display text-3xl">All accounts</h2><p className="text-sm text-hermes-bone/70">Every registered email is listed here, including developers, researchers and viewers. New visitors need your approval to view data. Approval grants viewing only.</p></header>
    <div className="flex flex-wrap gap-3 items-center"><label htmlFor="account-status" className="text-sm">Show</label><select id="account-status" className="field-brutal" value={status} onChange={event => { setStatus(event.target.value as AccountFilter); setOffset(0); }}><option value="all">All accounts</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Declined</option></select><button className="btn-outline-dark" disabled={requests.isFetching} onClick={() => void requests.refetch()}>Refresh accounts</button></div>
    {requests.data && <p className="text-xs text-hermes-bone/65">{requests.data.counts.all} total accounts · {requests.data.counts.pending} pending · {requests.data.counts.approved} approved · {requests.data.counts.rejected} declined</p>}
    {notice && <p role="status" className="border border-hermes-bone/20 p-4 text-sm">{notice}</p>}
    {error != null && <QueryError title="Account review failed" error={error} />}
    {requests.isPending && <p role="status">Loading accounts…</p>}
    {requests.isError && <QueryError title="Accounts unavailable" error={requests.error} onRetry={() => requests.refetch()} />}
    {requests.data && <>
      {!requests.data.items.length && <p className="border border-dashed border-hermes-bone/20 p-5 text-sm">{status === 'pending' ? 'No accounts are waiting for approval.' : 'No accounts in this view.'}</p>}
      {requests.data.items.map(account => <article key={account.id} className="border border-hermes-bone/20 p-5 space-y-3">
        <h3 className="font-display text-2xl break-words">{account.full_name || 'Name not supplied'}</h3>
        <p className="text-sm break-all">{account.email}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="border border-hermes-bone/20 px-2 py-1">Role: {account.role === 'admin' ? 'Developer / admin' : account.role === 'researcher' ? 'Researcher' : account.role === 'viewer' ? 'Viewer' : 'User'}</span>
          <span className="border border-hermes-bone/20 px-2 py-1">{account.is_active ? 'Active' : 'Disabled'}</span>
          <span className="border border-hermes-bone/20 px-2 py-1">{account.access_status === 'pending' ? 'Pending approval' : account.access_status === 'approved' ? 'Approved' : 'Declined'}</span>
        </div>
        <p className="text-xs text-hermes-bone/60">Registered {new Date(account.created_at).toLocaleString()}{account.reviewed_at ? ` · Reviewed ${new Date(account.reviewed_at).toLocaleString()}` : ''}</p>
        {account.access_status === 'pending' && account.role === 'viewer' && account.is_active ? <div className="flex flex-wrap gap-3">
          <button className="btn-brutal" disabled={busy !== null} aria-label={`Approve ${account.full_name || account.email} for viewing`} onClick={() => void review(account, 'approve')}>{busy === account.id ? 'Saving decision…' : 'Approve viewing access'}</button>
          <button className="btn-outline-dark" disabled={busy !== null} aria-label={`Decline ${account.full_name || account.email}`} onClick={() => void review(account, 'reject')}>Decline request</button>
        </div> : <p className="text-xs">{!account.is_active ? 'Disabled account · Sign-in unavailable' : account.access_status !== 'approved' ? 'No data access' : account.role === 'viewer' ? 'Viewing only' : 'Access follows the existing account role'}</p>}
      </article>)}
      <div className="flex flex-wrap gap-3 items-center"><button className="btn-outline-dark" disabled={offset === 0 || requests.isFetching} onClick={() => setOffset(value => Math.max(0, value - 20))}>Previous accounts</button><span className="text-xs">{requests.data.total ? offset + 1 : 0}–{offset + requests.data.items.length} of {requests.data.total}</span><button className="btn-outline-dark" disabled={offset + 20 >= requests.data.total || requests.isFetching} onClick={() => setOffset(value => value + 20)}>Next accounts</button></div>
    </>}
  </section>;
}
