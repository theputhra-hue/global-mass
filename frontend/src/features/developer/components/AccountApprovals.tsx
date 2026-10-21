import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { accountAccessApi, type AccessStatus, type VisitorRequest } from '../../../shared/api/accountAccess';
import { publicationsApi } from '../../../shared/api/publications';
import { useSession } from '../../../shared/session/session';
import { QueryError } from '../../../shared/ui/QueryError';

export function AccountApprovals() {
  const { user, revision } = useSession();
  const client = useQueryClient();
  const access = useQuery({ queryKey: ['publication-access', user?.id, revision], queryFn: publicationsApi.access, enabled: user?.role === 'admin', retry: false });
  const [status, setStatus] = useState<AccessStatus>('pending'), [offset, setOffset] = useState(0);
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
  return <section className="card-brutal-dark p-5 md:p-7 space-y-5 max-w-4xl" aria-label="Visitor access requests">
    <header className="space-y-3"><p className="text-xs tracking-widest text-hermes-red-bright">ACCOUNT MANAGEMENT</p><h2 className="font-display text-3xl">Visitor access requests</h2><p className="text-sm text-hermes-bone/70">New accounts cannot view data until you approve them. Approval grants viewing only; it never grants analysis, editing, upload or publishing permissions.</p></header>
    <div className="flex flex-wrap gap-3 items-center"><label htmlFor="visitor-request-status" className="text-sm">Show</label><select id="visitor-request-status" className="field-brutal" value={status} onChange={event => { setStatus(event.target.value as AccessStatus); setOffset(0); }}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Declined</option></select><button className="btn-outline-dark" disabled={requests.isFetching} onClick={() => void requests.refetch()}>Refresh requests</button></div>
    {requests.data && <p className="text-xs text-hermes-bone/65">{requests.data.counts.pending} pending · {requests.data.counts.approved} approved · {requests.data.counts.rejected} declined</p>}
    {notice && <p role="status" className="border border-hermes-bone/20 p-4 text-sm">{notice}</p>}
    {error != null && <QueryError title="Account review failed" error={error} />}
    {requests.isPending && <p role="status">Loading account requests…</p>}
    {requests.isError && <QueryError title="Account requests unavailable" error={requests.error} onRetry={() => requests.refetch()} />}
    {requests.data && <>
      {!requests.data.items.length && <p className="border border-dashed border-hermes-bone/20 p-5 text-sm">{status === 'pending' ? 'No accounts are waiting for approval.' : 'No accounts in this view.'}</p>}
      {requests.data.items.map(account => <article key={account.id} className="border border-hermes-bone/20 p-5 space-y-3"><h3 className="font-display text-2xl break-words">{account.full_name || 'Name not supplied'}</h3><p className="text-sm break-all">{account.email}</p><p className="text-xs text-hermes-bone/60">Requested {new Date(account.created_at).toLocaleString()}{account.reviewed_at ? ` · Reviewed ${new Date(account.reviewed_at).toLocaleString()}` : ''}</p>{account.access_status === 'pending' ? <div className="flex flex-wrap gap-3"><button className="btn-brutal" disabled={busy !== null} aria-label={`Approve ${account.full_name || account.email} for viewing`} onClick={() => void review(account, 'approve')}>{busy === account.id ? 'Saving decision…' : 'Approve viewing access'}</button><button className="btn-outline-dark" disabled={busy !== null} aria-label={`Decline ${account.full_name || account.email}`} onClick={() => void review(account, 'reject')}>Decline request</button></div> : <p className="text-xs">{account.access_status === 'approved' ? 'Approved · Viewing only' : 'Declined · No data access'}</p>}</article>)}
      <div className="flex flex-wrap gap-3 items-center"><button className="btn-outline-dark" disabled={offset === 0 || requests.isFetching} onClick={() => setOffset(value => Math.max(0, value - 20))}>Previous requests</button><span className="text-xs">{requests.data.total ? offset + 1 : 0}–{offset + requests.data.items.length} of {requests.data.total}</span><button className="btn-outline-dark" disabled={offset + 20 >= requests.data.total || requests.isFetching} onClick={() => setOffset(value => value + 20)}>Next requests</button></div>
    </>}
  </section>;
}
