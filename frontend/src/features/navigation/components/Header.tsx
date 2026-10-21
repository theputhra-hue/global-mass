import { RefreshCw } from 'lucide-react';
import type { TabType } from '../../../shared/navigation/tabs';
export type { TabType } from '../../../shared/navigation/tabs';
interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  refetchInterval: number;
  setRefetchInterval: (interval: number) => void;
  isFetching: boolean;
  onManualRefresh: () => void;
  status: 'connecting' | 'ready' | 'not_ready' | 'error';
  demoMode?: boolean;
}
const statuses = { connecting: 'Connecting', ready: 'Systems Ready', not_ready: 'Not Ready · Partial Outage', error: 'Connection Failed' };
export function Header({ refetchInterval, setRefetchInterval, isFetching, onManualRefresh, status, demoMode }: HeaderProps) {
  return <div className="flex flex-wrap items-center gap-3 border-b border-hermes-bone/15 pb-4 mb-6 text-xs">
    <span className={status === 'ready' ? 'text-emerald-300' : status === 'connecting' ? 'text-hermes-bone/65' : 'text-amber-300'}>{statuses[status]}</span>
    {demoMode && <span className="text-amber-300">Demo Telemetry · simulated</span>}
    <details className="ml-auto relative"><summary>Refresh settings</summary><div className="flex flex-wrap gap-3 items-center pt-3">
      <label htmlFor="background-polling">Background updates</label>
      <select id="background-polling" aria-label="Background polling interval" className="field-brutal" value={refetchInterval} onChange={event => setRefetchInterval(Number(event.target.value))}><option value={2000}>Every 2 seconds</option><option value={5000}>Every 5 seconds</option><option value={15000}>Every 15 seconds</option><option value={0}>Paused</option></select>
    </div></details>
    <button aria-label="Refresh telemetry" disabled={isFetching} onClick={onManualRefresh} className="btn-outline-dark"><RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />Refresh</button>
  </div>;
}
