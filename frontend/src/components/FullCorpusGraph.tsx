import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, ExternalLink, Layers, Maximize2, Minus, Network, Orbit, Plus, Search, X, Zap } from 'lucide-react';
import { graphApi, type FullGraph } from '../api/graph';
import { setSelectedArticle } from '../lib/useSelectedArticle';
import type { TabType } from './Header';
import { usePollingPolicy } from '../lib/polling';
import { safeHttpUrl } from '../lib/urls';
import { QueryError } from './QueryError';
import { articleScene, filterGraph, fitScene, groupOutlets, outletColor, outletName, type GraphPoint } from '../lib/corpusGraph';

const EMPTY_GRAPH: FullGraph = { nodes: [], edges: [], counts: { nodes: 0, edges: 0 } };
const controlClass = 'inline-flex items-center justify-center gap-2 px-3 py-2 text-xs text-hermes-bone/70 hover:bg-white/5 hover:text-hermes-bone focus-visible:outline-offset-[-3px]';

/** The original connected corpus: one real article or claim per node. */
const FullCorpusGraph: React.FC<{ setActiveTab?: (tab: TabType) => void }> = ({ setActiveTab }) => {
  const [mode, setMode] = useState<'articles' | 'claims'>('articles');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [outletFilter, setOutletFilter] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [showConnections, setShowConnections] = useState(true);
  const [hovered, setHovered] = useState<GraphPoint | null>(null);
  const [renderVersion, setRenderVersion] = useState(0);
  const [zoom, setZoom] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef({ ox: 0, oy: 0, scale: 1 });
  const baseScaleRef = useRef(1);
  const dragRef = useRef<{ node: GraphPoint | null; x: number; y: number; startX: number; startY: number; moved: boolean } | null>(null);
  const polling = usePollingPolicy(60000);
  const g = useQuery({
    queryKey: ['full-graph', mode],
    queryFn: ({ signal }) => mode === 'articles' ? graphApi.full({ signal }) : graphApi.claims({ signal }),
    ...polling,
    staleTime: 30000,
  });
  const graph = g.data ?? EMPTY_GRAPH;
  const hasFilters = !!outletFilter || !!query;
  const groups = useMemo(() => groupOutlets(graph), [graph]);
  const filtered = useMemo(() => filterGraph(graph, outletFilter, query), [graph, outletFilter, query]);
  const scene = useMemo(() => articleScene(filtered), [filtered]);
  const nodeOptions = useMemo(() => filtered.nodes.map((node) => <option key={node.id} value={node.id}>{node.title}</option>), [filtered]);
  const index = useMemo(() => new Map(scene.nodes.map((node) => [node.id, node])), [scene]);
  const degrees = useMemo(() => {
    const result = new Map<string, number>();
    for (const edge of scene.edges) {
      result.set(edge.a, (result.get(edge.a) ?? 0) + 1);
      result.set(edge.b, (result.get(edge.b) ?? 0) + 1);
    }
    return result;
  }, [scene]);
  const selected = graph.nodes.find((node) => node.id === selectedId) ?? null;
  const focusedId = hovered?.id ?? selected?.id ?? null;
  const neighbors = useMemo(() => {
    const ids = new Set<string>();
    if (focusedId) {
      ids.add(focusedId);
      for (const edge of scene.edges) {
        if (edge.a === focusedId) ids.add(edge.b);
        if (edge.b === focusedId) ids.add(edge.a);
      }
    }
    return ids;
  }, [scene, focusedId]);
  const redraw = useCallback(() => setRenderVersion((value) => value + 1), []);
  const resetView = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    viewRef.current = fitScene(scene.nodes, wrap.clientWidth, wrap.clientHeight, false);
    baseScaleRef.current = viewRef.current.scale;
    setZoom(100);
    redraw();
  }, [scene, redraw]);

  useEffect(() => {
    setHovered(null);
    dragRef.current = null;
    resetView();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resetView) : null;
    if (wrapRef.current) observer?.observe(wrapRef.current);
    return () => observer?.disconnect();
  }, [resetView]);

  // Draw on changes only. A resting graph does no animation or physics work.
  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = wrap.clientWidth, height = wrap.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr; canvas.height = height * dpr;
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const { ox, oy, scale } = viewRef.current;
    const screenPoint = (node: GraphPoint) => ({ x: width / 2 + ox + node.x * scale, y: height / 2 + oy + node.y * scale });

    // Keep every real edge, with low-contrast strokes for dense networks.
    // Inspection brings the selected node and its direct neighbors forward.
    const edgeOpacity = Math.max(0.035, Math.min(0.22, 12 / Math.sqrt(scene.edges.length || 1)));
    for (const edge of scene.edges) {
      const hot = edge.a === focusedId || edge.b === focusedId;
      if (!hot && !showConnections) continue;
      const a = index.get(edge.a), b = index.get(edge.b);
      if (!a || !b) continue;
      const p = screenPoint(a), q = screenPoint(b);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
      ctx.strokeStyle = hot ? outletColor(a.domain) : '#B7A6A0';
      const density = Math.sqrt(Math.max(1, Math.min(degrees.get(edge.a) ?? 1, degrees.get(edge.b) ?? 1)));
      ctx.globalAlpha = hot ? 0.8 : (focusedId ? 0.015 : edgeOpacity) / density;
      ctx.lineWidth = hot ? 1.4 : 0.65;
      ctx.stroke();
    }
    const term = query.toLowerCase();
    for (const node of scene.nodes) {
      const p = screenPoint(node);
      if (p.x < -120 || p.x > width + 120 || p.y < -80 || p.y > height + 80) continue;
      const focus = node.id === focusedId;
      const related = neighbors.has(node.id);
      const match = !!term && node.title.toLowerCase().includes(term);
      const radius = Math.max(focus ? 4 : 1.25, node.radius * Math.min(scale, 2));
      const color = outletColor(node.domain);
      ctx.globalAlpha = focusedId && !related ? 0.16 : 0.92;
      ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      if (focus || match || node.id === selectedId) {
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = focus ? '#FFF7F2' : color; ctx.lineWidth = 1; ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }, [scene, index, degrees, focusedId, neighbors, selectedId, query, showConnections, renderVersion, g.isLoading, g.isError]);

  const zoomAt = useCallback((factor: number, mx?: number, my?: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const view = viewRef.current;
    const next = Math.max(baseScaleRef.current * 0.5, Math.min(baseScaleRef.current * 8, view.scale * factor));
    const x = (mx ?? wrap.clientWidth / 2) - wrap.clientWidth / 2;
    const y = (my ?? wrap.clientHeight / 2) - wrap.clientHeight / 2;
    view.ox = x - (x - view.ox) * next / view.scale;
    view.oy = y - (y - view.oy) * next / view.scale;
    view.scale = next;
    setZoom(Math.round(next / baseScaleRef.current * 100));
    redraw();
  }, [redraw]);
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = wrap.getBoundingClientRect();
      zoomAt(Math.exp(-event.deltaY * 0.002), event.clientX - rect.left, event.clientY - rect.top);
    };
    wrap.addEventListener('wheel', wheel, { passive: false });
    return () => wrap.removeEventListener('wheel', wheel);
  }, [zoomAt]);

  const pickNode = (mx: number, my: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return null;
    const { ox, oy, scale } = viewRef.current;
    let picked: GraphPoint | null = null, closest = Infinity;
    for (const node of scene.nodes) {
      const dx = mx - (wrap.clientWidth / 2 + ox + node.x * scale);
      const dy = my - (wrap.clientHeight / 2 + oy + node.y * scale);
      const distance = dx * dx + dy * dy;
      const radius = Math.max(7, node.radius * Math.min(scale, 2) + 3);
      if (distance < radius * radius && distance < closest) { picked = node; closest = distance; }
    }
    return picked;
  };
  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const openOutlet = (id: string) => { setOutletFilter(id); setSelectedId(null); setHovered(null); };
  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    const { x, y } = pointFromEvent(event);
    dragRef.current = { node: pickNode(x, y), x, y, startX: x, startY: y, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = pointFromEvent(event), drag = dragRef.current;
    if (drag) {
      if (Math.hypot(x - drag.startX, y - drag.startY) > 4) drag.moved = true;
      if (drag.moved) {
        if (drag.node) {
          drag.node.x += (x - drag.x) / viewRef.current.scale;
          drag.node.y += (y - drag.y) / viewRef.current.scale;
        } else { viewRef.current.ox += x - drag.x; viewRef.current.oy += y - drag.y; }
        drag.x = x; drag.y = y; setHovered(null); redraw();
      }
    } else {
      const node = pickNode(x, y);
      if (node?.id !== hovered?.id) setHovered(node);
    }
  };
  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!drag || drag.moved) return;
    setSelectedId(drag.node?.id ?? null);
  };
  const clearFilters = () => { setOutletFilter(''); setQuery(''); setSearch(''); setSelectedId(null); };
  const changeMode = (next: 'articles' | 'claims') => { setMode(next); clearFilters(); };
  const inspectNode = (id: string) => {
    const node = graph.nodes.find((item) => item.id === id);
    setSelectedId(node?.id ?? null);
  };
  const timelineArticleId = selected?.article_id || (mode === 'articles' ? selected?.id : undefined);
  const focusGroup = groups.outlets.find((outlet) => outlet.id === outletFilter);

  return (
    <section className="card-brutal-dark overflow-hidden" aria-label="Whole-Corpus Graph">
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5 sm:px-6">
        <div>
          <div className="flex items-center gap-2.5"><Network className="h-5 w-5 text-hermes-bone/55" /><h2 className="text-2xl font-display">Whole-Corpus Graph</h2></div>
          <p className="mt-1.5 text-xs text-hermes-bone/55">Explore the original article and claim network. Follow the connections between stories.</p>
        </div>
        <div className="flex border border-hermes-bone/15 bg-black/10" aria-label="Graph type">
          <button onClick={() => changeMode('articles')} aria-pressed={mode === 'articles'} className={`${controlClass} ${mode === 'articles' ? '!bg-hermes-bone/10 !text-hermes-bone' : ''}`}><Layers className="w-3.5 h-3.5" /> Articles</button>
          <button onClick={() => changeMode('claims')} aria-pressed={mode === 'claims'} className={`${controlClass} ${mode === 'claims' ? '!bg-hermes-bone/10 !text-hermes-bone' : ''}`}><Zap className="w-3.5 h-3.5" /> Claims</button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-y border-hermes-bone/10 px-5 py-3 sm:px-6">
        <form onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); setSelectedId(null); }} className="flex min-w-0 flex-1 basis-full items-center border border-hermes-bone/15 bg-black/15 focus-within:border-hermes-bone/40 sm:max-w-sm sm:basis-0">
          <Search className="ml-3 h-4 w-4 shrink-0 text-hermes-bone/40" />
          <input aria-label="Graph title search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find an article or topic…" className="min-w-0 w-full bg-transparent px-2.5 py-2 text-xs text-hermes-bone outline-none placeholder:text-hermes-bone/40" />
          <button type="submit" aria-label="Search graph titles" className={controlClass}><ArrowUpRight className="h-4 w-4" /></button>
        </form>
        <label className="flex items-center gap-2 text-xs text-hermes-bone/65 cursor-pointer"><input type="checkbox" checked={showConnections} onChange={(event) => setShowConnections(event.target.checked)} className="accent-hermes-red-bright" /> Show all connections</label>
        <div className="ml-auto flex gap-4 text-[11px] font-mono text-hermes-bone/50" aria-live="polite">{g.data && <><span><strong className="font-normal text-hermes-bone/85">{graph.nodes.length.toLocaleString()}</strong> {mode}</span><span><strong className="font-normal text-hermes-bone/85">{graph.edges.length.toLocaleString()}</strong> links</span></>}</div>
      </div>
      <div className="grid min-w-0 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-hermes-bone/10 bg-black/10 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between px-4 pb-3 pt-4"><h3 className="!font-sans text-[10px] uppercase tracking-[0.18em] text-hermes-bone/45">Outlets</h3><span className="text-[10px] font-mono text-hermes-bone/40">{groups.outlets.length}</span></div>
          <nav aria-label="Graph outlet filter" className="flex gap-1 overflow-x-auto px-2 pb-3 lg:max-h-[490px] lg:flex-col lg:overflow-y-auto">
            <button aria-pressed={!outletFilter} onClick={() => openOutlet('')} className={`flex shrink-0 items-center gap-2.5 px-3 py-2.5 text-left text-xs ${!outletFilter ? 'bg-white/[0.07] text-hermes-bone' : 'text-hermes-bone/60 hover:bg-white/5'}`}><Network className="h-3.5 w-3.5" /><span className="flex-1 whitespace-nowrap">All outlets</span><span className="hidden font-mono text-[10px] text-hermes-bone/40 lg:inline">{graph.nodes.length.toLocaleString()}</span></button>
            {groups.outlets.map((outlet) => <button key={outlet.id} title={outlet.id} aria-pressed={outletFilter === outlet.id} onClick={() => openOutlet(outlet.id)} className={`flex shrink-0 items-center gap-2.5 px-3 py-2.5 text-left text-xs ${outletFilter === outlet.id ? 'bg-white/[0.07] text-hermes-bone' : 'text-hermes-bone/60 hover:bg-white/5 hover:text-hermes-bone'}`}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: outletColor(outlet.id) }} /><span className="flex-1 whitespace-nowrap">{outletName(outlet.id)}</span><span className="hidden font-mono text-[10px] text-hermes-bone/40 lg:inline">{outlet.count.toLocaleString()}</span>
            </button>)}
          </nav>
          <p className="hidden border-t border-hermes-bone/10 px-4 py-4 text-[11px] leading-relaxed text-hermes-bone/40 lg:block">Each dot is one {mode === 'articles' ? 'article' : 'claim'}.<br />Color identifies its outlet.<br /><br />Select a dot to highlight its connections, or filter an outlet above.</p>
        </aside>
        <div className="min-w-0 bg-[radial-gradient(ellipse_at_center,#201b23_0%,#141114_75%)]">
          <div className="flex min-h-[64px] flex-wrap items-center justify-between gap-2 border-b border-hermes-bone/[0.07] px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              {hasFilters && <button onClick={clearFilters} aria-label="Back to full network" className={`${controlClass} !p-1.5`}><ArrowLeft className="h-4 w-4" /></button>}
              <div className="min-w-0"><h3 className="!font-sans text-sm">{query ? `Results for “${query}”` : outletFilter ? outletName(outletFilter) : 'The connected corpus'}</h3><p className="mt-1 text-[11px] text-hermes-bone/40">{`${filtered.nodes.length.toLocaleString()} ${mode} · ${filtered.edges.length.toLocaleString()} ${mode === 'claims' ? 'near-duplicate' : 'similarity'} link${filtered.edges.length === 1 ? '' : 's'}${query ? ' · matches + direct neighbors' : ''}`}</p></div>
            </div>
            {query && <button onClick={() => { setQuery(''); setSearch(''); setSelectedId(null); }} className={controlClass}><X className="h-3 w-3" /> Clear search</button>}
          </div>
          <div ref={wrapRef} className="relative h-[440px] overflow-hidden sm:h-[570px]">
            {g.isLoading ? <div role="status" aria-label="Loading corpus graph" className="flex h-full items-center justify-center text-sm text-hermes-bone/50">Loading corpus graph…</div>
              : g.isError ? <div className="p-6"><QueryError title="Corpus graph unavailable" error={g.error} onRetry={() => g.refetch()} retrying={g.isFetching} /></div>
                : <>
                  <canvas ref={canvasRef} aria-hidden="true" className={`block touch-none ${hovered ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { dragRef.current = null; }} onLostPointerCapture={() => { dragRef.current = null; }} onPointerLeave={() => setHovered(null)} />
                  {!scene.nodes.length && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"><Search className="h-6 w-6 text-hermes-bone/30" /><p className="text-sm text-hermes-bone/70">{query || outletFilter ? `No ${mode} match these filters.` : 'No graph nodes returned.'}</p>{hasFilters && <button onClick={clearFilters} className={controlClass}>Clear filters</button>}</div>}
                  {hovered && <div className="pointer-events-none absolute left-4 top-3 max-w-[min(340px,calc(100%-32px))] border border-hermes-bone/15 bg-[#211b20] px-3 py-2.5 shadow-lg"><p className="mb-1 text-[10px]" style={{ color: outletColor(hovered.domain) }}>{outletName(hovered.domain)}</p><p className="line-clamp-2 text-xs leading-relaxed text-hermes-bone/85">{hovered.title}</p></div>}
                </>}
            <div className="absolute bottom-4 right-4 flex items-center divide-x divide-hermes-bone/10 border border-hermes-bone/15 bg-[#211b20] shadow-lg">
              <button onClick={() => zoomAt(1 / 1.25)} disabled={zoom <= 50} aria-label="Zoom out" className={`${controlClass} !px-2.5 disabled:opacity-30`}><Minus className="h-3.5 w-3.5" /></button><span className="w-12 text-center text-[10px] font-mono text-hermes-bone/55">{zoom}%</span>
              <button onClick={() => zoomAt(1.25)} disabled={zoom >= 800} aria-label="Zoom in" className={`${controlClass} !px-2.5 disabled:opacity-30`}><Plus className="h-3.5 w-3.5" /></button><button onClick={resetView} aria-label="Reset graph view" title="Fit graph to view" className={`${controlClass} !px-2.5`}><Maximize2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hermes-bone/[0.07] px-4 py-3 text-[10px] text-hermes-bone/40 sm:px-5"><span>{mode === 'articles' ? 'Dots = articles · Lines = similarity' : 'Dots = claims · Lines = near-duplicates'}{focusGroup && ` · ${focusGroup.internalLinks.toLocaleString()} links within this outlet`}</span><span>Click a node to inspect<span className="hidden sm:inline"> · Drag to pan · Ctrl/⌘ + scroll to zoom</span></span></div>
        </div>
      </div>
      {g.data && <div className="flex flex-wrap items-center gap-3 border-t border-hermes-bone/10 px-5 py-3 sm:px-6">
        <label htmlFor="graph-node-select" className="text-xs text-hermes-bone/50">Inspect {mode === 'articles' ? 'an article' : 'a claim'}</label>
        <select id="graph-node-select" aria-label="Inspect a node (keyboard alternative)" value={selectedId ?? ''} onChange={(event) => inspectNode(event.target.value)} className="min-w-0 max-w-full flex-1 border border-hermes-bone/15 bg-hermes-panel-deep px-3 py-2 text-xs text-hermes-bone/70 sm:max-w-xl"><option value="">Choose a {mode === 'articles' ? 'title' : 'claim'} to inspect…</option>{nodeOptions}</select>
      </div>}
      {selected && <div className="flex flex-wrap items-start justify-between gap-5 border-t border-hermes-bone/15 bg-black/15 p-5 sm:p-6">
        <div className="min-w-0 flex-1 basis-64"><div className="mb-2 text-[10px] uppercase tracking-widest" style={{ color: outletColor(selected.domain) }}>{outletName(selected.domain)}{selected.deg != null && ` · ${selected.deg} similarity links`}</div><h3 className="text-xl leading-snug">{selected.title}</h3></div>
        <div className="flex flex-wrap items-center gap-2">
          <button disabled={!timelineArticleId || !setActiveTab} title={timelineArticleId ? 'Open this article’s story timeline' : 'This claim has no article_id; timeline drill-down is unsupported'} onClick={() => { if (!timelineArticleId) return; setSelectedArticle({ id: timelineArticleId, title: selected.title, domain: selected.domain }); setActiveTab?.('timeline'); }} className="btn-brutal">View in Timeline <Orbit className="h-3.5 w-3.5" /></button>
          {safeHttpUrl(selected.url) && <a href={safeHttpUrl(selected.url)} target="_blank" rel="noreferrer" className={controlClass}>Read original <ExternalLink className="h-3.5 w-3.5" /></a>}<button aria-label="Close node inspector" onClick={() => setSelectedId(null)} className={controlClass}><X className="h-4 w-4" /></button>
        </div>
      </div>}
    </section>
  );
};

export default FullCorpusGraph;
