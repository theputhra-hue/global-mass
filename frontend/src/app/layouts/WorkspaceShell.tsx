import React from 'react';
import type { Destination } from '../routing/resolveRoute';
import { WorkspaceSidebar } from '../../features/navigation/components/WorkspaceSidebar';
import { WorkspaceMobileHeader } from '../../features/navigation/components/WorkspaceMobileHeader';
import { WorkspaceBreadcrumbs } from '../../features/navigation/components/WorkspaceBreadcrumbs';
import { PublicationNotice } from '../../shared/runtime/publicationRuntime';
import { useSession } from '../../shared/session/session';

interface WorkspaceShellProps {
  route: Destination & { raw: string; dashboard: boolean };
  articleTitle?: string;
  articleTab?: string;
  children: React.ReactNode;
}

export function WorkspaceShell({ route, articleTitle, articleTab, children }: WorkspaceShellProps) {
  const readOnly = useSession().user?.role === 'viewer';
  const wideMap = route.kind === 'advanced' && (route.tab === 'atlas' || route.tab === 'fullgraph');
  return (
    <div className="min-h-screen bg-hermes-ink text-hermes-bone font-mono relative isolate flex flex-col lg:flex-row">
      {/* Skip to main content link for keyboard accessibility */}
      <button
        type="button"
        onClick={() => document.getElementById('main-content')?.focus()}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:p-4 focus:bg-hermes-panel focus:text-hermes-bone focus:border focus:border-hermes-red-bright"
      >
        Skip to content
      </button>

      {/* Paper grain texture — Hermes site signature */}
      <div className="fixed inset-0 -z-10 pointer-events-none grain-overlay" aria-hidden="true" />

      {/* Desktop Persistent Sidebar */}
      <WorkspaceSidebar route={route} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header with labelled Menu button and section name */}
        <WorkspaceMobileHeader route={route} />

        {/* Global published notice when operating in published cloud mode */}
        <PublicationNotice />
        {readOnly && <p role="status" className="border-b border-hermes-bone/15 px-5 py-3 text-xs text-hermes-bone/70">Viewer account · Read-only access to published data. Analysis and editing are disabled.</p>}

        {/* Primary Page Content */}
        <main
          id="main-content"
          tabIndex={-1}
          className={`flex-1 p-4 md:p-8 ${wideMap ? 'max-w-none' : 'max-w-7xl'} w-full mx-auto min-w-0 outline-none space-y-6`}
        >
          {/* Breadcrumbs */}
          <WorkspaceBreadcrumbs route={route} articleTitle={articleTitle} articleTab={articleTab} />

          {children}
        </main>
      </div>
    </div>
  );
}
