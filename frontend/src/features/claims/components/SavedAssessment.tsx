import type { ArticleClaim } from '../../../shared/api/articles';
import { safeHttpUrl } from '../../../shared/lib/urls';
import { assessmentExplanation, assessmentRationale } from '../lib/assessment';

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((v): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)).slice(0, 20) : [];
}

export function SavedAssessment({ claim, published = false }: { claim: ArticleClaim; published?: boolean }) {
  const evidence = claim.verdict_evidence;
  const availability = claim.evidence_availability;
  // Only explicitly stored passages are displayed; a neighboring claim is not promoted to source text.
  const passages = records(evidence?.evidence ?? evidence?.checked_neighbors).filter(record =>
    typeof record.passage === 'string' && record.passage.trim() && safeHttpUrl(typeof record.url === 'string' ? record.url : undefined));
  const omitted = availability?.status === 'not_published' || published;
  return <div className="border-l-2 border-hermes-red-bright/60 pl-4 space-y-3">
    <p className="text-xs font-mono">Saved assessment: <strong>{claim.verdict || 'No stored assessment'}</strong>{claim.verdict_probability == null ? '' : ` · heuristic support score ${claim.verdict_probability.toFixed(3)} (uncalibrated)`}</p>
    <p className="text-sm leading-relaxed text-hermes-bone/70">{assessmentExplanation(claim.verdict)}</p>
    {claim.verdict_rationale && <p className="text-sm leading-relaxed text-hermes-bone/70 whitespace-pre-wrap break-words">{assessmentRationale(claim.verdict_rationale)}</p>}
    <p className="text-xs text-hermes-bone/60">{omitted ? 'Evidence passages were not included in this published archive. The saved label cannot be independently checked from this record alone.' : passages.length ? 'Stored source passages are shown below. Their textual relationship is a model assessment, not proof of truth.' : 'No citable source passages are attached to this assessment. Signal metadata or a score alone is not supporting evidence.'}</p>
    {!omitted && passages.length > 0 && <div className="space-y-3" aria-label="Stored evidence passages">{passages.map((record, index) => <article key={index} className="border border-hermes-bone/20 p-4 space-y-2">
      <a className="underline text-xs" href={safeHttpUrl(String(record.url))} target="_blank" rel="noopener noreferrer">Open evidence source (opens in a new tab)</a>
      <blockquote className="border-l border-hermes-bone/30 pl-3 text-sm whitespace-pre-wrap">{String(record.passage)}</blockquote>
      <p className="text-xs">Recorded stance: {typeof record.stance === 'string' ? record.stance : 'Not recorded'}</p>
      <p className="text-xs">Source publication date: {typeof record.published_at === 'string' ? record.published_at : 'Not recorded'}</p>
    </article>)}</div>}
    <p className="text-xs text-hermes-bone/55">Assessment method: {availability?.method_version || (typeof evidence?.method_version === 'string' ? evidence.method_version : 'Not recorded')} · Scores are not probabilities of truth. Reading this page does not rescore the claim.</p>
    {evidence && <details className="text-xs"><summary className="cursor-pointer">Original stored assessment metadata</summary><pre className="mt-3 whitespace-pre-wrap break-words">{JSON.stringify(evidence, null, 2)}</pre></details>}
  </div>;
}
