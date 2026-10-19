import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { LocateFixed, Minus, Plus } from 'lucide-react';
import { fitScene } from '../lib/graphScene';
import { percentile95, sizeRadius, visibleCityEdges, type CityEdge, type CityNode, type CityScene, type CityView } from '../lib/cityScene';

export interface CityCanvasHandle { fit: () => void; focus: (id: string) => void }
interface Props { scene: CityScene; scaleScene: CityScene; selected: string | null; selectedEdge: string | null; streets: 'auto' | 'all' | 'off'; uniform: boolean; onSelect: (id: string | null) => void; onRoute: (id: string) => void; initialView?: CityView | null; onView?: (view: CityView) => void }
type Point = { x: number; y: number };
const btn = 'city-icon-button';

export const CityNetworkCanvas = forwardRef<CityCanvasHandle, Props>(function CityNetworkCanvas({ scene, scaleScene, selected, selectedEdge, streets, uniform, onSelect, onRoute, initialView, onView }, ref) {
  const wrapper = useRef<HTMLDivElement>(null), surface = useRef<HTMLCanvasElement>(null);
  const currentScene = useRef(scene); currentScene.current = scene;
  const camera = useRef({ ox: 0, oy: 0, scale: 1 }), base = useRef(1), frame = useRef<number>();
  const draw = useRef<() => void>(() => {}), drag = useRef<{ x: number; y: number; startX: number; startY: number; moved: boolean }>();
  const hits = useRef<Array<{ node: CityNode; x: number; y: number; r: number }>>([]), routeHits = useRef<Array<{ edge: CityEdge; points: Point[] }>>([]);
  const mini = useRef<{ x: number; y: number; w: number; h: number; minX: number; minY: number; sx: number; sy: number }>();
  const [zoom, setZoom] = useState(100), [hover, setHover] = useState<string | null>(null), [drawn, setDrawn] = useState(0);
  const emitView = useCallback(() => onView?.({ x: -camera.current.ox / camera.current.scale, y: -camera.current.oy / camera.current.scale, zoom: camera.current.scale / base.current }), [onView]);
  const scales = useMemo(() => ({ article: percentile95(scaleScene.nodes.filter(n => n.kind === 'article').map(n => n.value)), topic: percentile95(scaleScene.nodes.filter(n => n.kind === 'topic').map(n => n.value)), theme: percentile95(scaleScene.nodes.filter(n => n.kind === 'theme').map(n => n.value)), highway: percentile95(scaleScene.edges.filter(e => e.kind === 'highway').map(e => e.value)), superway: percentile95(scaleScene.edges.filter(e => e.kind === 'superway').map(e => e.value)) }), [scaleScene]);
  const redraw = useCallback(() => { if (frame.current) cancelAnimationFrame(frame.current); frame.current = requestAnimationFrame(() => draw.current()); }, []);
  const fit = useCallback(() => {
    const wrap = wrapper.current; if (!wrap) return;
    camera.current = fitScene(currentScene.current.nodes.map(n => ({ ...n, title: n.label, domain: null, radius: 10 })), wrap.clientWidth, wrap.clientHeight);
    base.current = camera.current.scale; setZoom(100); redraw();
  }, [redraw]);
  const zoomAt = useCallback((factor: number, x?: number, y?: number) => {
    const wrap = wrapper.current; if (!wrap) return;
    const view = camera.current, next = Math.max(base.current * .35, Math.min(base.current * 20, view.scale * factor));
    const px = (x ?? wrap.clientWidth / 2) - wrap.clientWidth / 2, py = (y ?? wrap.clientHeight / 2) - wrap.clientHeight / 2;
    view.ox = px - (px - view.ox) * next / view.scale; view.oy = py - (py - view.oy) * next / view.scale; view.scale = next;
    setZoom(Math.round(next / base.current * 100)); redraw(); emitView();
  }, [redraw, emitView]);
  useImperativeHandle(ref, () => ({ fit, focus: id => {
    const n = scaleScene.nodes.find(n => n.id === id), wrap = wrapper.current; if (!n || !wrap) return;
    const ids = new Set(n.members || scaleScene.edges.filter(e => e.kind === 'street' && (e.a === id || e.b === id)).flatMap(e => [e.a, e.b]));
    ids.add(id); const group = scaleScene.nodes.filter(p => ids.has(p.id));
    const minX = Math.min(...group.map(p => p.x)), maxX = Math.max(...group.map(p => p.x)), minY = Math.min(...group.map(p => p.y)), maxY = Math.max(...group.map(p => p.y));
    const scale = Math.min(base.current * 20, Math.max(base.current * 1.8, Math.min(wrap.clientWidth * .72 / (maxX - minX + 50), wrap.clientHeight * .72 / (maxY - minY + 50))));
    camera.current = { ox: -(minX + maxX) / 2 * scale, oy: -(minY + maxY) / 2 * scale, scale }; setZoom(Math.round(scale / base.current * 100)); redraw(); emitView();
  } }), [fit, scaleScene, redraw, emitView]);
  useEffect(() => { fit(); if (initialView) { const scale = base.current * initialView.zoom; camera.current = { ox: -initialView.x * scale, oy: -initialView.y * scale, scale }; setZoom(Math.round(initialView.zoom * 100)); redraw(); } const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(redraw) : null; if (wrapper.current) observer?.observe(wrapper.current); return () => { observer?.disconnect(); if (frame.current) cancelAnimationFrame(frame.current); }; }, [fit, redraw, initialView]);
  useEffect(() => {
    const wrap = wrapper.current; if (!wrap) return;
    const wheel = (event: WheelEvent) => { if (!event.ctrlKey && !event.metaKey) return; event.preventDefault(); const rect = wrap.getBoundingClientRect(); zoomAt(Math.exp(-event.deltaY * .002), event.clientX - rect.left, event.clientY - rect.top); };
    wrap.addEventListener('wheel', wheel, { passive: false }); return () => wrap.removeEventListener('wheel', wheel);
  }, [zoomAt]);
  const level = zoom < 180 && scene.nodes.length === scaleScene.nodes.length ? 'city' : zoom < 350 ? 'district' : 'article';
  const edges = useMemo(() => visibleCityEdges(scene, level, streets, selected), [scene, level, streets, selected]);
  useEffect(() => {
    draw.current = () => {
      const wrap = wrapper.current, canvas = surface.current, ctx = canvas?.getContext('2d'); if (!wrap || !canvas || !ctx) return;
      const width = wrap.clientWidth, height = wrap.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) { canvas.width = width * dpr; canvas.height = height * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
      const { ox, oy, scale } = camera.current;
      const screen = (n: Point) => ({ x: width / 2 + ox + n.x * scale, y: height / 2 + oy + n.y * scale });
      const nodes = new Map(scene.nodes.map(n => [n.id, n])), focus = hover || selected, adjacent = new Set<string>(focus ? [focus] : []);
      for (const edge of scene.edges) if (edge.a === focus || edge.b === focus || edge.id === selectedEdge) { adjacent.add(edge.a); adjacent.add(edge.b); }
      // Sparse context grid is presentation only, not geography or distance units.
      ctx.fillStyle = '#fff7f2'; ctx.globalAlpha = .045;
      for (let x = 24; x < width; x += 48) for (let y = 24; y < height; y += 48) ctx.fillRect(x, y, 1, 1);
      routeHits.current = []; hits.current = [];
      const prioritized = [...edges].sort((a, b) => Number(b.id === selectedEdge || b.a === focus || b.b === focus) - Number(a.id === selectedEdge || a.a === focus || a.b === focus));
      for (const edge of prioritized) {
        const a = nodes.get(edge.a), b = nodes.get(edge.b); if (!a || !b) continue;
        const p = screen(a), q = screen(b);
        if ((Math.max(p.x, q.x) < -30 || Math.min(p.x, q.x) > width + 30 || Math.max(p.y, q.y) < -30 || Math.min(p.y, q.y) > height + 30) || routeHits.current.length >= 3000) continue;
        const active = edge.id === selectedEdge || edge.a === focus || edge.b === focus;
        const major = edge.kind === 'highway' || edge.kind === 'superway';
        const support = Math.min(1, Math.log1p(edge.value) / Math.log1p(edge.kind === 'superway' ? scales.superway : scales.highway));
        const lineWidth = edge.kind === 'street' ? .65 + .65 * (edge.score || 0) : edge.kind === 'recorded' ? 1.5 : edge.kind === 'highway' ? 1.8 + 2.2 * support : 4.5 + 2.5 * support;
        ctx.globalAlpha = active ? .95 : focus || selectedEdge ? .06 : major ? .52 : .2;
        ctx.strokeStyle = edge.kind === 'superway' ? '#e4c49b' : edge.kind === 'highway' ? '#cb8790' : edge.kind === 'recorded' ? '#fff7f2' : a.color;
        ctx.lineWidth = lineWidth; ctx.setLineDash(edge.kind === 'recorded' ? [5, 4] : []);
        const bend = major ? .13 : 0, control = { x: (p.x + q.x) / 2 - (q.y - p.y) * bend, y: (p.y + q.y) / 2 + (q.x - p.x) * bend };
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(control.x, control.y, q.x, q.y); ctx.stroke(); ctx.setLineDash([]);
        if (edge.directed) { const angle = Math.atan2(q.y - control.y, q.x - control.x), x = q.x - Math.cos(angle) * 7, y = q.y - Math.sin(angle) * 7; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 7 * Math.cos(angle - .45), y - 7 * Math.sin(angle - .45)); ctx.lineTo(x - 7 * Math.cos(angle + .45), y - 7 * Math.sin(angle + .45)); ctx.closePath(); ctx.fillStyle = ctx.strokeStyle; ctx.fill(); }
        const points = Array.from({ length: 9 }, (_, i) => { const t = i / 8; return { x: (1 - t) ** 2 * p.x + 2 * (1 - t) * t * control.x + t * t * q.x, y: (1 - t) ** 2 * p.y + 2 * (1 - t) * t * control.y + t * t * q.y }; });
        routeHits.current.push({ edge, points });
      }
      setDrawn(old => old === routeHits.current.length ? old : routeHits.current.length);
      const labels: Array<{ node: CityNode; x: number; y: number; r: number }> = [];
      for (const node of [...scene.nodes].sort((a, b) => ({ article: 0, topic: 1, theme: 2 }[a.kind] - { article: 0, topic: 1, theme: 2 }[b.kind]))) {
        const p = screen(node); if (p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50) continue;
        const active = node.id === focus;
        const r = node.kind === 'article' ? level === 'city' ? active ? 4 : 1.3 : uniform ? 3 : sizeRadius(node.value, scales.article, 2.5, 7) : node.kind === 'topic' ? level === 'city' ? 4.5 : sizeRadius(node.value, scales.topic, 12, 24) : level === 'city' ? 15 : sizeRadius(node.value, scales.theme, 28, 40);
        ctx.globalAlpha = focus && !adjacent.has(node.id) ? .16 : node.kind === 'article' ? .87 : .97;
        ctx.fillStyle = node.kind === 'article' ? node.color : '#240c10'; ctx.strokeStyle = node.color; ctx.lineWidth = node.kind === 'theme' ? 2 : 1.2;
        ctx.beginPath(); if (node.kind === 'article') ctx.arc(p.x, p.y, r, 0, Math.PI * 2); else ctx.roundRect(p.x - r, p.y - r, r * 2, r * 2, node.kind === 'topic' ? 4 : 9); ctx.fill(); if (node.kind !== 'article') ctx.stroke();
        if (node.kind === 'theme') { ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(p.x - r + 3, p.y - r + 3, r * 2 - 6, r * 2 - 6, 6); ctx.stroke(); }
        if (node.kind !== 'article' && (node.kind === 'theme' || level !== 'city')) { ctx.fillStyle = '#fff7f2'; ctx.font = '11px "Courier Prime", monospace'; ctx.textAlign = 'center'; ctx.fillText(node.value.toLocaleString(), p.x, p.y + 4); ctx.textAlign = 'start'; }
        if (active || node.id === selected) { ctx.globalAlpha = 1; ctx.strokeStyle = '#fff7f2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2); ctx.stroke(); }
        hits.current.push({ node, ...p, r });
        if (node.kind !== 'article' || active) labels.push({ node, ...p, r });
      }
      const occupied: Array<{ x: number; y: number; w: number; h: number }> = [];
      for (const label of labels.sort((a, b) => Number(b.node.id === focus) - Number(a.node.id === focus) || Number(b.node.kind === 'theme') - Number(a.node.kind === 'theme') || b.node.value - a.node.value)) {
        if (occupied.length >= (level === 'city' ? 12 : 18) && label.node.id !== focus) continue;
        const text = label.node.label.length > 36 ? label.node.label.slice(0, 34) + '…' : label.node.label;
        ctx.font = '12px "Courier Prime", monospace'; const w = Math.min(290, ctx.measureText(text).width + 16), x = Math.max(6, Math.min(width - w - 6, label.x - w / 2)), y = label.y + label.r + 8;
        const box = { x, y, w, h: 22 };
        if (occupied.some(b => x < b.x + b.w + 4 && x + w + 4 > b.x && y < b.y + b.h + 4 && y + box.h + 4 > b.y) && label.node.id !== focus) continue;
        occupied.push(box); ctx.globalAlpha = 1; ctx.fillStyle = '#1a0608e8'; ctx.fillRect(x, y, w, 22); ctx.fillStyle = '#fff7f2'; ctx.fillText(text, x + 8, y + 15);
      }
      // Viewport minimap uses the same coordinates; clicking only moves the camera.
      if (width > 620 && scaleScene.nodes.length) {
        const xs = scaleScene.nodes.map(n => n.x), ys = scaleScene.nodes.map(n => n.y), minX = Math.min(...xs) - 30, minY = Math.min(...ys) - 30;
        const m = { x: 20, y: height - 110, w: 130, h: 80, minX, minY, sx: 130 / (Math.max(...xs) - minX + 30), sy: 80 / (Math.max(...ys) - minY + 30) }; mini.current = m;
        ctx.globalAlpha = .95; ctx.fillStyle = '#240c10'; ctx.fillRect(m.x, m.y, m.w, m.h); ctx.strokeStyle = '#fff7f24d'; ctx.lineWidth = 1; ctx.strokeRect(m.x, m.y, m.w, m.h); ctx.fillStyle = '#cb8790';
        for (const n of scaleScene.nodes) if (n.kind === 'article') ctx.fillRect(m.x + (n.x - minX) * m.sx, m.y + (n.y - minY) * m.sy, 1, 1);
        ctx.save(); ctx.beginPath(); ctx.rect(m.x, m.y, m.w, m.h); ctx.clip(); ctx.strokeStyle = '#fff7f2'; ctx.strokeRect(m.x + ((-width / 2 - ox) / scale - minX) * m.sx, m.y + ((-height / 2 - oy) / scale - minY) * m.sy, width / scale * m.sx, height / scale * m.sy); ctx.restore();
      } else mini.current = undefined;
      if (scene.unsupported.length) {
        const x = Math.max(12, width - 155), y = 70; ctx.globalAlpha = .92; ctx.fillStyle = '#240c10'; ctx.fillRect(x, y, 140, 70); ctx.strokeStyle = '#fff7f250'; ctx.strokeRect(x, y, 140, 70); ctx.font = '10px "Courier Prime", monospace'; ctx.fillStyle = '#fff7f2'; ctx.fillText(`${scene.unsupported.length} without projection`, x + 8, y + 15);
        scene.unsupported.slice(0, 100).forEach((a, i) => { const px = x + 10 + i % 20 * 6, py = y + 29 + Math.floor(i / 20) * 7; ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.stroke(); hits.current.push({ node: { id: a.id, label: a.title, x: 0, y: 0, kind: 'article', value: 0, color: '#897d79', topic: null }, x: px, y: py, r: 2 }); });
      }
      ctx.globalAlpha = 1;
    };
    redraw();
  }, [scene, scaleScene, edges, selected, selectedEdge, hover, uniform, scales, level, redraw]);
  const pick = (x: number, y: number) => [...hits.current].reverse().find(n => Math.hypot(x - n.x, y - n.y) < Math.max(n.r + 4, n.node.kind === 'article' ? 5 : 12));
  const pickRoute = (x: number, y: number) => routeHits.current.find(route => route.points.some((p, i) => { const q = route.points[i + 1]; if (!q) return false; const dx = q.x - p.x, dy = q.y - p.y, t = Math.max(0, Math.min(1, ((x - p.x) * dx + (y - p.y) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(x - p.x - t * dx, y - p.y - t * dy) < 5; }));
  return <div ref={wrapper} className="city-canvas" aria-label="City relationship map">
    <canvas ref={surface} aria-hidden="true" className="city-map-surface" onPointerDown={e => { if (e.button !== 0) return; const rect = e.currentTarget.getBoundingClientRect(); drag.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, startX: e.clientX - rect.left, startY: e.clientY - rect.top, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { const rect = e.currentTarget.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top, d = drag.current; if (d) { if (Math.hypot(x - d.startX, y - d.startY) > 4) d.moved = true; if (d.moved) { camera.current.ox += x - d.x; camera.current.oy += y - d.y; d.x = x; d.y = y; redraw(); } } else { const next = pick(x, y)?.node.id || null; setHover(old => old === next ? old : next); } }} onPointerUp={e => { const d = drag.current; drag.current = undefined; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); if (!d) return; if (d.moved) { emitView(); return; } const m = mini.current; if (m && d.x >= m.x && d.x <= m.x + m.w && d.y >= m.y && d.y <= m.y + m.h) { camera.current.ox = -(m.minX + (d.x - m.x) / m.sx) * camera.current.scale; camera.current.oy = -(m.minY + (d.y - m.y) / m.sy) * camera.current.scale; redraw(); emitView(); return; } const node = pick(d.x, d.y); if (node) onSelect(node.node.id); else { const route = pickRoute(d.x, d.y); if (route) onRoute(route.edge.id); else onSelect(null); } }} onPointerCancel={() => { drag.current = undefined; }} onLostPointerCapture={() => { drag.current = undefined; }} onPointerLeave={() => setHover(null)} />
    <div className="city-level-badge"><span className="city-status-dot" />{level === 'article' ? 'Neighborhood detail' : level === 'district' ? 'District view' : 'City overview'}<small>{drawn.toLocaleString()} routes drawn · {scene.edges.length.toLocaleString()} loaded</small></div>
    {hover && <div className="city-hover-preview">{scene.nodes.find(n => n.id === hover)?.label || scene.unsupported.find(n => n.id === hover)?.title}</div>}
    <div className="city-zoom-controls"><button className={btn} aria-label="Zoom out" onClick={() => zoomAt(1 / 1.4)}><Minus size={17} /></button><span>{zoom}%</span><button className={btn} aria-label="Zoom in" onClick={() => zoomAt(1.4)}><Plus size={17} /></button><button className={btn} aria-label="Fit complete city" onClick={() => { fit(); emitView(); }}><LocateFixed size={17} /></button></div>
    <p className="city-gesture-hint">Drag to pan · Ctrl / ⌘ + scroll to zoom · select a dot or route</p>
  </div>;
});
