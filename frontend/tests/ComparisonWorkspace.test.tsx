import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ComparisonWorkspace } from '../src/components/ComparisonWorkspace';
import { openComparison } from '../src/lib/comparisonNavigation';
import { clearSession } from '../src/lib/session';
import { renderWithClient, signInFixture } from './helpers';

describe('comparison navigation privacy', () => {
  it('does not carry a pending handoff into a later session', () => {
    signInFixture();
    openComparison({ older: 'First account text', newer: 'First account revision', returnTo: '#/dashboard/masala' });
    clearSession(); signInFixture();
    renderWithClient(<ComparisonWorkspace />);
    expect((screen.getByLabelText('Older text') as HTMLTextAreaElement).value).toBe('');
  });

  it('clears mounted comparison context on session change and rejects external return URLs', () => {
    signInFixture();
    openComparison({ older: 'First account text', newer: 'First account revision', returnTo: 'https://example.com' });
    renderWithClient(<ComparisonWorkspace />);
    expect(screen.getByRole('link', { name: 'Back to article changes' }).getAttribute('href')).toBe('#/dashboard/browse');
    act(() => { clearSession(); signInFixture(); });
    expect((screen.getByLabelText('Older text') as HTMLTextAreaElement).value).toBe('');
    expect(screen.queryByRole('link', { name: 'Back to article changes' })).toBeNull();
  });
});
