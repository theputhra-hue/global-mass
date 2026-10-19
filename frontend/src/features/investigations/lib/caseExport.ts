import type { CaseDetail } from '../../../shared/api/casebook';
import { downloadApiResponse } from '../../../shared/lib/download';

export function caseMarkdown(item: CaseDetail): string {
  const { inputs, analysis } = item.snapshot;
  return [
    `# ${item.title.replace(/[\r\n]/g, ' ')}`, '',
    `Captured: ${item.snapshot.captured_at}`, `Status: ${item.status} (analyst review only)`,
    `Method: ${String(analysis.algorithm_version ?? 'not reported')}`, '',
    '## Text A', '', inputs.older_text, '', '## Text B', '', inputs.newer_text, '',
    '## Text changes', '', `Types: ${analysis.mutation_types.join(', ')}`, '',
    `Relation: ${String(analysis.relation_category ?? 'unknown')}`, '',
    String(analysis.relation_explanation ?? ''), '',
    '## Analyst notes', '', item.notes || 'No analyst notes.', '',
    '## Interpretation', '', item.snapshot.interpretation, '',
    `Snapshot SHA-256: ${item.snapshot_sha256}`, '',
    'The fingerprint identifies the immutable snapshot; it is not proof of factual correctness.',
  ].join('\n');
}

export function exportCase(item: CaseDetail, format: 'json' | 'md'): void {
  const body = format === 'json' ? JSON.stringify(item, null, 2) : caseMarkdown(item);
  downloadApiResponse({blob: new Blob([body], {type: format === 'json' ? 'application/json' : 'text/markdown;charset=utf-8'}), filename: `gmee-case-${item.id}.${format}`});
}
