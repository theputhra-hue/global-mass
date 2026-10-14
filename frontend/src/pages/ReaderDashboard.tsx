import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Search, ExternalLink, BookOpen, GitCompare, ShieldCheck } from 'lucide-react';
import { fetchDashboard } from '../api/dashboard';
import { corpusApi } from '../api/corpus';
import { AccountPanel } from '../components/AccountPanel';
import { QueryError } from '../components/QueryError';
import { MutationComparator } from '../components/MutationComparator';
import { FactCheck } from '../components/FactCheck';
import { safeHttpUrl } from '../lib/urls';

const actions = [
  { href: '#/dashboard/browse', title: 'Explore articles', text: 'Find coverage by title or author, then read the original source.', icon: BookOpen },
  { href: '#/dashboard/compare', title: 'Compare two claims', text: 'Paste two versions to see changes in names, numbers, and wording.', icon: GitCompare },
  { href: '#/dashboard/check', title: 'Find evidence for a claim', text: 'Look for supporting or conflicting passages in this collection.', icon: ShieldCheck },
];
export function ReaderDashboard({ view = 'home' }: { view?: string }) {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const home = view === 'home';
  const browsing = home || view === 'browse';
  const summary = useQuery({ queryKey: ['dashboard'], queryFn: ({ signal }) => fetchDashboard({ signal }), staleTime: 30_000 });
  const articles = useQuery({ queryKey: ['reader-articles', search, offset], queryFn: ({ signal }) => corpusApi.list({ q: search, limit: 6, offset }, { signal }), enabled: browsing });
  const number = (value?: number) => value === undefined ? '—' : value.toLocaleString();
  function submit(event: FormEvent) { event.preventDefault(); setSearch(draft.trim()); setOffset(0); }
  return <div className="min-h-screen bg-hermes-ink text-hermes-bone font-mono relative isolate">
    <div className="fixed inset-0 -z-10 pointer-events-none grain-overlay" aria-hidden="true" />
    <header className="border-b border-hermes-bone/15 px-4 md:px-8 py-5 flex flex-wrap items-center justify-between gap-4">
      <a href="#/dashboard" className="font-display text-3xl">GMEE <span className="font-mono text-[10px] uppercase tracking-widest text-hermes-bone/65 ml-3">Understand the story</span></a>
      <div className="flex items-center gap-4"><a href="#/dashboard/overview" className="btn-outline-dark">Advanced tools</a><AccountPanel /></div>
    </header>
    <nav aria-label="Workspace" className="flex flex-wrap gap-2 px-4 md:px-8 py-4 border-b border-hermes-bone/10">
      {[['home', 'Start here'], ['browse', 'Articles'], ['compare', 'Compare claims'], ['check', 'Find evidence']].map(([key, label]) => <a key={key} aria-current={view === key ? 'page' : undefined} href={key === 'home' ? '#/dashboard' : `#/dashboard/${key}`} className="workspace-tab">{label}</a>)}
    </nav>
    <main className="p-4 md:p-8 space-y-8">
      <section className="max-w-3xl">
        <p className="text-xs uppercase tracking-widest text-hermes-red-bright mb-3">{home ? 'Your starting point' : 'Research workspace'}</p>
        <h1 className="text-4xl md:text-6xl mb-4">{home ? 'Make sense of what you read.' : view === 'browse' ? 'Explore the collection.' : view === 'compare' ? 'What changed between versions?' : 'What does the collection say?'}</h1>
        <p className="text-sm md:text-base text-hermes-bone/70 leading-relaxed">{home ? 'Start with an article, compare how a claim is worded, or look for evidence. You do not need to understand the databases behind it.' : view === 'browse' ? 'Search article titles and authors. Open a source to read its full context.' : view === 'compare' ? 'A change in wording is a reason to investigate, not proof of misinformation.' : 'Results come from collected articles, not an exhaustive search of the web.'}</p>
      </section>
      {home && <>
        {summary.isError && <QueryError title="Collection summary unavailable" error={summary.error} onRetry={() => summary.refetch()} />}
        <dl className="grid sm:grid-cols-3 gap-4">
          {[[number(summary.data?.articles_total), 'Articles collected', 'Source documents available for research.'], [number(summary.data?.claims_total), 'Claims extracted', 'Statements identified in articles, not verified facts.'], [number(summary.data?.embedded_claims), 'Claims prepared for similarity search', 'Related wording can be retrieved; similarity is not truth.']].map(([value, label, help]) => <div key={label} className="card-brutal-dark p-5"><dt className="font-mono text-[11px] font-bold uppercase tracking-wider text-hermes-bone/70">{label}</dt><dd className="text-4xl font-display mt-2">{value}</dd><p className="text-xs text-hermes-bone/65 mt-3">{help}</p></div>)}
        </dl>
        {summary.isLoading && <p role="status">Loading collection totals…</p>}
        {summary.data && <p className="text-xs text-hermes-bone/65">Snapshot: {new Date(summary.data.generated_at).toLocaleString()}{summary.isError ? ' · Last available data; may be outdated.' : ''}</p>}
        <section aria-label="Choose what to do" className="grid lg:grid-cols-3 gap-4">{actions.map(({ href, title, text, icon: Icon }, index) => <a key={href} href={href} className="group card-brutal-dark p-6 hover:border-hermes-red-bright transition-colors"><div className="flex justify-between text-hermes-red-bright"><Icon className="w-6 h-6" /><span className="font-mono text-xs">0{index + 1}</span></div><h2 className="text-2xl mt-5 mb-2">{title}</h2><p className="text-sm text-hermes-bone/60 leading-relaxed">{text}</p><ArrowRight className="w-5 h-5 mt-5 group-hover:translate-x-1 transition-transform" /></a>)}</section>
      </>}
      {browsing && <section aria-labelledby="article-heading" className="space-y-5">
        <div className="flex flex-wrap justify-between items-end gap-4"><div><h2 id="article-heading" className="text-3xl">{home ? 'Start with an article' : 'Articles'}</h2><p className="text-sm text-hermes-bone/55 mt-2">Collected coverage may include older reporting. Check the publication date.</p></div>
        <form onSubmit={submit} className="flex gap-2 w-full sm:w-auto"><label htmlFor="reader-search" className="sr-only">Search article titles or authors</label><input id="reader-search" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Search titles or authors" className="field-brutal min-w-0 flex-1" /><button className="btn-brutal" aria-label="Search articles"><Search className="w-4 h-4" /></button></form></div>
        {articles.isFetching && <p role="status" className="text-sm">Loading articles…</p>}
        {articles.isError && <QueryError title="Articles unavailable" error={articles.error} onRetry={() => articles.refetch()} />}
        {!articles.isError && articles.data && <>
          <p className="text-xs text-hermes-bone/60">{number(articles.data.total)} matching articles{search ? ` for “${search}”` : ''}</p>
          {articles.data.items.length === 0 && <p className="border border-dashed border-hermes-bone/25 p-8">{search ? 'No matching articles. Try a shorter phrase or another author.' : 'No articles are available yet.'}</p>}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{articles.data.items.map(article => { const url = safeHttpUrl(article.url); return <article key={article.id} className="card-brutal-dark p-6 flex flex-col"><p className="text-xs text-hermes-bone/65 mb-3">{article.domain || 'Source unavailable'} · {article.published_at ? new Date(article.published_at).toLocaleDateString() : 'Publication date unknown'}</p><h3 className="text-2xl leading-snug mb-5">{article.title}</h3>{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="btn-outline-dark mt-auto self-start">Read original source <ExternalLink className="w-3 h-3" /><span className="sr-only"> (opens in a new tab)</span></a> : <p className="text-xs">Source link unavailable</p>}</article>; })}</div>
          <div className="flex gap-3"><button disabled={offset === 0 || articles.isFetching} onClick={() => setOffset(Math.max(0, offset - 6))} className="btn-brutal">Previous</button><button disabled={offset + 6 >= articles.data.total || articles.isFetching} onClick={() => setOffset(offset + 6)} className="btn-brutal">Next articles</button></div>
        </>}
      </section>}
      {view === 'compare' && <MutationComparator />}
      {view === 'check' && <FactCheck />}
      <aside className="border-t border-hermes-bone/15 pt-6 text-sm text-hermes-bone/60"><strong className="text-hermes-bone">How to read these results:</strong> An article is a source document. A claim is a statement extracted from it. Similarity means wording is related. None of these alone establishes whether a statement is true.</aside>
    </main>
  </div>;
}
