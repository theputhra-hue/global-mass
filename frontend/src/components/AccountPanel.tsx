import { useId, useState } from 'react';
import { LogOut, RefreshCw, UserRound, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { useSession } from '../lib/session';
import { Dialog } from './Dialog';
import { QueryError } from './QueryError';
import { publicationsApi } from '../api/publications';

export function AccountPanel({ signInLabel = 'Sign in' }: { signInLabel?: string }) {
  const { user, revision } = useSession();
  const developerAccess = useQuery({ queryKey: ['publication-access', user?.id, revision], queryFn: publicationsApi.access, enabled: user?.role === 'admin', retry: false });
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState('');
  const id = useId();

  const logout = async () => {
    setPending(true);
    setError(null);
    try {
      await authApi.logout();
      setNotice('Signed out. In-memory credentials have been cleared.');
    } catch (failure) {
      setError(failure);
      setNotice('Local credentials cleared. Server-side logout could not be confirmed; the server session may remain active until expiry.');
    } finally {
      queryClient.removeQueries({ queryKey: ['eval'] });
      setPending(false);
    }
  };

  const refresh = async () => {
    setPending(true);
    setError(null);
    setNotice('');
    try {
      await authApi.refresh();
      setNotice('Session rotated and account re-verified. Tokens remain in memory only.');
    } catch (failure) {
      setError(failure);
    } finally {
      setPending(false);
    }
  };

  if (!user && !open) return <a href="#/signin" className="btn-brutal"><UserRound className="w-3.5 h-3.5" />{signInLabel}</a>;

  return (
    <>
      <button type="button" onClick={() => { setError(null); setNotice(''); setOpen(true); }} className="btn-brutal">
        <UserRound className="w-3.5 h-3.5" /> {user ? 'Account' : signInLabel}
      </button>
      {open && (
        <Dialog labelledBy={`${id}-title`} onClose={() => { if (!pending) { setOpen(false); } }}>
          <div className="flex items-center justify-between gap-3">
            <h2 id={`${id}-title`} className="text-2xl font-display">GMEE Account</h2>
            <button type="button" aria-label="Close account" disabled={pending} onClick={() => { setOpen(false); }} className="btn-brutal !px-2">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs font-mono text-hermes-bone/65">Bearer and rotating refresh tokens are held in memory only. Reloading this page ends the local session; no tokens are saved in browser storage.</p>
          {error != null && <QueryError title="Account request failed" error={error} />}
          {notice && <p role="status" className="text-xs font-mono border border-hermes-bone/25 p-3">{notice}</p>}
          {user ? (
            <div className="space-y-4">
              <dl className="text-sm space-y-2">
                <div><dt className="text-hermes-bone/50 font-mono text-xs">Signed in as</dt><dd>{user.full_name || user.email}</dd></div>
                <div><dt className="text-hermes-bone/50 font-mono text-xs">Email</dt><dd>{user.email}</dd></div>
                <div><dt className="text-hermes-bone/50 font-mono text-xs">Role</dt><dd>{user.role}</dd></div>
              </dl>
              <div className="flex flex-wrap gap-3">
                {developerAccess.data?.allowed && <><a href="#/dashboard/developer" className="btn-outline-dark" onClick={() => setOpen(false)}>Developer console</a><a href="#/dashboard/upload" className="btn-outline-dark" onClick={() => setOpen(false)}>Developer uploads</a></>}
                <button type="button" disabled={pending} onClick={() => void refresh()} className="btn-brutal"><RefreshCw className="w-3.5 h-3.5" /> Rotate session</button>
                <button type="button" disabled={pending} onClick={() => void logout()} className="btn-brutal"><LogOut className="w-3.5 h-3.5" /> Log out</button>
              </div>
            </div>
          ) : <a href="#/signin" className="btn-brutal">Sign in again</a>}
        </Dialog>
      )}
    </>
  );
}
