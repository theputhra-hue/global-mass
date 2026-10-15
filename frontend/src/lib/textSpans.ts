export interface Span {start: number; end: number}

export function returnedSpans(analysis: Record<string, unknown>, side: 'older' | 'newer'): Span[] {
  if (!Array.isArray(analysis.changed_spans)) return [];
  return analysis.changed_spans.flatMap((change: unknown): Span[] => {
    if (!change || typeof change !== 'object') return [];
    const span = (change as Record<string, unknown>)[`${side}_span`];
    if (!span || typeof span !== 'object') return [];
    const {start,end} = span as Record<string, unknown>;
    return typeof start==='number' && Number.isInteger(start) && typeof end==='number' && Number.isInteger(end) ? [{start,end}] : [];
  });
}
