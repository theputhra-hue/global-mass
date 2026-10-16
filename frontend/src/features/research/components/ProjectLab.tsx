import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Download, FlaskConical, BookOpen, GitCompare, Network, Search, ClipboardCheck } from 'lucide-react';
import { apiClient } from '../../../shared/api/client';
import type { MutationComparison, MutationComparisonInput } from '../../../shared/api/features';
import type { TabType } from '../../../shared/navigation/tabs';
import { downloadApiResponse } from '../../../shared/lib/download';
import { QueryError } from '../../../shared/ui/QueryError';
import { TextSpans } from '../../comparison/components/TextSpans';
import { returnedSpans } from '../../comparison/lib/textSpans';

interface Challenge {
  id: string; title: string; group: string; older_text: string; newer_text: string;
  expected_change: boolean; required_type: string | null; passed: boolean;
  lexical_baseline_change: boolean; lexical_baseline_passed: boolean;
  analysis: MutationComparison['analysis'];
}
interface LabReport {
  algorithm_version: string; dataset_sha256: string; origin: string; research_gold: boolean;
  total: number; passed: number; lexical_baseline_passed: number; warning: string; items: Challenge[];
  runtime_mode?: string;
}

const JOURNEY: {title: string; detail: string; tab: TabType; icon: typeof Search}[] = [
  {title: 'Explore the corpus', detail: 'Find collected articles and inspect their source text.', tab: 'corpus', icon: Search},
  {title: 'Inspect a relationship', detail: 'Follow linked coverage through the graph and timeline.', tab: 'fullgraph', icon: Network},
  {title: 'Check the evidence', detail: 'Retrieve cited passages and inspect stance or abstention.', tab: 'factcheck', icon: BookOpen},
  {title: 'Preserve an investigation', detail: 'Compare a pair, record notes and export a traceable case.', tab: 'casebook', icon: GitCompare},
  {title: 'Review independently', detail: 'Annotate blinded pairs with the versioned human rubric.', tab: 'eval', icon: ClipboardCheck},
];

