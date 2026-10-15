import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DeveloperUpload } from '../src/pages/DeveloperUpload';
import { jsonResponse, mockApi, renderWithClient, signInFixture } from './helpers';

describe('developer upload', () => {
  it('uploads the selected JSON and reports saved staging counts', async () => {
    signInFixture();
    const fetch = mockApi(endpoint => {
      if (endpoint === '/publications/access') return jsonResponse({ allowed: true, max_bytes: 1000, mode: 'staging' });
      if (endpoint === '/publications/upload') return jsonResponse({ run_id: 'fixture', sha256: 'hash', uploaded_at: '2026-10-15T10:00:00Z', status: 'staged', replayed: false, articles: 2, claims: 3, relationships: 1 });
      return jsonResponse({ items: [] });
    });
    renderWithClient(<DeveloperUpload />);
    const file = new File(['{"schema_version":"1"}'], 'results.json');
    Object.defineProperty(file, 'text', { value: async () => '{"schema_version":"1"}' });
    fireEvent.change(await screen.findByLabelText('1. Choose your analysis file'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: '2. Validate and upload' }));
    expect(await screen.findByText(/Upload saved successfully/)).toBeTruthy();
    const call = fetch.mock.calls.find(([url]) => String(url).endsWith('/publications/upload'));
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ schema_version: '1' });
  });
  it('denies access without showing the file picker or requesting history', async () => {
    signInFixture();
    const fetch = mockApi(() => jsonResponse({ allowed: false, max_bytes: 100, mode: 'staging' }));
    renderWithClient(<DeveloperUpload />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByLabelText('1. Choose your analysis file')).toBeNull();
    expect(fetch.mock.calls.length).toBe(1);
  });

  it('shows staging limits and rejects an oversized file before sending it', async () => {
    signInFixture();
    const fetch = mockApi(endpoint => endpoint === '/publications/access'
      ? jsonResponse({ allowed: true, max_bytes: 2, mode: 'staging' })
      : jsonResponse({ items: [] }));
    renderWithClient(<DeveloperUpload />);
    const input = await screen.findByLabelText('1. Choose your analysis file');
    fireEvent.change(input, { target: { files: [new File(['{} '], 'results.json', { type: 'application/json' })] } });
    fireEvent.click(screen.getByRole('button', { name: '2. Validate and upload' }));
    expect(await screen.findByText('Choose a file smaller than 10 MiB.')).toBeTruthy();
    expect(fetch.mock.calls.some(([url]) => String(url).endsWith('/publications/upload'))).toBe(false);
    expect(screen.getByText(/They do not yet replace/)).toBeTruthy();
  });
});
