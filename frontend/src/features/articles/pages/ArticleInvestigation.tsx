import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ExternalLink, FileText, Clock, Search } from 'lucide-react';
import { ArticleCoverage } from '../components/ArticleCoverage';
import { articlesApi, type ArticleClaim, type ArticleConnections, type ArticleNode, type ConnectionEdge } from '../../../shared/api/articles';
import { QueryError } from '../../../shared/ui/QueryError';
import { ClaimCheck } from '../../claims/components/ClaimCheck';
import { MutationComparator } from '../../comparison/components/MutationComparator';
import { articleHref, detailTabs, isUuid, navigateHash, parseArticleRoute, type DetailTab } from '../../../shared/navigation/articleRoutes';
import { safeHttpUrl } from '../../../shared/lib/urls';
import { setSelectedArticle } from '../../../shared/navigation/useSelectedArticle';
import { usePublicationRuntime } from '../../../shared/runtime/publicationRuntime';
import { useSession } from '../../../shared/session/session';

const tabs: Record<DetailTab, { name: string; help: string }> = {
  overview: { name: 'Overview', help: 'Start with the source, available text and recorded analysis.' },
  article: { name: 'Article', help: 'Read the text stored in this collection and follow the original source.' },
  claims: { name: 'Claims', help: 'Inspect statements extracted from this article and select one to investigate.' },
  related: { name: 'Related coverage', help: 'Explore semantic neighbors and topic coverage, separately from stored claim relationships. Related wording does not prove the same event or independent corroboration.' },
  evidence: { name: 'Evidence', help: 'Select a claim, inspect its recorded assessment, or explicitly request an evidence check.' },
  changes: { name: 'Changes', help: 'Compare two versions and inspect recorded candidate evolution links. Text differences do not prove transmission.' },
  timeline: { name: 'Timeline', help: 'Publication order within this recorded neighborhood. Earlier reporting is not proof of copying.' },
  graph: { name: 'Graph', help: 'A focused map of stored claim relationships, grouped by article. Use the list below for exact claim links.' },
  methods: { name: 'Data & methods', help: 'Inspect data availability, provenance and limits, and understand the available evidence.' },
};
const primaryTabs: readonly DetailTab[] = ['overview', 'article', 'claims'];
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
    <div className="mt-4 border-l-2 border-hermes-red-bright/60 pl-4 space-y-2">
      <p className="text-xs font-mono">Saved assessment: <strong>{claim.verdict || 'Not recorded'}</strong>{claim.verdict_probability == null ? '' : ` · heuristic support score ${claim.verdict_probability.toFixed(3)} (uncalibrated)`}</p>
      {claim.verdict_rationale && <p className="text-sm leading-relaxed text-hermes-bone/70 whitespace-pre-wrap break-words">{claim.verdict_rationale}</p>}
    </div>
    {claim.entities.length > 0 && <div className="flex flex-wrap gap-2 mt-4">{claim.entities.map((entity, i) => <span key={i} className="chip-brutal break-words max-w-full">{entity.text} · {entity.type}</span>)}</div>}
    <div className="flex flex-wrap gap-4 mt-5 text-xs"><a className={linkStyle} href={href('evidence', claim.id)}>Inspect evidence</a><a className={linkStyle} href={href('changes', claim.id)}>Compare wording</a></div>
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

