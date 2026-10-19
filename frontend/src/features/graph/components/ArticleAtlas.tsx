import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Layers3, Maximize2, Search, X } from 'lucide-react';
import { loadArticleMap } from '../../../shared/api/articleMap';
import { loadCityNetwork } from '../../../shared/api/cityNetwork';
import { graphApi } from '../../../shared/api/graph';
import { articleHref } from '../../../shared/navigation/articleRoutes';
import { QueryError } from '../../../shared/ui/QueryError';
import { buildCityScene, parseCityView, type CityEdge } from '../lib/cityScene';
import { CityNetworkCanvas, type CityCanvasHandle } from './CityNetworkCanvas';
import './city.css';

export default function ArticleAtlas() {
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const [topic, setTopic] = useState(params.get('topic') || ''), [query, setQuery] = useState(params.get('q') || '');
  const [search, setSearch] = useState(query), [selected, select] = useState<string | null>(params.get('node'));
  const [selectedEdge, selectEdge] = useState<string | null>(params.get('route')), [theme, setTheme] = useState(params.get('theme') || '');
  const [initialView] = useState(() => parseCityView(params.get('view'))), [view, setView] = useState(initialView);
  const [page, setPage] = useState(0), [progress, setProgress] = useState([0, 0]), [exploring, setExploring] = useState(false);
  const [showRecorded, setRecorded] = useState(params.get('recorded') === '1'), [streets, setStreets] = useState<'auto' | 'all' | 'off'>(params.get('streets') === 'all' ? 'all' : params.get('streets') === 'off' ? 'off' : 'auto'), [uniform, setUniform] = useState(params.get('size') === 'uniform');
  const [pinnedRelease, pinRelease] = useState<string | null>(params.get('release')), [screenError, setScreenError] = useState('');
  const root = useRef<HTMLElement>(null), canvas = useRef<CityCanvasHandle>(null), queryClient = useQueryClient();
  const request = useQuery({ queryKey: ['complete-article-map', pinnedRelease], queryFn: ({ signal }) => loadArticleMap(signal, (n, total) => setProgress([n, total]), pinnedRelease), staleTime: 300000, retry: false });
  const summary = request.data?.summary, records = request.data?.articles, release = request.data?.run_id;
  const network = useQuery({ queryKey: ['complete-city-network', release], queryFn: async ({ signal }) => {
    const candidate = await loadCityNetwork(release!, signal);
    buildCityScene(records!, summary!, candidate);
    return candidate;
  }, enabled: request.data?.available === true && !!release, retry: false, staleTime: 300000 });
  const links = useQuery({ queryKey: ['atlas-recorded-links', release], queryFn: ({ signal }) => graphApi.full({ signal }), enabled: showRecorded && request.data?.available === true, retry: false, staleTime: 300000 });
  const fullScene = useMemo(() => {
    if (!records || !summary) return null;
    const result = buildCityScene(records, summary, network.data);
    if (showRecorded && links.data && links.data.run_id === release) result.edges.push(...links.data.edges.map(e => ({ id: `recorded:${e.id || [e.src, e.dst, e.relationship_type].join(':')}`, a: e.src, b: e.dst, kind: 'recorded' as const, value: e.score || 0, score: e.score ?? undefined, directed: e.directed, recorded: e })));
    return result;
  }, [records, summary, network.data, showRecorded, links.data, release]);
  const filtered = useMemo(() => {
    const themeTopics = new Set(network.data?.summary?.themes.find(t => t.id === theme)?.topics || []);
    return (records || []).filter(a => (!theme || themeTopics.has(a.topic_id || '')) && (!topic || (topic === '__unclassified' ? !a.topic_id : a.topic_id === topic)) && (!query || a.title.toLowerCase().includes(query.toLowerCase())));
  }, [records, theme, network.data, topic, query]);
  const scene = useMemo(() => {
    if (!fullScene) return null;
    const ids = new Set(filtered.map(a => a.id)), topicIds = new Set(filtered.map(a => a.topic_id));
    const nodes = fullScene.nodes.filter(n => n.kind === 'article' ? ids.has(n.id) : n.kind === 'topic' ? topicIds.has(n.id) : network.data?.summary?.themes.find(t => t.id === n.id)?.topics.some(t => topicIds.has(t)));
    const shownIds = new Set(nodes.map(n => n.id));
    return { ...fullScene, nodes, unsupported: fullScene.unsupported.filter(a => ids.has(a.id)), edges: fullScene.edges.filter(e => shownIds.has(e.a) && shownIds.has(e.b)) };
  }, [fullScene, filtered, network.data]);
  const chosen = records?.find(a => a.id === selected), hub = fullScene?.nodes.find(n => n.id === selected && n.kind !== 'article');
  const edge = scene?.edges.find(e => e.id === selectedEdge), topics = useMemo(() => new Map(summary?.topics.map(t => [t.id, t]) || []), [summary]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 12) - 1));
  const backParams = new URLSearchParams();
  if (release || pinnedRelease) backParams.set('release', release || pinnedRelease!);
  if (topic) backParams.set('topic', topic); if (query) backParams.set('q', query); if (selected) backParams.set('node', selected);
  if (theme) backParams.set('theme', theme); if (selectedEdge) backParams.set('route', selectedEdge);
  if (showRecorded) backParams.set('recorded', '1'); if (streets !== 'auto') backParams.set('streets', streets); if (uniform) backParams.set('size', 'uniform');
  if (view) backParams.set('view', [view.x.toFixed(3), view.y.toFixed(3), view.zoom.toFixed(4)].join(','));
  const back = `#/dashboard/atlas${backParams.size ? '?' + backParams : ''}`;
  useEffect(() => { if (window.location.hash.split('?')[0] === '#/dashboard/atlas') window.history.replaceState(null, '', back); }, [back]);
  useEffect(() => { if (selected || selectedEdge) root.current?.querySelector<HTMLElement>('.city-inspector')?.focus(); }, [selected, selectedEdge, request.data?.available, network.data?.available]);
  useEffect(() => { const handler = () => { setView(null); requestAnimationFrame(() => canvas.current?.fit()); }; document.addEventListener('fullscreenchange', handler); return () => document.removeEventListener('fullscreenchange', handler); }, []);
  useEffect(() => { const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { select(null); selectEdge(null); setExploring(false); } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, []);
  const reset = () => { setTopic(''); setTheme(''); setQuery(''); setSearch(''); setPage(0); select(null); selectEdge(null); setView(null); requestAnimationFrame(() => canvas.current?.fit()); };
  const latest = () => { reset(); pinRelease(null); void queryClient.invalidateQueries({ queryKey: ['complete-article-map', null] }); };
  const pick = (id: string | null) => { select(id); selectEdge(null); setExploring(false); };
  const pickEdge = (id: string) => { select(null); selectEdge(id); };
  const closeInspector = () => { pick(null); selectEdge(null); root.current?.querySelector<HTMLElement>('.city-canvas')?.focus({ preventScroll: true }); };
  const fullscreenMap = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else if (root.current?.requestFullscreen) await root.current.requestFullscreen(); else setScreenError('Fullscreen is unavailable in this browser. The map uses the available width.'); }
    catch { setScreenError('Fullscreen could not open. You can continue using the map here.'); }
  };
  const support = useMemo(() => {
    if (!edge || !scene) return [];
    if (edge.kind === 'street' || edge.kind === 'recorded') return [edge];
    const topicIds = (id: string) => edge.kind === 'highway' ? new Set([id]) : new Set(network.data?.summary?.themes.find(t => t.id === id)?.topics || []);
    const a = topicIds(edge.a), b = topicIds(edge.b), recordTopics = new Map(records?.map(r => [r.id, r.topic_id]));
    const highways = new Set(network.data?.summary?.highways.map(h => [h.a, h.b].sort().join('|')));
    return scene.edges.filter(e => {
      if (e.kind !== 'street') return false;
      const left = recordTopics.get(e.a) || '', right = recordTopics.get(e.b) || '';
      return ((a.has(left) && b.has(right)) || (b.has(left) && a.has(right))) &&
        (edge.kind !== 'superway' || highways.has([left, right].sort().join('|')));
    });
  }, [edge, scene, network.data, records]);
  const routeLabel = (e: CityEdge) => `${e.kind === 'recorded' ? 'Recorded ' + (e.recorded?.relationship_type || 'relationship') : e.kind === 'street' ? 'Article similarity' : e.kind === 'highway' ? 'Topic highway' : 'Theme superway'} · ${e.kind === 'street' ? e.score?.toFixed(3) : e.kind === 'recorded' ? 'saved evidence' : `${e.value} supporting pairs`}`;
  const title = (id: string) => fullScene?.nodes.find(n => n.id === id)?.label || records?.find(a => a.id === id)?.title || id;
  const downloadFigure = () => {
    const surface = root.current?.querySelector('canvas'); if (!surface) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), output = document.createElement('canvas');
    output.width = surface.width; output.height = surface.height + 142 * dpr;
    const ctx = output.getContext('2d'); if (!ctx) return;
    ctx.drawImage(surface, 0, 0); ctx.fillStyle = '#1a0608'; ctx.fillRect(0, surface.height, output.width, 142 * dpr);
    ctx.fillStyle = '#fff7f2'; ctx.font = `${10 * dpr}px "Courier Prime", monospace`;
    const lines = [
      `GMEE collection city · ${filtered.length.toLocaleString()} of ${records?.length.toLocaleString()} articles in view`,
      'Circles: articles · squares: topics · larger hubs: themes · wider routes: aggregate support',
      'Article size: retained neighbors · hub size: articles · area is log-compressed and capped',
      `Release ${release}`,
      `Similarity is exploratory, not verified spread · ${network.data?.summary ? 'minimum cosine ' + network.data.summary.min_similarity : 'no semantic streets published'}`,
      `Filters: ${topic || 'all topics'} · ${query || 'all titles'} · at most 3,000 visible routes drawn`,
    ];
    lines.forEach((line, i) => ctx.fillText(line, 16 * dpr, surface.height + (22 + i * 20) * dpr, output.width - 32 * dpr));
    const link = document.createElement('a'); link.download = `gmee-city-${release}.png`; link.href = output.toDataURL('image/png'); link.click();
  };

  return <section ref={root} className="city-workspace" aria-label="Complete collection map">
    <header className="city-page-header"><div><p className="city-eyebrow">The whole collection</p><h1 className="font-display">Your collection, connected.</h1><p className="city-intro">Explore articles, their neighborhoods, and the links between them.</p></div><a href="#/dashboard/fullgraph" className="city-text-link">Recorded connections <ArrowUpRight size={15} /></a></header>
    {request.isPending && <p className="city-notice" role="status">Loading the complete map… {progress[0].toLocaleString()} of {progress[1] ? progress[1].toLocaleString() : 'unknown'} records. Every article page is verified before drawing.</p>}
    {request.isError && <QueryError title="Collection map unavailable" error={request.error} onRetry={() => request.refetch()} retrying={request.isFetching} />}
    {request.data && !request.data.available && <div className="city-notice"><h2 className="font-display text-2xl">Article topics have not been published yet.</h2><p>{request.data.reason}</p><a href="#/dashboard/browse" className="underline">Browse source articles</a></div>}
    {summary && request.data?.available && scene && fullScene && <>
      <div className="city-scope-strip"><p>Complete collection loaded: {records?.length.toLocaleString()} of {summary.total_articles.toLocaleString()} articles · {summary.topics.length} topic groups · {summary.unclassified.toLocaleString()} unclassified.</p><span>{network.data?.available ? `${network.data.roads.length.toLocaleString()} semantic streets · exploratory similarity` : network.isFetching ? 'Loading street network…' : 'Article atlas'}</span></div>
      <div className="city-toolbar"><form onSubmit={e => { e.preventDefault(); setQuery(search.trim()); setPage(0); pick(null); }}><Search size={16} /><input aria-label="Search all mapped articles" placeholder="Find an article title…" value={search} onChange={e => setSearch(e.target.value)} /><button type="submit" className="city-button">Search map</button></form><button className="city-button city-explore-toggle" aria-expanded={exploring} onClick={() => setExploring(v => !v)}><Layers3 size={15} />Explore & layers</button><button className="city-icon-button" aria-label="Toggle fullscreen map" onClick={() => void fullscreenMap()}><Maximize2 size={18} /></button></div>
      {screenError && <p className="city-notice" role="status">{screenError}</p>}
      <div className={`city-body ${exploring ? 'city-exploring' : ''}`}>
        <aside className="city-explorer" aria-label="Explore the collection">
          <div className="city-panel-heading"><h2>Explore the city</h2><button className="city-mobile-close city-icon-button" aria-label="Close exploration controls" onClick={() => setExploring(false)}><X size={16} /></button></div>
          <label>Topic group<select aria-label="Topic group" value={topic} onChange={e => { setTopic(e.target.value); setTheme(''); setPage(0); pick(null); if (e.target.value !== '__unclassified') canvas.current?.focus(e.target.value); }}><option value="">All topic groups</option><option value="__unclassified">Unclassified ({summary.unclassified})</option>{summary.topics.map(t => <option value={t.id} key={t.id}>{t.label} ({t.article_count})</option>)}</select></label>
          {!!network.data?.summary?.themes.some(t => t.topics.length > 1) && <label>Broader theme<select aria-label="Theme group" value={theme} onChange={e => { setTheme(e.target.value); setTopic(''); pick(e.target.value || null); canvas.current?.focus(e.target.value); }}><option value="">All themes</option>{network.data.summary.themes.filter(t => t.topics.length > 1).map(t => <option value={t.id} key={t.id}>{t.label} ({t.article_count})</option>)}</select></label>}
          <div className="city-control-group"><h3>Map layers</h3><label>Article streets<select aria-label="Article street visibility" value={streets} onChange={e => setStreets(e.target.value as typeof streets)}><option value="auto">Automatic with zoom</option><option value="all">Show streets at every zoom</option><option value="off">Hide article streets</option></select></label><label className="city-check"><input type="checkbox" checked={showRecorded} onChange={e => setRecorded(e.target.checked)} />Recorded relationships</label><label className="city-check"><input type="checkbox" checked={uniform} onChange={e => setUniform(e.target.checked)} />Uniform article sizes</label><p>Larger articles have more retained similarity neighbors. Larger hubs contain more articles.</p></div>
          <div className="city-control-group"><h3>Find an article</h3><label>Keyboard article picker<select aria-label="Select mapped article" value={chosen?.id || ''} onChange={e => { pick(e.target.value || null); canvas.current?.focus(e.target.value); }}><option value="">Choose an article…</option>{chosen && !filtered.slice(0, 200).some(a => a.id === chosen.id) && <option value={chosen.id}>{chosen.title}</option>}{filtered.slice(0, 200).map(a => <option value={a.id} key={a.id}>{a.title}</option>)}</select></label><p>First 200 matches. Search or use the article list below for more.</p></div>
          <button className="city-button w-full" onClick={reset}>Clear map filters</button><button className="city-subtle-button" onClick={latest} disabled={request.isFetching}>Refresh complete map</button>
        </aside>
        <div className="city-stage">
          {filtered.length ? <CityNetworkCanvas key={release} ref={canvas} scene={scene} scaleScene={fullScene} selected={selected} selectedEdge={selectedEdge} streets={streets} uniform={uniform} initialView={initialView} onView={setView} onSelect={pick} onRoute={pickEdge} /> : <div className="city-empty"><h2>No articles match these map filters.</h2><button className="city-button" onClick={reset}>Show complete collection</button></div>}
          {(chosen || hub || edge) && <aside role="region" tabIndex={-1} className="city-inspector" aria-label={chosen ? 'Selected mapped article' : edge ? 'Selected map connection' : 'Selected neighborhood'}>
            <button className="city-inspector-close city-icon-button" aria-label="Close map inspector" onClick={closeInspector}><X size={17} /></button>
            {chosen && <><p className="city-eyebrow">Source article</p><h2>{chosen.title}</h2><p>{chosen.domain}</p><dl><dt>Topic</dt><dd>{chosen.topic_id ? topics.get(chosen.topic_id)?.label : 'Unclassified'}</dd><dt>Model input</dt><dd>{chosen.basis.replace(/_/g, ' ')}</dd><dt>Retained neighbors</dt><dd>{fullScene.degree.get(chosen.id) || 0}</dd></dl><a className="city-button" href={articleHref(chosen.id, 'overview', { back })}>Open article details <ArrowUpRight size={14} /></a><h3>Connected articles</h3><div className="city-neighbor-list">{fullScene.edges.filter(e => (e.kind === 'street' || e.kind === 'recorded') && (e.a === chosen.id || e.b === chosen.id)).map(e => <button key={e.id} onClick={() => pickEdge(e.id)}>{title(e.a === chosen.id ? e.b : e.a)}<small>{routeLabel(e)}</small></button>)}</div>{!fullScene.degree.get(chosen.id) && <p>No qualifying semantic streets are retained for this article. This does not prove it is unrelated to other reporting.</p>}</>}
            {hub && <><p className="city-eyebrow">Machine-generated {hub.kind}</p><h2>{hub.label}</h2><p>{hub.value.toLocaleString()} member articles · navigation hub</p><button className="city-button" onClick={() => { if (hub.kind === 'topic') { setTopic(hub.id); setTheme(''); } else { setTheme(hub.id); setTopic(''); } canvas.current?.focus(hub.id); }}>Explore this neighborhood</button><p>Topic membership is approximate. This hub is a summary, not an additional source article or verified event.</p></>}
            {edge && <><p className="city-eyebrow">Why this route exists</p><h2>{routeLabel(edge)}</h2><p>{title(edge.a)} ↔ {title(edge.b)}</p><p>{edge.kind === 'recorded' ? 'An existing saved relationship. Its direction is not observed transmission.' : 'Computed from document embeddings. Similarity does not establish truth, copying or observed transmission.'}</p>{edge.recorded && <p>{edge.recorded.support_count || 1} underlying claim record(s) · score family: {edge.recorded.score_family || 'not supplied'}. Scores are not probabilities of truth.</p>}<h3>Supporting source pairs</h3><p>{support.length.toLocaleString()} matching pairs in this filtered view. Showing the first 20.</p>{support.slice(0, 20).map(s => <div className="city-support-pair" key={s.id}>{[s.a, s.b].map(id => <button key={id} onClick={() => { pick(id); canvas.current?.focus(id); }}>{title(id)}</button>)}<small>{s.kind === 'recorded' ? 'Recorded score' : 'Cosine similarity'} {s.score?.toFixed(3) ?? 'not supplied'}</small></div>)}</>}
          </aside>}
        </div>
      </div>
      <div className="city-legend" aria-label="Map legend"><span><i className="city-symbol-article" />Article · connections</span><span><i className="city-symbol-topic" />Topic hub · articles</span><span><i className="city-symbol-theme" />Theme hub · articles</span><span><i className="city-line-street" />Street · similarity</span><span><i className="city-line-highway" />Highway · pair support</span><span><i className="city-line-superway" />Superway · aggregate support</span></div>
      <div className="city-view-status"><p aria-live="polite">Showing {filtered.length.toLocaleString()} articles. {scene.unsupported.length} without a semantic projection remain in a separate inset; inset spacing has no meaning.</p><button className="city-subtle-button" onClick={downloadFigure}>Save map image</button></div>
      {network.isError && <p className="city-notice" role="status">Semantic streets could not be verified. Article positions remain available. <button className="underline" onClick={() => void network.refetch()}>Retry road loading</button></p>}
      {network.data && !network.data.available && <p className="city-notice">{network.data.reason} You can enable the recorded-relationship layer.</p>}
      {showRecorded && <p className="city-notice" role="status">{links.isFetching ? 'Loading recorded relationships…' : links.isError ? 'Recorded relationships unavailable.' : links.data?.run_id !== release ? 'Recorded release differs from this map; links are hidden.' : `${scene.edges.filter(e => e.kind === 'recorded').length} recorded article groups in this view, from a bounded projection.`}</p>}
      <details className="city-methods"><summary>Data, methods & how to read this map</summary><div><p>Input coverage: {summary.coverage.stored_text || 0} stored-text records · {summary.coverage.title_only || 0} title-only · {summary.coverage.unsupported_language || 0} unsupported language. Stored text may be a snippet. Titles alone cannot establish shared claims or misinformation.</p><p>Positions are an approximate UMAP projection. Topics are machine-generated. Streets use original document embeddings, not screen distance. Hubs are synthetic navigation objects. Larger never means more trustworthy.</p><p>Semantic roads are exploratory and not human-validated. {network.data?.summary && <>Mutual top-{network.data.summary.neighbor_k} neighbors · minimum cosine {network.data.summary.min_similarity}. Highways require at least {network.data.summary.min_highway_support} distinct pairs and {network.data.summary.min_highway_endpoints} endpoints on each side.</>}</p><p>Sizes use release-wide scales; filtering does not change them. Area is log-compressed and capped at the 95th percentile; exact values appear in inspectors. Overview symbols simplify sizes. At most 3,000 visible routes are drawn at once; selected routes are prioritized. Loading, filters and zoom can hide additional links.</p><p className="break-all">Release {release} · map completed {new Date(summary.completed_at).toLocaleString()} · {summary.embedding_model} at {summary.embedding_revision}</p><p>Saved map links keep this exact release. Refresh complete map selects the latest publication. A line crossing is not a junction; a graph path is not observed information spread.</p></div></details>
      <details className="city-records"><summary>Browse article & route lists · keyboard alternative</summary><div className="city-records-grid">{filtered.slice(currentPage * 12, currentPage * 12 + 12).map(a => <article key={a.id}><small>{a.domain} · {a.topic_id ? topics.get(a.topic_id)?.label : 'Unclassified'}</small><button onClick={() => { pick(a.id); canvas.current?.focus(a.id); }}>{a.title}</button><a href={articleHref(a.id, 'overview', { back })}>Open article details</a></article>)}</div><div className="city-list-pagination"><button className="city-button" disabled={currentPage === 0} onClick={() => setPage(p => p - 1)}>Previous articles</button><span>{filtered.length ? currentPage * 12 + 1 : 0}–{Math.min((currentPage + 1) * 12, filtered.length)} of {filtered.length}</span><button className="city-button" disabled={(currentPage + 1) * 12 >= filtered.length} onClick={() => setPage(p => p + 1)}>Next articles</button></div><label>Inspect a route<select aria-label="Select map connection" value={selectedEdge || ''} onChange={e => pickEdge(e.target.value)}><option value="">Choose a route…</option>{scene.edges.filter(e => e.kind !== 'street' || selected === e.a || selected === e.b).slice(0, 300).map(e => <option value={e.id} key={e.id}>{routeLabel(e)} · {title(e.a).slice(0, 32)} ↔ {title(e.b).slice(0, 32)}</option>)}</select></label><p>Major routes and the selected article's streets appear here. Select an article to inspect its neighbors.</p></details>
    </>}
  </section>;
}
