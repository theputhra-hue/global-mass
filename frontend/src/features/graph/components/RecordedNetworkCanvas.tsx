import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import type { GraphScene, GraphPoint } from '../lib/graphScene';
import { fitScene } from '../lib/graphScene';
import { outletColor, outletName } from '../lib/corpusGraph';

export interface CanvasSnapshot { positions: GraphPoint[]; pins: string[]; camera: { ox: number; oy: number; scale: number } }
export interface NetworkCanvasHandle { snapshot: () => CanvasSnapshot; pin: (id: string) => void; unpin: () => void }
interface Props { scene: GraphScene; selected: string | null; onSelect: (id: string | null) => void; showConnections: boolean }
const button = 'px-3 py-2 text-xs hover:bg-hermes-panel focus-visible:outline focus-visible:outline-hermes-red-bright disabled:opacity-40';

export const RecordedNetworkCanvas = forwardRef<NetworkCanvasHandle, Props>(function RecordedNetworkCanvas({ scene, selected, onSelect, showConnections }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null), wrapper = useRef<HTMLDivElement>(null);
  const points = useRef(new Map(scene.nodes.map(n => [n.id, { ...n }])));
  const pins = useRef(new Set<string>());
  const camera = useRef({ ox: 0, oy: 0, scale: 1 }), baseScale = useRef(1);
  const drag = useRef<{ id?: string; x: number; y: number; startX: number; startY: number; moved: boolean }>();
  const [version, setVersion] = useState(0), [hover, setHover] = useState<string | null>(null), [zoom, setZoom] = useState(100);
  const redraw = useCallback(() => setVersion(v => v + 1), []);
  const fit = useCallback(() => { if (!wrapper.current) return; camera.current = fitScene([...points.current.values()], wrapper.current.clientWidth, wrapper.current.clientHeight); baseScale.current = camera.current.scale; setZoom(100); redraw(); }, [redraw]);
  useEffect(() => { fit(); const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(redraw) : null; if (wrapper.current) observer?.observe(wrapper.current); return () => observer?.disconnect(); }, [fit, redraw]);
  useImperativeHandle(ref, () => ({ snapshot: () => ({ positions: [...points.current.values()].map(p => ({ ...p })), pins: [...pins.current].sort(), camera: { ...camera.current } }), pin: id => { if (points.current.has(id)) { pins.current.add(id); redraw(); } }, unpin: () => { pins.current.clear(); points.current = new Map(scene.nodes.map(n => [n.id, { ...n }])); redraw(); } }), [redraw, scene]);
  const zoomAt = useCallback((factor: number, mx?: number, my?: number) => {
    const wrap = wrapper.current; if (!wrap) return;
    const view = camera.current, scale = Math.max(baseScale.current * .2, Math.min(baseScale.current * 20, view.scale * factor));
    const x = (mx ?? wrap.clientWidth / 2) - wrap.clientWidth / 2, y = (my ?? wrap.clientHeight / 2) - wrap.clientHeight / 2;
    view.ox = x - (x - view.ox) * scale / view.scale; view.oy = y - (y - view.oy) * scale / view.scale; view.scale = scale;
    setZoom(Math.round(scale / baseScale.current * 100)); redraw();
  }, [redraw]);
  useEffect(() => {
    const wrap = wrapper.current; if (!wrap) return;
    const wheel = (event: WheelEvent) => { if (!event.ctrlKey && !event.metaKey) return; event.preventDefault(); const rect = wrap.getBoundingClientRect(); zoomAt(Math.exp(-event.deltaY * .002), event.clientX - rect.left, event.clientY - rect.top); };
    wrap.addEventListener('wheel', wheel, { passive: false }); return () => wrap.removeEventListener('wheel', wheel);
  }, [zoomAt]);
  useEffect(() => {
    const surface = canvas.current, wrap = wrapper.current, ctx = surface?.getContext('2d'); if (!surface || !wrap || !ctx) return;
    const width = wrap.clientWidth, height = wrap.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    surface.width = width * dpr; surface.height = height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    const { ox, oy, scale } = camera.current;
    const screen = (p: GraphPoint) => ({ x: width / 2 + ox + p.x * scale, y: height / 2 + oy + p.y * scale });
    const focus = hover || selected, neighbors = new Set<string>(focus ? [focus] : []);
    for (const edge of scene.edges) { if (edge.a === focus) neighbors.add(edge.b); if (edge.b === focus) neighbors.add(edge.a); }
    for (const edge of scene.edges) {
      const a = points.current.get(edge.a), b = points.current.get(edge.b); if (!a || !b) continue;
      const active = edge.a === focus || edge.b === focus; if (!active && !showConnections) continue;
      const p = screen(a), q = screen(b); ctx.globalAlpha = active ? .95 : focus ? .04 : Math.max(.07, Math.min(.32, 10 / Math.sqrt(scene.edges.length)));
      ctx.strokeStyle = edge.directed ? '#f4ece1' : '#b7a6a0'; ctx.lineWidth = active ? 1.7 : .8; ctx.setLineDash(edge.directed === null || edge.directed === undefined ? [3, 3] : []);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); ctx.setLineDash([]);
      if (edge.directed) { const angle = Math.atan2(q.y - p.y, q.x - p.x), r = Math.max(4, b.radius * Math.min(scale, 2)) + 2; const x = q.x - Math.cos(angle) * r, y = q.y - Math.sin(angle) * r; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 7 * Math.cos(angle - .45), y - 7 * Math.sin(angle - .45)); ctx.lineTo(x - 7 * Math.cos(angle + .45), y - 7 * Math.sin(angle + .45)); ctx.closePath(); ctx.fillStyle = ctx.strokeStyle; ctx.fill(); }
    }
    for (const node of points.current.values()) { const p = screen(node); if (p.x < -20 || p.x > width + 20 || p.y < -20 || p.y > height + 20) continue; ctx.globalAlpha = focus && !neighbors.has(node.id) ? .2 : .95; const radius = Math.max(2.5, node.radius * Math.min(scale, 2)); ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fillStyle = outletColor(node.domain); ctx.fill(); if (node.id === focus || pins.current.has(node.id)) { ctx.globalAlpha = 1; ctx.strokeStyle = '#f4ece1'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, radius + 3, 0, Math.PI * 2); ctx.stroke(); } }
    ctx.globalAlpha = 1;
  }, [scene, selected, hover, showConnections, version]);
  const pick = (x: number, y: number) => { const wrap = wrapper.current; if (!wrap) return; const view = camera.current; let id: string | undefined, closest = Infinity; for (const p of points.current.values()) { const distance = Math.hypot(x - wrap.clientWidth / 2 - view.ox - p.x * view.scale, y - wrap.clientHeight / 2 - view.oy - p.y * view.scale); if (distance < Math.max(10, p.radius * Math.min(view.scale, 2) + 4) && distance < closest) { closest = distance; id = p.id; } } return id; };
  const hovered = hover ? points.current.get(hover) : null;
  return <div ref={wrapper} className="relative h-[420px] sm:h-[560px] overflow-hidden border-y border-hermes-bone/15 bg-hermes-ink" aria-label="Recorded relationship map">
    <canvas ref={canvas} aria-hidden="true" className="block w-full h-full touch-pan-y cursor-grab active:cursor-grabbing" onPointerDown={event => { if (event.button !== 0) return; const rect = event.currentTarget.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top; drag.current = { id: pick(x, y), x, y, startX: x, startY: y, moved: false }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { const rect = event.currentTarget.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top, current = drag.current; if (current) { if (Math.hypot(x - current.startX, y - current.startY) > 4) current.moved = true; if (current.moved) { const node = current.id ? points.current.get(current.id) : null; if (node) { node.x += (x - current.x) / camera.current.scale; node.y += (y - current.y) / camera.current.scale; pins.current.add(node.id); } else { camera.current.ox += x - current.x; camera.current.oy += y - current.y; } current.x = x; current.y = y; setHover(null); redraw(); } } else setHover(pick(x, y) || null); }} onPointerUp={event => { const current = drag.current; drag.current = undefined; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); if (current && !current.moved) onSelect(current.id || null); }} onPointerCancel={() => { drag.current = undefined; }} onLostPointerCapture={() => { drag.current = undefined; }} onPointerLeave={() => setHover(null)} />
    {hovered && <div className="pointer-events-none absolute top-3 left-3 max-w-[min(300px,calc(100%-24px))] border border-hermes-bone/30 bg-hermes-panel p-3 shadow-xl"><p className="text-xs text-hermes-bone/65">{outletName(hovered.domain)}</p><p className="text-sm line-clamp-2 mt-2">{hovered.title}</p></div>}
    <div className="absolute right-3 bottom-3 flex items-center divide-x divide-hermes-bone/20 border border-hermes-bone/25 bg-hermes-panel"><button aria-label="Zoom out" className={button} disabled={zoom <= 20} onClick={() => zoomAt(1 / 1.25)}><Minus className="w-4 h-4" /></button><span className="px-3 text-xs" aria-live="polite">{zoom}%</span><button aria-label="Zoom in" className={button} disabled={zoom >= 2000} onClick={() => zoomAt(1.25)}><Plus className="w-4 h-4" /></button><button aria-label="Reset graph view" className={button} onClick={fit}><Maximize2 className="w-4 h-4" /></button></div>
  </div>;
});
