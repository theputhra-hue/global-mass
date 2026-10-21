import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CollectionSearch } from '../src/features/navigation/components/CollectionSearch';
import { WorkspaceNavLinks } from '../src/features/navigation/components/WorkspaceNavLinks';
import { visitorLinks } from '../src/shared/navigation/visitorNavigation';
import { signInDestination } from '../src/shared/navigation/articleRoutes';
import { renderWithClient } from './helpers';

describe('first visit task navigation', () => {
  it('offers a flat, ordered set of main destinations before specialist tools', () => {
    renderWithClient(<nav aria-label="Test navigation"><WorkspaceNavLinks route={{ kind: 'reader', view: 'home', raw: 'dashboard', dashboard: true }} /></nav>);
    const nav = screen.getByRole('navigation');
    expect(within(nav).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual([...visitorLinks.map(link => link.href), '#/dashboard/help']);
    expect(within(nav).queryByRole('link', { name: 'Recorded links' })).toBeNull();
    fireEvent.click(within(nav).getByRole('button', { name: 'Research tools' }));
    expect(within(nav).getByRole('link', { name: 'Recorded links' }).getAttribute('href')).toBe('#/dashboard/fullgraph');
    expect(within(nav).getByRole('link', { name: 'All research tools' }).getAttribute('href')).toBe('#/dashboard/tools');
    expect(within(nav).queryByRole('link', { name: 'Manage data' })).toBeNull();
  });
  it('takes a signed-in visitor directly to results and safely encodes the search', () => {
    renderWithClient(<CollectionSearch />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  floods & storms  ' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Search the news collection' }));
    expect(window.location.hash).toBe('#/dashboard/browse?q=floods+%26+storms&offset=0');
  });
  it('keeps an anonymous visitor’s query through sign-in without fetching private data', () => {
    renderWithClient(<CollectionSearch authenticated={false} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'water shortage' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Search the news collection' }));
    expect(window.location.hash.startsWith('#/signin?next=')).toBe(true);
    expect(signInDestination()).toBe('#/dashboard/browse?q=water+shortage&offset=0');
  });
});
