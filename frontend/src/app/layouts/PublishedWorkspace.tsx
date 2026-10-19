import { useState } from 'react';
import type { MutationComparisonInput } from '../../shared/api/features';
import { ProjectLab } from '../../features/research/components/ProjectLab';
import { Casebook } from '../../features/investigations/components/Casebook';
import FullCorpusGraph from '../../features/graph/components/FullCorpusGraph';
import ArticleAtlas from '../../features/graph/components/ArticleAtlas';
import { ReaderDashboard } from '../../features/articles/pages/ReaderDashboard';
import { PublishedClaimSearch } from '../../features/claims/components/PublishedClaimSearch';
import { ToolAvailabilityNotice } from '../../features/navigation/components/ToolAvailabilityNotice';

export function PublishedWorkspace({ tab }: { tab: string }) {
  const [seed, setSeed] = useState<MutationComparisonInput | null>(null);
  const [investigating, setInvestigating] = useState(false);

  if (tab === 'corpus') return <ReaderDashboard view="browse" />;
  if (tab === 'atlas') return <ArticleAtlas />;

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
              Inspect saved relationship records, or browse the unlinked articles and claims when no connections have been published.
            </p>
          </section>
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
