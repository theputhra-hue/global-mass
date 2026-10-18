import { useEffect, useState, type ReactNode } from 'react';
import { BookOpen, Search, ShieldCheck, GitCompareArrows, Network, Clock, FlaskConical, Activity, Menu, PanelLeftClose, PanelLeftOpen, X, ArrowUpRight } from 'lucide-react';
import { AccountPanel } from './AccountPanel';
import { Dialog } from './Dialog';
import { usePublicationRuntime } from '../lib/publicationRuntime';

const primary = [
  { key: '', label: 'Explore articles', icon: Search },
  { key: 'check', label: 'Check a claim', icon: ShieldCheck },
  { key: 'compare', label: 'Compare wording', icon: GitCompareArrows },
  { key: 'casebook', label: 'My investigations', icon: BookOpen },
];
const research = [
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

export function WorkspaceShell({ children, route }: { children: ReactNode; route: string }) {
  const { mode } = usePublicationRuntime();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = route.split('?')[0];
  const key = pathname.split('/')[1] || '';
  useEffect(() => { if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  const active = key === 'articles' || key === 'browse' ? '' : key === 'factcheck' ? 'check' : key;
  useEffect(() => { setMobileOpen(false); }, [route]);
  const labelFor = (target: string, label: string) => target === 'check' && mode === 'published' ? 'Saved claims' : target === 'vector' && mode === 'published' ? 'Article search' : label;
  const links = (items: typeof primary) => items.map(({ key: target, label, icon: Icon }) => <a key={target} href={`#/dashboard${target ? `/${target}` : ''}`} aria-current={active === target ? 'page' : undefined} className="workspace-link" onClick={() => setMobileOpen(false)}><Icon size={17} aria-hidden="true" /><span>{labelFor(target, label)}{mode === 'published' && ['graph', 'timeline', 'masala', 'eval'].includes(target) && <small className="block text-[10px] text-hermes-bone/60">Local workspace only</small>}</span></a>);
  const navigation = <nav aria-label="Workspace" className="workspace-navigation">
    <p className="nav-group-label">Your workspace</p>{links(primary)}
    <details key={`research-${research.some(item => item.key === active)}`} open={research.some(item => item.key === active)} className="nav-group"><summary>Explore & research</summary>{links(research)}</details>
    {mode !== 'published' && <details key={`system-${system.some(item => item.key === active)}`} open={system.some(item => item.key === active)} className="nav-group"><summary>System tools</summary>{links(system)}</details>}
    <a href="#/dashboard/tools" className="workspace-link nav-directory" aria-current={active === 'tools' ? 'page' : undefined} onClick={() => setMobileOpen(false)}><ArrowUpRight size={17} aria-hidden="true" />All tools & guides</a>
    <p className="nav-footnote">Read the source.<br />Compare the evidence.</p>
  </nav>;
  return <div className={`workspace-shell ${collapsed ? 'workspace-collapsed' : ''}`}>
    <button className="skip-content" onClick={() => { const main = document.getElementById('main-content') || document.querySelector('main'); main?.setAttribute('tabindex', '-1'); main?.focus(); }}>Skip to content</button>
    <aside className="workspace-sidebar"><a href="#/dashboard" className="workspace-brand"><span className="brand-mark">G</span><span>GMEE<small>News & claim research</small></span></a>{navigation}</aside>
    <div className="workspace-body">
      <header className="workspace-topbar">
        <button className="shell-icon-button desktop-menu" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}>{collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}</button>
        <button className="shell-icon-button mobile-menu" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
        <span className="workspace-location">Workspace <span aria-hidden="true">/</span> <strong>{labelFor(active, [...primary, ...research, ...system].find(item => item.key === active)?.label || (active === 'tools' ? 'Tools & guides' : 'Administration'))}</strong></span>
        <AccountPanel />
      </header>
      <div className="workspace-content">{children}</div>
    </div>
    {mobileOpen && <Dialog labelledBy="navigation-title" onClose={() => setMobileOpen(false)} className="mobile-navigation-panel"><div className="flex items-center justify-between p-4"><h2 id="navigation-title" className="text-lg">Your workspace</h2><button className="shell-icon-button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={20} /></button></div>{navigation}</Dialog>}
  </div>;
}
