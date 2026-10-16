import { SystemHealth } from '../features/operations/pages/SystemHealth';
import { ReaderDashboard } from '../features/articles/pages/ReaderDashboard';
import { Landing } from '../features/landing/pages/Landing';
import { SignIn } from '../features/account/pages/SignIn';
import { DeveloperUpload } from '../features/publishing/pages/DeveloperUpload';
import { DeveloperConsole } from '../features/developer/pages/DeveloperConsole';
import { PublicProjectLab } from '../features/research/pages/PublicProjectLab';
import { PublishedWorkspace } from './layouts/PublishedWorkspace';
import { ToolsDirectory } from '../features/navigation/pages/ToolsDirectory';
import { DataServiceState, usePublicationRuntime } from '../shared/runtime/publicationRuntime';
import { useSession } from '../shared/session/session';
import { ArticleInvestigation } from '../features/articles/pages/ArticleInvestigation';
import { ClaimsWorkspace } from '../features/claims/pages/ClaimsWorkspace';
import { WorkspaceShell } from './layouts/WorkspaceShell';
import { useAppRoute } from './routing/useAppRoute';

/** Application composition only. Route parsing and redirects live in routing/. */
function App() {
  const runtime = usePublicationRuntime();
  const { user } = useSession();
  const route = useAppRoute(Boolean(user));

  if (user && route.dashboard && ['connecting', 'unavailable'].includes(runtime.mode)) {
    return <DataServiceState />;
  }

  let page;
  if (route.kind === 'landing') page = <Landing />;
  else if (route.kind === 'public-project') page = <PublicProjectLab />;
  else if (!user) page = <SignIn />;
  else {
    switch (route.kind) {
      case 'tools':
        page = <ToolsDirectory />;
        break;
      case 'developer':
        page = runtime.mode === 'published'
          ? <DeveloperUpload key={user.id} /> : <DeveloperConsole key={user.id} />;
        break;
      case 'upload':
        page = <DeveloperUpload key={user.id} />;
        break;
      case 'claims':
        page = <ClaimsWorkspace key={route.raw} />;
        break;
      case 'article':
        page = <ArticleInvestigation key={`${user.id}:${route.detail.id}`} route={route.detail} />;
        break;
      case 'reader':
        page = <ReaderDashboard key={route.raw} view={route.view} />;
        break;
      case 'advanced':
        page = runtime.mode === 'published'
          ? <PublishedWorkspace key={route.raw.split('?')[0]} tab={route.tab} /> : <SystemHealth />;
        break;
      case 'signin':
        page = <ReaderDashboard key={route.raw} view="home" />;
        break;
      default:
        page = (
          <div className="card-brutal-dark p-8 space-y-4">
            <h1 className="font-display text-4xl">Page not found</h1>
            <p className="text-sm text-hermes-bone/65">
              The requested dashboard destination does not exist.
            </p>
            <a href="#/dashboard" className="btn-brutal inline-block">
              Return to collection
            </a>
          </div>
        );
    }
    page = <WorkspaceShell route={route}>{page}</WorkspaceShell>;
  }
  return <div className="App">{page}</div>;
}

export default App;
