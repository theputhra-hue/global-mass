import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Database,
  Network,
  Terminal,
  HardDrive,
  Radar,
  GitBranch,
  ShieldCheck,
} from 'lucide-react';
import { useSession } from '../lib/session';
import { fetchDashboard } from '../api/dashboard';
import { AsciiGlobe } from '../components/AsciiGlobe';
import { AsciiTicker } from '../components/AsciiTicker';
import { AsciiReveal } from '../components/AsciiReveal';
import { LiveAuditFeed } from '../components/LiveAuditFeed';
import { QueryError } from '../components/QueryError';
import { usePollingPolicy } from '../lib/polling';

/**
 * GMEE landing page — editorial-brutalist poster in the red-immersion palette.
 * One solid-crimson moment (footer CTA band); the hero is an ink panel where
 * the animated ASCII globe carries all the drama. Sections reveal on scroll
 * (once, gentle, reduced-motion safe).
 */

/* -------------------------------- data -------------------------------- */

const HERO_LABELS = ['claims indexed', 'graph nodes', 'graph relationships', 'ready services'];

const TICKER_ITEMS = [
  'COMPARE CLAIMS ACROSS COLLECTED ARTICLES',
  'PGVECTOR · HNSW · 768-D EMBEDDINGS',
  'NEO4J CLAIM RELATIONSHIP GRAPH',
  'SOURCE-ATTRIBUTED INGEST STREAM',
  'REDIS-METERED INGEST QUEUE',
];

const CAPABILITIES = [
  {
    icon: Database,
    title: 'Semantic Vector Search',
    body: 'Search available article embeddings with pgvector. Nearest-neighbor cosine similarity surfaces related corpus coverage; similarity alone does not prove shared facts.',
    meta: 'PGVECTOR · HNSW · 768-D',
  },
  {
    icon: Network,
    title: 'Claim Relationship Graph',
    body: 'Explore linked articles and claim relationships. Similarity and mutation edges help compare coverage; they do not establish causal propagation or coordinated amplification.',
    meta: 'NEO4J · BOLT · CYPHER',
  },
  {
    icon: Terminal,
    title: 'Live Audit Stream',
    body: 'Inspect the newest collected articles, with source attribution and collection times from the corpus API.',
    meta: 'API SNAPSHOTS · SOURCE LINKS',
  },
  {
    icon: HardDrive,
    title: 'Rate-Limited Ingest Queue',
    body: 'Inspect configured collection jobs, processing stages and recovery controls. Redis supports rate limiting, queue coordination and session revocation.',
    meta: 'REDIS · JWT BLOCKLIST',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Ingest',
    body: 'Collect articles from configured sources, process their text and extract candidate claims. Coverage depends on the available sources and successful processing.',
  },
  {
    n: '02',
    title: 'Compare',
    body: 'Use vector similarity and mutation analysis to identify candidate relationships between claims. Inspect the evidence behind each relationship.',
  },
  {
    n: '03',
    title: 'Review',
    body: 'Explore corpus timelines, evidence passages and heuristic alerts. Use blinded annotation to collect independent judgments for evaluation.',
  },
];

