import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowRight, Database, Play, RefreshCw, Upload } from 'lucide-react';
import { developerApi, type DeveloperRunResult, type PipelineStage } from '../api/developer';
import { publicationsApi } from '../api/publications';
import { useSession } from '../lib/session';
import { AccountPanel } from '../components/AccountPanel';
import { QueryError } from '../components/QueryError';

const stages: Array<{ key: PipelineStage; title: string; description: string }> = [
  { key: 'collection', title: 'Gather articles', description: 'Fetch new coverage from enabled sources. Existing URLs are deduplicated.' },
  { key: 'preprocessing', title: 'Prepare text', description: 'Clean collected text, detect language and identify duplicates.' },
  { key: 'nlp', title: 'Extract claims', description: 'Run the configured local AI extraction cycle. Keep this PC running.' },
  { key: 'evolution', title: 'Analyze relationships', description: 'Run clustering and claim relationship analysis when corpus guards permit.' },
];
const tabs = ['Overview', 'Sources', 'Processing', 'Review', 'Publishing'] as const;
type Tab = typeof tabs[number];
const date = (value: string | null) => value ? new Date(value).toLocaleString() : 'Not recorded';

export function DeveloperConsole() {
  const { user, revision } = useSession();
  const [tab, setTab] = useState<Tab>('Overview');
  const [confirm, setConfirm] = useState<PipelineStage | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState('');
  const [outcome, setOutcome] = useState<DeveloperRunResult | null>(null);
  const access = useQuery({ queryKey: ['developer-access', user?.id, revision], queryFn: publicationsApi.access, retry: false });
  const overview = useQuery({ queryKey: ['developer-overview', user?.id, revision], queryFn: developerApi.overview, enabled: access.data?.allowed === true, refetchInterval: 10000, retry: false });
  const data = overview.data;
  const running = data?.jobs.some(job => job.status === 'running') ?? false;
  async function run(stage: PipelineStage) {
    setConfirm(null); setPending(stage); setError(null); setNotice(''); setOutcome(null);
    try {
      const response = await developerApi.run(stage);
      setOutcome(response);
      setNotice('Request completed. Check the job record and counts below; a completed cycle can skip work when guards apply.');
    } catch (failure) {
      setError(failure);
      setNotice('A timeout or connection loss does not prove the job stopped. Refresh the job history before retrying.');
    } finally { setPending(null); await overview.refetch(); }
  }
  async function switchSource(id: string, enabled: boolean) {
    setPending(id); setError(null);
    try { await developerApi.source(id, enabled); await overview.refetch(); }
    catch (failure) { setError(failure); }
    finally { setPending(null); }
  }
  const history = <section className="card-brutal-dark p-5 md:p-6 space-y-4"><h2 className="font-display text-2xl">Recent processing jobs</h2><p className="text-xs text-hermes-bone/60">Updates every 10 seconds. These are recorded synchronous runs, not a background queue.</p>
    {!data?.jobs.length && <p className="text-sm">No runs recorded yet.</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-hermes-bone/20"><th className="py-3 pr-4">Stage</th><th className="pr-4">Status</th><th className="pr-4">Started</th><th>Finished / heartbeat</th></tr></thead><tbody>{data?.jobs.map(job => <tr key={job.id} className="border-b border-hermes-bone/10"><td className="py-4 pr-4 uppercase">{job.type}</td><td className="pr-4">{job.status}{job.has_error && ' · inspect local logs'}</td><td className="pr-4 whitespace-nowrap">{date(job.started_at)}</td><td className="whitespace-nowrap">{date(job.finished_at || job.heartbeat_at)}</td></tr>)}</tbody></table></div>
  </section>;
  return <main className="min-h-screen bg-hermes-ink text-hermes-bone font-mono">
    <header className="border-b border-hermes-bone/20 px-4 md:px-8 py-5 flex flex-wrap justify-between gap-4 items-center"><a href="#/dashboard" className="font-display text-3xl">GMEE <span className="font-mono text-[10px] tracking-widest ml-2">DEVELOPER CONSOLE</span></a><div className="flex gap-3"><a href="#/dashboard" className="btn-outline-dark">Reader workspace</a><AccountPanel /></div></header>
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-7">
      <section className="flex flex-wrap justify-between items-end gap-5"><div><p className="text-xs text-hermes-red-bright uppercase tracking-widest mb-3">Research operations / approved developers</p><h1 className="font-display text-4xl md:text-5xl">From coverage to evidence.</h1><p className="text-sm text-hermes-bone/65 mt-4 max-w-2xl">Gather, prepare, analyze and review your collection. Publish only completed results with traceable provenance.</p></div>{access.data?.allowed && <button className="btn-outline-dark" disabled={overview.isFetching} onClick={() => void overview.refetch()}><RefreshCw className="w-4 h-4" /> Refresh status</button>}</section>
      {access.isLoading && <p role="status">Checking developer access…</p>}
      {access.isError && <QueryError title="Developer access unavailable" error={access.error} onRetry={() => access.refetch()} />}
      {access.data && !access.data.allowed && <p role="alert" className="card-brutal-dark p-6">Developer access is restricted to the two approved administrator accounts.</p>}
      {access.data?.allowed && <>
        <nav aria-label="Developer sections" className="flex overflow-x-auto border-y border-hermes-bone/20">{tabs.map(item => <button key={item} aria-current={tab === item ? 'page' : undefined} onClick={() => { setTab(item); setConfirm(null); }} className={`workspace-tab whitespace-nowrap ${tab === item ? 'text-hermes-red-bright' : ''}`}>{item}</button>)}</nav>
        {overview.isError && <QueryError title="Developer status unavailable" error={overview.error} onRetry={() => overview.refetch()} />}
        {error != null && <QueryError title="Action failed" error={error} />}
        {notice && <p role="status" className="border border-hermes-bone/25 p-4 text-sm">{notice}</p>}
        {outcome && <section aria-label="Last stage result" className="card-brutal-dark p-5 space-y-3 text-sm">
          <h2 className="font-display text-2xl">Last stage result</h2>
          {outcome.summary?.total_processed !== undefined && <p>Articles processed: {outcome.summary.total_processed.toLocaleString()}</p>}
          {outcome.summary?.claims_extracted !== undefined && <p>Claims extracted: {outcome.summary.claims_extracted.toLocaleString()}</p>}
          {outcome.summary?.status_counts?.failed !== undefined && <p>Articles failed: {outcome.summary.status_counts.failed.toLocaleString()}</p>}
          {outcome.result?.status && <p>Analysis outcome: {outcome.result.status}</p>}
          {outcome.result?.clusters_found !== undefined && <p>Clusters found: {outcome.result.clusters_found.toLocaleString()}</p>}
          {outcome.result?.relationships_detected !== undefined && <p>Relationships detected: {outcome.result.relationships_detected.toLocaleString()}</p>}
          {outcome.result?.neo4j_sync_success === false && <p role="alert">Graph synchronization did not complete. Saved database results are available; the graph projection may be unavailable or out of date.</p>}
        </section>}
        {pending && <p role="status" className="text-sm">Working… Keep this page open. Status updates continue below.</p>}
        {data && <>
          <div className="grid sm:grid-cols-3 gap-4">{Object.entries(data.counts).map(([label, value]) => <div key={label} className="card-brutal-dark p-5"><p className="text-xs uppercase tracking-widest text-hermes-bone/60">{label}</p><p className="font-display text-4xl mt-3">{value.toLocaleString()}</p></div>)}</div>
          {(tab === 'Overview' || tab === 'Processing') && <>
            <p className="text-sm border-l-2 border-hermes-red-bright pl-4">{data.pipeline_enabled ? 'Local processing controls enabled. Run stages in order. Collection uses configured external sources; AI uses the configured models/providers.' : 'Processing controls are disabled on this server. Open the local developer console to run analysis.'}</p>
            {data.nlp_cycle_limit !== undefined && <p className="text-xs text-hermes-bone/65">Each extraction cycle processes up to {data.nlp_cycle_limit} pending articles. Text preparation also starts an extraction cycle; extraction may then start relationship analysis. Check status before starting another stage.</p>}
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">{stages.map((stage, index) => <section key={stage.key} className="card-brutal-dark p-5 flex flex-col gap-4"><div className="flex justify-between text-hermes-red-bright"><span className="text-xs">0{index + 1}</span><Activity className="w-4 h-4" /></div><h2 className="font-display text-2xl">{stage.title}</h2><p className="text-sm text-hermes-bone/60 flex-1">{stage.description}</p><button className="btn-brutal self-start" disabled={!data.pipeline_enabled || !!pending || running || overview.isError} onClick={() => setConfirm(stage.key)}><Play className="w-3 h-3" /> Run stage</button></section>)}</div>
            {confirm && <section role="region" aria-label="Confirm processing" className="border border-hermes-red-bright p-5 space-y-4"><h2 className="font-display text-2xl">Run {stages.find(s => s.key === confirm)?.title.toLowerCase()}?</h2><p className="text-sm">This changes the connected local dataset. It may take several minutes and may contact configured sources or AI providers.</p><div className="flex gap-3"><button className="btn-brutal" disabled={!!pending} onClick={() => void run(confirm)}>Confirm run</button><button className="btn-outline-dark" onClick={() => setConfirm(null)}>Cancel</button></div></section>}
            {history}
          </>}
          {tab === 'Sources' && <section className="card-brutal-dark p-6 space-y-5"><h2 className="font-display text-2xl">Collection sources</h2><p className="text-sm text-hermes-bone/60">Enable or pause configured sources for future collection cycles. Existing articles are retained. Source URLs and credentials stay on the server.</p>{!data.sources.length && <p>No configured sources.</p>}{data.sources.map(source => <div key={source.id} className="flex flex-wrap justify-between items-center gap-4 border-t border-hermes-bone/15 pt-4"><div><h3 className="font-display text-xl">{source.name}</h3><p className="text-xs text-hermes-bone/60 mt-2">{source.type} · Last collected: {date(source.last_collected_at)}</p></div><button role="switch" aria-checked={source.enabled} aria-label={`${source.name} collection`} disabled={!data.pipeline_enabled || !!pending || running || overview.isError} className={source.enabled ? 'btn-brutal' : 'btn-outline-dark'} onClick={() => void switchSource(source.id, !source.enabled)}>{source.enabled ? 'Enabled — pause' : 'Paused — enable'}</button></div>)}</section>}
          {tab === 'Review' && <div className="space-y-5"><div className="grid md:grid-cols-2 gap-4">{[['Text preparation', data.processing], ['Claim extraction', data.nlp]].map(([title, counts]) => <section key={String(title)} className="card-brutal-dark p-6"><h2 className="font-display text-2xl mb-4">{String(title)}</h2><dl className="space-y-3">{Object.entries(counts).map(([key, value]) => <div key={key} className="flex justify-between text-sm border-t border-hermes-bone/10 pt-3"><dt>{key}</dt><dd>{value}</dd></div>)}</dl></section>)}</div><div className="flex flex-wrap gap-3"><a href="#/dashboard/browse" className="btn-outline-dark"><Database className="w-4 h-4" /> Review articles</a><a href="#/dashboard/fullgraph" className="btn-outline-dark">Explore relationships <ArrowRight className="w-4 h-4" /></a></div>{history}</div>}
          {tab === 'Publishing' && <section className="card-brutal-dark p-6 space-y-5"><h2 className="font-display text-3xl">Prepare a trustworthy release</h2><ol className="list-decimal pl-5 space-y-3 text-sm text-hermes-bone/70"><li>Review completed jobs and source coverage.</li><li>Export a publication-v1 JSON with actual model revisions and analysis provenance.</li><li>Upload and validate the file in the developer upload workspace.</li><li>Activate only after the cloud serving and integrity gates are implemented.</li></ol><a href="#/dashboard/upload" className="btn-brutal inline-flex"><Upload className="w-4 h-4" /> Open upload workspace</a><p className="text-sm border border-hermes-bone/20 p-4">Automatic export, public activation, scheduling, cancellation and crash recovery are not available in this console yet. Uploaded files remain staged; existing public results stay unchanged.</p></section>}
        </>}
      </>}
    </div>
  </main>;
}
