import { useEffect, useId, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { ResolvedAppRoute } from '../../../shared/navigation/registry';
import { publicationsApi } from '../../../shared/api/publications';
import { useSession } from '../../../shared/session/session';
import { AccountPanel } from '../../account/components/AccountPanel';
import { WorkspaceNavLinks } from './WorkspaceNavLinks';
import './workspaceSidebar.css';

export function WorkspaceSidebar({ route }: { route: ResolvedAppRoute }) {
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('gmee:sidebar-collapsed') === 'true'; } catch { return false; } });
  const navigationId = useId(), { user, revision } = useSession();
  useEffect(() => { try { localStorage.setItem('gmee:sidebar-collapsed', String(collapsed)); } catch { /* Keep navigation usable when storage is blocked. */ } }, [collapsed]);
  const access = useQuery({ queryKey: ['publication-access', user?.id, revision], queryFn: publicationsApi.access, retry: false, enabled: Boolean(user), staleTime: 60_000 });
  return <aside aria-label="Workspace navigation" data-collapsed={collapsed} className="workspace-sidebar hidden lg:flex sticky top-0 self-start h-dvh flex-col w-64 shrink-0 border-r border-hermes-bone/15 bg-hermes-ink/95 backdrop-blur-sm p-5 select-none">
    <div className="workspace-brand pb-6 mb-4 border-b border-hermes-bone/15">
      <a href="#/dashboard" className="group block" aria-label="GMEE home" hidden={collapsed}><div className="font-display text-3xl text-hermes-bone">GMEE</div><p className="text-[10px] font-mono text-hermes-bone/60 mt-1">Follow news across sources</p></a>
      <button type="button" className="workspace-collapse" aria-label={collapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'} title={collapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!collapsed} aria-controls={navigationId} onClick={() => setCollapsed(value => !value)}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>
    </div>
    <nav id={navigationId} className="flex-1 min-h-0 overflow-y-auto" aria-label="Primary destinations"><WorkspaceNavLinks route={route} compact={collapsed} developer={access.data?.allowed === true} onExpand={() => setCollapsed(false)} /></nav>
    <div className="pt-5 border-t border-hermes-bone/15 space-y-4"><AccountPanel compact={collapsed} /><p hidden={collapsed} className="text-[10px] leading-relaxed text-hermes-bone/45">Start with an article. Follow its source, then explore related reporting.</p></div>
  </aside>;
}
