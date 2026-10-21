export function ReadOnlyNotice() {
  return <section aria-label="Read-only access" className="card-brutal-dark p-6 space-y-3">
    <h2 className="font-display text-2xl">Viewing access only</h2>
    <p className="text-sm text-hermes-bone/70">You can explore articles, saved analysis, topics and graphs. This account cannot run analysis, save notes, upload or publish data.</p>
    <a href="#/dashboard/browse" className="btn-outline-dark">Browse articles</a>
    <a href="#/dashboard/atlas" className="btn-outline-dark ml-3">Explore the story map</a>
  </section>;
}
