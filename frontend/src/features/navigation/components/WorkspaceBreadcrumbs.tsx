import { ChevronRight } from 'lucide-react';
import type { ResolvedAppRoute } from '../../../shared/navigation/registry';
import { findTool } from '../../../shared/navigation/registry';

interface BreadcrumbsProps {
  route: ResolvedAppRoute;
  articleTitle?: string;
  articleTab?: string;
}

export function WorkspaceBreadcrumbs({ route, articleTitle, articleTab }: BreadcrumbsProps) {
  const items: Array<{ label: string; href?: string }> = [
    { label: 'Home', href: '#/dashboard' },
  ];

  if (route.kind === 'reader') {
    if (route.view === 'browse') {
      items.push({ label: 'Explore data', href: '#/dashboard/browse' });
      items.push({ label: 'Articles' });
    } else if (route.view === 'compare') {
      items.push({ label: 'Compare wording' });
    } else if (route.view === 'check') {
      items.push({ label: 'Explore data', href: '#/dashboard/browse' });
      items.push({ label: 'Claim check' });
    }
  } else if (route.kind === 'claims') {
    items.push({ label: 'Explore data', href: '#/dashboard/browse' });
    items.push({ label: 'Extracted claims' });
  } else if (route.kind === 'article') {
    items.push({ label: 'Explore data', href: '#/dashboard/browse' });
    items.push({ label: 'Articles', href: '#/dashboard/browse' });
    if (articleTitle) {
      items.push({ label: articleTitle.length > 35 ? `${articleTitle.slice(0, 32)}…` : articleTitle });
    } else {
      items.push({ label: 'Article' });
    }
    if (articleTab && articleTab !== 'overview') {
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
      items.push({ label: tabNames[articleTab] || articleTab });
    }
  } else if (route.kind === 'tools') {
    items.push({ label: 'Advanced tools' });
  } else if (route.kind === 'advanced') {
    if (route.tab === 'casebook') {
      items.push({ label: 'My investigations' });
    } else if (route.tab === 'fullgraph') {
      items.push({ label: 'Explore data', href: '#/dashboard/browse' });
      items.push({ label: 'Recorded connections' });
    } else {
      items.push({ label: 'Advanced tools', href: '#/dashboard/tools' });
      const tool = findTool(route.tab);
      items.push({ label: tool ? tool.label : route.tab });
    }
  } else if (route.kind === 'developer') {
    items.push({ label: 'Developer workspace' });
  } else if (route.kind === 'upload') {
    items.push({ label: 'Developer workspace', href: '#/dashboard/developer' });
    items.push({ label: 'Upload analysis' });
  }

  // If only Home, don't show trailing breadcrumb
  if (items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="text-xs font-mono text-hermes-bone/60 flex items-center flex-wrap gap-1 mb-4">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="inline-flex items-center gap-1">
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
