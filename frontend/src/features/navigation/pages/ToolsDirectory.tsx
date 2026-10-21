import { ArrowRight } from 'lucide-react';
import { usePublicationRuntime } from '../../../shared/runtime/publicationRuntime';
import { TOOL_REGISTRY, type ToolDescriptor } from '../../../shared/navigation/registry';

const directoryGroups = [
  { key: 'read', heading: 'Explore the collection', description: 'Start from stored articles, statements or connections.', ids: ['corpus', 'claims', 'vector', 'factcheck', 'atlas', 'fullgraph'] },
  { key: 'research', heading: 'Compare & keep research notes', description: 'Understand the analyzer and save your own investigations.', ids: ['casebook', 'project'] },
  { key: 'local', heading: 'Local system & research tools', description: 'Technical controls for collection, analysis and system inspection.', ids: ['overview', 'graph', 'timeline', 'cache', 'masala', 'eval'] },
] as const;

const names: Record<string, string> = {
  corpus: 'Article collection', claims: 'Extracted claims', vector: 'Semantic search', factcheck: 'Saved claim analysis',
  atlas: 'Story map', fullgraph: 'Article & claim map', project: 'Analyzer controls', casebook: 'My investigations',
  overview: 'System overview', graph: 'Story clusters', timeline: '3D story timeline', cache: 'Service & queue status',
  masala: 'Experimental analysis lab', eval: 'Research annotation',
};

export function ToolsDirectory() {
  const runtime = usePublicationRuntime();
  const cloud = runtime.mode === 'published';

  return <div className="space-y-10">
    <section className="space-y-4 max-w-3xl">
      <p className="text-[10px] uppercase tracking-widest text-hermes-red-bright">Choose by what you want to do</p>
      <h1 className="font-display text-4xl md:text-5xl">Tools &amp; guides</h1>
      <p className="text-sm leading-relaxed text-hermes-bone/70">Start with article search for ordinary reading. Use these tools when you want to inspect a statement, compare coverage, or work on research.</p>
      <a href="#/dashboard/compare" className="btn-outline-dark">Compare two versions of a statement <ArrowRight className="w-4 h-4" /></a>
    </section>

    {runtime.publication && <p className="text-xs text-hermes-bone/60 border-y border-hermes-bone/15 py-4">
      This published collection: {runtime.publication.counts.articles.toLocaleString()} articles · {runtime.publication.counts.claims.toLocaleString()} claims · {runtime.publication.counts.relationships.toLocaleString()} stored relationships.
      {runtime.publication.counts.relationships === 0 && ' No relationship links have been saved in this release. You can still read articles and compare supplied wording.'}
    </p>}

    {directoryGroups.map(group => {
      const heading = group.key === 'local' && cloud ? 'Tools on the developers’ PC' : group.heading;
      const description = group.key === 'local' && cloud ? 'These need the local analysis workspace. They do not run on this published website.' : group.description;
      const tools = group.ids.map(id => TOOL_REGISTRY.find(tool => tool.id === id)).filter((tool): tool is ToolDescriptor => Boolean(tool));
      return <section key={group.key} aria-label={heading} className="space-y-5">
        <div><h2 className="font-display text-3xl">{heading}</h2><p className="text-xs text-hermes-bone/60 mt-2 leading-relaxed">{description}</p></div>
        <div className="tool-directory-list">
          {tools.map(tool => {
            const requiresLocalPC = cloud && tool.availability === 'local-only';
            const name = names[tool.id] || tool.label;
            return <article key={tool.id} className="tool-directory-item space-y-3 flex flex-col">
              {requiresLocalPC && <p className="text-xs text-amber-300">Local workspace required</p>}
              <h3 className="font-display text-2xl">{name}</h3>
              <p className="text-sm text-hermes-bone/65 leading-relaxed flex-1">{!cloud && tool.id === 'vector' ? 'Retrieve related coverage using local embeddings. Similarity is not a truth score.' : !cloud && tool.id === 'factcheck' ? 'Check a supplied claim against the local corpus and inspect returned evidence.' : tool.id === 'atlas' ? 'Explore your articles as topic neighborhoods, with similarity connections and links to their sources.' : tool.summary}</p>
              {requiresLocalPC ? <details className="text-xs">
                <summary className="underline underline-offset-4">Where is this available?</summary>
                <p className="mt-3 text-hermes-bone/60 leading-relaxed">Open the local GMEE workspace on the analysis PC. <a href={tool.href} className="underline">View this tool’s availability notice</a>.</p>
              </details> : <a href={tool.href} className="text-xs underline underline-offset-4 inline-flex items-center gap-2">Open {name.toLowerCase()} <ArrowRight className="w-3 h-3" /></a>}
              <details className="text-xs text-hermes-bone/60">
                <summary>About this tool</summary>
                <dl className="mt-3 space-y-2 leading-relaxed"><div><dt className="font-semibold">Input</dt><dd>{tool.input}</dd></div><div><dt className="font-semibold">Output</dt><dd>{tool.output}</dd></div></dl>
                <p className="mt-2">Existing tool: {tool.legacySynonyms[0] || tool.label}</p>
              </details>
            </article>;
          })}
        </div>
      </section>;
    })}

    <details className="border-t border-hermes-bone/15 pt-5">
      <summary className="text-sm">What do the terms mean?</summary>
      <dl className="grid md:grid-cols-3 gap-6 mt-5 text-sm">{[
        ['Article', 'A report collected from an external source. Open its original link for full context.'],
        ['Claim', 'A statement extracted from a report. Extraction does not verify it.'],
        ['Relationship', 'A saved comparison between statements. It does not prove copying or truth.'],
      ].map(([term, meaning]) => <div key={term}><dt className="font-display text-2xl">{term}</dt><dd className="text-xs mt-2 leading-relaxed text-hermes-bone/65">{meaning}</dd></div>)}</dl>
    </details>
  </div>;
}
