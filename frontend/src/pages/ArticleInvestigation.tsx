import { useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ExternalLink, FileText, Clock, Search } from 'lucide-react';
import { articlesApi, type ArticleClaim, type ArticleConnections, type ArticleNode, type ConnectionEdge } from '../api/articles';
import { QueryError } from '../components/QueryError';
import { ClaimCheck } from '../components/ClaimCheck';
import { openComparison } from '../lib/comparisonNavigation';
import { articleHref, detailTabs, isUuid, navigateHash, parseArticleRoute, type DetailTab } from '../lib/articleRoutes';
import { safeHttpUrl } from '../lib/urls';
import { setSelectedArticle } from '../lib/useSelectedArticle';
import { PublicationNotice, usePublicationRuntime } from '../lib/publicationRuntime';

const tabs: Record<DetailTab, { name: string; help: string }> = {
  overview: { name: 'Overview', help: 'Start with the source, available text and recorded analysis.' },
  article: { name: 'Article', help: 'Read the text stored in this collection and follow the original source.' },
  claims: { name: 'Claims', help: 'Inspect statements extracted from this article and select one to investigate.' },
  related: { name: 'Related coverage', help: 'Other articles linked by stored claim relationships. Related wording does not prove the same event or independent corroboration.' },
  evidence: { name: 'Evidence', help: 'Select a claim, inspect its recorded assessment, or explicitly request an evidence check.' },
  changes: { name: 'Changes', help: 'Compare two versions and inspect recorded candidate evolution links. Text differences do not prove transmission.' },
  timeline: { name: 'Timeline', help: 'Publication order within this recorded neighborhood. Earlier reporting is not proof of copying.' },
  graph: { name: 'Graph', help: 'A focused map of stored claim relationships, grouped by article. Use the list below for exact claim links.' },
  methods: { name: 'Data & methods', help: 'Inspect data availability, provenance and limits, and understand the available evidence.' },
};
const date = (value: string | null | undefined) => value ? new Date(value).toLocaleString() : 'Unknown';
const panel = 'card-brutal-dark p-5 md:p-7 min-w-0';
const linkStyle = 'underline underline-offset-4 hover:text-hermes-red-bright';

function Empty({ children }: { children: ReactNode }) {
  return <p className="border border-dashed border-hermes-bone/25 p-6 text-sm leading-relaxed text-hermes-bone/65">{children}</p>;
}

function ClaimCard({ claim, href }: { claim: ArticleClaim; href: (tab: DetailTab, id: string) => string }) {
  return <article className={panel}>
    <p className="text-base leading-relaxed whitespace-pre-wrap break-words">{claim.text}</p>
    <p className="mt-3 text-xs text-hermes-bone/55">Extracted {date(claim.extracted_at)} · {claim.confidence == null ? 'Extraction confidence unknown' : `Extraction confidence ${claim.confidence.toFixed(2)} · heuristic`}</p>
    {claim.entities.length > 0 && <div className="flex flex-wrap gap-2 mt-4">{claim.entities.map((entity, i) => <span key={i} className="chip-brutal break-words max-w-full">{entity.text} · {entity.type}</span>)}</div>}
    <div className="flex flex-wrap gap-4 mt-5 text-xs"><a className={linkStyle} href={href('evidence', claim.id)}>Inspect evidence</a><a className={linkStyle} href={href('changes', claim.id)}>Inspect changes</a></div>
  </article>;
}

