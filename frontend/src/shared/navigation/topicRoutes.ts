import { isUuid, safeReturn } from './articleRoutes';

export const topicSections = ['coverage', 'timeline', 'connections', 'methods'] as const;
export type TopicSection = typeof topicSections[number];
export interface TopicRoute { id: string; release: string; section: TopicSection; offset: number; back: string; valid: boolean }
export function topicHref(id: string, release: string, section: TopicSection = 'coverage', options: { back?: string; offset?: number } = {}): string {
  const params = new URLSearchParams({ release });
  if (options.back) params.set('back', safeReturn(options.back));
  if (options.offset) params.set('offset', String(options.offset));
  return `#/dashboard/topics/${encodeURIComponent(id)}/${section}?${params}`;
}
export function parseTopicRoute(raw: string): TopicRoute | null {
  const [path, query] = raw.split('?');
  const match = path.match(/^dashboard\/topics\/([^/]+)(?:\/([^/]+))?$/);
  if (!match) return null;
  const params = new URLSearchParams(query), section = (match[2] || 'coverage') as TopicSection;
  const release = params.get('release') || '', offset = Number(params.get('offset') || 0);
  return { id: match[1], release, section, back: safeReturn(params.get('back')),
    offset: Number.isSafeInteger(offset) && offset >= 0 ? offset : 0,
    valid: /^[a-zA-Z0-9_-]{1,100}$/.test(match[1]) && isUuid(release) && topicSections.includes(section) };
}
