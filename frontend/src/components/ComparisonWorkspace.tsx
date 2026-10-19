import { useEffect, useState } from 'react';
import { clearComparisonDraft, getComparisonDraft } from '../lib/comparisonNavigation';
import { MutationComparator } from './MutationComparator';
import { useSession } from '../lib/session';

export function ComparisonWorkspace() {
  const { revision } = useSession();
  const [handoff] = useState(() => ({ draft: getComparisonDraft(), revision }));
  const draft = handoff.revision === revision ? handoff.draft : undefined;
  // Read without consuming during render so StrictMode cannot discard the handoff.
  useEffect(() => { clearComparisonDraft(handoff.draft); }, [handoff]);
  return <div className="space-y-4">
    {draft && <div className="flex flex-wrap items-center gap-4 text-sm">
      <a className="underline underline-offset-4" href={draft.returnTo}>Back to article changes</a>
      <p className="text-hermes-bone/65">Selected article text is ready below. Review both versions before comparing.</p>
    </div>}
    <MutationComparator initialOlder={draft?.older} initialNewer={draft?.newer} />
  </div>;
}
