export const detailTabs = ['overview', 'article', 'claims', 'related', 'evidence', 'changes', 'timeline', 'graph', 'methods'] as const;
export type DetailTab = typeof detailTabs[number];
export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Change local route state without reloading and clearing the memory-only session. */
export function navigateHash(hash: string, replace = false): void {
  if (window.location.hash !== hash) {
    if (replace) window.history.replaceState(null, '', hash);
    else window.history.pushState(null, '', hash);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/** Only dashboard hashes are accepted: this cannot redirect to an external site. */
export function safeReturn(value: string | null): string {
  return value && value.length <= 4000 && /^#\/dashboard(?:[/?][a-zA-Z0-9_\-/?=&.%+]*)?$/.test(value)
    && !value.split('?')[0].split('/').some(segment => segment === '.' || segment === '..')
    && !/[\r\n]/.test(value) ? value : '#/dashboard/browse';
}

export function articleHref(id: string, tab: DetailTab = 'overview', options: { claim?: string; back?: string; offset?: number } = {}): string {
  const params = new URLSearchParams();
  if (options.claim) params.set('claim', options.claim);
  if (options.back) params.set('back', safeReturn(options.back));
  if (options.offset) params.set('offset', String(options.offset));
  return `#/dashboard/articles/${encodeURIComponent(id)}/${tab}${params.size ? `?${params}` : ''}`;
}

export function parseArticleRoute(route: string) {
  const [pathname, query = ''] = route.split('?');
  const match = pathname.match(/^dashboard\/articles\/([^/]+)(?:\/([^/]+))?$/);
  if (!match) return null;
  const params = new URLSearchParams(query);
  const offset = Number(params.get('offset') || 0);
  return {
    id: match[1], tab: (match[2] || 'overview') as DetailTab,
    valid: isUuid(match[1]) && (!match[2] || detailTabs.includes(match[2] as DetailTab)),
    claim: params.get('claim') || '', back: safeReturn(params.get('back')),
    offset: Number.isSafeInteger(offset) && offset >= 0 ? offset : 0,
  };
}

export function signInDestination(hash = window.location.hash): string {
  return safeReturn(new URLSearchParams(hash.split('?')[1] || '').get('next') || '#/dashboard');
}