export const Landing: React.FC = () => {
  const { user } = useSession();
  const polling = usePollingPolicy(30_000);
  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: ({ signal }) => fetchDashboard({ signal }),
    ...polling,
    staleTime: 15_000,
    enabled: Boolean(user),
  });
  const snapshot = user ? dashboard.data : undefined;

  const heroStats = useMemo(() => {
    const format = (value: number | undefined) => value === undefined ? '—' : value.toLocaleString();
    const graph = snapshot?.graph?.available ? snapshot.graph : null;
    const values = [
      format(snapshot?.claims_total),
      format(graph ? Object.values(graph.nodes).reduce((sum, value) => sum + value, 0) : undefined),
      format(graph?.relationships),
      snapshot?.services ? `${Object.values(snapshot.services).filter((status) => status === 'ok').length} / 3` : '—',
    ];
    return HERO_LABELS.map((label, index) => ({ k: values[index], label }));
  }, [snapshot]);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Paper grain */}
      <div className="fixed inset-0 z-0 pointer-events-none grain-overlay" />

      {/* ------------------------------ Top bar ------------------------------ */}
      <header className="relative z-10 border-b border-hermes-ink/90 bg-hermes-paper">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="chip-brutal bg-hermes-red text-hermes-bone border-hermes-ink/90">
              GMEE
            </span>
            <span className="hidden sm:inline text-[11px] font-mono uppercase tracking-widest text-hermes-ink/60">
              v1.0 telemetry
            </span>
          </div>
          <a href={user ? "#/dashboard" : "#/signin"} className="btn-brutal !py-1.5 !px-3">
            {user ? 'Command Center' : 'Sign in'} <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* -------------------------------- Hero -------------------------------- */}
      <section className="relative z-10 bg-hermes-ink text-hermes-bone border-b border-hermes-ink/90">
        <div className="max-w-7xl mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center py-14 md:py-20">
          {/* Copy */}
          <div className="flex flex-col items-start gap-6">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-hermes-red-bright flex items-center gap-2">
              <Radar className="w-4 h-4" />
              Global Misinformation Evolution Engine
            </p>
            <h1 className="text-5xl md:text-7xl font-display leading-[0.98] tracking-tight">
              Explore how claims
              <br />
              differ across{' '}
              <em className="text-hermes-red-bright">sources</em>.
            </h1>
            <p className="text-sm md:text-base font-mono leading-relaxed text-hermes-bone/70 max-w-md">
              GMEE collects configured news sources, extracts candidate claims,
              and compares them within the available corpus. Explore related
              coverage, inspect evidence and annotate changes. Similarity links
              do not establish truth, misinformation or causal spread.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a href={user ? "#/dashboard" : "#/signin"} className="btn-brutal">
                {user ? 'Open dashboard' : 'Sign in to explore'} <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#/project" className="btn-outline-dark">Try engineering controls</a>
              <a
                href="#about"
                className="btn-ghost-brutal !text-hermes-bone !border-hermes-bone/40 hover:!border-hermes-bone"
              >
                What is GMEE?
              </a>
            </div>
          </div>

          {/* Globe */}
          <div className="relative w-full max-w-[520px] aspect-square mx-auto">
            <AsciiGlobe className="absolute inset-0" />
            <span className="absolute top-2 right-2 font-mono text-[10px] tracking-widest text-hermes-red-bright/80 uppercase">
              ◉ decorative globe · ascii raster
            </span>
            <span className="absolute bottom-2 left-2 font-mono text-[10px] tracking-widest text-hermes-bone/40 uppercase">
              rev 48s · scan 14s
            </span>
          </div>
        </div>

        {user && dashboard.isLoading && <p role="status" className="max-w-7xl mx-auto px-4 md:px-8 pb-4 font-mono text-xs">Connecting to real dashboard metrics…</p>}
        {user && dashboard.isError && <div className="max-w-7xl mx-auto px-4 md:px-8 pb-4"><QueryError title="Dashboard metrics unavailable" error={dashboard.error} onRetry={() => dashboard.refetch()} retrying={dashboard.isFetching} />
          {snapshot && <p className="font-mono text-xs mt-2">Last real snapshot: {snapshot.generated_at}. Values may be stale.</p>}
        </div>}
        {/* Stats strip */}
        <div className="border-t border-hermes-bone/15">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {heroStats.map((s) => (
              <div key={s.label} className="flex flex-col">
                <span className="font-display text-2xl md:text-3xl tabular-nums">
                  {s.k}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-hermes-bone/50">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------- Ticker stripe --------------------------- */}
      <div
        className="relative z-10 border-b border-hermes-ink/90 bg-hermes-paper py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-hermes-ink/80"
      >
        <AsciiTicker items={TICKER_ITEMS} speed={10} />
      </div>

      {/* ------------------------------- About -------------------------------- */}
      <main id="about" className="relative z-10 flex-1">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-14 md:py-20 flex flex-col gap-12">
          <AsciiReveal className="flex flex-col gap-2 max-w-2xl">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-hermes-red">
              What this site is
            </p>
            <h2 className="text-3xl md:text-5xl font-display tracking-tight">
              An observatory for claim variation.
            </h2>
            <p className="text-sm font-mono leading-relaxed text-hermes-ink/70">
              GMEE brings source collection, semantic retrieval, relationship
              graphs and human review into one research workspace. Its scores
              are heuristic signals whose accuracy requires independent
              evaluation on a documented benchmark.
            </p>
          </AsciiReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {CAPABILITIES.map((c) => (
              <AsciiReveal key={c.title}>
                <div className="card-brutal card-brutal-hover p-6 flex flex-col gap-3 h-full">
                  <div className="flex items-center justify-between">
                    <span className="p-2.5 border border-hermes-ink/90 bg-hermes-red text-hermes-bone">
                      <c.icon className="w-5 h-5" />
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-hermes-ink/40">
                      {c.meta}
                    </span>
                  </div>
                  <h3 className="text-xl font-display">{c.title}</h3>
                  <p className="text-xs font-mono leading-relaxed text-hermes-ink/70">
                    {c.body}
                  </p>
                </div>
              </AsciiReveal>
            ))}
          </div>

          {/* Pipeline steps */}
          <AsciiReveal>
            <div className="border border-hermes-ink/90 bg-hermes-blush shadow-[4px_4px_0_0_rgba(26,6,8,1)]">
              <div className="px-5 md:px-6 py-3 border-b border-hermes-ink/90 bg-hermes-red text-hermes-bone flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-widest">
                  The pipeline
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-hermes-ink/20">
                {STEPS.map((s) => (
                  <div key={s.n} className="p-5 md:p-6 flex flex-col gap-2">
                    <span className="font-mono text-[11px] font-bold text-hermes-red">
                      {s.n}
                    </span>
                    <h3 className="text-lg font-display">{s.title}</h3>
                    <p className="text-xs font-mono leading-relaxed text-hermes-ink/70">
                      {s.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </AsciiReveal>

          {/* ------------------------ Live engine output ------------------------ */}
          <AsciiReveal>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr] gap-8 items-center">
              <div className="flex flex-col gap-3">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.28em] text-hermes-red">
                  Live engine output
                </p>
                <h2 className="text-3xl md:text-4xl font-display tracking-tight">
                  The engine shows its work.
                </h2>
                <p className="text-sm font-mono leading-relaxed text-hermes-ink/70">
                  The ingest stream shows real collected articles and their
                  sources — the same corpus feed operators inspect in the
                  command center. An unavailable service stays visibly unavailable.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="chip-brutal bg-hermes-ink text-hermes-bone border-hermes-ink/90">
                    Real corpus
                  </span>
                  <span className="chip-brutal border-hermes-ink/60 text-hermes-ink/70">
                    API snapshots
                  </span>
                  <span className="chip-brutal border-hermes-ink/60 text-hermes-ink/70">
                    Source attribution
                  </span>
                </div>
              </div>
              {user ? <LiveAuditFeed /> : <div className="border border-hermes-ink/20 p-8 flex flex-col items-start justify-center gap-4"><p className="font-mono text-sm">Sign in to view articles and live corpus data.</p><a href="#/signin" className="btn-brutal">Sign in <ArrowRight className="w-4 h-4" /></a></div>}
            </div>
          </AsciiReveal>
        </div>
      </main>

      {/* ------------------------------ CTA band ------------------------------ */}
      <footer className="relative z-10 bg-hermes-red text-hermes-bone border-t border-hermes-ink/90">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-3xl md:text-4xl font-display tracking-tight">
              Ready to inspect the evidence?
            </h2>
            <p className="font-mono text-xs text-hermes-bone/75 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Real telemetry · optional labelled infrastructure demo
            </p>
          </div>
          <a
            href={user ? "#/dashboard" : "#/signin"}
            className="inline-flex items-center gap-2 border border-hermes-ink/90 bg-hermes-ink text-hermes-bone font-mono text-xs font-bold uppercase tracking-wider px-5 py-3 shadow-[3px_3px_0_0_rgba(26,6,8,1)] transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_rgba(26,6,8,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
          >
            Open {user ? 'Command Center' : 'Sign in'} <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <div className="border-t border-hermes-bone/20">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 font-mono text-[10px] uppercase tracking-widest text-hermes-bone/60 flex items-center justify-between">
            <span>GMEE // Global Misinformation Evolution Engine</span>
            <span className="hidden sm:inline">pgvector · neo4j · redis</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
