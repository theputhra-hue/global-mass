import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OperationsPanel } from '../src/components/OperationsPanel';
import { PollingContext } from '../src/lib/polling';
import { clearSession } from '../src/lib/session';
import { jsonResponse, mockApi, renderWithClient, signInFixture } from './helpers';

describe('Pipeline operations', () => {
  it('shows controls only to administrators', () => {
    signInFixture();
    renderWithClient(<OperationsPanel />);
    expect(screen.queryByRole('button', { name: 'Pipeline operations' })).toBeNull();
  });

  it('requires preview before recovery and sends the selected stage', async () => {
    signInFixture({ role: 'admin' });
    const calls: unknown[] = [];
    mockApi((path, init) => {
      if (path === '/operations/jobs') return jsonResponse({ items: [] });
      if (path === '/operations/recover') {
        const body = JSON.parse(String(init?.body)) as { stage: string; dry_run: boolean };
        calls.push(body);
        return jsonResponse({ ...body, requeued: 2, failed: 0 });
      }
      return jsonResponse({}, 404);
    });
    renderWithClient(<OperationsPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Pipeline operations' }));
    const recover = screen.getByRole('button', { name: 'Recover expired work' }) as HTMLButtonElement;
    expect(recover.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Preview expired work' }));
    await waitFor(() => expect(recover.disabled).toBe(false));
    expect(calls).toEqual([{ stage: 'nlp', dry_run: true }]);
    fireEvent.click(recover);
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]).toEqual({ stage: 'nlp', dry_run: false });
  });

  it('respects the dashboard polling pause for recent jobs', async () => {
    signInFixture({ role: 'admin' });
    const fetch = mockApi(() => jsonResponse({ items: [] }));
    renderWithClient(<PollingContext.Provider value={{ interval: 0, setInterval: () => {} }}><OperationsPanel /></PollingContext.Provider>);
    fireEvent.click(screen.getByRole('button', { name: 'Pipeline operations' }));
    await screen.findByText('No pipeline runs recorded yet.');
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.useFakeTimers();
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not reuse another administrator account’s cached job history', async () => {
    signInFixture({ role: 'admin' });
    let calls = 0;
    mockApi(() => ++calls === 1 ? jsonResponse({ items: [{ id: 'old-job', job_type: 'Old account job', status: 'completed', started_at: '2026-01-01T00:00:00Z', error: null }] }) : new Promise<Response>(() => {}));
    renderWithClient(<OperationsPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Pipeline operations' }));
    await screen.findByText('Old account job');
    act(() => {
      clearSession();
      signInFixture({ role: 'admin', id: 'another-admin' });
    });
    expect(screen.queryByText('Old account job')).toBeNull();
    expect(screen.getByText('Loading recent runs…')).toBeTruthy();
  });
});
