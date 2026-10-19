import { ArrowRight, Wrench, ShieldAlert } from 'lucide-react';
import { findTool } from '../../../shared/navigation/registry';

interface ToolAvailabilityNoticeProps {
  toolId: string;
}

export function ToolAvailabilityNotice({ toolId }: ToolAvailabilityNoticeProps) {
  const tool = findTool(toolId);
  const toolName = tool ? tool.label : toolId;

  // Specific alternative suggestions per tool
  let alternative = {
    title: 'Explore articles in this release',
    href: '#/dashboard/browse',
    description: 'Find source articles by title or author keywords.',
  };

  if (toolId === 'graph') {
    alternative = {
      title: 'Explore recorded connections',
      href: '#/dashboard/fullgraph',
      description: 'View the bounded article and claim relationship graph in this release.',
    };
  } else if (toolId === 'timeline') {
    alternative = {
      title: 'Browse articles with timelines',
      href: '#/dashboard/browse',
      description: 'Every article detail page includes a chronological publication timeline of its recorded neighborhood.',
    };
  } else if (toolId === 'masala') {
    alternative = {
      title: 'Compare wording',
      href: '#/dashboard/compare',
      description: 'Paste two texts into the wording comparator to highlight phrase differences.',
    };
  } else if (toolId === 'eval') {
    alternative = {
      title: 'Open My investigations',
      href: '#/dashboard/casebook',
      description: 'Save private comparisons, notes and investigation status in your personal casebook.',
    };
  } else if (toolId === 'cache' || toolId === 'overview') {
    alternative = {
      title: 'Return to Home',
      href: '#/dashboard',
      description: 'View published collection counts and available research paths.',
    };
  }

  return (
    <section aria-label={`${toolName} availability`} className="card-brutal-dark p-6 md:p-8 space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 text-hermes-red-bright text-xs uppercase tracking-widest font-mono">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span>Local workspace required · Cloud published mode</span>
      </div>

      <div className="space-y-3">
        <h1 className="font-display text-3xl md:text-4xl text-hermes-bone">
          {toolName} runs on the local analysis PC.
        </h1>
        <p className="text-sm leading-relaxed text-hermes-bone/70">
          This hosted website serves completed, frozen publication releases. Real-time database administration,
          local AI model execution, 3D narrative timelines, Redis queue metrics and human research annotation
          operate directly on the analysis PC.
        </p>
      </div>

      {tool && (
        <div className="border border-hermes-bone/15 bg-hermes-panel/40 p-4 space-y-2 text-xs font-mono text-hermes-bone/65">
          <p><span className="text-hermes-bone/45 uppercase">Purpose:</span> {tool.summary}</p>
          <p><span className="text-hermes-bone/45 uppercase">Input:</span> {tool.input}</p>
          <p><span className="text-hermes-bone/45 uppercase">Output:</span> {tool.output}</p>
        </div>
      )}

      {/* Suggested Alternative in this Workspace */}
      <div className="border-t border-hermes-bone/15 pt-5 space-y-3">
        <p className="text-xs uppercase tracking-wider text-hermes-bone/50 font-mono">
          Useful alternative in this workspace
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-hermes-bone/20 bg-hermes-panel/20">
          <div>
            <h2 className="font-display text-xl text-hermes-bone">{alternative.title}</h2>
            <p className="text-xs text-hermes-bone/65 mt-1">{alternative.description}</p>
          </div>
          <a href={alternative.href} className="btn-brutal shrink-0 inline-flex items-center gap-2 text-xs">
            <span>Open alternative</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <a href="#/dashboard/tools" className="btn-outline-dark inline-flex items-center gap-2 text-xs">
          <Wrench className="w-3.5 h-3.5" />
          <span>All tools &amp; guides</span>
        </a>
        <a href="#/dashboard" className="btn-outline-dark text-xs">
          Return to Home
        </a>
      </div>
    </section>
  );
}
