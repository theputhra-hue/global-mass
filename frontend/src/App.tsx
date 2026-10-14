import { useEffect, useState } from 'react';
import { SystemHealth } from './pages/SystemHealth';
import { ReaderDashboard } from './pages/ReaderDashboard';
import { Landing } from './pages/Landing';
import { SignIn } from './pages/SignIn';
import { useSession } from './lib/session';

function currentRoute() {
  const hash = window.location.hash;
  return hash.startsWith('#/dashboard') ? hash.slice(2) : hash.startsWith('#/signin') ? 'signin' : 'landing';
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
    if (route.startsWith('dashboard') && !user) window.location.replace('#/signin');
    if (route === 'signin' && user) window.location.replace('#/dashboard');
  }, [route, user]);
  const readerView = (route === 'dashboard' || route === 'signin') ? 'home' : route.split('/')[1];
  const reader = ['home', 'browse', 'compare', 'check'].includes(readerView);
  return <div className="App">{route === 'landing' ? <Landing /> : user ? reader ? <ReaderDashboard key={readerView} view={readerView} /> : <SystemHealth /> : <SignIn />}</div>;
}
export default App;
