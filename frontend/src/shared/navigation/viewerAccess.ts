import type { ResolvedAppRoute } from './registry';

/** UX guard only; authenticated mutations are also denied by the API. */
export function viewerCanOpen(route: ResolvedAppRoute): boolean {
  if (route.kind === 'reader') return route.view === 'browse';
  if (route.kind === 'advanced') return ['atlas', 'fullgraph', 'factcheck', 'corpus'].includes(route.tab);
  return ['article', 'topic', 'claims', 'help', 'signin', 'not-found'].includes(route.kind);
}
