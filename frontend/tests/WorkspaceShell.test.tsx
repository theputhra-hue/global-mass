import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WorkspaceShell } from '../src/components/WorkspaceShell';
import { PublicationProvider } from '../src/lib/publicationRuntime';
import { jsonResponse, mockApi, renderWithClient, signInFixture } from './helpers';

describe('shared workspace navigation', () => {
  it('keeps existing research deep links and identifies the active section', () => {
    signInFixture();
    renderWithClient(<WorkspaceShell route="dashboard/fullgraph"><main id="main-content">Map content</main></WorkspaceShell>);
    const nav = screen.getByRole('navigation', { name: 'Workspace' });
    expect(within(nav).getByRole('link', { name: 'Article & claim map' }).getAttribute('aria-current')).toBe('page');
    for (const key of ['graph', 'vector', 'corpus', 'timeline', 'project', 'masala', 'eval', 'overview', 'cache', 'casebook']) {
      expect(nav.querySelector(`a[href="#/dashboard/${key}"]`)).toBeTruthy();
    }
    expect(screen.queryByRole('link', { name: 'Developer console' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Skip to content' }));
    expect(document.activeElement).toBe(screen.getByRole('main'));
  });

  it('opens an accessible mobile menu, closes on Escape, and restores focus', () => {
    signInFixture();
    renderWithClient(<WorkspaceShell route="dashboard"><main>Articles</main></WorkspaceShell>);
    const trigger = screen.getByRole('button', { name: 'Open navigation' });
    trigger.focus(); fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Your workspace' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('link', { name: 'My investigations' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('collapses and restores desktop navigation without changing the page', () => {
    signInFixture();
    renderWithClient(<WorkspaceShell route="dashboard/compare"><main>Comparison draft</main></WorkspaceShell>);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse navigation' }));
    expect(screen.getByRole('button', { name: 'Expand navigation' }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText('Comparison draft')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Expand navigation' }));
    expect(screen.getByRole('button', { name: 'Collapse navigation' })).toBeTruthy();
  });

  it('describes published capabilities without offering local system controls', async () => {
    signInFixture();
    mockApi(endpoint => endpoint === '/capabilities' ? jsonResponse({ mode: 'published' }) : jsonResponse({ revision: 1, counts: { articles: 0, claims: 0, relationships: 0 } }));
    renderWithClient(<PublicationProvider><WorkspaceShell route="dashboard/vector"><main>Published search</main></WorkspaceShell></PublicationProvider>);
    expect(await screen.findByRole('link', { name: 'Saved claims' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Article search' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Research annotation Local workspace only' })).toBeTruthy();
    expect(screen.queryByText('System tools')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Developer console' })).toBeNull();
  });
});
