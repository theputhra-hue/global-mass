import { layoutSteps } from './graphLayout';
import type { FullGraph } from '../../../shared/api/graph';

const worker = self as unknown as { onmessage: ((event: MessageEvent<{ graph: FullGraph; seed: number }>) => void) | null; postMessage: (data: unknown) => void };
worker.onmessage = event => {
  try {
    const start = performance.now(), steps = layoutSteps(event.data.graph, event.data.seed);
    let next = steps.next(), reported = 0;
    while (!next.done) { if (next.value - reported > .05) { reported = next.value; worker.postMessage({ progress: reported }); } next = steps.next(); }
    worker.postMessage({ scene: next.value, elapsedMs: performance.now() - start });
  } catch { worker.postMessage({ error: 'The recorded network could not be laid out. Try fewer records or retry.' }); }
};
