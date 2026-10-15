import { ProjectLab } from '../components/ProjectLab';

export function PublicProjectLab() {
  const signIn = () => { window.location.hash = '/signin'; };
  return <div className="min-h-screen bg-hermes-ink text-hermes-bone font-mono relative isolate">
    <div className="fixed inset-0 -z-10 pointer-events-none grain-overlay" aria-hidden="true" />
    <header className="border-b border-hermes-bone/15 px-4 md:px-8 py-5 flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-display text-3xl">GMEE / Project Lab</h1>
      <nav aria-label="Public Project Lab" className="flex flex-wrap gap-3">
        <a href="#/" className="btn-outline-dark">About GMEE</a>
        <a href="#/signin" className="btn-brutal">Sign in</a>
      </nav>
    </header>
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <p className="text-sm leading-relaxed text-hermes-bone/65">Explore the disclosed engineering controls without an account. Corpus tools, private investigations and research annotation require signing in to the full application.</p>
      <ProjectLab publicMode navigate={signIn} investigate={signIn} />
    </main>
  </div>;
}
