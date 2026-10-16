import { useState } from 'react';
import type { MutationComparisonInput } from '../../shared/api/features';
import { ProjectLab } from '../../features/research/components/ProjectLab';
import { Casebook } from '../../features/investigations/components/Casebook';
import FullCorpusGraph from '../../features/graph/components/FullCorpusGraph';
import { ReaderDashboard } from '../../features/articles/pages/ReaderDashboard';
import { usePublicationRuntime } from '../../shared/runtime/publicationRuntime';
import { PublishedClaimSearch } from '../../features/claims/components/PublishedClaimSearch';
import { ToolsDirectory } from '../../features/navigation/pages/ToolsDirectory';
import { ToolAvailabilityNotice } from '../../features/navigation/components/ToolAvailabilityNotice';

export function PublishedWorkspace({ tab }: { tab: string }) {
  const runtime = usePublicationRuntime();
  const [seed, setSeed] = useState<MutationComparisonInput | null>(null);
  const [investigating, setInvestigating] = useState(false);

  if (['corpus', 'vector'].includes(tab)) return <ReaderDashboard view="browse" />;
  if (tab === 'overview') return <ToolsDirectory />;

  return (
    <div className="space-y-6">
      <a href="#/dashboard/tools" className="inline-block text-xs font-mono underline underline-offset-4 text-hermes-bone/70 hover:text-hermes-bone">
        ← All tools &amp; guides
      </a>

      {tab === 'project' ? (
        investigating ? (
          <>
            <button onClick={() => setInvestigating(false)} className="btn-outline-dark">
              Back to analyzer controls
            </button>
            <Casebook key={JSON.stringify(seed)} initialComparison={seed ?? undefined} />
          </>
        ) : (
          <>
            <p className="text-sm text-hermes-bone/65 leading-relaxed">
              Authored examples help explain the wording analyzer. To compare your own statements, use{' '}
              <a href="#/dashboard/compare" className="underline">Compare wording</a>.
            </p>
            <ProjectLab
              navigate={(next) => {
                window.location.hash = `#/dashboard/${next}`;
              }}
              investigate={(input) => {
                setSeed(input);
                setInvestigating(true);
              }}
            />
          </>
        )
      ) : tab === 'casebook' ? (
        <Casebook />
      ) : tab === 'fullgraph' ? (
        <div className="space-y-6">
          <section className="space-y-3">
            <h1 className="font-display text-4xl">Explore recorded connections.</h1>
            <p className="text-sm leading-relaxed text-hermes-bone/65">
              Each dot represents an article or claim; a line is a saved relationship. Select a dot, then open its article details to investigate it.
            </p>
            <p className="text-xs text-hermes-bone/50">
              This view is bounded to 1,000 nodes and 2,000 links. It does not show every record in larger collections.
            </p>
          </section>
          {runtime.publication?.counts.relationships === 0 && (
            <p className="border border-hermes-bone/25 p-5 text-sm leading-relaxed">
              This release has no saved relationship links, so its dots will not be connected. You can still{' '}
              <a href="#/dashboard" className="underline">search all articles</a> or{' '}
              <a href="#/dashboard/compare" className="underline">compare two supplied statements</a>. No missing links are inferred automatically.
            </p>
          )}
          <FullCorpusGraph />
        </div>
      ) : tab === 'factcheck' ? (
        <div className="space-y-4">
          <h1 className="font-display text-4xl">Search saved claim analysis.</h1>
          <p className="text-sm text-hermes-bone/65">
            These are previously extracted statements and recorded assessments. Opening a result does not run a new AI check.
          </p>
          <PublishedClaimSearch />
        </div>
      ) : (
        <ToolAvailabilityNotice toolId={tab} />
      )}
    </div>
  );
}