function FocusedGraph({ data, href }: { data: ArticleConnections; href: (id: string) => string }) {
  const root = data.articles.find(a => a.id === data.article_id);
  const nodes = [root, ...data.articles.filter(a => a.id !== data.article_id)].filter((a): a is ArticleNode => !!a).slice(0, 25);
  const locations = new Map(nodes.map((a, i) => {
    const angle = ((i - 1) / Math.max(1, nodes.length - 1)) * Math.PI * 2;
    return [a.id, { x: i === 0 ? 400 : 400 + Math.cos(angle) * 280, y: i === 0 ? 210 : 210 + Math.sin(angle) * 155 }];
  }));
  return <div className={panel}>
    <svg viewBox="0 0 800 420" className="w-full max-h-[500px]" role="img" aria-label="Article relationship map; exact links are listed below">
      <title>Focused article relationships</title>
      <defs><marker id="evolution-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#f4ece1" /></marker></defs>
      {data.edges.map(edge => {
        const from = locations.get(edge.from_article_id), to = locations.get(edge.to_article_id);
        if (!from || !to) return null;
        const evolution = edge.relationship_type === 'EVOLVED_FROM';
        return from === to ? <circle key={edge.id} cx={from.x + 19} cy={from.y - 18} r="24" fill="none" stroke="#b2152c" opacity=".6" />
          : <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={evolution ? '#f4ece1' : '#b2152c'} strokeWidth={evolution ? 2 : 1} opacity=".65" markerEnd={evolution ? 'url(#evolution-arrow)' : undefined} />;
      })}
      {nodes.map((node, i) => { const position = locations.get(node.id)!; return <a key={node.id} href={href(node.id)} aria-label={`Open details: ${node.title}`}>
        <title>{node.title}</title><circle cx={position.x} cy={position.y} r={i === 0 ? 17 : 11} fill={i === 0 ? '#f4ece1' : '#b2152c'} stroke="#f4ece1" />
        <text x={position.x} y={position.y + 32} textAnchor="middle" fill="#f4ece1" fontSize="11">{(node.domain || 'Unknown source').slice(0, 24)}</text>
      </a>; })}
    </svg>
    <p className="text-xs text-hermes-bone/65">Red: similarity · pale arrow: candidate evolution, child → parent · loops: two claims within one article. {data.articles.length > 25 ? 'Map shows 25 articles; use the complete returned list below.' : 'Each node is an article.'}</p>
  </div>;
}

function Changes({ edges, selected, returnTo }: { edges: ConnectionEdge[]; selected?: ArticleClaim; returnTo: string }) {
  const [choice, setChoice] = useState('');
  const candidates = edges.filter(e => e.relationship_type === 'EVOLVED_FROM' && (!selected || e.from_claim_id === selected.id || e.to_claim_id === selected.id));
  const edge = candidates.find(e => e.id === choice) || candidates[0];
  return <div className="space-y-5">
    {candidates.length ? <div className={panel}><label htmlFor="version-pair" className="block text-xs mb-3">Recorded candidate version pair</label><select id="version-pair" className="field-brutal w-full" value={edge?.id || ''} onChange={event => setChoice(event.target.value)}>{candidates.map((e, i) => <option key={e.id} value={e.id}>Pair {i + 1}: {e.to_text.slice(0, 65)}</option>)}</select>
      {edge?.mutation_evidence && <details className="mt-4 text-xs"><summary className="cursor-pointer">Stored mutation evidence</summary><pre className="mt-3 whitespace-pre-wrap break-words">{JSON.stringify(edge.mutation_evidence, null, 2)}</pre></details>}
    </div> : <Empty>No candidate evolution links recorded for {selected ? 'this claim' : 'this article'}. You can still supply two texts for comparison.</Empty>}
    <button type="button" className="btn-brutal" onClick={() => openComparison({ older: edge?.to_text || '', newer: edge?.from_text || selected?.text || '', returnTo })}>Open in Compare wording <ArrowRight className="w-4 h-4" /></button>
  </div>;
}

