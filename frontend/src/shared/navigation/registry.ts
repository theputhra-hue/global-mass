/**
 * Shared typed navigation and tool registry.
 * Contains tool descriptors, legacy synonyms, destinations, input/output descriptions
 * and availability categories without importing any UI components or features.
 */

import type { parseArticleRoute } from './articleRoutes';
import type { TabType } from './tabs';

export type NavGroup = 'primary' | 'explore' | 'research' | 'system' | 'developer';
export type ToolAvailability = 'both' | 'local-only' | 'published-only';
export type ToolPermission = 'public' | 'authenticated' | 'developer';

export type DetailRoute = NonNullable<ReturnType<typeof parseArticleRoute>>;

export type RouteDestination =
  | { kind: 'landing' | 'public-project' | 'signin' | 'tools' | 'developer' | 'upload' | 'claims' | 'not-found' }
  | { kind: 'reader'; view: 'home' | 'browse' | 'compare' | 'check' }
  | { kind: 'article'; detail: DetailRoute }
  | { kind: 'advanced'; tab: TabType };

export type ResolvedAppRoute = RouteDestination & { raw: string; dashboard: boolean };

export interface ToolDescriptor {
  id: string;
  label: string;
  href: string;
  legacySynonyms: readonly string[];
  group: NavGroup;
  summary: string;
  input: string;
  output: string;
  availability: ToolAvailability;
  permission: ToolPermission;
  badge?: string;
  primary?: boolean;
}

