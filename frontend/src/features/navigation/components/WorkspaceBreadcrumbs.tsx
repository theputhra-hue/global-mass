import { usePublicationRuntime } from '../../../shared/runtime/publicationRuntime';
import { ChevronRight } from 'lucide-react';
import type { ResolvedAppRoute } from '../../../shared/navigation/registry';
import { findTool } from '../../../shared/navigation/registry';
import { useQuery } from '@tanstack/react-query';
import { articlesApi } from '../../../shared/api/articles';
import { articleHref, isUuid } from '../../../shared/navigation/articleRoutes';

interface BreadcrumbsProps {
  route: ResolvedAppRoute;
  articleTitle?: string;
  articleTab?: string;
}

export function WorkspaceBreadcrumbs({ route, articleTitle, articleTab }: BreadcrumbsProps) {
  const runtime = usePublicationRuntime();
  const detail = route.kind === 'article' ? route.detail : null;
  const release = detail?.release || (runtime.mode === 'published' ? runtime.publication?.run_id || undefined : undefined);
  // Share the investigation query and cache; do not fetch a second title resource.
  const article = useQuery({
    queryKey: ['article-detail', detail?.id || '', release || ''],
    queryFn: ({ signal }) => articlesApi.detail(detail!.id, { signal }, release),
    enabled: Boolean(detail?.valid && (!detail.claim || isUuid(detail.claim)) && !articleTitle),
    staleTime: 30_000,
  });
  const title = articleTitle || article.data?.title;
  const selectedTab = articleTab || detail?.tab;
  const items: Array<{ label: string; href?: string }> = [
    { label: 'Workspace', href: '#/dashboard/browse' },
  ];

  if (route.kind === 'reader') {
    if (route.view === 'browse') {
      items.push({ label: 'Find articles' });
    } else if (route.view === 'compare') {
      items.push({ label: 'Compare wording' });
    } else if (route.view === 'check') {
      items.push({ label: 'Claim check' });
    }
  } else if (route.kind === 'claims') {
    items.push({ label: 'Extracted statements' });
  } else if (route.kind === 'article') {
    items.push({ label: 'Find articles', href: '#/dashboard/browse' });
    if (title) {
      items.push({ label: title, href: articleHref(route.detail.id, 'overview', { back: route.detail.back, release: route.detail.release }) });
    } else {
      items.push({ label: 'Article' });
    }
    if (selectedTab && selectedTab !== 'overview') {
      const tabNames: Record<string, string> = {
        article: 'Article text',
        claims: 'Claims',
        related: 'Related coverage',
        evidence: 'Evidence',
        changes: 'Changes',
        timeline: 'Timeline',
        graph: 'Graph',
        methods: 'Data & methods',
      };
      items.push({ label: tabNames[selectedTab] || selectedTab });
    }
  } else if (route.kind === 'topic') {
    items.push({ label: 'Topic investigation' });
  } else if (route.kind === 'help') {
    items.push({ label: 'Help & methods' });
  } else if (route.kind === 'tools') {
    items.push({ label: 'Research tools' });
  } else if (route.kind === 'advanced') {
    if (route.tab === 'casebook') {
      items.push({ label: 'Saved investigations' });
    } else if (route.tab === 'atlas') {
      items.push({ label: 'Story map' });
    } else if (route.tab === 'fullgraph') {
      items.push({ label: 'Recorded links' });
    } else {
      items.push({ label: 'Research tools', href: '#/dashboard/tools' });
      const tool = findTool(route.tab);
      items.push({ label: tool ? tool.label : route.tab });
    }
  } else if (route.kind === 'developer') {
    items.push({ label: 'Manage data' });
  } else if (route.kind === 'upload') {
    items.push({ label: 'Manage data', href: '#/dashboard/developer' });
    items.push({ label: 'Upload analysis' });
  }

  // If only Home, don't show trailing breadcrumb
  if (items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="text-xs font-mono text-hermes-bone/60 flex items-center flex-wrap gap-1 mb-4">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="inline-flex items-center gap-1 min-w-0 max-w-full break-words">
            {index > 0 && <ChevronRight className="w-3 h-3 text-hermes-bone/30 shrink-0" aria-hidden="true" />}
            {isLast || !item.href ? (
              <span className={isLast ? 'text-hermes-bone font-medium' : 'text-hermes-bone/70'} aria-current={isLast ? 'page' : undefined}>
                {item.label}
              </span>
            ) : (
              <a href={item.href} className="hover:text-hermes-red-bright hover:underline transition-colors">
                {item.label}
              </a>
            )}
          </span>
        );
      })}
    </nav>
  );
}
