import { ArrowRight } from 'lucide-react';
import { usePublicationRuntime } from '../../../shared/runtime/publicationRuntime';
import { TOOL_REGISTRY, type ToolDescriptor } from '../../../shared/navigation/registry';

export function ToolsDirectory() {
  const runtime = usePublicationRuntime();
  const cloud = runtime.mode === 'published';

  // Directory tools to show (12 advanced + casebook & compare shortcuts)
  const directoryToolIds = [
    // Read & explore
    'corpus', 'vector', 'factcheck', 'fullgraph',
    // Compare & investigate
    'compare', 'casebook', 'project', 'masala',
    // System & local operations
    'overview', 'graph', 'timeline', 'cache', 'eval',
  ];

  const tools = directoryToolIds
    .map((id) => TOOL_REGISTRY.find((t) => t.id === id))
    .filter((t): t is ToolDescriptor => Boolean(t));

  const groups = [
    {
      key: 'read',
      heading: 'Explore the collection',
      description: 'Start from stored articles, statements or connections in the archive.',
      toolIds: ['corpus', 'vector', 'factcheck', 'fullgraph'],
    },
    {
      key: 'research',
      heading: 'Compare & keep research notes',
      description: 'Understand the wording analyzer and save your personal investigations.',
      toolIds: ['compare', 'casebook', 'project', 'masala'],
    },
    {
      key: 'local',
      heading: cloud ? 'Tools on the developers’ PC' : 'Local system & research tools',
      description: cloud
        ? 'These need the local analysis workspace. They do not run on this published website.'
        : 'Technical controls for collection, analysis and system inspection.',
      toolIds: ['overview', 'graph', 'timeline', 'cache', 'eval'],
    },
  ] as const;

  return (
    <div className="space-y-10">
      {/* Page Title & Purpose */}
      <section className="space-y-4 max-w-3xl">
        <p className="text-[10px] uppercase tracking-widest text-hermes-red-bright font-mono">
          Specialist tools directory
        </p>
        <h1 aria-label="Tools &amp; guides" className="font-display text-4xl md:text-5xl">
          Advanced tools
        </h1>
        <p className="text-sm leading-relaxed text-hermes-bone/70">
          Start with article search for ordinary reading. Use these specialist tools when you want to
          inspect a statement, compare coverage, inspect database graphs, or work on research.
        </p>
        <div className="pt-2 flex flex-wrap gap-3">
          <a href="#/dashboard/compare" className="btn-outline-dark inline-flex items-center gap-2 text-xs">
            <span>Compare two versions of a statement</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Published release summary banner */}
      {runtime.publication && (
        <p className="text-xs text-hermes-bone/60 border-y border-hermes-bone/15 py-4 font-mono">
          This published collection: {runtime.publication.counts.articles.toLocaleString()} articles ·{' '}
          {runtime.publication.counts.claims.toLocaleString()} claims ·{' '}
          {runtime.publication.counts.relationships.toLocaleString()} stored relationships.
          {runtime.publication.counts.relationships === 0 &&
            ' No relationship links have been saved in this release. You can still read articles and compare supplied wording.'}
        </p>
      )}

      {/* Tool Groups */}
      {groups.map((group) => {
        const groupTools = tools.filter((t) => (group.toolIds as readonly string[]).includes(t.id));
        return (
          <section key={group.key} aria-label={group.heading} className="space-y-5">
            <div>
              <h2 className="font-display text-3xl">{group.heading}</h2>
              <p className="text-xs text-hermes-bone/60 mt-1 leading-relaxed">{group.description}</p>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {groupTools.map((tool) => {
                const isLocalOnly = tool.availability === 'local-only';
                const requiresLocalPC = cloud && isLocalOnly;

                return (
                  <article key={tool.id} className="card-brutal-dark p-5 space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] uppercase tracking-widest font-mono text-hermes-red-bright">
                          {requiresLocalPC ? 'Local PC required' : 'Available in this workspace'}
                        </span>
                        {tool.badge && (
                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 border border-hermes-bone/20 text-hermes-bone/60">
                            {tool.badge}
                          </span>
                        )}
                      </div>

                      <h3 className="font-display text-2xl">{tool.label}</h3>

                      <p className="text-sm text-hermes-bone/65 leading-relaxed">
                        {!cloud && tool.id === 'vector'
                          ? 'Retrieve related coverage using local embeddings. Similarity is not a truth score.'
                          : !cloud && tool.id === 'factcheck'
                          ? 'Check a supplied claim against the local corpus and inspect returned evidence.'
                          : tool.summary}
                      </p>

                      <div className="border-t border-hermes-bone/10 pt-2 text-[10px] font-mono text-hermes-bone/50 space-y-1">
                        <p><span className="text-hermes-bone/35">Input:</span> {tool.input}</p>
                        <p><span className="text-hermes-bone/35">Output:</span> {tool.output}</p>
                        <p>Existing tool: {tool.legacySynonyms[0] || tool.label}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-hermes-bone/10">
                      {requiresLocalPC ? (
                        <details className="text-xs">
                          <summary className="cursor-pointer underline underline-offset-4 text-hermes-bone/70 hover:text-hermes-bone">
                            Where is this available?
                          </summary>
                          <p className="mt-2 text-hermes-bone/60 leading-relaxed text-[11px]">
                            Open the local GMEE workspace on the analysis PC.{' '}
                            <a href={tool.href} className="underline hover:text-hermes-bone">
                              View this tool’s availability notice
                            </a>.
                          </p>
                        </details>
                      ) : (
                        <a
                          href={tool.href}
                          className="text-xs underline underline-offset-4 inline-flex items-center gap-2 hover:text-hermes-red-bright transition-colors"
                        >
                          <span>Open {tool.label.toLowerCase()}</span>
                          <ArrowRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Vocabulary Glossary */}
      <details className="border-t border-hermes-bone/15 pt-6">
        <summary className="text-sm cursor-pointer font-display text-xl text-hermes-bone hover:text-hermes-red-bright transition-colors">
          What do the terms mean?
        </summary>
        <dl className="grid md:grid-cols-3 gap-6 mt-5 text-sm">
          {[
            ['Article', 'A report collected from an external source. Open its original link for full context.'],
            ['Claim', 'A statement extracted from a report. Extraction does not verify it.'],
            ['Relationship', 'A saved comparison between statements. It does not prove copying or truth.'],
          ].map(([term, meaning]) => (
            <div key={term}>
              <dt className="font-display text-2xl">{term}</dt>
              <dd className="text-xs mt-2 leading-relaxed text-hermes-bone/65">{meaning}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
