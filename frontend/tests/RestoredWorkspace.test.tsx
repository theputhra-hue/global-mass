import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WorkspaceShell } from '../src/app/layouts/WorkspaceShell';
import { resolveRoute } from '../src/app/routing/resolveRoute';
import { MockPublicationProvider } from '../src/shared/runtime/publicationRuntime';
import { viewerCanOpen } from '../src/shared/navigation/viewerAccess';
import { renderWithClient, signInFixture } from './helpers';

function shell(hash = '#/dashboard/browse', mode: 'local' | 'published' = 'local') {
  return renderWithClient(<MockPublicationProvider mode={mode}>
    <WorkspaceShell route={resolveRoute(hash)}><h1>Collection content</h1></WorkspaceShell>
  </MockPublicationProvider>);
}

describe('restored clear workspace', () => {
  it('restores the earlier primary destinations with one content landmark', () => {
    shell();
    const nav = screen.getByRole('navigation', { name: 'Workspace' });
    for (const name of ['Explore articles', 'Check a claim', 'Compare wording', 'My investigations']) {
      expect(within(nav).getByRole('link', { name })).toBeTruthy();
    }
    expect(within(nav).getByRole('link', { name: 'Explore articles' }).getAttribute('aria-current')).toBe('page');
    expect(document.querySelectorAll('main')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Skip to content' }));
    expect(document.activeElement).toBe(screen.getByRole('main'));
  });

  it('keeps the current map available and selected under research navigation', () => {
    shell('#/dashboard/atlas?release=11111111-1111-1111-1111-111111111111');
    const link = screen.getByRole('link', { name: 'Story map', exact: true });
    expect(link.getAttribute('href')).toBe('#/dashboard/atlas');
    expect(link.getAttribute('aria-current')).toBe('page');
    expect(link.closest('details')?.open).toBe(true);
    expect(screen.getByRole('link', { name: 'Article & claim map' }).getAttribute('href')).toBe('#/dashboard/fullgraph');
    expect(document.querySelector('.workspace-wide-map')).toBeTruthy();
  });

  it('retains sidebar collapse preference and a reachable expand control', () => {
    shell();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse navigation' }));
    expect(localStorage.getItem('gmee:sidebar-collapsed')).toBe('true');
    expect(document.querySelector('.workspace-collapsed')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Expand navigation' }));
    expect(localStorage.getItem('gmee:sidebar-collapsed')).toBe('false');
    expect(document.querySelector('.workspace-collapsed')).toBeNull();
  });

  it('keeps mobile navigation modal and restores focus on Escape', () => {
    shell();
    const open = screen.getByRole('button', { name: 'Open navigation' });
    open.focus();
    fireEvent.click(open);
    const dialog = screen.getByRole('dialog', { name: 'Your workspace' });
    expect(within(dialog).getByRole('link', { name: 'Explore articles' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(open);
  });

  it('uses saved-claim wording and hides local system controls in a published archive', () => {
    shell('#/dashboard/check', 'published');
    expect(screen.getByRole('link', { name: 'Saved claims' }).getAttribute('aria-current')).toBe('page');
    expect(screen.queryByText('System tools')).toBeNull();
  });

  it('keeps viewer navigation restricted to saved data on desktop and mobile', () => {
    signInFixture({ role: 'viewer' });
    shell('#/dashboard/atlas');
    const nav = screen.getByRole('navigation', { name: 'Workspace' });
    expect(within(nav).getByRole('link', { name: 'Saved claims' }).getAttribute('href')).toBe('#/dashboard/claims');
    expect(within(nav).getByRole('link', { name: 'Story map', exact: true })).toBeTruthy();
    expect(within(nav).getByRole('link', { name: 'Article & claim map' })).toBeTruthy();
    expect(within(nav).getByRole('link', { name: 'Help & methods' })).toBeTruthy();
    for (const name of ['Check a claim', 'Compare wording', 'My investigations', 'All tools & guides']) {
      expect(within(nav).queryByRole('link', { name })).toBeNull();
    }
    expect(screen.queryByText('System tools')).toBeNull();
    expect(screen.getByText(/Viewer account · Read-only access/)).toBeTruthy();
    for (const link of within(nav).getAllByRole('link')) {
      expect(viewerCanOpen(resolveRoute(link.getAttribute('href') || ''))).toBe(true);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    const dialog = screen.getByRole('dialog', { name: 'Your workspace' });
    for (const link of within(dialog).getAllByRole('link')) {
      expect(viewerCanOpen(resolveRoute(link.getAttribute('href') || ''))).toBe(true);
    }
  });
});
