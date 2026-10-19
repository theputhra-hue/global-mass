import { navigateHash, safeReturn } from './articleRoutes';
import { getSessionRevision } from './session';

export interface ComparisonDraft {
  older: string;
  newer: string;
  returnTo: string;
}

// One navigation handoff, kept out of URLs and browser storage and bound to the session.
let pending: { revision: number; draft: ComparisonDraft } | undefined;

export function openComparison(draft: ComparisonDraft): void {
  pending = { revision: getSessionRevision(), draft: { ...draft, returnTo: safeReturn(draft.returnTo) } };
  navigateHash('#/dashboard/compare');
}

export function getComparisonDraft(): ComparisonDraft | undefined {
  if (pending?.revision !== getSessionRevision()) pending = undefined;
  return pending?.draft;
}

export function clearComparisonDraft(draft: ComparisonDraft | undefined): void {
  if (pending?.draft === draft) pending = undefined;
}
