import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Search, GitCompare } from 'lucide-react';
import { useSession } from '../../../shared/session/session';
import { fetchDashboard } from '../../../shared/api/dashboard';
import { AsciiGlobe } from '../../../shared/ui/decorative/AsciiGlobe';
import { QueryError } from '../../../shared/ui/QueryError';
import { usePublicationRuntime } from '../../../shared/runtime/publicationRuntime';

const steps = [
  { icon: Search, n: '01', title: 'Search for an article', text: 'Enter words from a title or the name of an author. Results come from this collection, not the whole web.' },
  { icon: BookOpen, n: '02', title: 'Open its details', text: 'See the source, publication date and extracted statements together on one article page.' },
  { icon: GitCompare, n: '03', title: 'Investigate a statement', text: 'Read its saved assessment, compare wording, or follow the original source for context.' },
];

export function Landing() {
  const { user } = useSession();
  const runtime = usePublicationRuntime();
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: ({ signal }) => fetchDashboard({ signal }), enabled: Boolean(user), staleTime: 60_000 });
  const snapshot = user ? dashboard.data : undefined;
  const stats = useMemo(() => {
    const format = (value: number | undefined) => value === undefined ? '—' : value.toLocaleString();
    const graph = snapshot?.graph?.available ? snapshot.graph : null;
    return [
      ['claims indexed', format(snapshot?.claims_total)],
      ['graph nodes', format(graph ? Object.values(graph.nodes).reduce((sum, n) => sum + n, 0) : undefined)],
      ['graph relationships', format(graph?.relationships)],
      ['ready services', snapshot?.services ? `${Object.values(snapshot.services).filter(s => s === 'ok').length} / 3` : '—'],
    ];
  }, [snapshot]);
  return <div className="min-h-screen bg-hermes-ink text-hermes-bone font-mono relative isolate">
    <div className="fixed inset-0 -z-10 pointer-events-none grain-overlay" aria-hidden="true" />
    <header className="border-b border-hermes-bone/15 px-4 md:px-8 py-5 flex items-center justify-between gap-4">
      <a href="#/" className="font-display text-3xl">GMEE</a>
      <a href={user ? '#/dashboard' : '#/signin'} className="btn-outline-dark">{user ? 'Explore articles' : 'Sign in'} <ArrowRight className="w-4 h-4" /></a>
    </header>
    <main id="main-content">
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-20 grid lg:grid-cols-[1.5fr_1fr] gap-10 items-center">
        <div className="space-y-6 max-w-3xl">
          <p className="text-[11px] uppercase tracking-widest text-hermes-red-bright">A research collection of news articles</p>
          <h1 className="font-display text-5xl md:text-7xl leading-tight">Find a story.<br /><span className="text-hermes-red-bright">Look closer.</span></h1>
          <p className="text-sm md:text-base leading-relaxed text-hermes-bone/75 max-w-xl">Search collected news articles, open a report, and inspect the statements extracted from it. Follow the original source to read the full story.</p>
          <a href={user ? '#/dashboard' : '#/signin'} className="btn-brutal">{user ? 'Explore the collection' : 'Sign in to explore'} <ArrowRight className="w-4 h-4" /></a>
          <p className="text-xs text-hermes-bone/55">{runtime.mode === 'published' ? 'A published archive. New AI analysis runs on the developers’ PC.' : 'Search the available collection. Analysis and tool availability depend on the workspace.'}</p>
        </div>
        <div className="relative hidden lg:block w-full max-w-[330px] aspect-square mx-auto" aria-hidden="true"><AsciiGlobe className="absolute inset-0" /><span className="absolute bottom-0 text-[9px] uppercase tracking-widest text-hermes-bone/40">decorative globe · not a data visualization</span></div>
      </section>
      <section aria-labelledby="reading-steps" className="border-y border-hermes-bone/15 bg-hermes-panel px-4 md:px-8 py-10">
        <div className="max-w-7xl mx-auto space-y-6"><h2 id="reading-steps" className="font-display text-3xl">Your first visit, in three steps.</h2>
          <ol className="grid md:grid-cols-3 gap-6">{steps.map(({ icon: Icon, n, title, text }) => <li key={n} className="border-t border-hermes-bone/20 pt-5 space-y-3"><div className="flex justify-between text-hermes-red-bright"><Icon className="w-5 h-5" /><span className="text-xs">{n}</span></div><h3 className="font-display text-2xl">{title}</h3><p className="text-sm leading-relaxed text-hermes-bone/65">{text}</p></li>)}</ol>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-14 grid md:grid-cols-2 gap-8">
        <div className="space-y-4"><p className="text-[10px] uppercase tracking-widest text-hermes-red-bright">Before you begin</p><h2 className="font-display text-3xl">A claim is a statement.<br />It is not a verified fact.</h2><p className="text-sm leading-relaxed text-hermes-bone/65">GMEE helps you inspect reporting and compare wording. Extracted statements and saved model assessments can be incomplete or wrong. Similarity does not prove copying or misinformation.</p></div>
        <div className="card-brutal-dark p-6 space-y-4"><h2 className="font-display text-3xl">What will you find?</h2><ul className="space-y-3 text-sm text-hermes-bone/70"><li>Source articles, with their original links and dates.</li><li>Statements extracted during earlier analysis.</li><li>Saved assessments and relationships, where available.</li></ul><p className="text-xs text-hermes-bone/50">Full article text and related coverage may be unavailable for some records. Each detail page explains what is stored.</p></div>
      </section>
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-12 space-y-5">
        <details className="border border-hermes-bone/20 p-5"><summary className="cursor-pointer text-sm">More about the project &amp; technical details</summary><div className="pt-5 space-y-5"><p className="text-sm text-hermes-bone/65">GMEE stands for Global Misinformation Evolution Engine. It supports research into differences between reports. Technical tools, methods and authored analyzer controls are available separately.</p><a href="#/project" className="btn-outline-dark">Try engineering controls <ArrowRight className="w-4 h-4" /></a>
          {!user && <p className="text-xs">Sign in to view articles and collection data.</p>}
          {user && dashboard.isPending && <p role="status" className="text-xs">Connecting to real dashboard metrics…</p>}
          {user && dashboard.isError && <QueryError title="Dashboard metrics unavailable" error={dashboard.error} onRetry={() => dashboard.refetch()} />}
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-5">{stats.map(([label, value]) => <div key={label}><dt className="text-[10px] uppercase text-hermes-bone/55">{label}</dt><dd className="font-display text-2xl mt-2">{value}</dd></div>)}</dl>
          <p className="text-xs text-hermes-bone/50">Technical counts describe stored records and service responses, not the accuracy of this research.</p>
        </div></details>
      </section>
    </main>
    <footer className="border-t border-hermes-bone/15 px-4 md:px-8 py-5 text-[10px] text-hermes-bone/50 uppercase tracking-widest">GMEE · Sources first. Interpret results with context.</footer>
  </div>;
}
