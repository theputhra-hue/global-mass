import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToolsDirectory } from '../src/features/navigation/pages/ToolsDirectory';
import { ReaderDashboard } from '../src/features/articles/pages/ReaderDashboard';
import { PublicationProvider, usePublicationRuntime } from '../src/shared/runtime/publicationRuntime';
import { jsonResponse, mockApi, renderWithClient, signInFixture } from './helpers';

const status = { mode: 'published', revision: 1, run_id: 'legacy-release', published_at: '2026-10-15T19:04:31Z', analysis_completed_at: '2026-09-16T10:10:56Z', counts: { articles: 7421, claims: 5157, relationships: 0 } };
const cloudApi = (endpoint: string) => endpoint === '/capabilities' ? jsonResponse({ mode: 'published' }) : endpoint === '/publications/status' ? jsonResponse(status) : jsonResponse({ total: 0, items: [] });
function ConnectedReader() {
  const runtime = usePublicationRuntime();
  return runtime.mode === 'published' ? <ReaderDashboard view="check" /> : null;
}

describe('reader clarity and capability boundaries', () => {
  it('explains zero saved relationships and separates local-only tools before users open them', async () => {
    signInFixture();
    const fetch = mockApi(cloudApi);
    renderWithClient(<PublicationProvider><ToolsDirectory /></PublicationProvider>);
    const local = await screen.findByRole('region', { name: 'Tools on the developers’ PC' });
    expect(within(local).queryByRole('link', { name: 'Open database graph' })).toBeNull();
    expect(await screen.findByText(/No relationship links have been saved/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open my investigations' }).getAttribute('href')).toBe('#/dashboard/casebook');
    expect(screen.getByRole('link', { name: 'Open story map' }).getAttribute('href')).toBe('#/dashboard/atlas');
    expect(screen.getByRole('link', { name: 'Open article & claim map' }).getAttribute('href')).toBe('#/dashboard/fullgraph');
    expect(screen.getByText('Existing tool: Postgres Vector')).toBeTruthy();
    expect(fetch.mock.calls.every(([url]) => /\/(capabilities|publications\/status)$/.test(String(url)))).toBe(true);
  });
  it('labels published claim search as saved analysis without promising new evidence inference', async () => {
    signInFixture();
    mockApi(cloudApi);
    renderWithClient(<PublicationProvider><ConnectedReader /></PublicationProvider>);
    expect(await screen.findByRole('heading', { name: 'Find a saved claim.' })).toBeTruthy();
    expect(screen.getByText(/This does not run a new AI check/)).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Developer console' })).toBeNull();
  });
});
