import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../shared/api/client';
import { articleHref } from '../../../shared/navigation/articleRoutes';
import { QueryError } from '../../../shared/ui/QueryError';

export function PublishedClaimSearch() {
  const [draft, setDraft] = useState(''); const [q, setQ] = useState(''); const [offset, setOffset] = useState(0);
  const results = useQuery({ queryKey: ['published-claims', q, offset], queryFn: () => apiClient.get<{
    total: number; items: Array<{ id: string; article_id: string; text: string; title: string; domain: string; verdict: string | null }>;
  }>(`/corpus/claims?${new URLSearchParams({ q, offset: String(offset), limit: '20' })}`) });
  function submit(event: FormEvent) { event.preventDefault(); setQ(draft.trim()); setOffset(0); }
  return <section className="card-brutal-dark p-6 space-y-5"><h2 className="font-display text-3xl">Search published claims</h2>
    <p className="text-sm text-hermes-bone/70">Find saved statements and their recorded assessments. Text matching does not generate new evidence, determine truth or run AI.</p>
    <form onSubmit={submit} className="flex flex-wrap gap-3"><input aria-label="Search published claims" className="field-brutal flex-1 min-w-0" maxLength={300} value={draft} onChange={event => setDraft(event.target.value)} /><button className="btn-brutal">Search claims</button></form>
    {results.isPending && <p>Loading saved claims…</p>}{results.error && <QueryError title="Published claims unavailable" error={results.error} />}
    {results.data && <><p className="text-xs">{results.data.total} matching claims</p>{results.data.items.map(claim => <article key={claim.id} className="border-t border-hermes-bone/20 pt-5 space-y-3"><p className="text-sm leading-relaxed">{claim.text}</p><p className="text-xs text-hermes-bone/60">{claim.domain} · {claim.verdict || 'No recorded assessment'}</p><a href={articleHref(claim.article_id, 'evidence', { claim: claim.id })} className="btn-outline-dark">Open article and recorded assessment</a></article>)}
    <div className="flex gap-3"><button className="btn-outline-dark" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>Previous claims</button><button className="btn-outline-dark" disabled={offset + 20 >= results.data.total} onClick={() => setOffset(offset + 20)}>Next claims</button></div></>}
  </section>;
}
