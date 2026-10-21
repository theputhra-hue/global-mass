import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { casebookApi } from '../../../shared/api/casebook';
import type { MutationComparisonInput } from '../../../shared/api/features';
import { ApiError } from '../../../shared/api/client';
import { safeReturn } from '../../../shared/navigation/articleRoutes';
import { QueryError } from '../../../shared/ui/QueryError';

export function SaveComparisonCase({ input, title: initialTitle, back }: { input: MutationComparisonInput; title: string; back?: string }) {
  const id = useId(), client = useQueryClient();
  const [title, setTitle] = useState(initialTitle.slice(0, 160)), [notes, setNotes] = useState('');
  const save = useMutation({ mutationFn: () => casebookApi.create({ title: title.trim(), notes, comparison: input }),
    onSuccess: () => { void client.invalidateQueries({ queryKey: ['casebook'] }); } });
  const uncertain = save.error instanceof ApiError && ['timeout', 'network'].includes(save.error.kind);
  return <section aria-label="Save comparison and notes" className="border-t border-hermes-bone/20 pt-5 space-y-4">
    <h3 className="font-display text-2xl">Keep this investigation</h3>
    <p className="text-sm text-hermes-bone/65">Save this exact pair, its source context and your private notes. The server computes the saved comparison again.</p>
    <div><label htmlFor={`${id}-title`} className="block text-sm mb-2">Investigation title</label><input id={`${id}-title`} className="field-brutal w-full" value={title} maxLength={160} disabled={save.isPending || save.isSuccess || uncertain} onChange={e => setTitle(e.target.value)} /></div>
    <div><label htmlFor={`${id}-notes`} className="block text-sm mb-2">Private review notes</label><textarea id={`${id}-notes`} className="field-brutal w-full" rows={4} value={notes} maxLength={4000} disabled={save.isPending || save.isSuccess || uncertain} onChange={e => setNotes(e.target.value)} /></div>
    <button type="button" className="btn-brutal" disabled={!title.trim() || save.isPending || save.isSuccess || uncertain} onClick={() => save.mutate()}>{save.isSuccess ? 'Investigation saved' : save.isPending ? 'Saving investigation…' : 'Save comparison & notes'}</button>
    {save.isError && <QueryError title="Save did not confirm completion" error={save.error} />}
    {uncertain && <p role="alert">The save outcome is uncertain. Check Saved investigations before attempting another save.</p>}
    {save.data && <p role="status">Saved privately. <a className="underline" href={`#/dashboard/casebook?${new URLSearchParams({ case: save.data.id, ...(back ? { back: safeReturn(back) } : {}) })}`}>Open saved investigation to review or export</a>.</p>}
  </section>;
}
