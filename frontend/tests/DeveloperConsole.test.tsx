import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DeveloperConsole } from '../src/pages/DeveloperConsole';
import { jsonResponse, mockApi, renderWithClient, signInFixture } from './helpers';

const overview = { pipeline_enabled: true, counts: { articles: 12, claims: 8, relationships: 3 }, processing: { raw: 2, processed: 10 }, nlp: { completed: 7, pending: 3 }, sources: [{ id: 'fixture', name: 'Fixture source', type: 'rss', enabled: true, last_collected_at: null }], jobs: [] };

describe('developer console', () => {
  it('discloses a failed graph projection even when analysis returns success', async () => {
    signInFixture();
    mockApi(endpoint => endpoint === '/publications/access' ? jsonResponse({ allowed: true }) : endpoint.endsWith('/trigger') ? jsonResponse({ result: { status: 'success', clusters_found: 77, relationships_detected: 71, neo4j_sync_success: false } }) : jsonResponse({ ...overview, nlp_cycle_limit: 10 }));
    renderWithClient(<DeveloperConsole />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Run stage' }))[3]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm run' }));
    expect(await screen.findByText(/Graph synchronization did not complete/)).toBeTruthy();
    expect(screen.getByText('Clusters found: 77')).toBeTruthy();
    expect(screen.getByText(/Each extraction cycle processes up to 10/)).toBeTruthy();
  });
  it('shows a failed source change without claiming that the source changed', async () => {
    signInFixture();
    mockApi(endpoint => endpoint === '/publications/access' ? jsonResponse({ allowed: true }) : endpoint.startsWith('/developer/sources/') ? jsonResponse({ detail: 'Source update unavailable' }, 503) : jsonResponse(overview));
    renderWithClient(<DeveloperConsole />);
    await screen.findAllByRole('button', { name: 'Run stage' });
    fireEvent.click(screen.getByRole('button', { name: 'Sources', exact: true }));
    fireEvent.click(screen.getByRole('switch', { name: 'Fixture source collection' }));
    expect(await screen.findByText('Source update unavailable')).toBeTruthy();
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
  });
  it('displays a concurrent-run conflict and advises checking history before retry', async () => {
    signInFixture();
    mockApi(endpoint => endpoint === '/publications/access' ? jsonResponse({ allowed: true }) : endpoint.endsWith('/trigger') ? jsonResponse({ detail: 'A collection job is already running.' }, 409) : jsonResponse(overview));
    renderWithClient(<DeveloperConsole />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Run stage' }))[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm run' }));
    expect(await screen.findByText('A collection job is already running.')).toBeTruthy();
    expect(screen.getByText(/does not prove the job stopped/)).toBeTruthy();
  });
  it('cancels stage confirmation without a processing request', async () => {
    signInFixture();
    const fetch = mockApi(endpoint => endpoint === '/publications/access' ? jsonResponse({ allowed: true }) : jsonResponse(overview));
    renderWithClient(<DeveloperConsole />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Run stage' }))[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel', exact: true }));
    expect(screen.queryByRole('button', { name: 'Confirm run' })).toBeNull();
    expect(fetch.mock.calls.some(([url]) => String(url).includes('/trigger'))).toBe(false);
  });
  it('disables both stage starts and source changes while a recorded job runs', async () => {
    signInFixture();
    mockApi(endpoint => endpoint === '/publications/access' ? jsonResponse({ allowed: true }) : jsonResponse({ ...overview, jobs: [{ id: 'busy', type: 'nlp', status: 'running', started_at: '2026-10-15T10:00:00Z', finished_at: null, heartbeat_at: null, lease_expires_at: '2026-10-15T10:15:00Z', has_error: false }] }));
    renderWithClient(<DeveloperConsole />);
    expect((await screen.findAllByRole('button', { name: 'Run stage' })).every(b => (b as HTMLButtonElement).disabled)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Sources', exact: true }));
    expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(true);
  });
  it('denies controls and overview requests for unapproved accounts', async () => {
    signInFixture();
    const fetch = mockApi(() => jsonResponse({ allowed: false }));
    renderWithClient(<DeveloperConsole />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Run stage' })).toBeNull();
    expect(fetch.mock.calls.some(([url]) => String(url).endsWith('/developer/overview'))).toBe(false);
  });
  it('requires explicit confirmation before running a stage', async () => {
    signInFixture();
    const fetch = mockApi(endpoint => endpoint === '/publications/access' ? jsonResponse({ allowed: true }) : endpoint === '/developer/overview' ? jsonResponse(overview) : jsonResponse({ status: 'success' }));
    renderWithClient(<DeveloperConsole />);
    const buttons = await screen.findAllByRole('button', { name: 'Run stage' });
    fireEvent.click(buttons[0]);
    expect(fetch.mock.calls.some(([url]) => String(url).includes('/trigger'))).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm run' }));
    expect(await screen.findByText(/Request completed/)).toBeTruthy();
    expect(fetch.mock.calls.some(([url]) => String(url).endsWith('/collection/trigger'))).toBe(true);
  });
  it('shows cloud controls disabled and explains publishing limitations', async () => {
    signInFixture();
    mockApi(endpoint => endpoint === '/publications/access' ? jsonResponse({ allowed: true }) : jsonResponse({ ...overview, pipeline_enabled: false }));
    renderWithClient(<DeveloperConsole />);
    const buttons = await screen.findAllByRole('button', { name: 'Run stage' });
    expect(buttons.every(button => (button as HTMLButtonElement).disabled)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Publishing' }));
    expect(screen.getByRole('heading', { name: 'Publish on the live website' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open live publishing workspace' }).getAttribute('href')).toBe('https://global-mass.onrender.com/#/dashboard/upload');
  });
});
