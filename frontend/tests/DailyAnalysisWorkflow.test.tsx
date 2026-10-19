import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DeveloperConsole } from '../src/features/developer/pages/DeveloperConsole';
import { MockPublicationProvider } from '../src/shared/runtime/publicationRuntime';
import { jsonResponse, mockApi, renderWithClient, signInFixture } from './helpers';

const baseOverview = {
  pipeline_enabled: true,
  nlp_cycle_limit: 25,
  counts: { articles: 50, claims: 35, relationships: 12 },
  processing: { raw: 10, processed: 40 },
  nlp: { completed: 35, pending: 5 },
  sources: [{ id: 'src-1', name: 'Reuters RSS', type: 'rss', enabled: true, last_collected_at: null }],
  jobs: [],
};

const preflightFixture = {
  schema_version: '1',
  runtime: 'local',
  pipeline_enabled: true,
  checked_at: '2026-10-17T12:00:00Z',
  checks: [
    { id: 'pipeline', status: 'ok', message: 'Local pipeline processing is enabled.', action: 'none' },
    { id: 'postgres', status: 'ok', message: 'PostgreSQL database is connected.', action: 'none' },
    { id: 'redis', status: 'unknown', message: 'Redis cache readiness is unconfirmed.', action: 'check_local_services' },
    { id: 'neo4j', status: 'ok', message: 'Neo4j graph database is connected.', action: 'none' },
    { id: 'model_metadata', status: 'warning', message: 'Model metadata found; inference unverified.', action: 'prepare_models' },
  ],
};

