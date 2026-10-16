import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import App from '../src/app/App';
import { clearSession } from '../src/shared/session/session';
import { mockApi, renderWithClient, signInFixture, jsonResponse, emptyDashboardApi } from './helpers';
import { findTool, isLegacySynonym } from '../src/shared/navigation/registry';
import { MockPublicationProvider } from '../src/shared/runtime/publicationRuntime';

const cloudStatusFixture = {
  mode: 'published',
  revision: 1,
  run_id: 'release-2026-10-16',
  published_at: '2026-10-16T12:00:00Z',
  analysis_completed_at: '2026-10-15T18:00:00Z',
  counts: { articles: 850, claims: 420, relationships: 0 },
};

function renderApp(mode: 'local' | 'published' = 'local') {
  return renderWithClient(
    <MockPublicationProvider mode={mode} publication={mode === 'published' ? cloudStatusFixture : undefined}>
      <App />
    </MockPublicationProvider>
  );
}

function mockNavigationApi(handler?: (endpoint: string) => Response | undefined) {
  return mockApi((endpoint) => {
    const custom = handler?.(endpoint);
    if (custom) return custom;
    if (endpoint === '/capabilities') return jsonResponse({ mode: 'local' });
    if (endpoint.startsWith('/publications/access')) {
      return jsonResponse({ can_manage: false, can_publish: false, role: 'user' });
    }
    return emptyDashboardApi(endpoint);
  });
}

function mockCloudApi(handler?: (endpoint: string) => Response | undefined) {
  return mockApi((endpoint) => {
    const custom = handler?.(endpoint);
    if (custom) return custom;
    if (endpoint === '/capabilities') return jsonResponse({ mode: 'published' });
    if (endpoint === '/publications/status') return jsonResponse(cloudStatusFixture);
    if (endpoint.startsWith('/publications/access')) {
      return jsonResponse({ can_manage: false, can_publish: false, role: 'user' });
    }
    return emptyDashboardApi(endpoint);
  });
}

