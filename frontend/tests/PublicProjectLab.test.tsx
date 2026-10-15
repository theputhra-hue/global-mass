import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/App';
import { jsonResponse, mockApi, renderWithClient } from './helpers';

function report(offline: boolean) {
  return {
    total: 12, passed: 12, lexical_baseline_passed: 9, research_gold: false,
    algorithm_version: 'test-v1', dataset_sha256: 'abc', warning: 'Authored controls, not research accuracy.',
    ...(offline ? { runtime_mode: 'offline_preview' } : {}),
    items: [{ id: 'distance', title: 'Equivalent distance', group: 'Controls', older_text: 'The road is 1 km long.', newer_text: 'The road is 1000 m long.', expected_change: false, passed: true, lexical_baseline_change: true, analysis: { relation_category: 'EQUIVALENT_QUANTITY', relation_explanation: 'Quantities match.', mutation_types: ['NEAR_DUPLICATE'] } }],
  };
}

describe('public engineering controls', () => {
  it('opens without signing in and requests only the public controls endpoint', async () => {
    const fetch = mockApi(endpoint => {
      expect(endpoint).toBe('/project/lab');
      return jsonResponse(report(true));
    });
    window.history.replaceState(null, '', '/#/project');
    renderWithClient(<App />);
    expect(await screen.findByText('Quantities match.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'GMEE / Project Lab' })).toBeTruthy();
    expect(screen.getByText(/Workspace actions are unavailable in this local preview/)).toBeTruthy();
    const journey = screen.getByRole('button', { name: /Explore the corpus/ }) as HTMLButtonElement;
    expect(journey.disabled).toBe(true);
    fireEvent.click(journey);
    expect((screen.getByRole('button', { name: 'Sign in to investigate this pair' }) as HTMLButtonElement).disabled).toBe(true);
    expect(window.location.hash).toBe('#/project');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('heading', { name: 'Welcome back' })).toBeNull();
  });
  it('directs public visitors to sign-in before opening an online workspace action', async () => {
    const fetch = mockApi(endpoint => {
      expect(endpoint).toBe('/project/lab');
      return jsonResponse(report(false));
    });
    window.history.replaceState(null, '', '/#/project');
    renderWithClient(<App />);
    await screen.findByText('Quantities match.');
    fireEvent.click(screen.getByRole('button', { name: /Preserve an investigation/ }));
    await waitFor(() => expect(window.location.hash).toBe('#/signin'));
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