describe('DailyAnalysisWorkflow', () => {
  describe('Mode-aware entry', () => {
    it('shows cloud mode guidance and suppresses all local overview, preflight, and pipeline calls', async () => {
      signInFixture({ role: 'admin' });
      const fetch = mockApi((endpoint) => {
        if (endpoint === '/publications/access') return jsonResponse({ allowed: true });
        return jsonResponse({});
      });

      renderWithClient(
        <MockPublicationProvider mode="published">
          <DeveloperConsole />
        </MockPublicationProvider>
      );

      expect(await screen.findByText('Cloud Publishing Workspace')).toBeTruthy();
      expect(screen.getByText(/Full analysis pipelines, raw scraping, and AI model executions run exclusively on the local developer workstation/)).toBeTruthy();
      expect(await screen.findByRole('link', { name: /Go to publication upload/ })).toBeTruthy();

      // Ensure no local pipeline endpoints are requested in published mode
      expect(fetch.mock.calls.some(([url]) => String(url).includes('/developer/overview'))).toBe(false);
      expect(fetch.mock.calls.some(([url]) => String(url).includes('/developer/preflight'))).toBe(false);
      expect(fetch.mock.calls.some(([url]) => String(url).includes('/trigger'))).toBe(false);
      expect(fetch.mock.calls.some(([url]) => String(url).includes('/developer/export-hints'))).toBe(false);
    });

    it('renders connecting state without falsely presenting controls as ready', async () => {
      signInFixture({ role: 'admin' });
      mockApi(() => jsonResponse({}));

      renderWithClient(
        <MockPublicationProvider mode="connecting">
          <DeveloperConsole />
        </MockPublicationProvider>
      );

      expect(await screen.findByRole('status')).toBeTruthy();
      expect(screen.getByText('Connecting to Analysis Workspace…')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Run stage' })).toBeNull();
    });

    it('renders offline/unavailable state with setup guidance and retry capability', async () => {
      signInFixture({ role: 'admin' });
      mockApi(() => jsonResponse({}));

      renderWithClient(
        <MockPublicationProvider mode="unavailable">
          <DeveloperConsole />
        </MockPublicationProvider>
      );

      expect(await screen.findByText('Local Analysis Service Unavailable')).toBeTruthy();
      expect(screen.getByRole('button', { name: /Retry connection/ })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Run stage' })).toBeNull();
    });

    it('denies access to unauthorized accounts without calling overview or preflight', async () => {
      signInFixture({ role: 'user' });
      const fetch = mockApi((endpoint) => {
        if (endpoint === '/publications/access') return jsonResponse({ allowed: false });
        return jsonResponse({});
      });

      renderWithClient(
        <MockPublicationProvider mode="local">
          <DeveloperConsole />
        </MockPublicationProvider>
      );

      expect(await screen.findByRole('alert')).toBeTruthy();
      expect(screen.getByText(/Developer access is restricted to the two approved administrator accounts/)).toBeTruthy();
      expect(fetch.mock.calls.some(([url]) => String(url).includes('/developer/overview'))).toBe(false);
      expect(fetch.mock.calls.some(([url]) => String(url).includes('/developer/preflight'))).toBe(false);
    });
  });

  describe('Preflight diagnostics', () => {
    it('renders preflight checks, status badges, and emphasizes model metadata is not inference proof', async () => {
      signInFixture({ role: 'admin' });
      mockApi((endpoint) => {
        if (endpoint === '/publications/access') return jsonResponse({ allowed: true });
        if (endpoint === '/developer/overview') return jsonResponse(baseOverview);
        if (endpoint === '/developer/preflight') return jsonResponse(preflightFixture);
        return jsonResponse({});
      });

      renderWithClient(
        <MockPublicationProvider mode="local">
          <DeveloperConsole />
        </MockPublicationProvider>
      );

      expect(await screen.findByText('Workspace Preflight')).toBeTruthy();
      expect(screen.getByText('PostgreSQL database is connected.')).toBeTruthy();
      expect(screen.getByText('Redis cache readiness is unconfirmed.')).toBeTruthy();
      expect(screen.getByText('Model metadata found; inference unverified.')).toBeTruthy();
      expect(screen.getByText(/Model metadata confirms manifest files only; it is not proof of a successful AI inference run/)).toBeTruthy();
    });

    it('handles preflight failure gracefully as advisory without assuming checks passed', async () => {
      signInFixture({ role: 'admin' });
      mockApi((endpoint) => {
        if (endpoint === '/publications/access') return jsonResponse({ allowed: true });
        if (endpoint === '/developer/overview') return jsonResponse(baseOverview);
        if (endpoint === '/developer/preflight') return jsonResponse({ detail: 'Preflight endpoint not implemented' }, 404);
        return jsonResponse({});
      });

      renderWithClient(
        <MockPublicationProvider mode="local">
          <DeveloperConsole />
        </MockPublicationProvider>
      );

      expect(await screen.findByText('Preflight inspection unavailable')).toBeTruthy();
      expect(screen.getByText(/Missing or failed checks are not assumed to be passed/)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Retry preflight/ })).toBeTruthy();
      // Stage buttons remain accessible when overview is ok
      expect(screen.getAllByRole('button', { name: 'Run stage' }).length).toBe(4);
    });
  });

  describe('Guided local workflow', () => {
    it('explains bounded extraction cycle limits and chained stage execution', async () => {
      signInFixture({ role: 'admin' });
      mockApi((endpoint) => {
        if (endpoint === '/publications/access') return jsonResponse({ allowed: true });
        if (endpoint === '/developer/overview') return jsonResponse(baseOverview);
        if (endpoint === '/developer/preflight') return jsonResponse(preflightFixture);
        return jsonResponse({});
      });

      renderWithClient(
        <MockPublicationProvider mode="local">
          <DeveloperConsole />
        </MockPublicationProvider>
      );

      expect(await screen.findByText(/Each extraction cycle processes up to 25 pending articles/)).toBeTruthy();
      expect(screen.getByText(/Text preparation also starts an extraction cycle; extraction may then start relationship analysis/)).toBeTruthy();
    });

    it('advises refreshing history upon request timeout without retrying automatically', async () => {
      signInFixture({ role: 'admin' });
      mockApi((endpoint) => {
        if (endpoint === '/publications/access') return jsonResponse({ allowed: true });
        if (endpoint === '/developer/overview') return jsonResponse(baseOverview);
        if (endpoint === '/developer/preflight') return jsonResponse(preflightFixture);
        if (endpoint.endsWith('/trigger')) {
          const timeoutErr = new Error('The request timed out.');
          return Promise.reject(timeoutErr);
        }
        return jsonResponse({});
      });

      renderWithClient(
        <MockPublicationProvider mode="local">
          <DeveloperConsole />
        </MockPublicationProvider>
      );

      const buttons = await screen.findAllByRole('button', { name: 'Run stage' });
      fireEvent.click(buttons[1]); // Prepare text
      fireEvent.click(screen.getByRole('button', { name: 'Confirm run' }));

      expect(await screen.findByText(/A timeout or connection loss does not prove the job stopped/)).toBeTruthy();
      expect(screen.getByText(/Refresh the job history before retrying/)).toBeTruthy();
    });

    it('provides review guidance and direct links without claiming truth verification', async () => {
      signInFixture({ role: 'admin' });
      mockApi((endpoint) => {
        if (endpoint === '/publications/access') return jsonResponse({ allowed: true });
        if (endpoint === '/developer/overview') return jsonResponse(baseOverview);
        if (endpoint === '/developer/preflight') return jsonResponse(preflightFixture);
        return jsonResponse({});
      });

      renderWithClient(
        <MockPublicationProvider mode="local">
          <DeveloperConsole />
        </MockPublicationProvider>
      );

      await screen.findByText('Workspace Preflight');
      fireEvent.click(screen.getByRole('button', { name: 'Review', exact: true }));

      expect(screen.getByText('Review Guidance:')).toBeTruthy();
      expect(screen.getByText(/Counts measure technical pipeline operations, not factual accuracy or real-world misinformation spread/)).toBeTruthy();
      expect(screen.getByRole('link', { name: /Review articles/ }).getAttribute('href')).toBe('#/dashboard/browse');
      expect(screen.getByRole('link', { name: /Explore relationships/ }).getAttribute('href')).toBe('#/dashboard/fullgraph');
    });
  });
});
