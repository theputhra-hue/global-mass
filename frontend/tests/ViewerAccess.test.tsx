import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WorkspaceNavLinks } from '../src/features/navigation/components/WorkspaceNavLinks';
import { MutationComparator } from '../src/features/comparison/components/MutationComparator';
import { ClaimCheck } from '../src/features/claims/components/ClaimCheck';
import { viewerCanOpen } from '../src/shared/navigation/viewerAccess';
import { resolveRoute } from '../src/app/routing/resolveRoute';
import { renderWithClient, signInFixture } from './helpers';

describe('viewer-only access', () => {
  it('keeps browsing and graphs while removing write destinations from the shared navigation', () => {
    signInFixture({ role: 'viewer' });
    renderWithClient(<nav><WorkspaceNavLinks route={resolveRoute('#/dashboard/browse')} developer /></nav>);
    const nav = within(screen.getByRole('navigation'));
    expect(nav.getByRole('link', { name: 'Find articles' })).toBeDefined();
    expect(nav.getByRole('link', { name: 'Story map' })).toBeDefined();
    expect(nav.queryByRole('link', { name: 'Compare wording' })).toBeNull();
    expect(nav.queryByRole('link', { name: 'Saved investigations' })).toBeNull();
    expect(nav.queryByRole('link', { name: 'Manage data' })).toBeNull();
    fireEvent.click(nav.getByRole('button', { name: 'Research tools' }));
    expect(nav.getByRole('link', { name: 'Recorded links' })).toBeDefined();
    expect(nav.getByRole('link', { name: 'Extracted statements' })).toBeDefined();
    expect(nav.queryByRole('link', { name: 'All research tools' })).toBeNull();
  });
  it.each(['compare', 'check', 'casebook', 'tools', 'developer', 'upload', 'eval', 'masala', 'project'])('blocks direct navigation to %s', destination => {
    expect(viewerCanOpen(resolveRoute(`#/dashboard/${destination}`))).toBe(false);
  });
  it.each(['browse', 'atlas', 'fullgraph', 'claims', 'factcheck', 'help'])('permits saved data at %s', destination => {
    expect(viewerCanOpen(resolveRoute(`#/dashboard/${destination}`))).toBe(true);
  });
  it('does not render inline comparison or evidence forms inside article sections', () => {
    signInFixture({ role: 'viewer' });
    renderWithClient(<><MutationComparator /><ClaimCheck /></>);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Compare mutations' })).toBeNull();
    expect(screen.getAllByRole('heading', { name: 'Viewing access only' })).toHaveLength(2);
  });
});
