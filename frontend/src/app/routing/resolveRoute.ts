import { parseArticleRoute } from '../../shared/navigation/articleRoutes';
import { isDashboardTab } from '../../shared/navigation/tabs';
import type { RouteDestination, ResolvedAppRoute } from '../../shared/navigation/registry';

export type Destination = RouteDestination;

/** Resolve existing hashes without fetching data or changing browser/session state. */
export function resolveRoute(hash: string): ResolvedAppRoute {
  const raw = hash === '#/project' ? 'project'
    : hash.startsWith('#/dashboard') || hash.startsWith('#/signin') ? hash.slice(2) : 'landing';
  const pathname = raw.split('?')[0];
  const context = { raw, dashboard: raw.startsWith('dashboard') };
  const route = (destination: Destination) => ({ ...context, ...destination });
  if (raw === 'landing') return route({ kind: 'landing' });
  if (raw === 'project') return route({ kind: 'public-project' });
  if (pathname === 'signin') return route({ kind: 'signin' });
  if (pathname === 'dashboard/tools') return route({ kind: 'tools' });
  if (pathname === 'dashboard/developer') return route({ kind: 'developer' });
  if (pathname === 'dashboard/upload') return route({ kind: 'upload' });
  if (pathname === 'dashboard/claims') return route({ kind: 'claims' });
  const detail = parseArticleRoute(raw);
  if (detail) return route({ kind: 'article', detail });
  if (pathname === 'dashboard') {
    const query = raw.split('?')[1];
    const params = new URLSearchParams(query || '');
    if (params.has('q') || params.has('offset')) {
      return route({ kind: 'reader', view: 'browse' });
    }
    return route({ kind: 'reader', view: 'home' });
  }
  const tab = pathname.split('/')[1];
  if (['browse', 'compare', 'check'].includes(tab)) {
    return route({ kind: 'reader', view: tab as 'browse' | 'compare' | 'check' });
  }
  if (/^dashboard\/[a-z]+$/.test(pathname) && isDashboardTab(tab)) {
    return route({ kind: 'advanced', tab });
  }
  return route({ kind: 'not-found' });
}
