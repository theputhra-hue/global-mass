import { useEffect, useMemo, useState } from 'react';
import { navigateHash, signInDestination } from '../../shared/navigation/articleRoutes';
import { resolveRoute } from './resolveRoute';

export function useAppRoute(signedIn: boolean) {
  const [hash, setHash] = useState(() => window.location.hash);
  const route = useMemo(() => resolveRoute(hash), [hash]);
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);
  useEffect(() => {
    if (route.dashboard && !signedIn) {
      const target = `#/signin?next=${encodeURIComponent(`#/${route.raw}`)}`;
      if (window.location.hash !== target) navigateHash(target, true);
    }
    if (route.raw.startsWith('signin') && signedIn) {
      const target = signInDestination(`#/${route.raw}`);
      if (window.location.hash !== target) navigateHash(target, true);
    }
    if (signedIn && route.raw === 'dashboard') navigateHash('#/dashboard/browse', true);
    if (signedIn && route.raw.startsWith('dashboard?')) {
      const query = route.raw.slice('dashboard?'.length);
      const params = new URLSearchParams(query);
      if (params.has('q') || params.has('offset')) {
        const target = `#/dashboard/browse?${query}`;
        if (window.location.hash !== target) navigateHash(target, true);
      }
    }
  }, [route.raw, route.dashboard, signedIn]);
  return route;
}