function Changes({ edges, selected, articleId, title, source, release, against, comparisonBack }: { edges: ConnectionEdge[]; selected?: ArticleClaim; articleId: string; title: string; source?: string; release?: string; against?: string; comparisonBack: string }) {
  const [choice, setChoice] = useState(''), [otherClaim, chooseOtherClaim] = useState('');
  const comparisonArticle = useQuery({ queryKey: ['article-detail', against || '', release || ''], queryFn: ({ signal }) => articlesApi.detail(against!, { signal }, release), enabled: !!against, staleTime: 30_000 });
  const otherClaims = useQuery({ queryKey: ['comparison-source-claims', release, against], queryFn: ({ signal }) => articlesApi.claims(against!, 0, '', { signal }, release), enabled: !!against, staleTime: 30_000 });
  const olderClaim = otherClaims.data?.items.find(item => item.id === otherClaim);

  const candidates = edges.filter(e => e.relationship_type === 'EVOLVED_FROM' && (!selected || e.from_claim_id === selected.id || e.to_claim_id === selected.id));
  const edge = candidates.find(e => e.id === choice) || candidates[0];
  return <div className="space-y-5">
    {against && <section className={`${panel} space-y-4`} aria-label="Comparison source">
      <h3 className="font-display text-2xl">Compare reporting in context</h3>
      {comparisonArticle.isPending && <p role="status">Loading comparison source…</p>}
      {comparisonArticle.isError && <QueryError title="Comparison source unavailable" error={comparisonArticle.error} onRetry={() => comparisonArticle.refetch()} />}
      {comparisonArticle.data && <><p className="text-sm">{comparisonArticle.data.title} · {comparisonArticle.data.domain}</p><a className={linkStyle} href={articleHref(against, 'overview', { back: comparisonBack, release })}>Inspect comparison source</a></>}
      {otherClaims.isPending && <p role="status">Loading its saved statements…</p>}
      {otherClaims.isError && <QueryError title="Comparison statements unavailable" error={otherClaims.error} onRetry={() => otherClaims.refetch()} />}
      {!!otherClaims.data?.items.length && <><label htmlFor="comparison-source-statement" className="block text-sm">Passage from the comparison source</label><select id="comparison-source-statement" className="field-brutal w-full" value={otherClaim} onChange={e => chooseOtherClaim(e.target.value)}><option value="">Choose a saved statement</option>{otherClaims.data.items.map(item => <option key={item.id} value={item.id}>{item.text.slice(0, 160)}</option>)}</select><p className="text-xs text-hermes-bone/60">First {otherClaims.data.items.length} of {otherClaims.data.total} saved statements. Inspect the source for its full paginated analysis.</p></>}
      {otherClaims.data?.total === 0 && <p className="text-sm">No saved statements are available from this source. Paste an attributable passage below and check the original source.</p>}
      <p className="text-xs text-hermes-bone/65">Similarity proposes a comparison; it does not prove matching claims. Check dates and choose passages yourself. The labels “older” and “newer” are supplied comparison roles.</p>
    </section>}
    {candidates.length ? <div className={panel}><label htmlFor="version-pair" className="block text-xs mb-3">Recorded candidate version pair</label><select id="version-pair" className="field-brutal w-full" value={edge?.id || ''} onChange={event => setChoice(event.target.value)}>{candidates.map((e, i) => <option key={e.id} value={e.id}>Pair {i + 1}: {e.to_text.slice(0, 65)}</option>)}</select>
      {edge?.mutation_evidence && <details className="mt-4 text-xs"><summary className="cursor-pointer">Stored mutation evidence</summary><pre className="mt-3 whitespace-pre-wrap break-words">{JSON.stringify(edge.mutation_evidence, null, 2)}</pre></details>}
    </div> : <Empty>No candidate evolution links recorded for {selected ? 'this claim' : 'this article'}. You can still supply two texts for comparison.</Empty>}
    <MutationComparator key={`${articleId}:${selected?.id || ''}:${edge?.id || ''}:${otherClaim}`} initialOlder={olderClaim?.text || edge?.to_text || ''} initialNewer={edge?.from_text || selected?.text || ''} context={{ title, source, workspaceHref: comparisonBack, note: `Article ${articleId}${release ? ` · release ${release}` : ''}${selected ? ` · claim ${selected.id}` : ''}${edge ? ` · candidate link ${edge.id}` : ''}${against ? ` · comparison article ${against}${olderClaim ? ` · comparison claim ${olderClaim.id}` : ''}` : ''}. Supplied order is not observed transmission.` }} />
  </div>;
}

