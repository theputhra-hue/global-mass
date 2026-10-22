import type { ArticleDetail } from '../../../shared/api/articles';
import { extractionLabel } from '../lib/analysis';

export function AnalysisAvailability({ article, published }: { article: ArticleDetail; published: boolean }) {
  const count = article.assessment_counts;
  const body = article.body || '';
  const total = article.claims_total;
  const assessed = count ? Object.entries(count).reduce((sum, [label, total]) => sum + (label === 'UNASSESSED' ? 0 : total), 0) : null;
  const warnings = article.analysis_availability?.warnings || [
    ...(published ? ['Published means included in this release; it does not establish extraction completion.'] : []),
    ...(!published && article.nlp_status === 'completed' && typeof article.body === 'string' && !body.trim() ? ['Extraction is marked completed, but usable source text is missing.'] : []),
  ];
  return <section aria-label="Analysis availability" className="card-brutal-dark p-5 md:p-7 space-y-4">
    <h2 className="font-display text-2xl">What is available?</h2>
    <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
      <div><dt className="text-hermes-bone/55">Source text</dt><dd className="mt-2">{body.trim() ? 'Stored text available · completeness unknown' : published ? 'Not included in archive' : typeof article.body === 'string' ? 'Missing from local record' : 'Text availability not supplied'}</dd></div>
      <div><dt className="text-hermes-bone/55">Claim extraction</dt><dd className="mt-2">{extractionLabel(article, published)}</dd></div>
      <div><dt className="text-hermes-bone/55">Extracted statements</dt><dd className="mt-2">{total == null ? 'Count not supplied' : `${total.toLocaleString()} recorded${total ? '' : ' · content may need review'}`}</dd></div>
      <div><dt className="text-hermes-bone/55">Saved assessments</dt><dd className="mt-2">{assessed == null ? 'Count not supplied' : `${assessed.toLocaleString()} of ${total?.toLocaleString() ?? 'unknown'} statements · not independently validated`}</dd></div>
    </dl>
    {warnings.map((warning, index) => <p key={index} className="text-xs leading-relaxed text-hermes-bone/65">{warning}</p>)}
  </section>;
}
