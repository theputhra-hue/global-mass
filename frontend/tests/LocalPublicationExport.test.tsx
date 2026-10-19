import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LocalPublicationExport } from '../src/features/publishing/components/LocalPublicationExport';
import { MockPublicationProvider } from '../src/shared/runtime/publicationRuntime';
import { jsonResponse, mockApi, renderWithClient, signInFixture } from './helpers';

const sampleHints = {
  source_commit: '1234567890abcdef1234567890abcdef12345678',
  config_sha256: 'a'.repeat(64),
  model_revisions: { 'spacy-ner': 'v3.7.2', 'embeddings': 'bge-small-en-v1.5' },
  notice: 'Local analysis configuration loaded from active environment.',
};

describe('LocalPublicationExport', () => {
  it('labels inputs as claim extraction start/end and warns about complete replacement release', async () => {
    signInFixture({ role: 'admin' });
    mockApi((endpoint) => (endpoint === '/developer/export-hints' ? jsonResponse(sampleHints) : jsonResponse({})));

    renderWithClient(
      <MockPublicationProvider mode="local">
        <LocalPublicationExport />
      </MockPublicationProvider>
    );

    expect(await screen.findByLabelText('Claim extraction started')).toBeTruthy();
    expect(screen.getByLabelText('Claim extraction completed')).toBeTruthy();
    expect(screen.getByText(/These timestamps select completed claims by extraction time/)).toBeTruthy();
    expect(screen.getByText(/Complete replacement release \(10 MiB max\)/)).toBeTruthy();
    expect(screen.getByText(/Never split a dataset into multiple partial uploads/)).toBeTruthy();
    expect(screen.getByText(/Current hints describe the server's active environment/)).toBeTruthy();
  });

  it('keeps source commit, config SHA-256 and model revision JSON visible and editable', async () => {
    signInFixture({ role: 'admin' });
    mockApi((endpoint) => (endpoint === '/developer/export-hints' ? jsonResponse(sampleHints) : jsonResponse({})));

    renderWithClient(
      <MockPublicationProvider mode="local">
        <LocalPublicationExport />
      </MockPublicationProvider>
    );

    const commitInput = (await screen.findByLabelText('Analysis source commit')) as HTMLInputElement;
    const configInput = screen.getByLabelText('Analysis configuration SHA-256') as HTMLInputElement;
    const modelsInput = screen.getByLabelText('Actual model revisions (JSON)') as HTMLTextAreaElement;

    expect(commitInput.value).toBe(sampleHints.source_commit);
    expect(configInput.value).toBe(sampleHints.config_sha256);
    expect(modelsInput.value).toContain('spacy-ner');
  });

  it('submits valid export request with review confirmation and triggers download', async () => {
    signInFixture({ role: 'admin' });
    let exportBody: unknown = null;

    mockApi((endpoint, init) => {
      if (endpoint === '/developer/export-hints') return jsonResponse(sampleHints);
      if (endpoint === '/developer/export') {
        exportBody = JSON.parse(String(init?.body));
        return new Response('{"schema_version":"1","articles":[],"claims":[],"relationships":[]}', {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="gmee-publication-test.json"',
          },
        });
      }
      return jsonResponse({});
    });

    // Mock URL.createObjectURL and revokeObjectURL
    const createObjectURL = vi.fn(() => 'blob:mock-export-url');
    const revokeObjectURL = vi.fn();
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderWithClient(
      <MockPublicationProvider mode="local">
        <LocalPublicationExport />
      </MockPublicationProvider>
    );

    const startInput = await screen.findByLabelText('Claim extraction started');
    const endInput = screen.getByLabelText('Claim extraction completed');

    fireEvent.change(startInput, { target: { value: '2026-10-01T00:00' } });
    fireEvent.change(endInput, { target: { value: '2026-10-17T12:00' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Download publication file' }));

    expect(await screen.findByText(/File downloaded. Keep the exact file for retries./)).toBeTruthy();
    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
    expect(exportBody).toEqual({
      provenance: {
        analysis_started_at: new Date('2026-10-01T00:00').toISOString(),
        analysis_completed_at: new Date('2026-10-17T12:00').toISOString(),
        source_commit: sampleHints.source_commit,
        config_sha256: sampleHints.config_sha256,
        model_revisions: sampleHints.model_revisions,
      },
      reviewed: true,
    });
  });

  it('handles 409 active processing conflict without retrying writes or auto-cancelling', async () => {
    signInFixture({ role: 'admin' });
    mockApi((endpoint) => {
      if (endpoint === '/developer/export-hints') return jsonResponse(sampleHints);
      if (endpoint === '/developer/export') {
        return jsonResponse({ detail: 'An NLP extraction job is currently running.' }, 409);
      }
      return jsonResponse({});
    });

    renderWithClient(
      <MockPublicationProvider mode="local">
        <LocalPublicationExport />
      </MockPublicationProvider>
    );

    fireEvent.change(await screen.findByLabelText('Claim extraction started'), { target: { value: '2026-10-01T00:00' } });
    fireEvent.change(screen.getByLabelText('Claim extraction completed'), { target: { value: '2026-10-17T12:00' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Download publication file' }));

    expect(await screen.findByText(/An active processing job is running/)).toBeTruthy();
    expect(screen.queryByText(/File downloaded/)).toBeNull();
  });

  it('handles 422 empty extraction window guidance', async () => {
    signInFixture({ role: 'admin' });
    mockApi((endpoint) => {
      if (endpoint === '/developer/export-hints') return jsonResponse(sampleHints);
      if (endpoint === '/developer/export') {
        return jsonResponse({ detail: 'No completed claims found in requested range.' }, 422);
      }
      return jsonResponse({});
    });

    renderWithClient(
      <MockPublicationProvider mode="local">
        <LocalPublicationExport />
      </MockPublicationProvider>
    );

    fireEvent.change(await screen.findByLabelText('Claim extraction started'), { target: { value: '2026-10-01T00:00' } });
    fireEvent.change(screen.getByLabelText('Claim extraction completed'), { target: { value: '2026-10-17T12:00' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Download publication file' }));

    expect(await screen.findByText(/No completed claims found in the selected extraction window/)).toBeTruthy();
  });

  it('handles 413 oversized export guidance', async () => {
    signInFixture({ role: 'admin' });
    mockApi((endpoint) => {
      if (endpoint === '/developer/export-hints') return jsonResponse(sampleHints);
      if (endpoint === '/developer/export') {
        return jsonResponse({ detail: 'Payload exceeds 10 MiB limit.' }, 413);
      }
      return jsonResponse({});
    });

    renderWithClient(
      <MockPublicationProvider mode="local">
        <LocalPublicationExport />
      </MockPublicationProvider>
    );

    fireEvent.change(await screen.findByLabelText('Claim extraction started'), { target: { value: '2026-10-01T00:00' } });
    fireEvent.change(screen.getByLabelText('Claim extraction completed'), { target: { value: '2026-10-17T12:00' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Download publication file' }));

    expect(await screen.findByText(/Exported dataset exceeds the 10 MiB publication limit/)).toBeTruthy();
  });

  it('suppresses export setup and hints call when rendered in cloud mode', async () => {
    signInFixture({ role: 'admin' });
    const fetch = mockApi(() => jsonResponse({}));

    renderWithClient(
      <MockPublicationProvider mode="published">
        <LocalPublicationExport />
      </MockPublicationProvider>
    );

    expect(await screen.findByText(/Publication exports can only be generated from the local analysis environment/)).toBeTruthy();
    expect(fetch.mock.calls.some(([url]) => String(url).includes('/developer/export-hints'))).toBe(false);
  });
});
