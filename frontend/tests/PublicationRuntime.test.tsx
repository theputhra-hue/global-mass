import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PublicationProvider, usePublicationRuntime } from '../src/shared/runtime/publicationRuntime';
import { jsonResponse, mockApi, renderWithClient } from './helpers';

function RuntimeStatus() { const runtime = usePublicationRuntime(); return <p>{runtime.mode}</p>; }

describe('publication runtime recovery', () => {
  it('keeps a validated reader visible when a background capabilities refresh fails', async () => {
    let fail = false;
    mockApi(path => path === '/capabilities' ? jsonResponse(fail ? { detail: 'Temporary network failure' } : { mode: 'published' }, fail ? 503 : 200) : jsonResponse({ revision: 3, run_id: 'release-a' }));
    const { client } = renderWithClient(<PublicationProvider><RuntimeStatus /></PublicationProvider>);
    expect(await screen.findByText('published')).toBeTruthy();
    fail = true;
    await act(async () => { await client.refetchQueries({ queryKey: ['capabilities'] }); });
    expect(client.getQueryState(['capabilities'])?.status).toBe('error');
    expect(screen.getByText('published')).toBeTruthy();
  });
  it('reports an initial capabilities failure instead of assuming a mode', async () => {
    mockApi(() => jsonResponse({ detail: 'Service unavailable' }, 503));
    renderWithClient(<PublicationProvider><RuntimeStatus /></PublicationProvider>);
    expect(await screen.findByText('unavailable')).toBeTruthy();
  });
});
