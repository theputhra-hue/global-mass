import type { TabType } from '../../../shared/navigation/tabs';

const guides: Record<TabType, { name: string; purpose: string; use: string; meaning: string }> = {
  atlas: { name: 'Story map', purpose: 'Explore all articles in the saved topic map.', use: 'Select a topic, search titles or open an article.', meaning: 'Machine-generated topic membership and projected distance do not establish truth or transmission.' },
  project: {
    name: 'Analyzer examples',
    purpose: 'A guided investigation workflow and twelve authored engineering controls for the text change analyzer.',
    use: 'Inspect a control pair, compare the analyzer with the lexical baseline, export its report, or open the pair in your investigations.',
    meaning: 'These authored controls check known behavior. Passing them is not scientific accuracy; publication requires independent human annotations and held-out evaluation.',
  },
  casebook: {
    name: 'My investigations',
    purpose: 'Your private investigations, with original texts, reproducible analysis snapshots, review notes, and exports.',
    use: 'Compare two texts, save a case, review its notes and status, then export its evidence. Archived cases remain available through the archive filter.',
    meaning: 'Saving a case preserves the server-computed analysis and its fingerprint. Notes and review status can change; a saved snapshot is not proof that either text is true.',
  },
  overview: {
    name: 'Service overview',
    purpose: 'A summary of collection counts, service availability, alerts, and recent activity.',
    use: 'Start here to see whether data and services are available. Open a specialist tab when you want to investigate a result.',
    meaning: 'Ready means a service responded. It does not mean the articles are accurate or the research has been validated. Demo telemetry is explicitly simulated.',
  },
  graph: {
    name: 'Story clusters',
    purpose: 'The technical view of entities and relationships stored in the graph database, alongside recently collected articles.',
    use: 'Inspect the topology and available node details to understand how the stored graph is organized. Use Graph for the broader interactive corpus view.',
    meaning: 'A node represents a stored item; an edge represents a relationship. A connection alone does not establish copying or influence.',
  },
  vector: {
    name: 'Semantic search',
    purpose: 'Semantic search: find articles whose extracted claims have related wording or meaning.',
    use: 'Enter a short phrase or claim, inspect the matching articles, and read the original sources. The embedding service must be available.',
    meaning: 'An embedding is a numerical representation of text. Similarity ranks related text; it is not a truth score or independent corroboration.',
  },
  cache: {
    name: 'Cache & queue',
    purpose: 'Operational information about Redis, the in-memory service used for caching, rate limiting, and token revocation.',
    use: 'Check reported memory and availability when investigating performance or authentication problems.',
    meaning: 'Unreported queue depth, latency, or hit rate is unknown, not zero. The tab name does not mean a complete worker queue is implemented. Demo values are simulated.',
  },
  fullgraph: {
    name: 'Article & claim map',
    purpose: 'An interactive map of the corpus and its linked coverage.',
    use: 'Search for a topic, select nodes, and inspect connected articles and their details. Use the displayed controls to explore the map.',
    meaning: 'The map is bounded and may omit items. Nearby or connected nodes indicate modeled relationships, not proven transmission of misinformation.',
  },
  timeline: {
    name: 'Story timeline',
    purpose: 'A chronological view of story clusters and their versions.',
    use: 'Explore the timeline with the controls or arrow keys; press Enter to inspect a selected story. Check source dates when comparing versions.',
    meaning: 'A cluster groups related coverage. Earlier publication does not prove that later publishers copied it; timestamps can be incomplete or unreliable.',
  },
  masala: {
    name: 'Analysis lab',
    purpose: 'Exploratory tools for comparing wording, publication timing, mutation groups, and the engine’s judgments.',
    use: 'Use Mutation Comparator for two texts, Scoop Races for publication timing, and Mutation DNA for related versions. The arcade lets you compare a guess with the engine.',
    meaning: 'Text changes and timing differences are observations, not proof of misinformation. Agreement with the engine is not factual correctness or a validated research label.',
  },
  factcheck: {
    name: 'Check a claim',
    purpose: 'Check a claim against evidence available in the collected corpus and inspect the engine’s results.',
    use: 'Submit a claim, inspect supporting or conflicting passages, and follow the cited sources. Read the explanation before relying on a label.',
    meaning: 'This is corpus-local checking, not exhaustive web verification. Insufficient evidence means the system cannot decide; it does not mean false. Scores are uncalibrated.',
  },
  eval: {
    name: 'Research annotation',
    purpose: 'The research annotation workspace for reviewing claim pairs, recording judgments, and tracking labeling progress.',
    use: 'Read both claims and apply the provided label definitions independently. Your account role controls access; dataset export is restricted to administrators.',
    meaning: 'Submitting a label records a research judgment. Label counts or agreement alone do not establish accuracy; independent review and held-out evaluation are still needed.',
  },
  corpus: {
    name: 'Collection & history',
    purpose: 'The collection of source articles, with search, source filters, related coverage, and recent ingestion.',
    use: 'Search titles or authors, narrow by source, and open original articles to read their context and publication dates.',
    meaning: 'Collected does not mean verified. Recent ingestion is not necessarily recent publication, and multiple outlets can repeat the same original reporting.',
  },
};

export function AdvancedTabGuide({ tab }: { tab: TabType }) {
  const guide = guides[tab];
  return <section aria-labelledby="advanced-guide-title" className="tool-guide">
    <h1 id="advanced-guide-title">{guide.name}</h1>
    <p>{guide.purpose}</p>
    <details><summary>How to use this tool & interpret results</summary>
      <dl>{[["How to use it", guide.use], ["How to interpret it", guide.meaning]].map(([label, text]) => <div key={label}><dt>{label}</dt><dd>{text}</dd></div>)}</dl>
      <a href="#/dashboard/tools" className="inline-block mt-4 underline">All tools & guides</a>
    </details>
  </section>;
}
