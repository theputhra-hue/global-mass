import { useId, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Download, Save } from 'lucide-react';
import { casebookApi, type CaseDetail, type CaseSummary } from '../api/casebook';
import { featuresApi, type MutationComparisonInput } from '../api/features';
import { exportCase } from '../lib/caseExport';
import { useSession } from '../lib/session';
import { QueryError } from './QueryError';
import { SignInNotice } from './SignInNotice';
import { TextSpans } from './TextSpans';
import { returnedSpans } from '../lib/textSpans';

function ReviewEditor({item, onUpdated, reload}: {item: CaseDetail; onUpdated: (item: CaseDetail) => void; reload: () => void}) {
  const [notes, setNotes] = useState(item.notes);
  const [status, setStatus] = useState(item.status);
  const id = useId();
  const save = useMutation({mutationFn: () => casebookApi.review(item.id, {revision:item.revision,notes,status}), onSuccess:onUpdated});
  return <article className="border border-hermes-bone/20 bg-hermes-panel-deep p-5 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-xs text-hermes-bone/40 mb-2">CASE FILE / REVISION {item.revision}</p><h3 className="font-display text-2xl">{item.title}</h3></div><div className="flex gap-2"><button type="button" className="btn-ghost-brutal text-xs" onClick={() => exportCase(item,'md')}><Download className="w-3 h-3"/>Markdown</button><button type="button" className="btn-ghost-brutal text-xs" onClick={() => exportCase(item,'json')}>JSON</button></div></div>
    <p className="text-xs font-mono text-hermes-bone/50">Captured {new Date(item.created_at).toLocaleString()} · immutable analysis snapshot</p>
    <div className="grid md:grid-cols-2 gap-3">{[['TEXT A',item.snapshot.inputs.older_text],['TEXT B',item.snapshot.inputs.newer_text]].map(([label,text]) => <div key={label} className="border border-hermes-bone/15 p-3"><p className="font-mono text-[10px] text-hermes-bone/40 mb-2">{label}</p><p className="text-sm"><TextSpans text={text} spans={returnedSpans(item.snapshot.analysis,label==='TEXT A'?'older':'newer')}/></p></div>)}</div>
    <div className="flex flex-wrap gap-2">{item.snapshot.analysis.mutation_types.map(type => <span key={type} className="chip-brutal">{type}</span>)}</div>
    <p className="text-sm text-hermes-bone/70">{String(item.snapshot.analysis.relation_explanation ?? '')}</p>
    <p className="text-xs text-amber-200/70">{item.snapshot.interpretation}</p>
    <form onSubmit={event => {event.preventDefault(); if (!save.isPending) save.mutate();}} className="space-y-3">
      <div><label className="block text-xs font-mono mb-2" htmlFor={`${id}-notes`}>Analyst review notes</label><textarea id={`${id}-notes`} value={notes} maxLength={4000} rows={4} onChange={event => setNotes(event.target.value)} disabled={save.isPending} className="field-brutal w-full"/></div>
      <div className="flex flex-wrap gap-3 items-center"><label className="text-xs font-mono" htmlFor={`${id}-status`}>Review status</label><select id={`${id}-status`} value={status} onChange={event => setStatus(event.target.value as CaseSummary['status'])} disabled={save.isPending} className="field-brutal"><option value="open">Open</option><option value="reviewed">Reviewed by analyst</option><option value="archived">Archived</option></select><button type="submit" className="btn-brutal" disabled={save.isPending}>{save.isPending?'Saving review…':'Save review'}</button><button type="button" onClick={reload} className="btn-ghost-brutal text-xs">Reload saved case</button></div>
      <p className="text-xs text-hermes-bone/45">“Reviewed” records workflow status, not truth or a gold label. Archiving is reversible. Downloads include saved notes; save your changes before exporting.</p>
    </form>
    {save.isError && <QueryError title="Review could not be saved" error={save.error}/>}
    <details className="text-xs font-mono"><summary className="cursor-pointer">Snapshot fingerprint & raw analysis</summary><p className="break-all mt-3">SHA-256: {item.snapshot_sha256}</p><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words mt-3">{JSON.stringify(item.snapshot.analysis,null,2)}</pre></details>
  </article>;
}

