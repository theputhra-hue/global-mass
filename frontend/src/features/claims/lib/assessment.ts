const explanations: Record<string, string> = {
  UNSUPPORTED: 'This stored assessment did not establish support in the checked material. It does not mean the statement is false or that only one source exists.',
  UNRESOLVED: 'The stored assessment is inconclusive. Review the available sources and context.',
  DISPUTED: 'The stored method flagged conflicting material. This does not establish which statement is correct.',
  SUPPORTED: 'The stored method assigned support. This is not independent factual verification.',
  PARTIALLY_SUPPORTED: 'The stored method assigned partial support. Inspect which parts have source evidence.',
  WEAKLY_CORROBORATED: 'The stored method assigned limited corroboration. Similar reports may share a source.',
};

export function assessmentExplanation(verdict: string | null | undefined): string {
  return explanations[verdict?.trim().toUpperCase() || ''] || 'No validated truth judgment is available from this stored label.';
}

/** Preserve the stored record; clarify only the historical probability wording on screen. */
export function assessmentRationale(rationale: string): string {
  return rationale.replace(/P\(supported\)\s*=/gi, 'Legacy heuristic score=')
    .replace(/(raises|lowers) confidence/gi, '$1 the heuristic score');
}
