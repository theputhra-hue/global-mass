import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Search, ExternalLink } from 'lucide-react';
import { fetchDashboard } from '../../../shared/api/dashboard';
import { corpusApi } from '../../../shared/api/corpus';
import { QueryError } from '../../../shared/ui/QueryError';
import { MutationComparator } from '../../comparison/components/MutationComparator';
import { FactCheck } from '../../claims/components/FactCheck';
import { safeHttpUrl } from '../../../shared/lib/urls';
import { articleHref, navigateHash } from '../../../shared/navigation/articleRoutes';
import { usePublicationRuntime } from '../../../shared/runtime/publicationRuntime';
import { PublishedClaimSearch } from '../../claims/components/PublishedClaimSearch';
import { useSession } from '../../../shared/session/session';

export function ReaderDashboard({ view = 'home' }: { view?: string }) {
  const readOnly = useSession().user?.role === 'viewer';
  const runtime = usePublicationRuntime();
  const cloud = runtime.mode === 'published';
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const [draft, setDraft] = useState(params.get('q') || '');
  const [search, setSearch] = useState(params.get('q') || '');
  const [domainDraft, setDomainDraft] = useState(params.get('domain') || '');
  const [domain, setDomain] = useState(params.get('domain') || '');
  const initialOffset = Number(params.get('offset') || 0);
  const [offset, setOffset] = useState(Number.isSafeInteger(initialOffset) && initialOffset >= 0 ? initialOffset : 0);
  const home = view === 'home';
  const browsing = home || view === 'browse';
  const resultPath = home ? '#/dashboard' : '#/dashboard/browse';
  const searchParams = (query: string, source: string, page: number) => new URLSearchParams({ q: query, ...(source ? { domain: source } : {}), offset: String(page) });
  const resultsHref = `${resultPath}?${searchParams(search, domain, offset)}`;
  const summary = useQuery({ queryKey: ['dashboard'], queryFn: ({ signal }) => fetchDashboard({ signal }), staleTime: 60_000, enabled: browsing && !cloud });
  const articles = useQuery({ queryKey: ['reader-articles', search, domain, offset], queryFn: ({ signal }) => corpusApi.list({ q: search, domain, limit: 6, offset }, { signal }), enabled: browsing });
  const number = (value?: number) => value === undefined ? '—' : value.toLocaleString();
  function move(nextQuery: string, nextOffset: number, nextDomain = domain) {
    setSearch(nextQuery); setOffset(nextOffset); setDomain(nextDomain);
    navigateHash(`${resultPath}?${searchParams(nextQuery, nextDomain, nextOffset)}`);
  }
  function submit(event: FormEvent) { event.preventDefault(); move(draft.trim(), 0, domainDraft.trim()); }
  return <div className="space-y-6 min-w-0">
      <section className="max-w-3xl space-y-4">
          <p className="text-[10px] uppercase tracking-widest text-hermes-red-bright">{browsing ? 'Start with a source article' : 'Research tools'}</p>
          <h1 className="font-display text-4xl md:text-5xl">{browsing ? 'Find an article.' : view === 'compare' ? 'Compare two versions of a statement.' : cloud ? 'Find a saved claim.' : 'Check a claim against this collection.'}</h1>
          <p className="text-sm leading-relaxed text-hermes-bone/70">{browsing ? 'Search a title or author. Open a result to inspect its source and saved statements.' : view === 'compare' ? 'Paste an older and newer version. We highlight wording and number changes; a difference does not establish which version is true.' : cloud ? 'Search statements extracted during earlier analysis. Open a result to inspect its saved assessment and source. This does not run a new AI check.' : 'Inspect available supporting or conflicting passages. Results cover this collection, not the whole web.'}</p>
      </section>
      {browsing && <>
        <section aria-label="Find articles" className="card-brutal-dark p-5 md:p-7 space-y-4">
          <form onSubmit={submit} className="space-y-4">
            <label htmlFor="reader-search" className="block text-sm">Search article titles or authors</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input id="reader-search" maxLength={120} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Try a place, a name, or words from a headline" className="field-brutal min-w-0 w-full flex-1 !py-4" />
              <button className="btn-brutal" aria-label="Search articles"><Search className="w-4 h-4" />Search articles</button>
            </div>
            <details open={Boolean(domain)} className="text-xs">
              <summary className="text-hermes-bone/65">Filter by source (optional)</summary>
              <div className="mt-3 max-w-md space-y-2">
                <label htmlFor="reader-domain" className="block text-xs">Source domain (optional)</label>
                <input id="reader-domain" maxLength={253} value={domainDraft} onChange={event => setDomainDraft(event.target.value)} placeholder="e.g. www.thehindu.com" className="field-brutal w-full" />
              </div>
            </details>
          </form>
          <p className="text-xs text-hermes-bone/55">Title and author matching · {cloud ? 'Published collection' : 'Available local collection'} · No new analysis is started</p>
        </section>
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm border-b border-hermes-bone/15 pb-5" aria-label="Collection size">
            <p><span className="font-display text-2xl mr-2">{number(cloud ? runtime.publication?.counts.articles : summary.data?.articles_total)}</span>articles</p>
            <p><span className="font-display text-2xl mr-2">{number(cloud ? runtime.publication?.counts.claims : summary.data?.claims_total)}</span>extracted claims</p>
            <p className="w-full text-xs text-hermes-bone/55">Statements identified in articles, not verified facts.</p>
        </div>
        {!cloud && summary.isError && <QueryError title="Collection summary unavailable" error={summary.error} onRetry={() => summary.refetch()} />}
        <section aria-labelledby="article-heading" className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3"><h2 id="article-heading" className="font-display text-3xl">{search ? `Results for “${search}”` : 'Browse the collection'}</h2>{(search || domain) && <button onClick={() => { setDraft(''); setDomainDraft(''); move('', 0, ''); }} className="text-xs underline underline-offset-4">Clear search</button>}</div>
          {domain && <p className="text-xs text-hermes-bone/70 break-words">Source filter: {domain}</p>}
          <p className="text-xs text-hermes-bone/55">Collected coverage may include older reporting. Check the publication date.</p>
          {articles.isFetching && <p role="status" className="text-sm">Loading articles…</p>}
          {articles.isError && <QueryError title="Articles unavailable" error={articles.error} onRetry={() => articles.refetch()} />}
          {!articles.isError && articles.data && <>
            <p className="text-xs text-hermes-bone/60">{number(articles.data.total)} matching articles{articles.data.total > 0 ? ` · Showing ${offset + 1}–${Math.min(offset + 6, articles.data.total)}` : ''}</p>
            {articles.data.items.length === 0 && <p className="border border-dashed border-hermes-bone/25 p-8">{search ? 'No matching articles. Try a shorter phrase or another author.' : 'No articles are available yet.'}</p>}
            <div className="article-results">{articles.data.items.map(article => { const url = safeHttpUrl(article.url); const href = articleHref(article.id, 'overview', { back: resultsHref, release: cloud ? articles.data?.run_id : undefined }); return <article key={article.id} className="article-result"><div><p className="text-[11px] leading-relaxed text-hermes-bone/60 mb-3">{article.domain || 'Source unavailable'} · {article.published_at ? new Date(article.published_at).toLocaleDateString() : 'Publication date unknown'}</p><h3 className="font-display text-2xl leading-snug"><a href={href} className="hover:text-hermes-red-bright">{article.title}</a></h3></div><div className="result-actions"><a href={href} className="btn-outline-dark">Open details <ArrowRight className="w-3 h-3" /></a>{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-hermes-bone/60 underline underline-offset-4 inline-flex items-center gap-2">Read original source <ExternalLink className="w-3 h-3" /><span className="sr-only"> (opens in a new tab)</span></a> : <p className="text-xs">Source link unavailable</p>}</div></article>; })}</div>
            <div className="flex gap-3"><button disabled={offset === 0 || articles.isFetching} onClick={() => move(search, Math.max(0, offset - 6))} className="btn-outline-dark">Previous</button><button disabled={offset + 6 >= articles.data.total || articles.isFetching} onClick={() => move(search, offset + 6)} className="btn-outline-dark">Next articles</button></div>
          </>}
        </section>
        <details className="border-t border-hermes-bone/15 pt-4"><summary className="text-xs cursor-pointer">How do I use these results?</summary><ol className="list-decimal pl-5 mt-4 space-y-3 text-xs leading-relaxed text-hermes-bone/65"><li>Choose a headline and open its details.</li><li>Read the source and publication date, then inspect the extracted claims.</li><li>Follow the original source for full context. Claims and model assessments are not verified facts.</li></ol></details>
        <aside className="border-t border-hermes-bone/15 pt-6 space-y-4"><h2 className="font-display text-2xl">Have a statement instead of a headline?</h2><div className="flex flex-wrap gap-5 text-xs"><a href={readOnly ? '#/dashboard/claims' : '#/dashboard/check'} className="underline underline-offset-4">{cloud || readOnly ? 'Search saved claims' : 'Check a claim'}</a>{!readOnly && <><a href="#/dashboard/compare" className="underline underline-offset-4">Compare two versions</a><a href="#/dashboard/tools" className="underline underline-offset-4">Explore all tools &amp; guides</a></>}</div></aside>
      </>}
      {view === 'compare' && <MutationComparator />}
      {view === 'check' && (cloud ? <PublishedClaimSearch /> : <FactCheck />)}
      {!browsing && !home && <a href="#/dashboard/browse" className="inline-flex items-center gap-2 text-xs underline underline-offset-4">Return to article search <ArrowRight className="w-3 h-3" /></a>}
  </div>;
}
