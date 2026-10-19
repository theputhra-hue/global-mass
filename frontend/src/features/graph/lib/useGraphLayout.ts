import { useEffect, useMemo, useRef, useState } from 'react';
import type { FullGraph } from '../../../shared/api/graph';
import type { GraphScene } from './graphLayout';
import { topologyKey } from './graphModel';

interface Result { key: string; scene?: GraphScene; elapsedMs?: number; progress: number; error?: string }
export function useGraphLayout(graph: FullGraph, seed: number, enabled: boolean) {
  const key = useMemo(() => topologyKey(graph, seed), [graph, seed]);
  const input = useRef(graph); input.current = graph;
  const cache = useRef(new Map<string, Result>());
  const [result, setResult] = useState<Result>({ key: '', progress: 0 });
  useEffect(() => {
    if (!enabled || !input.current.edges.length) return;
    const cached = cache.current.get(key);
    if (cached) { setResult(cached); return; }
    let cancelled = false, worker: Worker | undefined;
    // Layout needs no article bodies, model annotations or supporting references.
    // Keep structured-clone work bounded to the fields used by the solver.
    const start = performance.now();
    const snapshot: FullGraph = {
      nodes: input.current.nodes.map(({ id, title, domain }) => ({ id, title, domain })),
      edges: input.current.edges.map(({ id, src, dst, score, relationship_type, score_kind, score_family, directed }) => ({ id, src, dst, score, relationship_type, score_kind, score_family, directed })),
      counts: input.current.counts,
    };
    setResult({ key, progress: 0 });
    const done = (message: Omit<Result, 'key' | 'progress'> & { progress?: number }) => {
      if (cancelled) return;
      const next = { key, progress: message.scene ? 1 : message.progress || 0, ...message };
      if (message.scene) { cache.current.set(key, next); while (cache.current.size > 4) cache.current.delete(cache.current.keys().next().value!); }
      setResult(next);
    };
    const timer = setTimeout(() => { worker?.terminate(); done({ error: 'Layout exceeded its 20-second budget. Reduce the displayed network and retry.' }); cancelled = true; }, 20000);
    if (typeof Worker !== 'undefined') {
      try {
        worker = new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = event => { done(event.data); if (event.data.scene || event.data.error) { clearTimeout(timer); worker?.terminate(); } };
        worker.onerror = () => { clearTimeout(timer); done({ error: 'The layout worker is unavailable. Retry or use the record and neighbor lists.' }); worker?.terminate(); };
        worker.postMessage({ graph: snapshot, seed });
      } catch { clearTimeout(timer); worker?.terminate(); done({ error: 'The layout worker is blocked in this browser. Use the record list or retry.' }); }
    } else if (snapshot.nodes.length > 500) {
      clearTimeout(timer);
      done({ error: 'Background layout is unavailable in this browser for more than 500 records. Filter the network or use the record list.' });
    } else {
      // Compatibility/test fallback yields every five ticks, never starts D3's timer.
      void import('./graphLayout').then(async ({ layoutSteps }) => {
        if (cancelled) return;
        const steps = layoutSteps(snapshot, seed);
        let next = steps.next();
        while (!next.done && !cancelled) { done({ progress: next.value }); await new Promise(resolve => setTimeout(resolve, 0)); next = steps.next(); }
        clearTimeout(timer);
        if (next.done) done({ scene: next.value, elapsedMs: performance.now() - start });
      }).catch(() => { clearTimeout(timer); done({ error: 'Layout unavailable. Use the record list or retry.' }); });
    }
    return () => { cancelled = true; clearTimeout(timer); worker?.terminate(); };
  }, [key, seed, enabled]);
  return result.key === key ? { ...result, key } : { key, progress: 0 } as Result;
}