export function ArticleInvestigation({ route }: { route: NonNullable<ReturnType<typeof parseArticleRoute>> }) {
  const readOnly = useSession().user?.role === 'viewer';
  const runtime = usePublicationRuntime();
  const { id, tab, claim, back, offset } = route;
  const release = route.release || (runtime.mode === 'published' ? runtime.publication?.run_id || undefined : undefined);
  const archived = runtime.mode === 'published' || !!release;
  const tabsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (runtime.mode === 'published' && !route.release && release && isUuid(release) && route.valid) {
      navigateHash(articleHref(id, tab, { claim, back, offset, release, against: route.against }), true);
    }
  }, [runtime.mode, route.release, route.valid, route.against, release, id, tab, claim, back, offset]);
  const valid = route.valid && (!claim || isUuid(claim));
  const details = useQuery({ queryKey: ['article-detail', id, release || ''], queryFn: ({ signal }) => articlesApi.detail(id, { signal }, release), enabled: valid, staleTime: 30_000 });
  const claimTab = ['claims', 'evidence', 'changes'].includes(tab);
  const claims = useQuery({ queryKey: ['article-claims', id, offset, claim, release || ''], queryFn: ({ signal }) => articlesApi.claims(id, offset, claim, { signal }, release), enabled: valid && details.isSuccess && (claimTab || tab === 'overview'), staleTime: 30_000 });
  const connectionTab = ['related', 'changes', 'timeline', 'graph', 'methods'].includes(tab);
  const connections = useQuery({ queryKey: ['article-connections', id, release || ''], queryFn: ({ signal }) => articlesApi.connections(id, { signal }, release), enabled: valid && details.isSuccess && connectionTab, staleTime: 30_000 });
  const article = details.data;
  const selected = claims.data?.selected;
  const href = (next: DetailTab, selectedClaim = claim, nextOffset = offset) => articleHref(id, next, { claim: selectedClaim, back, offset: nextOffset, release, against: route.against });
  const relatedHref = (articleId: string) => articleHref(articleId, 'overview', { back: href(tab), release });
  const neighborhood = connections.data;
  const related = neighborhood?.articles.filter(a => a.id !== id) || [];
  const timeline = [...(neighborhood?.articles || [])].sort((a, b) => (a.published_at ? Date.parse(a.published_at) : Infinity) - (b.published_at ? Date.parse(b.published_at) : Infinity) || a.id.localeCompare(b.id));
  const source = safeHttpUrl(article?.url);
  return (
    <div className="space-y-6 min-w-0">
      <a href={back} className={`${linkStyle} text-xs inline-flex gap-2 items-center`}><ArrowLeft className="w-4 h-4" /> {back.startsWith('#/dashboard/browse') ? 'Back to results' : 'Back to investigation'}</a>
    {!valid ? <Empty>This article link is invalid. Return to the collection and open an article.</Empty> : <>
      {details.isPending && <p role="status">Loading article details…</p>}
      {details.isError && <QueryError title="Article details unavailable" error={details.error} onRetry={() => details.refetch()} />}
      {article && <>
        <section className="space-y-4 border-b border-hermes-bone/15 pb-7">
          <p className="text-[10px] uppercase tracking-widest text-hermes-red-bright">Collection / Article &amp; related topic{release ? ' · Saved map snapshot' : ''}</p>
          <h1 className="font-display text-4xl md:text-6xl max-w-6xl break-words leading-tight">{article.title}</h1>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-hermes-bone/65">
            <span>{article.domain || 'Source unknown'}</span>
            <span>{article.author || 'Author unknown'}</span>
            <span>Published {date(article.published_at)}</span>
          </div>
          <div className="flex gap-3 flex-wrap items-center pt-1">
            {source && (
              <a href={source} target="_blank" rel="noopener noreferrer" className="btn-outline-dark text-xs inline-flex items-center gap-2">
                <span>Read original source</span>
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
            <span className="chip-brutal">{(article.claims_total ?? 0).toLocaleString()} extracted claims</span>
            <span className="chip-brutal">NLP: {article.nlp_status || 'unknown'}</span>
          </div>
        </section>

        {tab === 'overview' && <p className="text-sm leading-relaxed text-hermes-bone/70">{article.claims_total > 0 ? `${article.claims_total} extracted statements are available to inspect.` : 'No extracted statements are saved for this article.'} Start with the source, then inspect the claims and their evidence.</p>}
        <nav ref={tabsRef} aria-label="Article details" className="flex flex-wrap items-start gap-1 border-b border-hermes-bone/15 pb-3"
          onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            const links = [...(tabsRef.current?.querySelectorAll<HTMLAnchorElement>('a') || [])].filter(link => !link.closest('details') || link.closest('details')?.open);
            const index = links.indexOf(document.activeElement as HTMLAnchorElement);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + links.length) % links.length;
            event.preventDefault(); links[next]?.focus();
          }}>
          {primaryTabs.map(key => <a key={key} href={href(key)} aria-current={tab === key ? 'page' : undefined} className="workspace-tab whitespace-nowrap shrink-0">{tabs[key].name}</a>)}
          <details key={primaryTabs.includes(tab) ? 'primary' : 'research'} open={!primaryTabs.includes(tab)} className="article-more-tabs">
            <summary>Investigate further</summary>
            <div className="flex flex-wrap gap-1 mt-2">{detailTabs.filter(key => !primaryTabs.includes(key)).map(key => <a key={key} href={href(key)} aria-current={tab === key ? 'page' : undefined} className="workspace-tab">{tabs[key].name}</a>)}</div>
          </details>
        </nav>

        <section aria-labelledby="detail-tab-heading" className="space-y-5">
          <div>
            <h2 id="detail-tab-heading" className="font-display text-3xl">{tabs[tab].name}</h2>
            <p className="text-sm text-hermes-bone/65 mt-2 max-w-4xl leading-relaxed">{tabs[tab].help}</p>
          </div>
            {tab === 'overview' && <>
              <div className="grid lg:grid-cols-[2fr_1fr] gap-5"><div className={panel}><FileText className="w-5 h-5 text-hermes-red-bright mb-4" /><h3 className="text-2xl mb-3">Inside this report</h3><p className="text-sm leading-loose whitespace-pre-wrap break-words">{article.body ? `${article.body.slice(0, 650)}${article.body.length > 650 ? '…' : ''}` : archived ? 'Full article text is not included in this published archive. Follow the original source above to read the report.' : 'No article text is stored for this item.'}</p><p className="text-xs text-hermes-bone/50 mt-4">{article.body ? 'Excerpt from stored text · completeness unknown; it may be a feed summary.' : 'Source metadata and saved statements remain available when recorded.'}</p><a href={href('article')} className="btn-outline-dark mt-5">{article.body ? 'Read available text' : 'Source text availability'} <ArrowRight className="w-3 h-3" /></a></div>
              <dl className={`${panel} space-y-4 text-sm`}>{[['Published', date(article.published_at)], ['Collected', date(article.collected_at)], ['Language', article.language || 'Unknown'], ['Text preparation', article.processing_status], ['Claim extraction', article.nlp_status || 'Unknown']].map(([label, value]) => <div key={label}><dt className="text-[10px] uppercase tracking-wider text-hermes-bone/50">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}</dl></div>
              <div className="grid sm:grid-cols-3 gap-4">{[['claims', 'Inspect the claims', `${article.claims_total} statements extracted from this article.`], ['related', 'Follow related coverage', 'Read similar reporting and inspect separately recorded links.'], ['timeline', 'Read the timeline', 'See publication dates within this neighborhood.']].map(([target, title, description]) => <a key={target} href={href(target as DetailTab)} className={panel}><h3 className="text-2xl mb-3">{title}</h3><p className="text-xs leading-relaxed text-hermes-bone/65">{description}</p></a>)}</div>
              <ArticleCoverage id={id} release={release} back={href(tab)} compact />
              <section aria-label="Saved article analysis" className={`${panel} space-y-5`}>
                <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-display text-2xl">Saved article analysis</h3><a href={href('claims')} className={`${linkStyle} text-xs`}>Open all saved claims</a></div>
                <p className="text-sm text-hermes-bone/70">{article.claims_total ? `${article.claims_total} extracted statements belong to this article. The labels below summarize saved assessments across all of them.` : 'This article has no saved extracted statements. Its metadata is available, but claim analysis has not been recorded here.'}</p>
                {article.assessment_counts && Object.keys(article.assessment_counts).length > 0 && <dl className="grid sm:grid-cols-2 gap-4">{Object.entries(article.assessment_counts).map(([label, count]) => <div key={label} className="border border-hermes-bone/15 p-4 min-w-0"><dt className="text-xs font-mono break-words text-hermes-bone/70">{label === 'UNASSESSED' ? 'No saved assessment' : label}</dt><dd className="font-display text-3xl mt-2">{count.toLocaleString()}</dd></div>)}</dl>}
                {!article.assessment_counts && article.claims_total > 0 && <p className="text-xs text-hermes-bone/60">Assessment totals are unavailable from this API version. Open the saved claims to inspect individual results.</p>}
                <p className="text-xs text-hermes-bone/55 leading-relaxed">These are stored model assessments, not a verified percentage of fake news. No new AI analysis runs when you open this page. Topic coverage uses document similarity; claim changes and recorded graphs require saved claim links.</p>
                {claims.isPending && <p role="status">Loading saved statement preview…</p>}
                {claims.isError && <QueryError title="Saved analysis preview unavailable" error={claims.error} onRetry={() => claims.refetch()} />}
                {claims.data && claims.data.total > 0 && <div className="space-y-4"><p className="text-xs text-hermes-bone/60">Preview: {Math.min(3, claims.data.items.length)} of {claims.data.total} statements. Open all saved claims for the complete paginated list.</p>{claims.data.items.slice(0, 3).map(c => <ClaimCard key={c.id} claim={c} href={href} />)}</div>}
                {article.claims_total === 0 && <p className="text-xs text-hermes-bone/65">{archived ? 'An approved developer must analyze this article locally and publish a complete release containing its results.' : 'An approved developer can check extraction jobs in the developer workspace.'} <a className={linkStyle} href="#/dashboard/browse">Browse another article</a>.</p>}
              </section>
            </>}
            {tab === 'article' && <div className={panel}><p className="text-xs text-hermes-bone/60 mb-6">Available text · {article.word_count ?? 'Unknown'} recorded words · completeness unknown</p>{article.body ? <div className="whitespace-pre-wrap break-words text-sm md:text-base leading-loose max-w-5xl">{article.body}</div> : <Empty>{archived ? 'Full article text is not included in this archive. Use the original source link above to read the report.' : 'No text was stored. Use the original source link if available.'}</Empty>}</div>}
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
                  {runtime.mode === 'local' && !release ? <ClaimCheck initialClaim={selected.text} /> : <p className="text-sm text-hermes-bone/65">New evidence checks run on the local analysis PC. This website shows saved assessments from the published release.</p>}
                </> : <Empty>Choose a claim above to inspect its assessment or request evidence. No analysis runs automatically.</Empty>)}
              </>}
            </>}
            {connectionTab && <>
              {connections.isPending && <p role="status">Loading recorded article relationships…</p>}
              {connections.isError && <QueryError title="Recorded relationships unavailable" error={connections.error} onRetry={() => connections.refetch()} />}
              {neighborhood?.truncated && <p role="status" className="text-xs text-amber-300">Showing the strongest {neighborhood.edges.length} of {neighborhood.total_edges} direct claim links. Related coverage, map and timeline are limited to these returned links.</p>}
            </>}
            {tab === 'related' && <><ArticleCoverage id={id} release={release} back={href(tab)} /><h3 className="font-display text-2xl">Recorded claim relationships</h3></>}
            {tab === 'related' && neighborhood && (related.length ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{related.map(a => <article key={a.id} className={panel}><p className="text-xs text-hermes-bone/55 mb-3">{a.domain || 'Source unknown'} · {date(a.published_at)}</p><h3 className="text-2xl mb-4">{a.title}</h3><p className="text-xs mb-5">{[...new Set(neighborhood.edges.filter(e => e.from_article_id === a.id || e.to_article_id === a.id).map(e => e.relationship_type))].join(' · ')}</p><a className="btn-outline-dark" href={relatedHref(a.id)}>Open details <ArrowRight className="w-3 h-3" /></a></article>)}</div> : <Empty>No cross-article coverage links are recorded for this item. This does not mean no other reporting exists.</Empty>)}
            {tab === 'timeline' && neighborhood && <ol className="border-l border-hermes-red-bright/50 ml-2 space-y-4">{timeline.map(a => <li key={a.id} className={`${panel} ml-5`}><p className="text-xs text-hermes-bone/55 flex flex-wrap gap-2"><Clock className="w-4 h-4" />{date(a.published_at)} · {a.domain || 'Source unknown'}{a.id === id ? ' · Selected article' : ''}</p><h3 className="text-2xl mt-3 mb-4">{a.title}</h3><a className={`${linkStyle} text-xs`} href={relatedHref(a.id)}>Open article details</a></li>)}</ol>}
            {tab === 'graph' && neighborhood && <><FocusedGraph data={neighborhood} href={relatedHref} />{neighborhood.edges.length === 0 && <Empty>No stored claim links are available for this article.</Empty>}<div className="space-y-3" aria-label="Exact claim relationships">{neighborhood.edges.map(edge => <article key={edge.id} className={panel}><p className="text-xs text-hermes-red-bright mb-3">{edge.relationship_type} · matching signal {edge.score.toFixed(3)}{edge.from_article_id === edge.to_article_id ? ' · Within one article' : ''}</p><div className="grid md:grid-cols-2 gap-4 text-sm leading-relaxed"><a className={linkStyle} href={articleHref(edge.from_article_id, 'claims', { claim: edge.from_claim_id, back: href(tab), release })}>{edge.from_text}</a><a className={linkStyle} href={articleHref(edge.to_article_id, 'claims', { claim: edge.to_claim_id, back: href(tab), release })}>{edge.to_text}</a></div></article>)}</div></>}
            {tab === 'methods' && <><dl className={`${panel} grid sm:grid-cols-2 gap-5 text-xs`}>{[['Article ID', article.id], ['Text field', article.body_source], ['Text completeness', article.content_completeness], ['Collected at', date(article.collected_at)], ['Processed at', date(article.processed_at)], ['Relationship basis', neighborhood?.basis || 'Unavailable'], ['Model/run revision', 'Not recorded in this article response'], ['Public release provenance', archived ? release || 'Publication details unavailable' : 'Not available; this response is from the current database']].map(([label, value]) => <div key={label}><dt className="text-hermes-bone/50 uppercase tracking-wider mb-2">{label}</dt><dd className="break-words">{value}</dd></div>)}</dl><p className="text-sm text-hermes-bone/65">An article is a source document, and a claim is extracted text. Similarity, publication order and inferred evolution are research signals. They do not establish truth, independence or observed propagation.</p></>}
          </section>
          {claims.data && (neighborhood || connections.isError) && <div hidden={tab !== 'changes'}><Changes key={`${id}:${claim}:${route.against || ''}`} edges={neighborhood?.edges || []} selected={selected || undefined} articleId={id} title={article.title} source={source || undefined} release={release} against={route.against} comparisonBack={href('changes')} /></div>}
          {!readOnly && <footer className="border-t border-hermes-bone/15 pt-5 flex flex-wrap gap-5 text-xs"><a href="#/dashboard/tools" className="underline underline-offset-4">All tools &amp; guides</a>{runtime.mode !== 'published' && <a href="#/dashboard/timeline" className="underline underline-offset-4" onClick={() => setSelectedArticle({ id, title: article.title, domain: article.domain })}>Open this article in the story timeline</a>}</footer>}
          <footer className="text-xs leading-relaxed text-hermes-bone/55 border-t border-hermes-bone/15 pt-5"><Search className="inline w-3 h-3 mr-2" />This page shows one article and its recorded neighborhood, not an exhaustive topic or web search. Missing data remains unknown.</footer>
        </>}
      </>}
    </div>
  );
}