function CasebookContent({initialComparison, ownerKey}: {initialComparison?: MutationComparisonInput; ownerKey: string}) {
  const client = useQueryClient();
  const id = useId();
  const [older, setOlder] = useState(initialComparison?.older_text ?? '');
  const [newer, setNewer] = useState(initialComparison?.newer_text ?? '');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [archived, setArchived] = useState(false);
  const [offset, setOffset] = useState(0);
  const input = (): MutationComparisonInput => ({older_text:older,newer_text:newer});
  const query = useQuery({queryKey:['casebook',ownerKey,search,archived,offset],queryFn:({signal})=>casebookApi.list(search,archived,offset,{signal})});
  const detailKey = ['casebook-detail',ownerKey,selected];
  const detail = useQuery({queryKey:detailKey,queryFn:({signal})=>casebookApi.get(selected!,{signal}),enabled:!!selected,staleTime:Infinity});
  const compare = useMutation({mutationFn:()=>featuresApi.compare(input())});
  const create = useMutation({mutationFn:()=>casebookApi.create({title:title.trim(),notes,comparison:input()}),onSuccess:(item)=>{
    setSelected(item.id); client.setQueryData(['casebook-detail',ownerKey,item.id],item); void client.invalidateQueries({queryKey:['casebook',ownerKey]});
  }});
  const pending = compare.isPending || create.isPending;
  const valid = older.trim().length > 0 && newer.trim().length > 0;
  const edit = (side:'a'|'b',value:string) => { if(side==='a') setOlder(value); else setNewer(value); compare.reset(); create.reset(); };
  const analyze = (event: FormEvent) => {event.preventDefault(); if(valid&&!pending) compare.mutate();};
  return <div className="space-y-6">
    <section className="card-brutal-dark p-6 space-y-5">
      <div><p className="font-mono text-xs uppercase tracking-widest text-hermes-red-bright mb-2">Private workspace / account owned</p><h2 className="font-display text-3xl">Investigation Studio</h2><p className="text-sm text-hermes-bone/60 mt-3">Compare two accounts, capture a server-computed snapshot, keep your review notes and export a case file. The original analysis and its fingerprint stay unchanged when notes are edited.</p></div>
      <form onSubmit={analyze} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">{(['a','b'] as const).map(side=><div key={side}><label htmlFor={`${id}-${side}`} className="block text-xs font-mono mb-2">{side==='a'?'Text A / older account':'Text B / newer account'}</label><textarea id={`${id}-${side}`} required maxLength={2000} rows={4} value={side==='a'?older:newer} disabled={pending} onChange={event=>edit(side,event.target.value)} className="field-brutal w-full"/></div>)}</div>
        <button type="submit" className="btn-brutal" disabled={!valid||pending}>{compare.isPending?'Analyzing…':'Analyze pair'}</button>
      </form>
      {compare.isError && <QueryError title="Pair analysis unavailable" error={compare.error}/>}
      {compare.data && <div aria-live="polite" className="border-l-2 border-hermes-red-bright pl-4 space-y-3"><h3 className="font-display text-xl">{String(compare.data.analysis.relation_category??'Analysis').replace(/_/g,' ')}</h3><p className="text-sm text-hermes-bone/70">{String(compare.data.analysis.relation_explanation??'')}</p><div className="flex flex-wrap gap-2">{compare.data.analysis.mutation_types.map(type=><span className="chip-brutal" key={type}>{type}</span>)}</div><p className="text-xs text-amber-200/70">Text changes and supplied order do not establish truth, misinformation or observed transmission.</p></div>}
      <div className="grid md:grid-cols-2 gap-4 border-t border-hermes-bone/15 pt-5"><div><label htmlFor={`${id}-title`} className="block text-xs font-mono mb-2">Case title</label><input id={`${id}-title`} value={title} maxLength={160} disabled={pending} onChange={event=>setTitle(event.target.value)} className="field-brutal w-full" placeholder="e.g. Bridge closure reporting update"/></div><div><label htmlFor={`${id}-notes`} className="block text-xs font-mono mb-2">Initial analyst notes</label><textarea id={`${id}-notes`} value={notes} maxLength={4000} rows={2} disabled={pending} onChange={event=>setNotes(event.target.value)} className="field-brutal w-full"/></div></div>
      <button type="button" className="btn-brutal" disabled={!valid||!title.trim()||pending} onClick={()=>create.mutate()}><Save className="w-4 h-4"/>{create.isPending?'Capturing case…':'Capture & save case'}</button>
      <p className="text-xs text-hermes-bone/45">Saving recomputes the comparison on the server. No client-supplied analysis is accepted. Up to 200 case files per account.</p>
      {create.isError && <QueryError title="Case could not be captured" error={create.error}/>}
      {create.isSuccess && <p role="status" className="text-sm text-emerald-300">Case captured. Open it below to review or export.</p>}
    </section>
    <section className="card-brutal-dark p-6 space-y-5">
      <h2 className="font-display text-2xl flex gap-2 items-center"><BookOpen className="w-5 h-5 text-hermes-red-bright"/>Your casebook</h2>
      <form className="flex flex-wrap gap-3 items-center" onSubmit={event=>{event.preventDefault();setSearch(q);setOffset(0);}}><label className="sr-only" htmlFor={`${id}-search`}>Search case titles</label><input id={`${id}-search`} className="field-brutal min-w-0 flex-1" maxLength={160} value={q} onChange={event=>setQ(event.target.value)} placeholder="Search case titles…"/><button type="submit" className="btn-ghost-brutal">Search cases</button><label className="text-xs font-mono flex items-center gap-2"><input type="checkbox" checked={archived} onChange={event=>{setArchived(event.target.checked);setOffset(0);}}/>Archived cases</label><button type="button" className="btn-ghost-brutal" onClick={()=>query.refetch()}>Refresh cases</button></form>
      {query.isPending && <p role="status" className="text-xs font-mono">Loading your saved cases…</p>}
      {query.isError && <QueryError title="Casebook unavailable" error={query.error} onRetry={()=>query.refetch()}/>}
      {query.data && <><p className="font-mono text-xs text-hermes-bone/45">{query.data.total} saved {archived?'archived ':''}cases</p>{query.data.items.length===0&&<p className="text-sm text-hermes-bone/60">No cases match this view. Capture a comparison above to start an investigation.</p>}<div className="grid sm:grid-cols-2 gap-3">{query.data.items.map(item=><button type="button" key={item.id} aria-pressed={selected===item.id} className={`text-left border p-4 ${selected===item.id?'border-hermes-red-bright':'border-hermes-bone/20'}`} onClick={()=>setSelected(item.id)}><p className="text-[10px] font-mono uppercase text-hermes-bone/40 mb-2">{item.status} · revision {item.revision}</p><h3 className="font-bold text-sm">{item.title}</h3><p className="text-xs text-hermes-bone/50 mt-2">{new Date(item.updated_at).toLocaleString()}</p></button>)}</div><div className="flex gap-3"><button type="button" className="btn-ghost-brutal" disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-20))}>Previous cases</button><button type="button" className="btn-ghost-brutal" disabled={offset+20>=query.data.total} onClick={()=>setOffset(offset+20)}>Next cases</button></div></>}
      {detail.isFetching&&selected&&<p role="status" className="text-xs">Loading case snapshot…</p>}
      {detail.isError&&<QueryError title="Case unavailable" error={detail.error} onRetry={()=>detail.refetch()}/>}
      {detail.data&&<ReviewEditor key={`${detail.data.id}:${detail.data.revision}`} item={detail.data} reload={()=>{void detail.refetch();}} onUpdated={item=>{client.setQueryData(detailKey,item);void client.invalidateQueries({queryKey:['casebook',ownerKey]});}}/>}
    </section>
  </div>;
}

export function Casebook({initialComparison}: {initialComparison?: MutationComparisonInput}) {
  const session = useSession();
  if (!session.user) return <section className="card-brutal-dark p-6 space-y-4"><h2 className="font-display text-3xl">Investigation Studio</h2><p className="text-sm text-hermes-bone/60">Save private comparison snapshots, review notes and export traceable case files.</p><SignInNotice feature="your private casebook"/></section>;
  return <CasebookContent key={`${session.user.id}:${session.revision}`} ownerKey={`${session.user.id}:${session.revision}`} initialComparison={initialComparison}/>;
}
