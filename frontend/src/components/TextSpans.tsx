import type { Span } from '../lib/textSpans';

/** Python offsets are Unicode code points; JS UTF-16 slice would shift emoji. */
export function TextSpans({text,spans}:{text:string;spans:Span[]}) {
  const points=Array.from(text);
  const ranges=spans.filter(s=>s.start>=0&&s.end>s.start&&s.end<=points.length).sort((a,b)=>a.start-b.start);
  const merged: Span[]=[];
  for(const span of ranges){const last=merged[merged.length-1];if(last&&span.start<=last.end)last.end=Math.max(last.end,span.end);else merged.push({...span});}
  const parts: {text:string;marked:boolean;start:number}[]=[];
  let cursor=0;
  for(const span of merged){if(cursor<span.start)parts.push({text:points.slice(cursor,span.start).join(''),marked:false,start:cursor});parts.push({text:points.slice(span.start,span.end).join(''),marked:true,start:span.start});cursor=span.end;}
  if(cursor<points.length)parts.push({text:points.slice(cursor).join(''),marked:false,start:cursor});
  return <span className="whitespace-pre-wrap">{parts.map(part=>part.marked?<mark key={part.start} className="bg-hermes-red-bright/20 text-hermes-bone border-b border-hermes-red-bright">{part.text}</mark>:<span key={part.start}>{part.text}</span>)}</span>;
}