export function ArticleInvestigation({ route }: { route: NonNullable<ReturnType<typeof parseArticleRoute>> }) {
  const runtime = usePublicationRuntime();
  const { id, tab, claim, back, offset } = route;
  const tabsRef = useRef<HTMLElement>(null);
  const valid = route.valid && (!claim || isUuid(claim));
  const details = useQuery({ queryKey: ['article-detail', id], queryFn: ({ signal }) => articlesApi.detail(id, { signal }), enabled: valid, staleTime: 30_000 });
  const claimTab = ['claims', 'evidence', 'changes'].includes(tab);
  const claims = useQuery({ queryKey: ['article-claims', id, offset, claim], queryFn: ({ signal }) => articlesApi.claims(id, offset, claim, { signal }), enabled: valid && details.isSuccess && claimTab, staleTime: 30_000 });
  const connectionTab = ['related', 'changes', 'timeline', 'graph', 'methods'].includes(tab);
  const connections = useQuery({ queryKey: ['article-connections', id], queryFn: ({ signal }) => articlesApi.connections(id, { signal }), enabled: valid && details.isSuccess && connectionTab, staleTime: 30_000 });
  const article = details.data;
  const selected = claims.data?.selected;
  const href = (next: DetailTab, selectedClaim = claim, nextOffset = offset) => articleHref(id, next, { claim: selectedClaim, back, offset: nextOffset });
  const relatedHref = (articleId: string) => articleHref(articleId, 'overview', { back });
  const neighborhood = connections.data;
  const related = neighborhood?.articles.filter(a => a.id !== id) || [];
  const timeline = [...(neighborhood?.articles || [])].sort((a, b) => (a.published_at ? Date.parse(a.published_at) : Infinity) - (b.published_at ? Date.parse(b.published_at) : Infinity) || a.id.localeCompare(b.id));
  const source = safeHttpUrl(article?.url);
  return <div className="min-h-screen bg-hermes-ink text-hermes-bone font-mono relative isolate">
    <div className="fixed inset-0 -z-10 pointer-events-none grain-overlay" aria-hidden="true" />

    <PublicationNotice />
    <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 min-w-0 outline-none">
      <a href={back} className={`${linkStyle} text-xs inline-flex gap-2 items-center`}><ArrowLeft className="w-4 h-4" /> Back to results</a>
      {!valid ? <Empty>This article link is invalid. Return to the collection and open an article.</Empty> : <>
        {details.isPending && <p role="status">Loading article details…</p>}
        {details.isError && <QueryError title="Article details unavailable" error={details.error} onRetry={() => details.refetch()} />}
        {article && <>
          <section className="space-y-4 border-b border-hermes-bone/15 pb-7">
            <p className="text-[10px] uppercase tracking-widest text-hermes-red-bright">Collection / Article & related topic</p>
            <h1 className="font-display text-4xl md:text-6xl max-w-6xl break-words leading-tight">{article.title}</h1>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-hermes-bone/65"><span>{article.domain || 'Source unknown'}</span><span>{article.author || 'Author unknown'}</span><span>Published {date(article.published_at)}</span></div>
            <div className="flex gap-3 flex-wrap items-center">{source && <a href={source} target="_blank" rel="noopener noreferrer" className="btn-outline-dark">Read original source <ExternalLink className="w-3 h-3" /></a>}<span className="chip-brutal">{article.claims_total.toLocaleString()} extracted claims</span><span className="chip-brutal">NLP: {article.nlp_status || 'unknown'}</span></div>
          </section>
          {tab === 'overview' && <p className="text-sm leading-relaxed text-hermes-bone/70">{article.claims_total > 0 ? `${article.claims_total} extracted statements are available to inspect.` : 'No extracted statements are saved for this article.'} Start with the source, then inspect the claims and their evidence.</p>}
          <nav ref={tabsRef} aria-label="Article details" className="flex flex-wrap items-start gap-1 border-b border-hermes-bone/15 pb-3" onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            const links = [...(tabsRef.current?.querySelectorAll<HTMLAnchorElement>('a') || [])].filter(link => !link.closest('details') || link.closest('details')?.open);
            const index = links.indexOf(document.activeElement as HTMLAnchorElement);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + links.length) % links.length;
            event.preventDefault(); links[next]?.focus();
          }}>{detailTabs.filter(key => ['overview', 'article', 'claims'].includes(key)).map(key => <a key={key} href={href(key)} aria-current={tab === key ? 'page' : undefined} className="workspace-tab whitespace-nowrap shrink-0">{tabs[key].name}</a>)}
            <details key={['overview', 'article', 'claims'].includes(tab) ? 'primary' : 'research'} open={!['overview', 'article', 'claims'].includes(tab)} className="article-more-tabs"><summary>Investigate further</summary><div className="flex flex-wrap gap-1 mt-2">{detailTabs.filter(key => !['overview', 'article', 'claims'].includes(key)).map(key => <a key={key} href={href(key)} aria-current={tab === key ? 'page' : undefined} className="workspace-tab">{tabs[key].name}</a>)}</div></details>
          </nav>
          <section aria-labelledby="detail-tab-heading" className="space-y-5">
            <div><h2 id="detail-tab-heading" className="font-display text-3xl">{tabs[tab].name}</h2><p className="text-sm text-hermes-bone/65 mt-2 max-w-4xl leading-relaxed">{tabs[tab].help}</p></div>
            {tab === 'overview' && <>
              <div className="grid lg:grid-cols-[2fr_1fr] gap-5"><div className={panel}><FileText className="w-5 h-5 text-hermes-red-bright mb-4" /><h3 className="text-2xl mb-3">Inside this report</h3><p className="text-sm leading-loose whitespace-pre-wrap break-words">{article.body ? `${article.body.slice(0, 650)}${article.body.length > 650 ? '…' : ''}` : runtime.mode === 'published' ? 'Full article text is not included in this published archive. Follow the original source above to read the report.' : 'No article text is stored for this item.'}</p><p className="text-xs text-hermes-bone/50 mt-4">{article.body ? 'Excerpt from stored text · completeness unknown; it may be a feed summary.' : 'Source metadata and saved statements remain available when recorded.'}</p><a href={href('article')} className="btn-outline-dark mt-5">{article.body ? 'Read available text' : 'Source text availability'} <ArrowRight className="w-3 h-3" /></a></div>
              <dl className={`${panel} space-y-4 text-sm`}>{[['Published', date(article.published_at)], ['Collected', date(article.collected_at)], ['Language', article.language || 'Unknown'], ['Text preparation', article.processing_status], ['Claim extraction', article.nlp_status || 'Unknown']].map(([label, value]) => <div key={label}><dt className="text-[10px] uppercase tracking-wider text-hermes-bone/50">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}</dl></div>
              <div className="grid sm:grid-cols-3 gap-4">{[['claims', 'Inspect the claims', `${article.claims_total} statements extracted from this article.`], ['related', 'Follow related coverage', 'Explore recorded links to reporting from other sources.'], ['timeline', 'Read the timeline', 'See publication dates within this neighborhood.']].map(([target, title, description]) => <a key={target} href={href(target as DetailTab)} className={panel}><h3 className="text-2xl mb-3">{title}</h3><p className="text-xs leading-relaxed text-hermes-bone/65">{description}</p></a>)}</div>
            </>}
            {tab === 'article' && <div className={panel}><p className="text-xs text-hermes-bone/60 mb-6">Available text · {article.word_count ?? 'Unknown'} recorded words · completeness unknown</p>{article.body ? <div className="whitespace-pre-wrap break-words text-sm md:text-base leading-loose max-w-5xl">{article.body}</div> : <Empty>{runtime.mode === 'published' ? 'Full article text is not included in this archive. Use the original source link above to read the report.' : 'No text was stored. Use the original source link if available.'}</Empty>}</div>}
            {claimTab && <>
              {claims.isPending && <p role="status">Loading this article’s claims…</p>}
              {claims.isError && <QueryError title="Article claims unavailable" error={claims.error} onRetry={() => claims.refetch()} />}
              {claims.data && <>
                <div className="flex flex-wrap gap-3 items-end"><div className="flex-1 min-w-0"><label htmlFor="investigation-claim" className="block text-xs mb-2">Selected claim</label><select id="investigation-claim" className="field-brutal w-full" value={claim} onChange={event => { navigateHash(href(tab, event.target.value)); }}><option value="">Choose a claim to investigate</option>{selected && !claims.data.items.some(c => c.id === selected.id) && <option value={selected.id}>{selected.text.slice(0, 120)}</option>}{claims.data.items.map(c => <option key={c.id} value={c.id}>{c.text.slice(0, 120)}</option>)}</select></div><span className="text-xs text-hermes-bone/55">{claims.data.total} claims · showing {claims.data.items.length ? offset + 1 : 0}–{offset + claims.data.items.length}</span></div>
                {claims.data.total === 0 && <Empty>No claims were extracted from this article. A completed processing status does not guarantee a useful extraction.</Empty>}
                {tab === 'claims' && <div className="space-y-4">{selected && !claims.data.items.some(c => c.id === selected.id) && <ClaimCard claim={selected} href={href} />}{claims.data.items.map(c => <ClaimCard key={c.id} claim={c} href={href} />)}</div>}
                {claims.data.total > 20 && <div className="flex flex-wrap gap-4 text-xs">{offset > 0 && <a className="btn-outline-dark" href={href(tab, claim, Math.max(0, offset - 20))}>Previous claims</a>}{offset + 20 < claims.data.total && <a className="btn-outline-dark" href={href(tab, claim, offset + 20)}>Next claims</a>}</div>}
                {tab === 'evidence' && (selected ? <>
                  <div className={panel}><h3 className="text-2xl mb-3">Recorded assessment</h3><p className="text-sm leading-relaxed">{selected.text}</p><p className="mt-4 text-xs">{selected.verdict || 'No stored assessment'}{selected.verdict_probability == null ? '' : ` · heuristic support score ${selected.verdict_probability.toFixed(3)}`}</p>{selected.verdict_rationale && <p className="text-sm text-hermes-bone/65 mt-3">{selected.verdict_rationale}</p>}{selected.verdict_evidence && <details className="mt-4 text-xs"><summary className="cursor-pointer">Full stored assessment and evidence</summary><pre className="mt-3 whitespace-pre-wrap break-words">{JSON.stringify(selected.verdict_evidence, null, 2)}</pre></details>}<p className="text-xs text-hermes-bone/50 mt-3">Reading this page does not rescore the claim. Scores are uncalibrated.</p></div>
                  <ClaimCheck initialClaim={selected.text} />
                </> : <Empty>Choose a claim above to inspect its assessment or request evidence. No analysis runs automatically.</Empty>)}
              </>}
            </>}
            {connectionTab && <>
              {connections.isPending && <p role="status">Loading recorded article relationships…</p>}
              {connections.isError && <QueryError title="Recorded relationships unavailable" error={connections.error} onRetry={() => connections.refetch()} />}
              {neighborhood?.truncated && <p role="status" className="text-xs text-amber-300">Showing the strongest {neighborhood.edges.length} of {neighborhood.total_edges} direct claim links. Related coverage, map and timeline are limited to these returned links.</p>}
            </>}
            {tab === 'related' && neighborhood && (related.length ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{related.map(a => <article key={a.id} className={panel}><p className="text-xs text-hermes-bone/55 mb-3">{a.domain || 'Source unknown'} · {date(a.published_at)}</p><h3 className="text-2xl mb-4">{a.title}</h3><p className="text-xs mb-5">{[...new Set(neighborhood.edges.filter(e => e.from_article_id === a.id || e.to_article_id === a.id).map(e => e.relationship_type))].join(' · ')}</p><a className="btn-outline-dark" href={relatedHref(a.id)}>Open details <ArrowRight className="w-3 h-3" /></a></article>)}</div> : <Empty>No cross-article coverage links are recorded for this item. This does not mean no other reporting exists.</Empty>)}
            {tab === 'changes' && !claims.isError && claims.data && neighborhood && <Changes key={`${id}:${claim}`} edges={neighborhood.edges} selected={selected || undefined} returnTo={href('changes')} />}
            {tab === 'changes' && connections.isError && selected && <button type="button" className="btn-outline-dark" onClick={() => openComparison({ older: '', newer: selected.text, returnTo: href('changes') })}>Open in Compare wording <ArrowRight className="w-4 h-4" /></button>}
            {tab === 'timeline' && neighborhood && <ol className="border-l border-hermes-red-bright/50 ml-2 space-y-4">{timeline.map(a => <li key={a.id} className={`${panel} ml-5`}><p className="text-xs text-hermes-bone/55 flex flex-wrap gap-2"><Clock className="w-4 h-4" />{date(a.published_at)} · {a.domain || 'Source unknown'}{a.id === id ? ' · Selected article' : ''}</p><h3 className="text-2xl mt-3 mb-4">{a.title}</h3><a className={`${linkStyle} text-xs`} href={relatedHref(a.id)}>Open article details</a></li>)}</ol>}
            {tab === 'graph' && neighborhood && <><FocusedGraph data={neighborhood} href={relatedHref} />{neighborhood.edges.length === 0 && <Empty>No stored claim links are available for this article.</Empty>}<div className="space-y-3" aria-label="Exact claim relationships">{neighborhood.edges.map(edge => <article key={edge.id} className={panel}><p className="text-xs text-hermes-red-bright mb-3">{edge.relationship_type} · matching signal {edge.score.toFixed(3)}{edge.from_article_id === edge.to_article_id ? ' · Within one article' : ''}</p><div className="grid md:grid-cols-2 gap-4 text-sm leading-relaxed"><a className={linkStyle} href={articleHref(edge.from_article_id, 'claims', { claim: edge.from_claim_id, back })}>{edge.from_text}</a><a className={linkStyle} href={articleHref(edge.to_article_id, 'claims', { claim: edge.to_claim_id, back })}>{edge.to_text}</a></div></article>)}</div></>}
            {tab === 'methods' && <><dl className={`${panel} grid sm:grid-cols-2 gap-5 text-xs`}>{[['Article ID', article.id], ['Text field', article.body_source], ['Text completeness', article.content_completeness], ['Collected at', date(article.collected_at)], ['Processed at', date(article.processed_at)], ['Relationship basis', neighborhood?.basis || 'Unavailable'], ['Model/run revision', 'Not recorded in this article response'], ['Public release provenance', runtime.mode === 'published' ? runtime.publication?.run_id || 'Publication details unavailable' : 'Not available; this response is from the current database']].map(([label, value]) => <div key={label}><dt className="text-hermes-bone/50 uppercase tracking-wider mb-2">{label}</dt><dd className="break-words">{value}</dd></div>)}</dl><p className="text-sm text-hermes-bone/65">An article is a source document, and a claim is extracted text. Similarity, publication order and inferred evolution are research signals. They do not establish truth, independence or observed propagation.</p></>}
          </section>
          <footer className="border-t border-hermes-bone/15 pt-5 flex flex-wrap gap-5 text-xs"><a href="#/dashboard/tools" className="underline underline-offset-4">All tools & guides</a>{runtime.mode !== 'published' && <a href="#/dashboard/timeline" className="underline underline-offset-4" onClick={() => setSelectedArticle({ id, title: article.title, domain: article.domain })}>Open this article in the story timeline</a>}</footer>
          <footer className="text-xs leading-relaxed text-hermes-bone/55 border-t border-hermes-bone/15 pt-5"><Search className="inline w-3 h-3 mr-2" />This page shows one article and its recorded neighborhood, not an exhaustive topic or web search. Missing data remains unknown.</footer>
        </>}
      </>}
    </main>
  </div>;
}
