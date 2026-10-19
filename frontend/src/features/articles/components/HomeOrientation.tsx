import { ArrowRight, BookOpen, GitCompare, Search, Wrench } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchDashboard } from '../../../shared/api/dashboard';
import { usePublicationRuntime } from '../../../shared/runtime/publicationRuntime';
import { QueryError } from '../../../shared/ui/QueryError';

export function HomeOrientation() {
  const runtime = usePublicationRuntime();
  const cloud = runtime.mode === 'published';

  const summary = useQuery({
    queryKey: ['dashboard'],
    queryFn: ({ signal }) => fetchDashboard({ signal }),
    staleTime: 60_000,
    enabled: !cloud,
  });

  const number = (value?: number) => (value === undefined ? '—' : value.toLocaleString());

  const articlesCount = cloud ? runtime.publication?.counts.articles : summary.data?.articles_total;
  const claimsCount = cloud ? runtime.publication?.counts.claims : summary.data?.claims_total;
  const relsCount = cloud ? runtime.publication?.counts.relationships : summary.data?.graph?.relationships;

  return (
    <div className="space-y-10">
      {/* Purpose Banner */}
      <section className="space-y-4 max-w-3xl">
        <p className="text-[10px] uppercase tracking-widest text-hermes-red-bright">
          News &amp; claim research
        </p>
        <h1 className="font-display text-4xl md:text-5xl leading-tight">
          Explore collected news, inspect statements, and compare reporting.
        </h1>
        <p className="text-sm md:text-base leading-relaxed text-hermes-bone/75">
          GMEE helps you investigate collected news articles, examine claims extracted from them,
          and compare how coverage is worded. An extracted claim is not a verified fact, and a saved
          model assessment is previous analysis output.
        </p>
      </section>

      {/* Real Collection Freshness and Summary */}
      <section aria-label="Collection summary" className="card-brutal-dark p-5 md:p-6 space-y-4">
        <h2 className="text-xs uppercase tracking-wider text-hermes-bone/60 font-mono">
          {cloud ? 'Published collection summary' : 'Local workspace collection summary'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-2">
          <div>
            <dt className="text-[10px] uppercase text-hermes-bone/50 tracking-wider">Articles</dt>
            <dd className="font-display text-3xl md:text-4xl text-hermes-bone mt-1">{number(articlesCount)}</dd>
            <p className="text-[11px] text-hermes-bone/50 mt-1">Source records</p>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-hermes-bone/50 tracking-wider">Extracted claims</dt>
            <dd className="font-display text-3xl md:text-4xl text-hermes-bone mt-1">{number(claimsCount)}</dd>
            <p className="text-[11px] text-hermes-bone/50 mt-1">Statements identified in articles, not verified facts.</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-[10px] uppercase text-hermes-bone/50 tracking-wider">Saved relationships</dt>
            <dd className="font-display text-3xl md:text-4xl text-hermes-bone mt-1">{number(relsCount)}</dd>
            <p className="text-[11px] text-hermes-bone/50 mt-1">
              {relsCount === 0 ? 'Zero saved links in this release' : 'Stored comparison signals'}
            </p>
          </div>
        </div>

        {!cloud && summary.isError && (
          <QueryError title="Local collection metrics unavailable" error={summary.error} onRetry={() => summary.refetch()} />
        )}

        {cloud && runtime.publication && (
          <p className="text-xs text-hermes-bone/50 pt-2 border-t border-hermes-bone/10">
            Release: <span className="font-mono text-hermes-bone/80">{runtime.publication.run_id || 'active'}</span> · Published {runtime.publication.published_at ? new Date(runtime.publication.published_at).toLocaleDateString() : 'recently'}
          </p>
        )}
      </section>

      {/* Three Primary Task Choices */}
      <section aria-label="Next reading actions" className="space-y-4">
        <h2 className="font-display text-2xl">Where would you like to start?</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {/* Action 1: Articles (Dominant Hero) */}
          <div className="card-brutal-dark p-6 space-y-4 flex flex-col border-2 border-hermes-bone/35 bg-hermes-panel/30">
            <div className="w-10 h-10 border border-hermes-bone/30 bg-hermes-red flex items-center justify-center text-hermes-bone">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="font-display text-2xl">Find source articles</h3>
            <p className="text-sm leading-relaxed text-hermes-bone/70 flex-1">
              Search by title or author keywords across the collection. Open details to inspect the report and its extracted statements.
            </p>
            <a href="#/dashboard/browse" className="btn-brutal inline-flex items-center justify-between">
              <span>Browse articles</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </div>

          {/* Action 2: Claims */}
          <div className="card-brutal-dark p-6 space-y-4 flex flex-col">
            <div className="w-10 h-10 border border-hermes-bone/20 bg-hermes-panel flex items-center justify-center text-hermes-bone">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-display text-2xl">Inspect extracted claims</h3>
            <p className="text-sm leading-relaxed text-hermes-bone/70 flex-1">
              {cloud
                ? 'Search previously extracted statements and view their source context and recorded model assessments.'
                : 'Browse statements extracted from local articles and inspect recorded model assessments.'}
            </p>
            <a href="#/dashboard/claims" className="btn-outline-dark inline-flex items-center justify-between">
              <span>Explore claims</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </div>

          {/* Action 3: Compare Wording */}
          <div className="card-brutal-dark p-6 space-y-4 flex flex-col">
            <div className="w-10 h-10 border border-hermes-bone/20 bg-hermes-panel flex items-center justify-center text-hermes-bone">
              <GitCompare className="w-5 h-5" />
            </div>
            <h3 className="font-display text-2xl">Compare wording</h3>
            <p className="text-sm leading-relaxed text-hermes-bone/70 flex-1">
              Paste two text passages to highlight differences and analyze phrasing changes. A difference does not determine truth.
            </p>
            <a href="#/dashboard/compare" className="btn-outline-dark inline-flex items-center justify-between">
              <span>Compare wording</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </div>
        </div>
      </section>

      {/* What These Records Mean */}
      <section aria-labelledby="meaning-heading" className="border-t border-hermes-bone/15 pt-8 space-y-5">
        <h2 id="meaning-heading" className="font-display text-2xl">What these records mean</h2>
        <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 text-xs">
          <div className="border border-hermes-bone/15 bg-hermes-panel/20 p-4 space-y-2">
            <dt className="font-display text-lg text-hermes-bone">Article</dt>
            <dd className="leading-relaxed text-hermes-bone/65">
              An attributable source record collected from external news reporting. Follow its original link to read the publisher’s full story.
            </dd>
          </div>
          <div className="border border-hermes-bone/15 bg-hermes-panel/20 p-4 space-y-2">
            <dt className="font-display text-lg text-hermes-bone">Extracted claim</dt>
            <dd className="leading-relaxed text-hermes-bone/65">
              A statement extracted by NLP during analysis. Extraction does not prove accuracy or verify the claim as fact.
            </dd>
          </div>
          <div className="border border-hermes-bone/15 bg-hermes-panel/20 p-4 space-y-2">
            <dt className="font-display text-lg text-hermes-bone">Saved assessment</dt>
            <dd className="leading-relaxed text-hermes-bone/65">
              Prior model output recorded with its method and context. Scores are heuristic signals, not certified verdicts.
            </dd>
          </div>
          <div className="border border-hermes-bone/15 bg-hermes-panel/20 p-4 space-y-2">
            <dt className="font-display text-lg text-hermes-bone">Recorded connection</dt>
            <dd className="leading-relaxed text-hermes-bone/65">
              A saved comparison or candidate evolution link. It indicates textual relationship, not proof of copying or transmission.
            </dd>
          </div>
        </dl>
      </section>

      {/* Advanced Tools Quieter Contextual Link */}
      <section className="border-t border-hermes-bone/15 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-hermes-bone/65">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-hermes-bone/50 shrink-0" />
          <span>Need specialist research labs, database graphs or local system vitals?</span>
        </div>
        <a href="#/dashboard/tools" className="underline underline-offset-4 hover:text-hermes-bone text-hermes-bone/80">
          Open Advanced tools directory →
        </a>
      </section>
    </div>
  );
}
