import { useState, useEffect, useRef } from 'react';
import { Menu, X, Home, Compass, GitCompare, Bookmark, Wrench, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { ResolvedAppRoute } from '../../../shared/navigation/registry';
import { publicationsApi } from '../../../shared/api/publications';
import { useSession } from '../../../shared/session/session';
import { AccountPanel } from '../../account/components/AccountPanel';
import { findTool } from '../../../shared/navigation/registry';

interface WorkspaceMobileHeaderProps {
  route: ResolvedAppRoute;
}

export function WorkspaceMobileHeader({ route }: WorkspaceMobileHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { user, revision } = useSession();

  const access = useQuery({
    queryKey: ['publication-access', user?.id, revision],
    queryFn: publicationsApi.access,
    retry: false,
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const isDeveloper = access.data?.allowed === true;

  // Derive current section label
  let currentSection = 'Workspace';
  if (route.kind === 'reader') {
    if (route.view === 'home') currentSection = 'Home';
    else if (route.view === 'browse') currentSection = 'Articles';
    else if (route.view === 'compare') currentSection = 'Compare wording';
    else if (route.view === 'check') currentSection = 'Claim checking';
  } else if (route.kind === 'claims') {
    currentSection = 'Extracted claims';
  } else if (route.kind === 'article') {
    currentSection = 'Article detail';
  } else if (route.kind === 'tools') {
    currentSection = 'Advanced tools';
  } else if (route.kind === 'advanced') {
    if (route.tab === 'casebook') currentSection = 'My investigations';
    else if (route.tab === 'fullgraph') currentSection = 'Recorded connections';
    else {
      const tool = findTool(route.tab);
      currentSection = tool ? tool.label : 'Advanced tool';
    }
  } else if (route.kind === 'developer') {
    currentSection = 'Developer workspace';
  } else if (route.kind === 'upload') {
    currentSection = 'Upload analysis';
  }

  // Active state determinations
  const isHome = route.kind === 'reader' && route.view === 'home';
  const isBrowse = route.kind === 'reader' && route.view === 'browse';
  const isClaims = route.kind === 'claims';
  const isFullgraph = route.kind === 'advanced' && route.tab === 'fullgraph';
  const isCompare = route.kind === 'reader' && route.view === 'compare';
  const isCasebook = route.kind === 'advanced' && route.tab === 'casebook';
  const isTools = route.kind === 'tools' || (route.kind === 'advanced' && !['fullgraph', 'corpus', 'casebook'].includes(route.tab));
  const isDev = route.kind === 'developer' || route.kind === 'upload';

  // Keyboard Escape listener & focus management
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const closeMenu = () => {
    setIsOpen(false);
    menuButtonRef.current?.focus();
  };

  const navItemClass = (isActive: boolean) =>
    `flex items-center gap-3 px-4 py-3 text-sm font-mono rounded transition-colors ${
      isActive
        ? 'bg-hermes-panel text-hermes-red-bright border-l-2 border-hermes-red-bright font-semibold'
        : 'text-hermes-bone/80 hover:text-hermes-bone hover:bg-hermes-panel/40 border-l-2 border-transparent'
    }`;

  return (
    <header className="lg:hidden border-b border-hermes-bone/15 bg-hermes-ink/95 backdrop-blur-sm sticky top-0 z-30 px-4 py-3 flex items-center justify-between gap-3">
      {/* Menu button + Current section */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation-drawer"
          aria-label="Open navigation menu"
          className="flex items-center gap-2 px-3 py-1.5 border border-hermes-bone/25 bg-hermes-panel text-hermes-bone text-xs font-mono font-medium hover:border-hermes-bone/50 transition-colors"
        >
          <Menu className="w-4 h-4 text-hermes-bone" aria-hidden="true" />
          <span>Menu</span>
        </button>

        <span className="font-display text-lg text-hermes-bone truncate" title={currentSection}>
          {currentSection}
        </span>
      </div>

      {/* Account Control */}
      <div className="shrink-0">
        <AccountPanel />
      </div>

      {/* Mobile Drawer Modal */}
      {isOpen && (
        <div
          id="mobile-navigation-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-0 z-50 flex flex-col bg-hermes-ink/95 text-hermes-bone font-mono backdrop-blur-md p-5 overflow-y-auto"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-4 border-b border-hermes-bone/15 mb-6">
            <div>
              <div className="font-display text-2xl text-hermes-bone">GMEE</div>
              <p className="text-[10px] uppercase tracking-widest text-hermes-bone/60">News &amp; claim research</p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeMenu}
              aria-label="Close navigation menu"
              className="p-2 border border-hermes-bone/25 text-hermes-bone hover:text-hermes-red-bright transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav aria-label="Mobile navigation destinations" className="space-y-2 flex-1">
            <a href="#/dashboard" onClick={closeMenu} aria-current={isHome ? 'page' : undefined} className={navItemClass(isHome)}>
              <Home className="w-4 h-4 shrink-0" />
              <span>Home</span>
            </a>

            {/* Explore data section */}
            <div className="space-y-1 pt-2">
              <div className="px-4 text-[10px] uppercase tracking-wider text-hermes-bone/50">Explore data</div>
              <a href="#/dashboard/browse" onClick={closeMenu} aria-current={isBrowse ? 'page' : undefined} className={navItemClass(isBrowse)}>
                <Compass className="w-4 h-4 shrink-0" />
                <span>Articles</span>
              </a>
              <a href="#/dashboard/claims" onClick={closeMenu} aria-current={isClaims ? 'page' : undefined} className={navItemClass(isClaims)}>
                <Compass className="w-4 h-4 shrink-0" />
                <span>Extracted claims</span>
              </a>
              <a href="#/dashboard/fullgraph" onClick={closeMenu} aria-current={isFullgraph ? 'page' : undefined} className={navItemClass(isFullgraph)}>
                <Compass className="w-4 h-4 shrink-0" />
                <span>Recorded connections</span>
              </a>
            </div>

            <div className="pt-2">
              <a href="#/dashboard/compare" onClick={closeMenu} aria-current={isCompare ? 'page' : undefined} className={navItemClass(isCompare)}>
                <GitCompare className="w-4 h-4 shrink-0" />
                <span>Compare wording</span>
              </a>
            </div>

            <div>
              <a href="#/dashboard/casebook" onClick={closeMenu} aria-current={isCasebook ? 'page' : undefined} className={navItemClass(isCasebook)}>
                <Bookmark className="w-4 h-4 shrink-0" />
                <span className="flex-1">My investigations</span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 border border-hermes-bone/20 text-hermes-bone/50">Private</span>
              </a>
            </div>

            <div>
              <a href="#/dashboard/tools" onClick={closeMenu} aria-current={isTools ? 'page' : undefined} className={navItemClass(isTools)}>
                <Wrench className="w-4 h-4 shrink-0" />
                <span>Advanced tools</span>
              </a>
            </div>

            {isDeveloper && (
              <div className="pt-3 border-t border-hermes-bone/15 mt-3">
                <a href="#/dashboard/developer" onClick={closeMenu} aria-current={isDev ? 'page' : undefined} className={navItemClass(isDev)}>
                  <Shield className="w-4 h-4 shrink-0 text-hermes-red-bright" />
                  <span className="flex-1">Developer workspace</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 bg-hermes-red-bright text-hermes-bone">Admin</span>
                </a>
              </div>
            )}
          </nav>

          {/* Drawer Footer */}
          <div className="pt-5 border-t border-hermes-bone/15 mt-6 text-xs text-hermes-bone/50 space-y-2">
            <p>Sources first · Claims are extracted statements, not certified facts.</p>
          </div>
        </div>
      )}
    </header>
  );
}
