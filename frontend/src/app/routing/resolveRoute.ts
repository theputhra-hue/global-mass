import { parseArticleRoute } from '../../shared/navigation/articleRoutes';
import { isDashboardTab, type TabType } from '../../shared/navigation/tabs';

type DetailRoute = NonNullable<ReturnType<typeof parseArticleRoute>>;
type Destination =
  | { kind: 'landing' | 'public-project' | 'signin' | 'tools' | 'developer' | 'upload' | 'not-found' }
  | { kind: 'reader'; view: 'home' | 'browse' | 'compare' | 'check' }
  | { kind: 'article'; detail: DetailRoute }
  | { kind: 'advanced'; tab: TabType };

/** Resolve existing hashes without fetching data or changing browser/session state. */
export function resolveRoute(hash: string): Destination & { raw: string; dashboard: boolean } {
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
  const detail = parseArticleRoute(raw);
  if (detail) return route({ kind: 'article', detail });
  if (pathname === 'dashboard') return route({ kind: 'reader', view: 'home' });
  const tab = pathname.split('/')[1];
  if (['browse', 'compare', 'check'].includes(tab)) {
    return route({ kind: 'reader', view: tab as 'browse' | 'compare' | 'check' });
  }
  if (/^dashboard\/[a-z]+$/.test(pathname) && isDashboardTab(tab)) {
    return route({ kind: 'advanced', tab });
  }
  return route({ kind: 'not-found' });
}
