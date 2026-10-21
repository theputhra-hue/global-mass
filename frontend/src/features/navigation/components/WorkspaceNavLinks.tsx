import { useEffect, useId, useState } from 'react';
import { ArrowRight, Bookmark, ChevronDown, Compass, GitCompare, CircleHelp, Network, Shield, Wrench } from 'lucide-react';
import type { ResolvedAppRoute } from '../../../shared/navigation/registry';
import { researchLinks, visitorDestination, visitorLinks } from '../../../shared/navigation/visitorNavigation';
import './workspaceSidebar.css';
import { useSession } from '../../../shared/session/session';

export function WorkspaceNavLinks({ route, compact = false, developer = false, onNavigate, onExpand }: { route: ResolvedAppRoute; compact?: boolean; developer?: boolean; onNavigate?: () => void; onExpand?: () => void }) {
  const readOnly = useSession().user?.role === 'viewer';
  const active = visitorDestination(route), researchActive = researchLinks.some(link => link.id === active);
  const [open, setOpen] = useState(researchActive), id = useId();
  useEffect(() => { if (researchActive) setOpen(true); }, [route.raw, researchActive]);
  const icons = { browse: Compass, atlas: Network, compare: GitCompare, casebook: Bookmark };
  const classes = (selected: boolean) => `visitor-nav-link ${selected ? 'visitor-nav-active' : ''}`;
  return <>
    <div className="visitor-nav-heading" aria-hidden="true">Explore the news</div>
    {visitorLinks.filter(item => !readOnly || ['browse', 'atlas'].includes(item.id)).map(item => { const Icon = icons[item.id]; return <a key={item.id} href={item.href} aria-label={item.label} title={compact ? item.label : undefined} aria-current={active === item.id ? 'page' : undefined} className={classes(active === item.id)} onClick={onNavigate}>
      <Icon size={18} aria-hidden="true" /><span className="visitor-nav-copy"><span>{item.label}</span><small>{item.description}</small></span>
    </a>; })}
    <div className="visitor-research-group">
      <button type="button" className={classes(researchActive)} aria-label="Research tools" title={compact ? 'Research tools' : undefined} aria-expanded={!compact && open} aria-controls={id} onClick={() => { if (compact) { onExpand?.(); setOpen(true); } else setOpen(value => !value); }}>
        <Wrench size={18} aria-hidden="true" /><span className="visitor-nav-copy"><span>Research tools</span><small>Statements, recorded links and more</small></span><ChevronDown size={14} aria-hidden="true" className={`visitor-nav-chevron ${open ? 'rotate-180' : ''}`} />
      </button>
      <div id={id} hidden={compact || !open} className="visitor-research-links">
        {researchLinks.filter(item => !readOnly || item.id !== 'tools').map(item => <a key={item.id} href={item.href} aria-label={item.label} className={classes(active === item.id)} aria-current={active === item.id ? 'page' : undefined} onClick={onNavigate}><ArrowRight size={13} aria-hidden="true" /><span className="visitor-nav-copy"><span>{item.label}</span><small>{item.description}</small></span></a>)}
      </div>
    </div>
    <a href="#/dashboard/help" aria-label="Help & methods" title={compact ? 'Help & methods' : undefined} className={classes(active === 'help')} aria-current={active === 'help' ? 'page' : undefined} onClick={onNavigate}><CircleHelp size={18} aria-hidden="true" /><span className="visitor-nav-copy"><span>Help &amp; methods</span><small>Understand the data and research limits</small></span></a>
    {developer && !readOnly && <div className="visitor-developer-group"><a href="#/dashboard/developer" aria-label="Manage data" title={compact ? 'Manage data' : undefined} aria-current={['developer', 'upload'].includes(active) ? 'page' : undefined} className={classes(['developer', 'upload'].includes(active))} onClick={onNavigate}>
      <Shield size={18} aria-hidden="true" /><span className="visitor-nav-copy"><span>Manage data <em>Developer</em></span><small>Run, upload and publish analysis</small></span>
    </a></div>}
  </>;
}
