import { useState } from 'react';
import type { MutationComparisonInput } from '../api/features';
import { AccountPanel } from '../components/AccountPanel';
import { ProjectLab } from '../components/ProjectLab';
import { Casebook } from '../components/Casebook';
import FullCorpusGraph from '../components/FullCorpusGraph';
import { ReaderDashboard } from './ReaderDashboard';
import { PublicationNotice, usePublicationRuntime } from '../lib/publicationRuntime';
import { PublishedClaimSearch } from '../components/PublishedClaimSearch';

const tabs = [['overview', 'Collection overview'], ['corpus', 'Articles'], ['vector', 'Text search'], ['fullgraph', 'Published graph'], ['project', 'Project Lab'], ['casebook', 'Casebook'], ['factcheck', 'Saved claims'], ['graph', 'Neo4j tools'], ['timeline', '3D timeline'], ['cache', 'Queue'], ['masala', 'Masala Lab'], ['eval', 'Research annotation']];
export function PublishedWorkspace({ tab }: { tab: string }) {
  const runtime = usePublicationRuntime();
  const [seed, setSeed] = useState<MutationComparisonInput | null>(null);
  const [investigating, setInvestigating] = useState(false);
  if (['corpus', 'vector'].includes(tab)) return <ReaderDashboard view="browse" />;
  return <main className="min-h-screen bg-hermes-ink text-hermes-bone font-mono">
    <header className="px-4 md:px-8 py-5 flex flex-wrap justify-between gap-4"><a href="#/dashboard" className="font-display text-3xl">GMEE / Published collection</a><AccountPanel /></header><PublicationNotice />
    <div className="p-4 md:p-8 space-y-6"><nav aria-label="Published workspaces" className="flex flex-wrap gap-2">{tabs.map(([key, name]) => <a key={key} href={`#/dashboard/${key}`} className="workspace-tab" aria-current={tab === key ? 'page' : undefined} onClick={event => { if (tab === 'project' && key === 'project') { event.preventDefault(); setInvestigating(false); } }}>{name}</a>)}</nav>
      {tab === 'overview' && <section className="card-brutal-dark p-6 space-y-5"><h1 className="font-display text-4xl">Published research collection</h1><p className="text-sm">Explore the last complete, reviewed analysis. Source text and new AI checks remain on the local analysis PC.</p><dl className="grid sm:grid-cols-3 gap-5">{Object.entries(runtime.publication?.counts ?? {}).map(([name, value]) => <div key={name}><dt className="text-xs uppercase">{name}</dt><dd className="font-display text-4xl">{value.toLocaleString()}</dd></div>)}</dl><div className="flex flex-wrap gap-3"><a className="btn-brutal" href="#/dashboard/browse">Browse articles</a><a className="btn-outline-dark" href="#/dashboard/factcheck">Find saved claims</a><a className="btn-outline-dark" href="#/dashboard/fullgraph">Explore published links</a></div></section>}
      {tab === 'overview' ? null : tab === 'project' ? investigating ? <Casebook key={JSON.stringify(seed)} initialComparison={seed ?? undefined} /> : <ProjectLab navigate={next => { window.location.hash = `#/dashboard/${next}`; }} investigate={input => { setSeed(input); setInvestigating(true); }} /> : tab === 'casebook' ? <Casebook /> : tab === 'fullgraph' ? <><p className="text-xs">Stored claim links projected onto articles. This view is bounded to 1,000 nodes and 2,000 links. Open article details for focused relationships and publication timelines.</p><FullCorpusGraph /></> : tab === 'factcheck' ? <PublishedClaimSearch /> : <section className="card-brutal-dark p-6 space-y-4"><h1 className="font-display text-3xl">This tool runs in the local workspace</h1><p className="text-sm leading-relaxed">Live collection, AI checks, Neo4j administration, queue metrics and research annotation are available on the analysis PC. Published article pages retain saved claims, related coverage, graphs and timelines.</p><a href="#/dashboard/browse" className="btn-brutal">Explore published articles</a></section>}
    </div>
  </main>;
}