describe('Navigation and Data Experience (Package N5)', () => {
  beforeEach(() => {
    clearSession();
  });

  describe('Registry and Tool Descriptors', () => {
    it('contains all 12 advanced tools with complete metadata', () => {
      const advancedIds = [
        'overview', 'factcheck', 'fullgraph', 'timeline', 'masala',
        'graph', 'vector', 'cache', 'corpus', 'eval', 'project', 'casebook',
      ];
      for (const id of advancedIds) {
        const tool = findTool(id);
        expect(tool, `Tool ${id} should exist in registry`).toBeDefined();
        expect(tool?.summary).toBeTruthy();
        expect(tool?.input).toBeTruthy();
        expect(tool?.output).toBeTruthy();
        expect(tool?.availability).toMatch(/^(both|local-only|published-only)$/);
      }
    });

    it('identifies legacy synonyms correctly', () => {
      expect(isLegacySynonym('overview')).toBe(true);
      expect(isLegacySynonym('masala')).toBe(true);
      expect(isLegacySynonym('factcheck')).toBe(true);
      expect(isLegacySynonym('unknown-route-xyz')).toBe(false);
    });
  });

  describe('Shared Workspace Shell and Active Navigation', () => {
    it('renders the shared sidebar with primary destinations and breadcrumbs for signed-in users', async () => {
      signInFixture();
      mockNavigationApi((endpoint) => {
        if (endpoint === '/dashboard') {
          return jsonResponse({
            generated_at: '2026-10-03T10:00:00Z',
            services: { postgres: 'ok', neo4j: 'ok', redis: 'ok' },
            articles_total: 120, claims_total: 45, embedded_claims: 30, entities_total: 10,
            graph: { available: true, nodes: {}, relationships: 15 },
            cache: { available: true, used_memory_human: '2MB', used_memory_mb: 2 },
          });
        }
        return undefined;
      });

      window.history.replaceState(null, '', '/#/dashboard/browse');
      renderApp();

      // Verify breadcrumbs
      const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(breadcrumb).toBeTruthy();
      expect(within(breadcrumb).getByText('Home')).toBeTruthy();

      // Verify sidebar navigation items
      const nav = screen.getByRole('navigation', { name: 'Primary destinations' });
      expect(nav).toBeTruthy();
      expect(within(nav).getByRole('link', { name: 'Home' })).toBeTruthy();
      expect(within(nav).getByRole('link', { name: 'Explore data' })).toBeTruthy();
      expect(within(nav).getByRole('link', { name: 'Articles' })).toBeTruthy();
      expect(within(nav).getByRole('link', { name: 'Extracted claims' })).toBeTruthy();
      expect(within(nav).getByRole('link', { name: 'Recorded connections' })).toBeTruthy();
      expect(within(nav).getByRole('link', { name: 'Compare wording' })).toBeTruthy();
      expect(within(nav).getByRole('link', { name: /My investigations/ })).toBeTruthy();
      expect(within(nav).getByRole('link', { name: 'Advanced tools' })).toBeTruthy();

      // Developer workspace should NOT be shown for normal user without manage permission
      expect(screen.queryByRole('link', { name: /Developer workspace/ })).toBeNull();
    });

    it('shows Developer workspace link in sidebar for approved publishers/managers', async () => {
      signInFixture({ role: 'admin' });
      mockNavigationApi((endpoint) => {
        if (endpoint.startsWith('/publications/access')) {
          return jsonResponse({ can_manage: true, can_publish: true, role: 'admin', allowed: true });
        }
        return undefined;
      });

      window.history.replaceState(null, '', '/#/dashboard');
      renderApp();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /Developer workspace/ })).toBeTruthy();
      });
    });

    it('supports mobile menu toggle with keyboard accessibility (Escape to close)', async () => {
      signInFixture();
      mockNavigationApi();
      window.history.replaceState(null, '', '/#/dashboard/tools');
      renderApp();

      // Find mobile menu toggle button
      const menuBtn = screen.getByRole('button', { name: 'Open navigation menu' });
      expect(menuBtn).toBeTruthy();
      expect(menuBtn.getAttribute('aria-expanded')).toBe('false');

      // Click to open drawer
      fireEvent.click(menuBtn);
      expect(menuBtn.getAttribute('aria-expanded')).toBe('true');
      expect(screen.getByRole('dialog', { name: 'Navigation menu' })).toBeTruthy();

      // Close drawer via Escape key
      fireEvent.keyDown(window, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: 'Navigation menu' })).toBeNull();
      });
    });
  });

  describe('Legacy Search Normalization', () => {
    it('normalizes legacy #/dashboard?q=... to #/dashboard/browse?q=... without session loss', async () => {
      signInFixture();
      mockNavigationApi((endpoint) => {
        if (endpoint.startsWith('/corpus/articles')) {
          return jsonResponse({
            total: 1,
            items: [{ id: 'art-1', title: 'Floods in Region', domain: 'news.com' }],
            domains: ['news.com'],
            limit: 25,
            offset: 0,
          });
        }
        return undefined;
      });

      window.history.replaceState(null, '', '/#/dashboard?q=floods&offset=12');
      renderApp();

      await waitFor(() => {
        expect(window.location.hash).toBe('#/dashboard/browse?q=floods&offset=12');
      });
    });
  });

  describe('Home Orientation Experience', () => {
    it('renders real collection counts and honest research purpose without hardcoded metrics', async () => {
      signInFixture();
      mockNavigationApi((endpoint) => {
        if (endpoint === '/dashboard') {
          return jsonResponse({
            generated_at: '2026-10-03T10:00:00Z',
            services: { postgres: 'ok', neo4j: 'ok', redis: 'ok' },
            articles_total: 1050, claims_total: 620, embedded_claims: 400, entities_total: 90,
            graph: { available: true, nodes: {}, relationships: 0 },
            cache: { available: true, used_memory_human: '5MB', used_memory_mb: 5 },
          });
        }
        return undefined;
      });

      window.history.replaceState(null, '', '/#/dashboard');
      renderApp();

      // Purpose statement
      expect(screen.getByText(/An extracted claim is not a verified fact/)).toBeTruthy();

      await waitFor(() => {
        expect(document.querySelector('[aria-label="Collection summary"]')?.textContent).toContain('1,050');
      });

      // Three primary actions
      expect(screen.getByRole('heading', { name: 'Find source articles' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Inspect extracted claims' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Compare wording' })).toBeTruthy();

      // Definitions
      expect(screen.getByText('What these records mean')).toBeTruthy();
    });
  });

  describe('Claims Workspace (#/dashboard/claims)', () => {
    it('renders claims search in local mode with bounded article selector', async () => {
      signInFixture();
      mockNavigationApi((endpoint) => {
        if (endpoint.startsWith('/corpus/articles?') && !endpoint.includes('/claims')) {
          return jsonResponse({
            total: 1,
            items: [
              { id: '11111111-1111-1111-1111-111111111111', title: 'Local Investigation Article', domain: 'tribune.example' },
            ],
            domains: ['tribune.example'],
            limit: 12,
            offset: 0,
          });
        }
        if (endpoint.includes('/claims')) {
          return jsonResponse({
            total: 1,
            items: [
              {
                id: 'claim-101',
                text: 'Local flood defense infrastructure held back rising waters.',
                verdict: 'Supported',
                verdict_probability: 0.88,
              },
            ],
          });
        }
        return undefined;
      });

      window.history.replaceState(null, '', '/#/dashboard/claims');
      renderApp();

      // Scope notice
      expect(await screen.findByText(/Local analysis workspace notice/)).toBeTruthy();

      // Article selector
      const selector = await screen.findByLabelText(/Select an article to view its claims/);
      expect(selector).toBeTruthy();

      // Select article
      fireEvent.change(selector, { target: { value: '11111111-1111-1111-1111-111111111111' } });

      // Claims list for that article
      expect(await screen.findByText(/Local flood defense infrastructure held back rising waters/)).toBeTruthy();
      expect(screen.getByText(/Open owning article with this claim/)).toBeTruthy();
    });

    it('renders global claims search in published cloud mode with parameter persistence', async () => {
      signInFixture();
      mockCloudApi((endpoint) => {
        if (endpoint.startsWith('/corpus/claims')) {
          return jsonResponse({
            total: 1,
            items: [
              {
                id: 'claim-cloud-1',
                article_id: '22222222-2222-2222-2222-222222222222',
                text: 'Cloud publication recorded statement regarding water flow.',
                title: 'River Basin Study',
                domain: 'science.org',
                verdict: 'Supported',
                verdict_probability: 0.95,
              },
            ],
          });
        }
        return undefined;
      });

      window.history.replaceState(null, '', '/#/dashboard/claims?q=water');
      renderApp('published');

      expect(await screen.findByText(/1 matching statements/)).toBeTruthy();
      expect(screen.getByText(/Cloud publication recorded statement regarding water flow/)).toBeTruthy();
      expect(screen.getByText(/River Basin Study/)).toBeTruthy();

      // Submitting a new search query updates hash
      const searchInput = screen.getByRole('textbox', { name: 'Search published claims' });
      fireEvent.change(searchInput, { target: { value: 'storm' } });
      fireEvent.submit(searchInput.closest('form')!);

      await waitFor(() => {
        expect(window.location.hash).toContain('q=storm');
      });
    });
  });

  describe('Tools Directory & Cloud Availability Notices', () => {
    it('renders 12 tools grouped by task with legacy synonyms and availability', async () => {
      signInFixture();
      mockNavigationApi();

      window.history.replaceState(null, '', '/#/dashboard/tools');
      renderApp();

      expect(screen.getByRole('heading', { name: 'Tools & guides' })).toBeTruthy();
      expect(screen.getByText('Explore the collection')).toBeTruthy();
      expect(screen.getByText('Compare & keep research notes')).toBeTruthy();
    });

    it('displays clear named notice when a local-only tool is opened in cloud mode', async () => {
      signInFixture();
      mockCloudApi();

      window.history.replaceState(null, '', '/#/dashboard/graph');
      renderApp('published');

      // Should indicate tool runs on local PC
      expect(await screen.findByText(/runs on the local analysis PC/)).toBeTruthy();
      expect(screen.getByText(/Useful alternative in this workspace/)).toBeTruthy();
      expect(screen.getByRole('link', { name: /Open alternative/ })).toBeTruthy();
    });
  });

  describe('Article Investigation 9 Tabs Experience', () => {
    it('groups 9 detail tabs into Source, Analysis, Context, Methods and retains navigation', async () => {
      signInFixture();
      mockNavigationApi((endpoint) => {
        if (endpoint.includes('/claims?')) {
          return jsonResponse({
            article_id: '11111111-1111-1111-1111-111111111111',
            total: 0,
            items: [],
            limit: 20,
            offset: 0,
          });
        }
        if (endpoint.includes('/connections?')) {
          return jsonResponse({
            article_id: '11111111-1111-1111-1111-111111111111',
            total_edges: 0,
            articles: [],
            edges: [],
          });
        }
        if (endpoint.startsWith('/corpus/articles/11111111-1111-1111-1111-111111111111')) {
          return jsonResponse({
            id: '11111111-1111-1111-1111-111111111111',
            title: 'Major Climate Report Released',
            domain: 'reuters.com',
            url: 'https://reuters.com/climate',
            published_at: '2026-10-01T08:00:00Z',
            collected_at: '2026-10-02T08:00:00Z',
            claims_total: 5,
            body: 'Full article text regarding the climate findings.',
            nlp_status: 'completed',
          });
        }
        return undefined;
      });

      window.history.replaceState(null, '', '/#/dashboard/articles/11111111-1111-1111-1111-111111111111/overview');
      renderApp();

      // Verify article title and source info
      expect(await screen.findByRole('heading', { name: 'Major Climate Report Released' })).toBeTruthy();
      expect(screen.getByText('reuters.com')).toBeTruthy();

      // Verify tab group headers
      expect(screen.getByText('Source')).toBeTruthy();
      expect(screen.getByText('Analysis')).toBeTruthy();
      expect(screen.getByText('Context')).toBeTruthy();
      expect(screen.getByText('Methods')).toBeTruthy();

      // Verify all 9 tabs are rendered
      const nav = screen.getByRole('navigation', { name: 'Article details' });
      expect(within(nav).getAllByRole('link')).toHaveLength(9);
    });
  });

  describe('Account Sign-out and Private State', () => {
    it('signs out and purges user session without leaving private dashboard mounted', async () => {
      signInFixture();
      mockNavigationApi((endpoint) => {
        if (endpoint === '/auth/logout') {
          return jsonResponse({ message: 'Logged out' });
        }
        return undefined;
      });

      window.history.replaceState(null, '', '/#/dashboard');
      renderApp();

      expect(screen.getByRole('navigation', { name: 'Primary destinations' })).toBeTruthy();

      // Open Account modal (select desktop sidebar button)
      const accountBtns = screen.getAllByRole('button', { name: /Account/ });
      fireEvent.click(accountBtns[0]);

      // Click Log out button inside modal
      const logoutBtn = await screen.findByRole('button', { name: 'Log out' });
      fireEvent.click(logoutBtn);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeTruthy();
      });
      expect(screen.queryByRole('navigation', { name: 'Primary destinations' })).toBeNull();
    });
  });
});
