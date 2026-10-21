import { useId, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { accountAccessApi, type AccountAction, type AccountFilter, type VisitorRequest } from '../../../shared/api/accountAccess';
import { publicationsApi } from '../../../shared/api/publications';
import { useSession } from '../../../shared/session/session';
import { QueryError } from '../../../shared/ui/QueryError';
import { Dialog } from '../../../shared/ui/Dialog';

type Decision = AccountAction | 'decline';
const labels: Record<Decision, string> = { allow: 'Allow viewing', pause: 'Pause access', ban: 'Ban account', decline: 'Decline request' };
const effects: Record<Decision, string> = {
  allow: 'Allow this account to view published data. It will have viewing-only permissions. Revoked sessions stay invalid; the user may need to sign in again.',
  pause: 'Temporarily block data access and revoke existing sessions. The user can sign in to see their paused status. Use Allow viewing to restore access.',
  ban: 'Block sign-in and data access, and revoke existing sessions. This keeps the account and its history. Only a developer can restore it with Allow viewing.',
  decline: 'Decline this pending request. The visitor will have no data access. You can allow viewing later.',
};
const statusLabels: Record<string, string> = { pending: 'Pending approval', approved: 'Approved', rejected: 'Declined', paused: 'Paused', banned: 'Banned' };

export function AccountApprovals() {
  const { user, revision } = useSession();
  const client = useQueryClient();
  const dialogId = useId();
  const access = useQuery({ queryKey: ['publication-access', user?.id, revision], queryFn: publicationsApi.access, enabled: user?.role === 'admin', retry: false });
  const [status, setStatus] = useState<AccountFilter>('all'), [offset, setOffset] = useState(0);
  const [selection, setSelection] = useState<{ account: VisitorRequest; decision: Decision } | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<unknown>(null), [notice, setNotice] = useState('');
  const requests = useQuery({ queryKey: ['developer-accounts', user?.id, revision, status, offset], queryFn: () => accountAccessApi.list(status, offset), enabled: access.data?.allowed === true, retry: false, refetchInterval: 30_000 });
  async function confirm() {
    if (busy || !selection) return;
    const { account, decision } = selection;
    setBusy(true); setError(null); setNotice('');
    try {
      if (decision === 'decline') await accountAccessApi.review(account, 'reject');
      else await accountAccessApi.control(account, decision);
      setNotice(`${account.email}: ${decision === 'allow' ? 'approved for viewing only' : decision === 'pause' ? 'access paused; existing sessions revoked' : decision === 'ban' ? 'banned; sign-in blocked and existing sessions revoked' : 'request declined'}.`);
    } catch (failure) { setError(failure); }
    finally {
      setSelection(null); setBusy(false);
      await client.invalidateQueries({ queryKey: ['developer-accounts'] });
    }
  }
  function choose(account: VisitorRequest, decision: Decision) {
    setError(null); setNotice(''); setSelection({ account, decision });
  }
  if (!access.data?.allowed) return null;
  return <section className="card-brutal-dark p-5 md:p-7 space-y-5 max-w-4xl" aria-label="Account management">
    <header className="space-y-3"><p className="text-xs tracking-widest text-hermes-red-bright">ACCOUNT MANAGEMENT</p><h2 className="font-display text-3xl">All accounts</h2><p className="text-sm text-hermes-bone/70">Every registered email is listed here. Allow viewing, temporarily pause data access, or ban sign-in. Developer and researcher accounts are protected.</p></header>
    <div className="flex flex-wrap gap-3 items-center"><label htmlFor="account-status" className="text-sm">Show</label><select id="account-status" className="field-brutal" value={status} onChange={event => { setStatus(event.target.value as AccountFilter); setOffset(0); }}><option value="all">All accounts</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Declined</option><option value="paused">Paused</option><option value="banned">Banned</option></select><button className="btn-outline-dark" disabled={requests.isFetching || busy} onClick={() => void requests.refetch()}>Refresh accounts</button></div>
    {requests.data && <p className="text-xs text-hermes-bone/65">{requests.data.counts.all} total accounts · {requests.data.counts.pending} pending · {requests.data.counts.approved} approved · {requests.data.counts.rejected} declined · {requests.data.counts.paused ?? 0} paused · {requests.data.counts.banned ?? 0} banned</p>}
    {notice && <p role="status" className="border border-hermes-bone/20 p-4 text-sm">{notice}</p>}
    {error != null && <QueryError title="Account change failed — refresh accounts to verify the current state" error={error} />}
    {requests.isPending && <p role="status">Loading accounts…</p>}
    {requests.isError && <QueryError title="Accounts unavailable" error={requests.error} onRetry={() => requests.refetch()} />}
    {requests.data && <>
      {!requests.data.items.length && <p className="border border-dashed border-hermes-bone/20 p-5 text-sm">{status === 'pending' ? 'No accounts are waiting for approval.' : 'No accounts in this view.'}</p>}
      {requests.data.items.map(account => {
        const manageable = account.is_active && ['viewer', 'user'].includes(account.role) && account.id !== user?.id;
        return <article key={account.id} className="border border-hermes-bone/20 p-5 space-y-3">
          <h3 className="font-display text-2xl break-words">{account.full_name || 'Name not supplied'}</h3>
          <p className="text-sm break-all">{account.email}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="border border-hermes-bone/20 px-2 py-1">Role: {account.role === 'admin' ? 'Developer / admin' : account.role === 'researcher' ? 'Researcher' : account.role === 'viewer' ? 'Viewer' : 'User'}</span>
            <span className="border border-hermes-bone/20 px-2 py-1">{account.is_active ? 'Active' : 'Disabled'}</span>
            <span className="border border-hermes-bone/20 px-2 py-1">{statusLabels[account.access_status] || account.access_status}</span>
          </div>
          <p className="text-xs text-hermes-bone/60">Registered {new Date(account.created_at).toLocaleString()}{account.reviewed_at ? ` · Reviewed ${new Date(account.reviewed_at).toLocaleString()}` : ''}</p>
          <p className="text-xs">{!account.is_active ? 'Disabled account · Sign-in unavailable' : !manageable ? 'Staff account · Protected from access controls' : account.access_status !== 'approved' ? 'No data access' : account.role === 'viewer' ? 'Viewing only' : 'Existing user permissions · Allow viewing switches this account to read-only'}</p>
          {manageable && <div className="flex flex-wrap gap-3">
            <button className="btn-brutal" disabled={busy || (account.access_status === 'approved' && account.role === 'viewer')} aria-label={`Allow viewing for ${account.email}`} onClick={() => choose(account, 'allow')}>Allow viewing</button>
            <button className="btn-outline-dark" disabled={busy || account.access_status === 'paused' || account.access_status === 'banned'} aria-label={`Pause ${account.email}`} onClick={() => choose(account, 'pause')}>Pause access</button>
            <button className="btn-outline-dark !border-hermes-red-bright !text-hermes-red-bright" disabled={busy || account.access_status === 'banned'} aria-label={`Ban ${account.email}`} onClick={() => choose(account, 'ban')}>Ban account</button>
            {account.access_status === 'pending' && account.role === 'viewer' && <button className="btn-outline-dark" disabled={busy} aria-label={`Decline ${account.full_name || account.email}`} onClick={() => choose(account, 'decline')}>Decline request</button>}
          </div>}
        </article>;
      })}
      <div className="flex flex-wrap gap-3 items-center"><button className="btn-outline-dark" disabled={offset === 0 || requests.isFetching} onClick={() => setOffset(value => Math.max(0, value - 20))}>Previous accounts</button><span className="text-xs">{requests.data.total ? offset + 1 : 0}–{offset + requests.data.items.length} of {requests.data.total}</span><button className="btn-outline-dark" disabled={offset + 20 >= requests.data.total || requests.isFetching} onClick={() => setOffset(value => value + 20)}>Next accounts</button></div>
    </>}
    {selection && <Dialog labelledBy={dialogId} onClose={() => { if (!busy) setSelection(null); }}>
      <div className="space-y-5"><h2 id={dialogId} className="font-display text-3xl">Confirm {labels[selection.decision].toLowerCase()}</h2>
        <p className="break-all text-sm">{selection.account.email}</p><p className="text-sm text-hermes-bone/70">{effects[selection.decision]}</p>
        <div className="flex flex-wrap gap-3"><button className="btn-outline-dark" disabled={busy} onClick={() => setSelection(null)}>Cancel</button><button className="btn-brutal" disabled={busy} onClick={() => void confirm()}>{busy ? 'Saving…' : `Confirm ${labels[selection.decision].toLowerCase()}`}</button></div>
      </div>
    </Dialog>}
  </section>;
}