export function ProjectLab({navigate, investigate, publicMode = false}: {navigate: (tab: TabType) => void; investigate: (input: MutationComparisonInput) => void; publicMode?: boolean}) {
  const [selected, setSelected] = useState('distance');
  const [group, setGroup] = useState('All');
  const report = useQuery({queryKey: ['project-lab'], queryFn: ({signal}) => apiClient.get<LabReport>('/project/lab', {signal}), staleTime: Infinity});
  const data = report.data;
  const preview = data?.runtime_mode === 'offline_preview';
  const workspaceDisabled = publicMode && (!data || preview);
  const sample = data?.items.find(item => item.id === selected) ?? data?.items[0];
  return <div className="space-y-8">
    <section className="card-brutal-dark p-6 md:p-8 relative overflow-hidden">
      <div className="absolute -right-8 -top-12 text-[180px] font-display text-hermes-bone/[0.025] select-none pointer-events-none">GMEE</div>
      <p className="text-xs uppercase tracking-[0.25em] text-hermes-red-bright font-mono mb-3">Project Lab / start here</p>
      <h2 className="font-display text-3xl md:text-5xl max-w-3xl">Follow the evidence.<br/><span className="text-hermes-bone/45">Explain every change.</span></h2>
      <p className="max-w-2xl mt-4 text-sm text-hermes-bone/65 leading-relaxed">A guided workspace for comparing claims across sources. Start with the reproducible controls below, then investigate real corpus material, preserve your analysis and collect independent human review.</p>
      {data?.runtime_mode === 'offline_preview' && <p role="status" className="mt-4 border border-amber-400/30 text-amber-200 p-3 text-xs font-mono">Local preview · the engineering controls run the real text-change engine. Database, graph, accounts and model services require Docker and are offline.</p>}
      {publicMode && <p className="text-xs text-hermes-bone/60 mt-4">{preview ? 'Workspace actions are unavailable in this local preview. Start the full application after its services recover.' : 'The workspace actions below open sign-in before accessing corpus data or saving work.'}</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-7">{JOURNEY.map((step, index) => <button type="button" key={step.tab} disabled={workspaceDisabled} onClick={() => navigate(step.tab)} className="text-left border border-hermes-bone/15 hover:border-hermes-red-bright p-4 bg-hermes-ink/40 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed">
        <div className="flex justify-between items-center mb-4"><span className="font-mono text-xs text-hermes-bone/35">0{index + 1}</span><step.icon className="w-4 h-4 text-hermes-red-bright"/></div>
        <h3 className="text-sm font-bold mb-2">{step.title}</h3><p className="text-xs leading-relaxed text-hermes-bone/50">{step.detail}</p>{publicMode && <p className="mt-3 text-[10px] uppercase tracking-wider text-hermes-bone/50">{preview ? 'Full application required' : 'Sign in required'}</p>}<ArrowRight className="w-4 h-4 mt-4 text-hermes-bone/30 group-hover:text-hermes-red-bright"/>
      </button>)}</div>
    </section>
    <section className="card-brutal-dark p-6 space-y-5">
      <div className="flex flex-wrap justify-between gap-4 items-start"><div><h2 className="font-display text-2xl flex gap-2 items-center"><FlaskConical className="w-5 h-5 text-hermes-red-bright"/>Engineering challenge suite</h2><p className="font-mono text-xs text-hermes-bone/50 mt-2">Authored controls · deterministic analysis · no research gold</p></div>
      {data && <button type="button" className="btn-ghost-brutal text-xs" onClick={() => downloadApiResponse({blob:new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),filename:'gmee-engineering-challenges.json'})}><Download className="w-3.5 h-3.5"/>Export controls & results</button>}</div>
      {report.isPending && <p role="status" className="font-mono text-xs">Running the published engineering controls…</p>}
      {report.isError && <QueryError title="Project controls unavailable" error={report.error} onRetry={() => report.refetch()}/>}
      {data && <>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="border border-emerald-400/25 p-4"><p className="font-mono text-xs text-hermes-bone/50">TYPED ANALYZER / CONTROLS PASSED</p><p className="font-display text-4xl text-emerald-300 mt-2">{data.passed}<span className="text-xl text-hermes-bone/40"> / {data.total}</span></p></div>
          <div className="border border-hermes-bone/15 p-4"><p className="font-mono text-xs text-hermes-bone/50">LEXICAL TOKEN BASELINE / PASSED</p><p className="font-display text-4xl mt-2">{data.lexical_baseline_passed}<span className="text-xl text-hermes-bone/40"> / {data.total}</span></p></div>
          <div className="border border-hermes-bone/15 p-4"><p className="font-mono text-xs text-hermes-bone/50">WHAT THIS MEASURES</p><p className="text-sm mt-3 leading-relaxed">Rule behavior on disclosed examples. Natural-news accuracy requires a separate human benchmark.</p></div>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Challenge groups">{['All','Numbers','Context','Controls'].map(value => <button key={value} type="button" aria-pressed={value===group} onClick={() => {setGroup(value); if(value!=='All' && sample?.group!==value){const first=data.items.find(item=>item.group===value);if(first)setSelected(first.id);}}} className={`chip-brutal cursor-pointer ${value===group?'border-hermes-red-bright text-hermes-red-bright':''}`}>{value}</button>)}</div>
        <div className="grid lg:grid-cols-[260px_1fr] gap-5"><div className="space-y-2" aria-label="Challenge examples">{data.items.filter(item => group==='All'||item.group===group).map(item => <button key={item.id} type="button" aria-pressed={item.id===sample?.id} onClick={() => setSelected(item.id)} className={`w-full text-left flex items-center justify-between p-3 border text-sm ${item.id===sample?.id?'border-hermes-red-bright bg-hermes-red-bright/5':'border-hermes-bone/15'}`}><span>{item.title}</span><span className="text-xs font-mono text-hermes-bone/50">{item.passed?'PASS':'FAIL'}</span></button>)}</div>
        {sample && <article className="border border-hermes-bone/20 p-5 space-y-4" aria-label="Selected challenge analysis">
          <div className="flex items-center gap-2"><CheckCircle2 className={`w-4 h-4 ${sample.passed?'text-emerald-300':'text-amber-300'}`}/><h3 className="font-display text-xl">{sample.title}</h3></div>
          <div className="grid md:grid-cols-2 gap-3">{[['TEXT A',sample.older_text],['TEXT B',sample.newer_text]].map(([label,text]) => <div key={label} className="bg-hermes-ink p-4 border border-hermes-bone/10"><p className="font-mono text-[10px] text-hermes-bone/40 mb-2">{label}</p><p className="text-sm leading-relaxed"><TextSpans text={text} spans={returnedSpans(sample.analysis,label==='TEXT A'?'older':'newer')}/></p></div>)}</div>
          <p className="text-xs font-mono text-emerald-300">{String(sample.analysis.relation_category).replace(/_/g,' ')}</p>
          <p className="text-sm text-hermes-bone/70">{String(sample.analysis.relation_explanation)}</p>
          <div className="flex flex-wrap gap-2">{sample.analysis.mutation_types.map(type => <span key={type} className="chip-brutal text-xs">{type}</span>)}</div>
          <div className="text-xs text-hermes-bone/60 space-y-2"><p>Expected meaningful change: {sample.expected_change?'yes':'no'} · lexical baseline: {sample.lexical_baseline_change?'change':'no change'}</p><p>No observed propagation. A correction cue describes wording; it does not verify the correction.</p></div>
          <button type="button" disabled={workspaceDisabled} className="btn-brutal" onClick={() => investigate({older_text:sample.older_text,newer_text:sample.newer_text})}>{publicMode ? 'Sign in to investigate this pair' : 'Investigate this pair'} <ArrowRight className="w-4 h-4"/></button>
          <details className="text-xs font-mono"><summary className="cursor-pointer text-hermes-bone/50">Inspect returned spans and method metadata</summary><pre className="mt-3 whitespace-pre-wrap break-all max-h-80 overflow-y-auto">{JSON.stringify(sample.analysis,null,2)}</pre></details>
        </article>}</div>
        <p className="text-xs text-amber-200/70 leading-relaxed">{data.warning}</p>
        <details className="text-xs font-mono text-hermes-bone/45"><summary className="cursor-pointer">Reproducibility fingerprint</summary><p className="mt-2">Method: {data.algorithm_version}</p><p className="break-all mt-1">Challenge SHA-256: {data.dataset_sha256}</p></details>
      </>}
    </section>
  </div>;
}
