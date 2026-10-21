import { useEffect } from 'react';
import { authApi } from '../../../shared/api/auth';
import { useSession } from '../../../shared/session/session';

/** Recheck idle reader sessions; protected API requests enforce access immediately. */
export function AccountAccessMonitor() {
  const { user } = useSession();
  const enabled = user?.access_status === 'approved' && ['viewer', 'user'].includes(user.role);
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => {
      // Transport clears revoked sessions. A network failure leaves the current
      // state intact and the next interval can verify it again.
      void authApi.me().catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [enabled, user?.id]);
  return null;
}
