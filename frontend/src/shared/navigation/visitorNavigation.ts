import type { ResolvedAppRoute } from './registry';

// One vocabulary and order for the desktop rail, mobile drawer and breadcrumbs.
export const visitorLinks = [
  { id: 'browse', label: 'Find articles', description: 'Search headlines, names and sources', href: '#/dashboard/browse' },
  { id: 'atlas', label: 'Story map', description: 'Explore topics and connected articles', href: '#/dashboard/atlas' },
  { id: 'compare', label: 'Compare wording', description: 'See what changed between two texts', href: '#/dashboard/compare' },
  { id: 'casebook', label: 'Saved investigations', description: 'Your private notes and comparisons', href: '#/dashboard/casebook' },
] as const;
export const researchLinks = [
  { id: 'claims', label: 'Extracted statements', description: 'Search statements saved from articles', href: '#/dashboard/claims' },
  { id: 'fullgraph', label: 'Recorded links', description: 'Inspect previously recorded relationships', href: '#/dashboard/fullgraph' },
  { id: 'tools', label: 'All research tools', description: 'Specialist analysis and system tools', href: '#/dashboard/tools' },
] as const;
export function visitorDestination(route: ResolvedAppRoute): string {
  if (route.kind === 'reader') return route.view === 'check' ? 'claims' : route.view;
  if (route.kind === 'article' || route.kind === 'topic') return 'browse';
  if (route.kind === 'claims') return 'claims';
  if (route.kind === 'advanced') return route.tab === 'corpus' ? 'browse' : ['atlas', 'fullgraph', 'casebook'].includes(route.tab) ? route.tab : 'tools';
  return route.kind;
}
export function visitorLabel(route: ResolvedAppRoute): string {
  const id = visitorDestination(route);
  return [...visitorLinks, ...researchLinks].find(link => link.id === id)?.label || (id === 'help' ? 'Help & methods' : id === 'developer' ? 'Manage data' : id === 'upload' ? 'Upload analysis' : 'Workspace');
}
