import { useEffect, useId, useState } from 'react';
import { Home, Compass, GitCompare, Bookmark, Wrench, Shield, ChevronDown, PanelLeftClose, PanelLeftOpen, Network } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { ResolvedAppRoute } from '../../../shared/navigation/registry';
import { publicationsApi } from '../../../shared/api/publications';
import { useSession } from '../../../shared/session/session';
import { AccountPanel } from '../../account/components/AccountPanel';
import './workspaceSidebar.css';

interface WorkspaceSidebarProps {
  route: ResolvedAppRoute;
}

export function WorkspaceSidebar({ route }: WorkspaceSidebarProps) {
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('gmee:sidebar-collapsed') === 'true'; } catch { return false; } });
  const navigationId = useId();
  useEffect(() => { try { localStorage.setItem('gmee:sidebar-collapsed', String(collapsed)); } catch { /* Navigation works when browser storage is unavailable. */ } }, [collapsed]);
  const { user, revision } = useSession();
  const access = useQuery({
    queryKey: ['publication-access', user?.id, revision],
    queryFn: publicationsApi.access,
    retry: false,
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const isDeveloper = access.data?.allowed === true;

  // Active state determinations
  const isHome = route.kind === 'reader' && route.view === 'home';
  const isExplore =
    (route.kind === 'reader' && route.view === 'browse') ||
    route.kind === 'claims' ||
    route.kind === 'article' ||
    (route.kind === 'advanced' && ['atlas', 'fullgraph', 'corpus'].includes(route.tab));
  const isCompare = route.kind === 'reader' && route.view === 'compare';
  const isCasebook = route.kind === 'advanced' && route.tab === 'casebook';
  const isTools =
    route.kind === 'tools' ||
    (route.kind === 'advanced' && !['atlas', 'fullgraph', 'corpus', 'casebook'].includes(route.tab));
  const isDev = route.kind === 'developer' || route.kind === 'upload';

  // Sub-items for Explore data
  const isArticlesSub = (route.kind === 'reader' && route.view === 'browse') || route.kind === 'article' || (route.kind === 'advanced' && route.tab === 'corpus');
  const isClaimsSub = route.kind === 'claims';
  const isConnectionsSub = route.kind === 'advanced' && route.tab === 'fullgraph';
  const [exploreOpen, setExploreOpen] = useState(true);
  const exploreId = useId();
  useEffect(() => { if (isExplore) setExploreOpen(true); }, [route.raw, isExplore]);

  const linkBase = 'flex items-center gap-3 px-3.5 py-2.5 text-xs font-mono font-medium rounded transition-colors';
  const activeStyle = 'bg-hermes-panel text-hermes-red-bright border-l-2 border-hermes-red-bright font-semibold';
  const inactiveStyle = 'text-hermes-bone/70 hover:text-hermes-bone hover:bg-hermes-panel/50 border-l-2 border-transparent';

  return (
    <aside
      aria-label="Workspace navigation"
      data-collapsed={collapsed}
      className="workspace-sidebar hidden lg:flex sticky top-0 self-start h-dvh flex-col w-64 shrink-0 border-r border-hermes-bone/15 bg-hermes-ink/95 backdrop-blur-sm p-5 select-none"
    >
      {/* Brand Header */}
      <div className="workspace-brand pb-6 mb-4 border-b border-hermes-bone/15">
        <a href="#/dashboard" className="group block" aria-label="GMEE home" hidden={collapsed}>
          <div className="font-display text-3xl text-hermes-bone group-hover:text-hermes-red-bright transition-colors">
            GMEE
          </div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-hermes-bone/60 mt-1">
            News &amp; claim research
          </p>
        </a>
        <button type="button" className="workspace-collapse" aria-label={collapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'} title={collapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!collapsed} aria-controls={navigationId} onClick={() => setCollapsed(value => !value)}>
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Primary Navigation */}
      <nav id={navigationId} className="flex-1 min-h-0 overflow-y-auto space-y-1.5" aria-label="Primary destinations">
        {/* 1. Home */}
        <a
          href="#/dashboard"
          title={collapsed ? 'Home' : undefined}
          aria-current={isHome ? 'page' : undefined}
          className={`${linkBase} ${isHome ? activeStyle : inactiveStyle}`}
        >
          <Home className="w-4 h-4 shrink-0" />
          <span>Home</span>
        </a>

        {/* 2. Explore data */}
        <div className="space-y-1">
          <button
            type="button"
            title={collapsed ? 'Explore data' : undefined}
            aria-expanded={!collapsed && exploreOpen}
            aria-controls={exploreId}
            onClick={() => { if (collapsed) { setCollapsed(false); setExploreOpen(true); } else setExploreOpen(open => !open); }}
            className={`${linkBase} w-full text-left ${isExplore ? activeStyle : inactiveStyle}`}
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span className="flex-1">Explore data</span>
            <ChevronDown aria-hidden="true" className={`w-3 h-3 text-hermes-bone/60 transition-transform ${exploreOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Sub-destinations under Explore data */}
          <div id={exploreId} hidden={collapsed || !exploreOpen} className="pl-7 pr-1 py-1 space-y-1 border-l border-hermes-bone/10 ml-5">
            <a
              href="#/dashboard/browse"
              aria-current={isArticlesSub ? 'page' : undefined}
              className={`block px-2.5 py-1.5 text-[11px] font-mono rounded transition-colors ${
                isArticlesSub
                  ? 'text-hermes-red-bright font-semibold bg-hermes-panel/40'
                  : 'text-hermes-bone/60 hover:text-hermes-bone'
              }`}
            >
              Articles
            </a>
            <a
              href="#/dashboard/claims"
              aria-current={isClaimsSub ? 'page' : undefined}
              className={`block px-2.5 py-1.5 text-[11px] font-mono rounded transition-colors ${
                isClaimsSub
                  ? 'text-hermes-red-bright font-semibold bg-hermes-panel/40'
                  : 'text-hermes-bone/60 hover:text-hermes-bone'
              }`}
            >
              Extracted claims
            </a>
            <a
              href="#/dashboard/fullgraph"
              aria-current={isConnectionsSub ? 'page' : undefined}
              className={`block px-2.5 py-1.5 text-[11px] font-mono rounded transition-colors ${
                isConnectionsSub
                  ? 'text-hermes-red-bright font-semibold bg-hermes-panel/40'
                  : 'text-hermes-bone/60 hover:text-hermes-bone'
              }`}
            >
              Recorded connections
            </a>
            <a href="#/dashboard/atlas" aria-current={route.kind === 'advanced' && route.tab === 'atlas' ? 'page' : undefined} className={`block px-2.5 py-1.5 text-[11px] font-mono rounded ${route.kind === 'advanced' && route.tab === 'atlas' ? 'text-hermes-red-bright font-semibold bg-hermes-panel/40' : 'text-hermes-bone/60 hover:text-hermes-bone'}`}>Collection map</a>
          </div>
        </div>
        {collapsed && <a href="#/dashboard/atlas" title="Collection map" aria-label="Collection map" aria-current={route.kind === 'advanced' && route.tab === 'atlas' ? 'page' : undefined} className={`${linkBase} ${route.kind === 'advanced' && route.tab === 'atlas' ? activeStyle : inactiveStyle}`}><Network className="w-4 h-4 shrink-0" /></a>}

        {/* 3. Compare wording */}
        <a
          href="#/dashboard/compare"
          title={collapsed ? 'Compare wording' : undefined}
          aria-current={isCompare ? 'page' : undefined}
          className={`${linkBase} ${isCompare ? activeStyle : inactiveStyle}`}
        >
          <GitCompare className="w-4 h-4 shrink-0" />
          <span>Compare wording</span>
        </a>

        {/* 4. My investigations */}
        <a
          href="#/dashboard/casebook"
          title={collapsed ? 'My investigations' : undefined}
          aria-current={isCasebook ? 'page' : undefined}
          className={`${linkBase} ${isCasebook ? activeStyle : inactiveStyle}`}
        >
          <Bookmark className="w-4 h-4 shrink-0" />
          <span className="flex-1">My investigations</span>
          <span className="text-[9px] uppercase px-1.5 py-0.5 border border-hermes-bone/20 bg-hermes-bone/5 text-hermes-bone/50">
            Private
          </span>
        </a>

        {/* 5. Advanced tools */}
        <a
          href="#/dashboard/tools"
          title={collapsed ? 'Advanced tools' : undefined}
          aria-current={isTools ? 'page' : undefined}
          className={`${linkBase} ${isTools ? activeStyle : inactiveStyle}`}
        >
          <Wrench className="w-4 h-4 shrink-0" />
          <span>Advanced tools</span>
        </a>

        {/* 6. Developer workspace (approved accounts only) */}
        {isDeveloper && (
          <div className="pt-3 border-t border-hermes-bone/10 mt-3">
            <a
              href="#/dashboard/developer"
              title={collapsed ? 'Developer workspace' : undefined}
              aria-current={isDev ? 'page' : undefined}
              className={`${linkBase} ${isDev ? activeStyle : inactiveStyle}`}
            >
              <Shield className="w-4 h-4 shrink-0 text-hermes-red-bright" />
              <span className="flex-1">Developer workspace</span>
              <span className="text-[9px] uppercase px-1.5 py-0.5 bg-hermes-red-bright text-hermes-bone font-mono font-bold">
                Admin
              </span>
            </a>
          </div>
        )}
      </nav>

      {/* Account Panel & Footer */}
      <div className="pt-5 border-t border-hermes-bone/15 space-y-4">
        <AccountPanel compact={collapsed} />
        <p hidden={collapsed} className="text-[10px] font-mono leading-relaxed text-hermes-bone/45">
          Sources first · Claims are extracted statements, not certified facts.
        </p>
      </div>
    </aside>
  );
}