export const TOOL_REGISTRY: readonly ToolDescriptor[] = [
  {
    id: 'home',
    label: 'Home',
    href: '#/dashboard',
    legacySynonyms: ['dashboard'],
    group: 'primary',
    summary: 'Orient yourself in the collection with a real collection summary and clear next actions.',
    input: 'None (read-only orientation)',
    output: 'Collection summary, freshness and reading guidance',
    availability: 'both',
    permission: 'authenticated',
    primary: true,
  },
  {
    id: 'browse',
    label: 'Articles',
    href: '#/dashboard/browse',
    legacySynonyms: ['corpus', 'Explore articles', 'Articles'],
    group: 'explore',
    summary: 'Find source articles by title or author, then inspect their statements.',
    input: 'Title, author or keyword string',
    output: 'Attributable source records with dates, domains and detail links',
    availability: 'both',
    permission: 'authenticated',
    primary: true,
  },
  {
    id: 'claims',
    label: 'Extracted claims',
    href: '#/dashboard/claims',
    legacySynonyms: ['Saved claims', 'factcheck', 'check'],
    group: 'explore',
    summary: 'Search or browse statements extracted from collected reports.',
    input: 'Claim text query (published) or article selection (local)',
    output: 'Extracted statements, owning articles and stored assessments',
    availability: 'both',
    permission: 'authenticated',
    primary: false,
  },
  {
    id: 'fullgraph',
    label: 'Recorded connections',
    href: '#/dashboard/fullgraph',
    legacySynonyms: ['Graph', 'fullgraph'],
    group: 'explore',
    summary: 'Explore recorded connections between articles and claims in a bounded graph.',
    input: 'Stored relationship links in the active collection',
    output: 'Bounded node and relationship network with article inspection',
    availability: 'both',
    permission: 'authenticated',
    badge: 'Graph',
    primary: false,
  },
  {
    id: 'compare',
    label: 'Compare wording',
    href: '#/dashboard/compare',
    legacySynonyms: ['Compare', 'Mutation Comparator'],
    group: 'primary',
    summary: 'Paste two texts to inspect wording and number differences. Difference does not establish truth.',
    input: 'Two text passages (older and newer)',
    output: 'Typed wording changes, numeric differences and similarity signals',
    availability: 'both',
    permission: 'authenticated',
    primary: true,
  },
  {
    id: 'casebook',
    label: 'My investigations',
    href: '#/dashboard/casebook',
    legacySynonyms: ['Casebook'],
    group: 'primary',
    summary: 'Save private comparisons, notes and review status in your personal casebook.',
    input: 'Comparisons and research notes saved by the signed-in user',
    output: 'Private case records, identity-bound and exportable',
    availability: 'both',
    permission: 'authenticated',
    badge: 'NEW',
    primary: true,
  },
  {
    id: 'tools',
    label: 'Advanced tools',
    href: '#/dashboard/tools',
    legacySynonyms: ['Tools & guides', 'tools'],
    group: 'primary',
    summary: 'Exhaustive directory of all 12 specialist research, analysis and system tools.',
    input: 'Tool directory selection',
    output: 'Task-oriented index with input/output requirements and runtime availability',
    availability: 'both',
    permission: 'authenticated',
    primary: true,
  },
  {
    id: 'developer',
    label: 'Developer workspace',
    href: '#/dashboard/developer',
    legacySynonyms: ['Developer Console', 'developer'],
    group: 'developer',
    summary: 'Prepare, review and publish complete collection releases with traceable provenance.',
    input: 'Collection pipeline commands (local) or publication JSON file (cloud)',
    output: 'Processing stage jobs, review diffs and activated complete release',
    availability: 'both',
    permission: 'developer',
    badge: 'ADMIN',
    primary: true,
  },
  {
    id: 'overview',
    label: 'System overview',
    href: '#/dashboard/overview',
    legacySynonyms: ['Overview Vitals'],
    group: 'system',
    summary: 'Inspect collection counts, service readiness and operational status in the local analysis workspace.',
    input: 'System health checks and dashboard metrics',
    output: 'PostgreSQL, Neo4j and Redis status, storage counts and readiness state',
    availability: 'local-only',
    permission: 'authenticated',
  },
  {
    id: 'factcheck',
    label: 'Claim checking',
    href: '#/dashboard/factcheck',
    legacySynonyms: ['FactCheck', 'check'],
    group: 'research',
    summary: 'Check a supplied claim against the local corpus (local) or search saved claims (published).',
    input: 'Claim text string to check',
    output: 'Supporting/conflicting evidence passages and heuristic assessment',
    availability: 'both',
    permission: 'authenticated',
    badge: 'VERDICTS',
  },
  {
    id: 'timeline',
    label: '3D story timeline',
    href: '#/dashboard/timeline',
    legacySynonyms: ['Timeline'],
    group: 'research',
    summary: 'Explore chronological publication order in a 3D narrative timeline visualization.',
    input: 'Corpus article timestamps and cluster neighborhood',
    output: 'Interactive 3D timeline; publication sequence does not prove transmission',
    availability: 'local-only',
    permission: 'authenticated',
    badge: '3D',
  },
  {
    id: 'masala',
    label: 'Experimental analysis lab',
    href: '#/dashboard/masala',
    legacySynonyms: ['Masala Lab'],
    group: 'research',
    summary: 'Explore publication timing, wording clusters and comparison experiments in the local workspace.',
    input: 'Corpus records and experimental parameters',
    output: 'Experimental evolution links, cluster groupings and comparison charts',
    availability: 'local-only',
    permission: 'authenticated',
    badge: 'NEW',
  },
  {
    id: 'graph',
    label: 'Neo4j graph inspection',
    href: '#/dashboard/graph',
    legacySynonyms: ['Neo4j Graph Engine'],
    group: 'system',
    summary: 'Inspect the local Neo4j database, Cypher query interface and stored topology.',
    input: 'Neo4j graph query or node inspection',
    output: 'Database nodes, relationships and property graphs',
    availability: 'local-only',
    permission: 'authenticated',
    badge: '7687',
  },
  {
    id: 'vector',
    label: 'Semantic retrieval',
    href: '#/dashboard/vector',
    legacySynonyms: ['Postgres Vector'],
    group: 'system',
    summary: 'Retrieve related coverage using local embeddings. Similarity is a retrieval metric, not a truth score.',
    input: 'Natural language search query',
    output: 'Vector similarity matches from pgvector with distance metrics',
    availability: 'local-only',
    permission: 'authenticated',
    badge: 'pgvector',
  },
  {
    id: 'cache',
    label: 'Redis queue & status',
    href: '#/dashboard/cache',
    legacySynonyms: ['Redis Queue'],
    group: 'system',
    summary: 'Inspect local Redis availability, memory footprint and rate-limit measurements.',
    input: 'Redis INFO and ping telemetry',
    output: 'Actual memory usage, revoked token counts and connection latency',
    availability: 'local-only',
    permission: 'authenticated',
    badge: '6379',
  },
  {
    id: 'corpus',
    label: 'Article collection',
    href: '#/dashboard/corpus',
    legacySynonyms: ['Corpus'],
    group: 'explore',
    summary: 'Browse and manage the source article collection in the local analysis database.',
    input: 'Corpus filter queries and pagination',
    output: 'Attributable source records with processing and NLP status',
    availability: 'both',
    permission: 'authenticated',
  },
  {
    id: 'eval',
    label: 'Research annotation',
    href: '#/dashboard/eval',
    legacySynonyms: ['Eval Lab'],
    group: 'research',
    summary: 'Record independent human research labels. Existing research and admin role restrictions apply.',
    input: 'Claim-pair annotation judgments and notes',
    output: 'Evaluation dataset records, inter-rater metrics and export splits',
    availability: 'local-only',
    permission: 'authenticated',
    badge: 'REVIEW',
  },
  {
    id: 'project',
    label: 'Analyzer demonstrations',
    href: '#/dashboard/project',
    legacySynonyms: ['Project Lab'],
    group: 'research',
    summary: 'Try authored text pairs to understand wording comparison. These are engineering examples, not an accuracy benchmark.',
    input: 'Authored demonstration pairs or custom input',
    output: 'Demonstration comparison results and step-by-step analyzer explanation',
    availability: 'both',
    permission: 'authenticated',
    badge: 'START',
  },
  {
    id: 'upload',
    label: 'Upload & publish',
    href: '#/dashboard/upload',
    legacySynonyms: ['Developer Upload'],
    group: 'developer',
    summary: 'Upload an exported publication JSON file, review contents, and publish to the live site.',
    input: 'Validated publication JSON file',
    output: 'Upload receipt, diff summary and publication release activation',
    availability: 'both',
    permission: 'developer',
  },
] as const;

