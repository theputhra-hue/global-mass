import { useState, useEffect, useRef, useId } from 'react';
import { Menu, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { ResolvedAppRoute } from '../../../shared/navigation/registry';
import { publicationsApi } from '../../../shared/api/publications';
import { useSession } from '../../../shared/session/session';
import { AccountPanel } from '../../account/components/AccountPanel';
import { visitorLabel } from '../../../shared/navigation/visitorNavigation';
import { WorkspaceNavLinks } from './WorkspaceNavLinks';
import { Dialog } from '../../../shared/ui/Dialog';

interface WorkspaceMobileHeaderProps {
  route: ResolvedAppRoute;
}

export function WorkspaceMobileHeader({ route }: WorkspaceMobileHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const { user, revision } = useSession();

  const access = useQuery({
    queryKey: ['publication-access', user?.id, revision],
    queryFn: publicationsApi.access,
    retry: false,
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const isDeveloper = access.data?.allowed === true;

  const currentSection = route.kind === 'article' ? 'Article details' : route.kind === 'topic' ? 'Topic investigation' : visitorLabel(route);

  // A drawer opened on mobile must not remain over the desktop navigation.
  useEffect(() => {
    if (!window.matchMedia) return;
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) setIsOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  const closeMenu = () => {
    setIsOpen(false);
    menuButtonRef.current?.focus();
  };

  return (
    <>
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
    </header>

      {/* Mobile Drawer Modal */}
      {isOpen && (
        <Dialog
          id="mobile-navigation-drawer"
          labelledBy={titleId}
          onClose={closeMenu}
          backdropClassName="fixed inset-0 z-50 bg-hermes-ink"
          className="h-full w-full flex flex-col bg-hermes-ink text-hermes-bone font-mono p-5 overflow-y-auto overscroll-contain outline-none"
        >
          <h2 id={titleId} className="sr-only">Navigation menu</h2>
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-4 border-b border-hermes-bone/15 mb-6">
            <div>
              <div className="font-display text-2xl text-hermes-bone">GMEE</div>
              <p className="text-[10px] uppercase tracking-widest text-hermes-bone/60">Follow news across sources</p>
            </div>
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Close navigation menu"
              className="p-2 border border-hermes-bone/25 text-hermes-bone hover:text-hermes-red-bright transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav aria-label="Mobile navigation destinations" className="flex-1"><WorkspaceNavLinks route={route} developer={isDeveloper} onNavigate={closeMenu} /></nav>

          {/* Drawer Footer */}
          <div className="pt-5 border-t border-hermes-bone/15 mt-6 text-xs text-hermes-bone/50 space-y-2">
            <p>Sources first · Claims are extracted statements, not certified facts.</p>
          </div>
        </Dialog>
      )}
    </>
  );
}
