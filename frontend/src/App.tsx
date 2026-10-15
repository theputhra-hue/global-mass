import { useEffect, useState } from 'react';
import { SystemHealth } from './pages/SystemHealth';
import { ReaderDashboard } from './pages/ReaderDashboard';
import { Landing } from './pages/Landing';
import { SignIn } from './pages/SignIn';
import { DeveloperUpload } from './pages/DeveloperUpload';
import { DeveloperConsole } from './pages/DeveloperConsole';
import { PublicProjectLab } from './pages/PublicProjectLab';
import { useSession } from './lib/session';
import { ArticleInvestigation } from './pages/ArticleInvestigation';
import { navigateHash, parseArticleRoute, signInDestination } from './lib/articleRoutes';

function currentRoute() {
  const hash = window.location.hash;
  if (hash === '#/project') return 'project';
  return hash.startsWith('#/dashboard') || hash.startsWith('#/signin') ? hash.slice(2) : 'landing';
}
function App() {
  const [route, setRoute] = useState(currentRoute);
  const { user } = useSession();
  useEffect(() => {
    const onHash = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onHash);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('popstate', onHash);
    };
  }, []);
  useEffect(() => {
    if (route.startsWith('dashboard') && !user) {
      const target = `#/signin?next=${encodeURIComponent(`#/${route}`)}`;
      if (window.location.hash !== target) navigateHash(target, true);
    }
    if (route.startsWith('signin') && user) {
      const target = signInDestination(`#/${route}`);
      if (window.location.hash !== target) navigateHash(target, true);
    }
  }, [route, user]);
  const pathname = route.split('?')[0];
  const detail = parseArticleRoute(route);
  const readerView = (pathname === 'dashboard' || pathname === 'signin') ? 'home' : pathname.split('/')[1];
  const reader = ['home', 'browse', 'compare', 'check'].includes(readerView);
  const advanced = /^dashboard\/(overview|graph|vector|cache|fullgraph|timeline|masala|factcheck|eval|corpus|project|casebook)$/.test(pathname);
  return <div className="App">{route === 'landing' ? <Landing /> : route === 'project' ? <PublicProjectLab /> : user ? pathname === 'dashboard/developer' ? <DeveloperConsole key={user.id} /> : pathname === 'dashboard/upload' ? <DeveloperUpload key={user.id} /> : detail ? <ArticleInvestigation key={`${user.id}:${detail.id}`} route={detail} /> : reader ? <ReaderDashboard key={route} view={readerView} /> : advanced ? <SystemHealth /> : pathname === 'signin' ? <ReaderDashboard view="home" /> : <main className="min-h-screen bg-hermes-ink text-hermes-bone p-8"><h1 className="text-4xl">Page not found</h1><a href="#/dashboard" className="btn-brutal mt-5">Return to collection</a></main> : <SignIn />}</div>;
}
export default App;
