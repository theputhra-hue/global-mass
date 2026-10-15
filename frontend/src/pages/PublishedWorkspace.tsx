import { useState } from 'react';
import type { MutationComparisonInput } from '../api/features';
import { ReaderNavigation } from '../components/ReaderNavigation';
import { ProjectLab } from '../components/ProjectLab';
import { Casebook } from '../components/Casebook';
import FullCorpusGraph from '../components/FullCorpusGraph';
import { ReaderDashboard } from './ReaderDashboard';
import { PublicationNotice, usePublicationRuntime } from '../lib/publicationRuntime';
import { PublishedClaimSearch } from '../components/PublishedClaimSearch';
import { ToolsDirectory } from './ToolsDirectory';

export function PublishedWorkspace({ tab }: { tab: string }) {
  const runtime = usePublicationRuntime();
  const [seed, setSeed] = useState<MutationComparisonInput | null>(null);
  const [investigating, setInvestigating] = useState(false);
  if (['corpus', 'vector'].includes(tab)) return <ReaderDashboard view="browse" />;
  if (tab === 'overview') return <ToolsDirectory />;
  return <div className="min-h-screen bg-hermes-ink text-hermes-bone font-mono">
    <ReaderNavigation active="tools" /><PublicationNotice />
    <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 outline-none">
      <a href="#/dashboard/tools" className="inline-block text-xs underline underline-offset-4">← All tools &amp; guides</a>
      {tab === 'project' ? investigating ? <><button onClick={() => setInvestigating(false)} className="btn-outline-dark">Back to analyzer controls</button><Casebook key={JSON.stringify(seed)} initialComparison={seed ?? undefined} /></> : <><p className="text-sm text-hermes-bone/65">Authored examples help explain the wording analyzer. To compare your own statements, use <a href="#/dashboard/compare" className="underline">Compare wording</a>.</p><ProjectLab navigate={next => { window.location.hash = `#/dashboard/${next}`; }} investigate={input => { setSeed(input); setInvestigating(true); }} /></> : tab === 'casebook' ? <Casebook /> : tab === 'fullgraph' ? <>
        <section className="space-y-3"><h1 className="font-display text-4xl">Explore recorded connections.</h1><p className="text-sm leading-relaxed text-hermes-bone/65">Each dot represents an article or claim; a line is a saved relationship. Select a dot, then open its article details to investigate it.</p><p className="text-xs text-hermes-bone/50">This view is bounded to 1,000 nodes and 2,000 links. It does not show every record in larger collections.</p></section>
        {runtime.publication?.counts.relationships === 0 && <p className="border border-hermes-bone/25 p-5 text-sm leading-relaxed">This release has no saved relationship links, so its dots will not be connected. You can still <a href="#/dashboard" className="underline">search all articles</a> or <a href="#/dashboard/compare" className="underline">compare two supplied statements</a>. No missing links are inferred automatically.</p>}
        <FullCorpusGraph />
      </> : tab === 'factcheck' ? <><h1 className="font-display text-4xl">Search saved claim analysis.</h1><p className="text-sm text-hermes-bone/65">These are previously extracted statements and recorded assessments. Opening a result does not run a new AI check.</p><PublishedClaimSearch /></> : <section className="card-brutal-dark p-6 space-y-4"><p className="text-[10px] uppercase tracking-widest text-hermes-red-bright">Local PC required</p><h1 className="font-display text-3xl">This tool runs in the local workspace.</h1><p className="text-sm leading-relaxed">Collection, new AI analysis, Neo4j administration, the 3D timeline, queue metrics and research annotation run on the analysis PC. This website serves the last published collection.</p><div className="flex flex-wrap gap-3"><a href="#/dashboard" className="btn-brutal">Find an article</a><a href="#/dashboard/tools" className="btn-outline-dark">Choose another tool</a></div></section>}
    </main>
  </div>;
}
