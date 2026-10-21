import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { investigationApi } from '../../../shared/api/investigation';
import { articleHref } from '../../../shared/navigation/articleRoutes';
import { topicHref, topicSections, type TopicRoute } from '../../../shared/navigation/topicRoutes';
import { QueryError } from '../../../shared/ui/QueryError';

const names = { coverage: 'Coverage', timeline: 'Timeline', connections: 'Connections', methods: 'Data & methods' };
const date = (value: string | null) => value ? new Date(value).toLocaleDateString() : 'Date unknown';
export function TopicInvestigation({ route }: { route: TopicRoute }) {
  const { id, release, section, offset, back } = route;
  const query = useQuery({ queryKey: ['topic-investigation', release, id, section === 'timeline', offset],
    queryFn: ({ signal }) => investigationApi.topic(id, release, offset, section === 'timeline', { signal }), enabled: route.valid, staleTime: 60_000 });
  const data = query.data;
  const here = topicHref(id, release, section, { back, offset });
  return <div className="space-y-6 min-w-0">
    <a href={back} className="inline-flex gap-2 text-sm underline underline-offset-4"><ArrowLeft size={16} />Back to exploration</a>
    {!route.valid ? <p role="alert">This topic link is invalid or missing its published release. Open a topic from the story map.</p> : <>
      {query.isPending && <p role="status">Loading topic coverage…</p>}
      {query.isError && <QueryError title="Topic coverage unavailable" error={query.error} onRetry={() => query.refetch()} />}
      {data && data.run_id !== release && <p role="alert">The release changed. Coverage is hidden to prevent mixing datasets.</p>}
      {data && data.run_id === release && <>
        <header className="space-y-4 border-b border-hermes-bone/15 pb-6">
          <p className="text-xs uppercase tracking-widest text-hermes-red-bright">Topic investigation · machine-generated grouping</p>
          <h1 className="font-display text-4xl md:text-5xl break-words">{data.topic.label}</h1>
          <p className="text-sm text-hermes-bone/70 max-w-3xl leading-relaxed">Read reporting grouped by related wording. A topic can mix events; membership does not establish shared claims, independent corroboration or misinformation.</p>
          <p className="text-sm">{data.total.toLocaleString()} articles · {data.sources.toLocaleString()} source domains · {date(data.earliest)}–{date(data.latest)}</p>
        </header>
        <nav aria-label="Topic sections" className="flex flex-wrap gap-2">{topicSections.map(key => <a key={key} href={topicHref(id, release, key, { back })} aria-current={key === section ? 'page' : undefined} className={key === section ? 'btn-brutal' : 'btn-outline-dark'}>{names[key]}</a>)}</nav>
        <section aria-labelledby="topic-section-heading" className="space-y-5">
          <h2 id="topic-section-heading" className="font-display text-3xl">{names[section]}</h2>
          {(section === 'coverage' || section === 'timeline') && <>
            <p className="text-sm text-hermes-bone/65">{section === 'timeline' ? 'Earliest publication first; unknown dates last. Publication order does not establish who copied whom.' : 'Latest publication first. Choose an article to inspect its text, saved analysis and related reporting.'}</p>
            <div className="grid md:grid-cols-2 gap-4">{data.items.map(item => <article key={item.id} className="card-brutal-dark p-6 space-y-4">
              <p className="text-xs text-hermes-bone/60">{item.domain} · {date(item.published_at)}</p><h3 className="font-display text-2xl break-words">{item.title}</h3>
              <p className="text-xs text-hermes-bone/60">Grouping input: {item.basis.replace(/_/g, ' ')}</p>
              <a className="btn-outline-dark" href={articleHref(item.id, 'overview', { back: here, release })}>Investigate article <ArrowRight size={14} /></a>
            </article>)}</div>
            {!data.items.length && <p>No articles on this page. Return to the first page of coverage.</p>}
            <div className="flex flex-wrap gap-4 text-sm items-center"><span>{data.items.length ? offset + 1 : 0}–{offset + data.items.length} of {data.total}</span>{offset > 0 && <a className="btn-outline-dark" href={topicHref(id, release, section, { back, offset: Math.max(0, offset - 20) })}>Previous articles</a>}{data.next_offset !== null && <a className="btn-outline-dark" href={topicHref(id, release, section, { back, offset: data.next_offset })}>Next articles</a>}</div>
          </>}
          {section === 'connections' && <>
            <p className="text-sm text-hermes-bone/65">Topic highways summarize retained semantic article pairs. Counts are supporting pairs, not people, readership or verified spread.</p>
            <a className="btn-outline-dark" href={`#/dashboard/atlas?${new URLSearchParams({ release, topic: id })}`}>View this topic on the map</a>
            {data.connections.length ? <div className="grid md:grid-cols-2 gap-4">{data.connections.map(connection => <article key={connection.neighbor_id} className="card-brutal-dark p-6 space-y-4"><h3 className="font-display text-2xl">{connection.neighbor_label}</h3><p className="text-sm">{connection.support} retained article pairs · {connection.endpoints_a} and {connection.endpoints_b} distinct endpoints</p><a className="underline" href={topicHref(connection.neighbor_id, release, 'coverage', { back: here })}>Explore related topic</a></article>)}</div> : <p>No qualifying topic highways were retained. This does not establish that the topic is isolated.</p>}
          </>}
          {section === 'methods' && <div className="card-brutal-dark p-6 space-y-5 text-sm leading-relaxed">
            <p>Topics and semantic streets are computed locally, reviewed and published as a completed release. They are exploratory and have not been validated as event or misinformation labels. Title-only input has less context than stored text.</p>
            <dl className="space-y-3 break-words">{[['Release', release], ['Method', data.methods.method || 'Not supplied'], ['Model', data.methods.embedding_model || 'Not supplied'], ['Model revision', data.methods.embedding_revision || 'Not supplied'], ['Analysis completed', data.methods.completed_at || 'Unknown']].map(([label, value]) => <div key={label}><dt className="text-hermes-bone/60">{label}</dt><dd>{value}</dd></div>)}</dl>
            <p>Source counts count distinct domains, not independent publishers. Coverage is limited to this dataset. This page never runs new AI analysis.</p>
          </div>}
        </section>
      </>}
    </>}
  </div>;
}
