import { useEffect, useState, type ReactNode } from 'react';
import {
  Activity, ArrowUpRight, BookOpen, Clock, FlaskConical, GitCompareArrows,
  Menu, Network, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck, X,
} from 'lucide-react';
import type { Destination } from '../routing/resolveRoute';
import { resolveRoute } from '../routing/resolveRoute';
import { AccountPanel } from '../../features/account/components/AccountPanel';
import { Dialog } from '../../shared/ui/Dialog';
import { PublicationNotice, usePublicationRuntime } from '../../shared/runtime/publicationRuntime';
import { viewerCanOpen } from '../../shared/navigation/viewerAccess';
import { useSession } from '../../shared/session/session';

const primary = [
  { key: '', label: 'Explore articles', icon: Search },
  { key: 'check', label: 'Check a claim', icon: ShieldCheck },
  { key: 'compare', label: 'Compare wording', icon: GitCompareArrows },
  { key: 'casebook', label: 'My investigations', icon: BookOpen },
];
const research = [
  { key: 'atlas', label: 'Story map', icon: Network },
  { key: 'fullgraph', label: 'Article & claim map', icon: Network },
  { key: 'graph', label: 'Story clusters', icon: Network },
  { key: 'timeline', label: 'Story timeline', icon: Clock },
  { key: 'vector', label: 'Semantic search', icon: Search },
  { key: 'corpus', label: 'Collection & history', icon: BookOpen },
  { key: 'project', label: 'Analyzer examples', icon: FlaskConical },
  { key: 'masala', label: 'Analysis lab', icon: FlaskConical },
  { key: 'eval', label: 'Research annotation', icon: BookOpen },
];
const system = [
  { key: 'overview', label: 'Service overview', icon: Activity },
  { key: 'cache', label: 'Cache & queue', icon: Activity },
];
interface WorkspaceShellProps {
  route: Destination & { raw: string; dashboard: boolean };
  articleTitle?: string;
  articleTab?: string;
  children: ReactNode;
}
export function WorkspaceShell({ route, children }: WorkspaceShellProps) {
  const readOnly = useSession().user?.role === 'viewer';
  const { mode } = usePublicationRuntime();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('gmee:sidebar-collapsed') === 'true'; }
    catch { return false; }
  });
  const pathname = route.raw.split('?')[0];
  const key = pathname.split('/')[1] || '';
  const active = ['articles', 'browse'].includes(key) ? '' : key === 'factcheck' ? 'check' : key;
  const wideMap = route.kind === 'advanced' && ['atlas', 'fullgraph'].includes(route.tab);
  useEffect(() => {
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'instant' });
    setMobileOpen(false);
  }, [pathname]);
  useEffect(() => {
    try { localStorage.setItem('gmee:sidebar-collapsed', String(collapsed)); }
    catch { /* Navigation remains usable when browser storage is unavailable. */ }
  }, [collapsed]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) setMobileOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);
  const labelFor = (target: string, label: string) => target === 'check' && mode === 'published'
    ? 'Saved claims' : target === 'vector' && mode === 'published' ? 'Article search' : label;
  const primaryItems = readOnly
    ? [primary[0], { key: 'claims', label: 'Saved claims', icon: ShieldCheck }]
    : primary;
  const canOpen = (target: string) => !readOnly || viewerCanOpen(resolveRoute(`#/dashboard${target ? `/${target}` : ''}`));
  const links = (items: typeof primary) => items.filter(item => canOpen(item.key)).map(({ key: target, label, icon: Icon }) => (
    <a key={target} href={`#/dashboard${target ? `/${target}` : ''}`}
      aria-current={active === target ? 'page' : undefined} className="workspace-link"
      onClick={() => setMobileOpen(false)}>
      <Icon size={17} aria-hidden="true" />
      <span>{labelFor(target, label)}
        {mode === 'published' && ['graph', 'timeline', 'masala', 'eval'].includes(target) &&
          <small className="block text-[10px] text-hermes-bone/60">Local workspace only</small>}
      </span>
    </a>
  ));
  const navigation = <nav aria-label="Workspace" className="workspace-navigation">
    <p className="nav-group-label">Your workspace</p>{links(primaryItems)}
    <details key={`research-${research.some(item => item.key === active)}`}
      open={research.some(item => item.key === active)} className="nav-group">
      <summary>Explore &amp; research</summary>{links(research)}
    </details>
    {mode !== 'published' && !readOnly && <details key={`system-${system.some(item => item.key === active)}`}
      open={system.some(item => item.key === active)} className="nav-group">
      <summary>System tools</summary>{links(system)}
    </details>}
    {canOpen('tools') && <a href="#/dashboard/tools" className="workspace-link nav-directory"
      aria-current={active === 'tools' ? 'page' : undefined} onClick={() => setMobileOpen(false)}>
      <ArrowUpRight size={17} aria-hidden="true" />All tools &amp; guides
    </a>}
    {readOnly && <a href="#/dashboard/help" className="workspace-link nav-directory"
      aria-current={active === 'help' ? 'page' : undefined} onClick={() => setMobileOpen(false)}>
      <BookOpen size={17} aria-hidden="true" />Help &amp; methods
    </a>}
    <p className="nav-footnote">Read the source.<br />Compare the evidence.</p>
  </nav>;
  const location = labelFor(active, [...primaryItems, ...research, ...system].find(item => item.key === active)?.label
    || (active === 'tools' ? 'Tools & guides' : active === 'topics' ? 'Topic coverage' : active === 'help' ? 'Help & methods' : 'Administration'));
  return <div className={`workspace-shell ${collapsed ? 'workspace-collapsed' : ''} ${wideMap ? 'workspace-wide-map' : ''}`}>
    <button className="skip-content" onClick={() => document.getElementById('main-content')?.focus()}>Skip to content</button>
    <aside aria-label="Workspace navigation" className="workspace-sidebar" data-collapsed={collapsed}>
      <a href="#/dashboard" className="workspace-brand"><span className="brand-mark">G</span>
        <span>GMEE<small>News &amp; claim research</small></span></a>
      {navigation}
    </aside>
    <div className="workspace-body">
      <header className="workspace-topbar">
        <button className="shell-icon-button desktop-menu" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}>
          {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
        </button>
        <button className="shell-icon-button mobile-menu" aria-label="Open navigation"
          aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
        <span className="workspace-location">Workspace <span aria-hidden="true">/</span><strong>{location}</strong></span>
        <AccountPanel />
      </header>
      <PublicationNotice />
      {readOnly && <p role="status" className="border-b border-hermes-bone/15 px-5 py-3 text-xs text-hermes-bone/70">Viewer account · Read-only access to published data. Analysis and editing are disabled.</p>}
      <main id="main-content" tabIndex={-1} className="workspace-content p-4 md:p-8 min-w-0 outline-none space-y-6">{children}</main>
    </div>
    {mobileOpen && <Dialog labelledBy="navigation-title" onClose={() => setMobileOpen(false)} className="mobile-navigation-panel">
      <div className="flex items-center justify-between p-4"><h2 id="navigation-title" className="text-lg">Your workspace</h2>
        <button className="shell-icon-button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={20} /></button>
      </div>{navigation}
    </Dialog>}
  </div>;
}
