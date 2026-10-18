import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PublishedWorkspace } from '../src/pages/PublishedWorkspace';
import { PublicationProvider } from '../src/lib/publicationRuntime';
import { jsonResponse, mockApi, renderWithClient, signInFixture } from './helpers';

describe('published workspace boundaries', () => {
  it.each(['graph', 'timeline', 'cache', 'masala', 'eval'])('keeps %s deep links explanatory without requesting local analysis', async tab => {
    signInFixture();
    const fetch = mockApi(endpoint => endpoint === '/capabilities' ? jsonResponse({ mode: 'published' }) : jsonResponse({ revision: 1, counts: { articles: 0, claims: 0, relationships: 0 } }));
    renderWithClient(<PublicationProvider><PublishedWorkspace tab={tab} /></PublicationProvider>);
    expect(screen.getByRole('heading', { name: 'This tool runs in the local workspace.' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Choose another tool' }).getAttribute('href')).toBe('#/dashboard/tools');
    await screen.findByText('Awaiting the first reviewed publication.');
    expect(fetch.mock.calls.every(([url]) => /\/(capabilities|publications\/status)$/.test(String(url)))).toBe(true);
  });
});