export const PRIMARY_NAV_IDS = ['home', 'browse', 'compare', 'casebook', 'tools'] as const;
export const EXPLORE_NAV_IDS = ['browse', 'claims', 'fullgraph'] as const;
export const ADVANCED_TOOL_IDS = [
  'overview', 'factcheck', 'fullgraph', 'timeline', 'masala',
  'graph', 'vector', 'cache', 'corpus', 'eval', 'project', 'casebook',
] as const;

export function findTool(identifier: string): ToolDescriptor | undefined {
  const normalized = identifier.replace(/^#\/?/, '').replace(/^dashboard\/?/, '').split('?')[0];
  const exact = TOOL_REGISTRY.find(t =>
    t.id === normalized || t.href === identifier.split('?')[0] ||
    t.href === `#/${normalized}` || t.href === `#/dashboard/${normalized}`
  );
  if (exact) return exact;
  return TOOL_REGISTRY.find(t =>
    t.label.toLowerCase() === normalized.toLowerCase() ||
    t.legacySynonyms.some(s => s.toLowerCase() === normalized.toLowerCase())
  );
}

export function isToolAvailable(
  tool: ToolDescriptor,
  runtimeMode: 'published' | 'local' | 'connecting' | 'unavailable'
): boolean {
  if (tool.availability === 'both') return true;
  if (tool.availability === 'local-only') return runtimeMode === 'local';
  if (tool.availability === 'published-only') return runtimeMode === 'published';
  return false;
}

export function isLegacySynonym(identifier: string): boolean {
  const normalized = identifier.replace(/^#\/?/, '').replace(/^dashboard\/?/, '').split('?')[0].toLowerCase();
  return TOOL_REGISTRY.some(t => t.id.toLowerCase() === normalized || t.legacySynonyms.some(s => s.toLowerCase() === normalized));
}
