import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DeveloperUpload } from '../src/features/publishing/pages/DeveloperUpload';
import { ApiError } from '../src/shared/api/client';
import { publicationsApi } from '../src/shared/api/publications';
import { vi } from 'vitest';
import { jsonResponse, mockApi, renderWithClient, signInFixture } from './helpers';

describe('developer upload', () => {
  it('distinguishes a read-only review timeout from upload failure and retries only review', async () => {
    signInFixture({ role: 'admin' });
    const receipt = { run_id: 'saved-run', sha256: 'a'.repeat(64), status: 'staged', articles: 7421, claims: 5157, relationships: 300 };
    const fetch = mockApi(endpoint => endpoint === '/publications/access'
      ? jsonResponse({ allowed: true, max_bytes: 10000000, mode: 'publishing' }) : jsonResponse({ items: [receipt] }));
    const review = vi.spyOn(publicationsApi, 'review').mockRejectedValueOnce(new ApiError(0, null, 'Request timed out after 15s.', 'timeout'))
      .mockResolvedValueOnce({ ...receipt, uploaded_at: '2026-10-18T10:00:00Z', replayed: false, status: 'staged', generated_at: '', provenance: {}, sample_articles: [], sample_claims: [], current: { revision: 1, counts: { articles: 7421 } } } as Awaited<ReturnType<typeof publicationsApi.review>>);
    renderWithClient(<DeveloperUpload />);
    fireEvent.click(await screen.findByRole('button', { name: 'Review / publish this release' }));
    expect(await screen.findByText('Release review unavailable')).toBeTruthy();
    expect(screen.getByText(/This read-only request did not upload or publish anything/)).toBeTruthy();
    expect(screen.queryByText('Upload failed')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry release review' }));
    expect(await screen.findByText('Staged release summary:')).toBeTruthy();
    expect(review).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls.some(([url]) => /\/upload$|\/publish$/.test(String(url)))).toBe(false);
  });

  it('requires review approval and publishes the exact reviewed fingerprint and revision', async () => {
    signInFixture({ role: 'admin' });
    const receipt = {
      run_id: 'reviewed-run',
      sha256: 'a'.repeat(64),
      uploaded_at: '2026-10-15T10:00:00Z',
      status: 'staged',
      articles: 2,
      claims: 3,
      relationships: 1,
    };
    const fetch = mockApi((endpoint) => {
      if (endpoint === '/publications/access') return jsonResponse({ allowed: true, max_bytes: 1000, mode: 'publishing' });
      if (endpoint.endsWith('/review')) {
        return jsonResponse({
          ...receipt,
          provenance: { source_commit: 'b'.repeat(40) },
          sample_articles: [],
          sample_claims: [],
          current: { revision: 7, counts: { articles: 8 } },
        });
      }
      if (endpoint.endsWith('/publish')) return jsonResponse({ revision: 8, run_id: receipt.run_id });
      return jsonResponse({ items: [receipt] });
    });
    renderWithClient(<DeveloperUpload />);
    fireEvent.click(await screen.findByRole('button', { name: 'Review / publish this release' }));
    const publish = await screen.findByRole('button', { name: '4. Publish reviewed release' });
    expect(publish.hasAttribute('disabled')).toBe(true);
    expect(fetch.mock.calls.some(([url]) => String(url).endsWith('/publish'))).toBe(false);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(publish);
    expect(await screen.findByText(/Published successfully/)).toBeTruthy();
    const call = fetch.mock.calls.find(([url]) => String(url).endsWith('/publish'));
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ sha256: receipt.sha256, expected_revision: 7, reviewed: true });
  });

  it('uploads the selected JSON and reports saved staging counts', async () => {
    signInFixture();
    const fetch = mockApi((endpoint) => {
      if (endpoint === '/publications/access') return jsonResponse({ allowed: true, max_bytes: 1000, mode: 'staging' });
      if (endpoint === '/publications/upload') {
        return jsonResponse({
          run_id: 'fixture',
          sha256: 'hash',
          uploaded_at: '2026-10-15T10:00:00Z',
          status: 'staged',
          replayed: false,
          articles: 2,
          claims: 3,
          relationships: 1,
        });
      }
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
    const fetch = mockApi((endpoint) =>
      endpoint === '/publications/access'
        ? jsonResponse({ allowed: true, max_bytes: 2, mode: 'staging' })
        : jsonResponse({ items: [] })
    );
    renderWithClient(<DeveloperUpload />);
    const input = await screen.findByLabelText('1. Choose your analysis file');
    fireEvent.change(input, { target: { files: [new File(['{} '], 'results.json', { type: 'application/json' })] } });
    fireEvent.click(screen.getByRole('button', { name: '2. Validate and upload' }));
    expect(await screen.findByText('Choose a file smaller than 10 MiB.')).toBeTruthy();
    expect(fetch.mock.calls.some(([url]) => String(url).endsWith('/publications/upload'))).toBe(false);
    expect(screen.getByText(/An upload stays private/)).toBeTruthy();
  });

  it('handles 409 stale review conflict on publish with refresh advice', async () => {
    signInFixture({ role: 'admin' });
    const receipt = {
      run_id: 'conflict-run',
      sha256: 'c'.repeat(64),
      uploaded_at: '2026-10-15T10:00:00Z',
      status: 'staged',
      articles: 5,
      claims: 5,
      relationships: 2,
    };
    mockApi((endpoint) => {
      if (endpoint === '/publications/access') return jsonResponse({ allowed: true, max_bytes: 1000, mode: 'publishing' });
      if (endpoint.endsWith('/review')) {
        return jsonResponse({
          ...receipt,
          provenance: { source_commit: 'b'.repeat(40) },
          sample_articles: [],
          sample_claims: [],
          current: { revision: 10, counts: { articles: 12 } },
        });
      }
      if (endpoint.endsWith('/publish')) return jsonResponse({ detail: 'Active revision changed' }, 409);
      return jsonResponse({ items: [receipt] });
    });

    renderWithClient(<DeveloperUpload />);
    fireEvent.click(await screen.findByRole('button', { name: 'Review / publish this release' }));
    const publish = await screen.findByRole('button', { name: '4. Publish reviewed release' });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(publish);

    expect(await screen.findByText(/Stale release review \(revision conflict\)/)).toBeTruthy();
    expect(screen.getByText(/Refresh the review before publishing/)).toBeTruthy();
  });

  it('rejects invalid JSON file structure on client side', async () => {
    signInFixture({ role: 'admin' });
    const fetch = mockApi((endpoint) =>
      endpoint === '/publications/access'
        ? jsonResponse({ allowed: true, max_bytes: 10000, mode: 'staging' })
        : jsonResponse({ items: [] })
    );
    renderWithClient(<DeveloperUpload />);
    const file = new File(['not json content'], 'invalid.json');
    Object.defineProperty(file, 'text', { value: async () => 'not json content' });
    fireEvent.change(await screen.findByLabelText('1. Choose your analysis file'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: '2. Validate and upload' }));

    expect(await screen.findByText('Choose a publication JSON object.')).toBeTruthy();
    expect(fetch.mock.calls.some(([url]) => String(url).endsWith('/publications/upload'))).toBe(false);
  });
});
