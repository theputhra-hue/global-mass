import { AccountPanel } from '../../account/components/AccountPanel';

export function ReaderNavigation({ active }: { active: string }) {
  const selected = ['home', 'browse'].includes(active) ? 'home' : active;
  return <>
    <button type="button" onClick={() => document.getElementById('main-content')?.focus()} className="sr-only focus:not-sr-only focus:block focus:p-4">Skip to content</button>
    <header className="border-b border-hermes-bone/15 px-4 md:px-8 py-5 flex flex-wrap items-center justify-between gap-4">
      <a href="#/dashboard" className="font-display text-3xl">GMEE <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-widest text-hermes-bone/60 ml-3">News &amp; claim research</span></a>
      <AccountPanel />
    </header>
    <nav aria-label="Workspace" className="flex flex-wrap gap-2 px-4 md:px-8 py-3 border-b border-hermes-bone/10">
      {[['home', 'Explore articles', '#/dashboard'], ['check', 'Saved claims', '#/dashboard/check'], ['compare', 'Compare wording', '#/dashboard/compare'], ['tools', 'Tools & guides', '#/dashboard/tools']].map(([key, label, href]) => <a key={key} href={href} aria-current={selected === key ? 'page' : undefined} className={`workspace-tab ${selected === key ? '!border-hermes-red-bright !text-hermes-red-bright' : ''}`}>{label}</a>)}
    </nav>
  </>;
}
