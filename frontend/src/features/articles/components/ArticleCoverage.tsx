import { useQuery } from '@tanstack/react-query';
import { investigationApi } from '../../../shared/api/investigation';
import { articleHref } from '../../../shared/navigation/articleRoutes';
import { topicHref } from '../../../shared/navigation/topicRoutes';
import { QueryError } from '../../../shared/ui/QueryError';

export function ArticleCoverage({ id, release, back, compact = false }: { id: string; release?: string; back: string; compact?: boolean }) {
  const context = useQuery({ queryKey: ['article-context', release, id], queryFn: ({ signal }) => investigationApi.context(id, release!, { signal }), enabled: !!release, staleTime: 60_000 });
  if (!release) return null;
  if (context.isPending) return <p role="status">Loading topic context…</p>;
  if (context.isError) return <QueryError title="Topic context unavailable" error={context.error} onRetry={() => context.refetch()} />;
  const data = context.data;
  if (!data || data.run_id !== release || data.article_id !== id) return <p role="alert">Topic context does not match this article and release. It is hidden.</p>;
  return <section aria-label="Topic and semantic coverage" className="card-brutal-dark p-6 space-y-4">
    <h3 className="font-display text-2xl">{compact ? 'The wider story' : 'Similar reporting'}</h3>
    {data.topic ? <div className="space-y-3"><p className="text-sm">Topic group: <strong>{data.topic.label}</strong> · {data.topic.article_count} articles</p><a className="btn-outline-dark" href={topicHref(data.topic.id, release, 'coverage', { back })}>Explore topic coverage</a></div> : <p className="text-sm">No topic was assigned to this article. Unclassified does not mean unrelated.</p>}
    <p className="text-sm text-hermes-bone/65">{data.neighbors.length} retained semantic neighbors. Similar wording does not establish the same event, agreement, truth or observed transmission.</p>
    {!compact && <>
      {!data.network_available && <p className="text-sm">A semantic street network has not been published for this release.</p>}
      {data.network_available && !data.neighbors.length && <p className="text-sm">No semantic pairs passed the published retention rules for this article. Explore its topic or search other reporting.</p>}
      <div className="grid md:grid-cols-2 gap-4">{data.neighbors.map(item => <article key={item.id} className="border border-hermes-bone/20 p-5 space-y-3"><p className="text-xs text-hermes-bone/60">{item.domain} · {item.published_at ? new Date(item.published_at).toLocaleDateString() : 'Date unknown'}</p><h4 className="font-display text-xl">{item.title}</h4><p className="text-xs text-hermes-bone/65">Cosine similarity {item.score.toFixed(3)} · grouping input: {item.basis.replace(/_/g, ' ')}</p><div className="flex flex-wrap gap-4 text-sm"><a className="underline" href={articleHref(item.id, 'overview', { back, release })}>Investigate related article</a><a className="underline" href={articleHref(id, 'changes', { back, release, against: item.id })}>Compare with this source</a></div></article>)}</div>
    </>}
  </section>;
}
