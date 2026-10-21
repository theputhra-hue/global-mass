import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnalysisAvailability } from '../src/features/articles/components/AnalysisAvailability';
import { SavedAssessment } from '../src/features/claims/components/SavedAssessment';
import type { ArticleClaim, ArticleDetail } from '../src/shared/api/articles';
import { renderWithClient } from './helpers';

const article: ArticleDetail = { id: 'article', title: 'DDR5 RAM prices', url: 'https://example.org',
  domain: 'example.org', body: '', body_source: 'not_published', content_completeness: 'not_published',
  processing_status: 'published', nlp_status: 'published', collected_at: null, processed_at: null,
  claims_total: 0, assessment_counts: {} };
const claim: ArticleClaim = { id: 'claim', article_id: 'article', text: 'A RAM kit costs more.',
  extracted_at: '2026-10-01T00:00:00Z', confidence: null, verdict: 'UNSUPPORTED', verdict_probability: .29,
  verdict_rationale: 'P(supported)=0.29 [UNSUPPORTED]. Corroboration lowers confidence.', verdict_evidence: null, entities: [] };

describe('core evidence integrity', () => {
  it('does not turn archive publication into completed extraction, even on the old API', () => {
    renderWithClient(<AnalysisAvailability article={article} published />);
    const region = screen.getByRole('region', { name: 'Analysis availability' });
    expect(within(region).getByText('Completion not recorded in archive')).toBeTruthy();
    expect(within(region).getByText('Not included in archive')).toBeTruthy();
    expect(within(region).getByText(/0 recorded/)).toBeTruthy();
  });
  it('flags completed extraction with missing local source text', () => {
    renderWithClient(<AnalysisAvailability article={{ ...article, nlp_status: 'completed' }} published={false} />);
    expect(screen.getByText('Marked complete · source text missing')).toBeTruthy();
  });
  it('explains unsupported and clarifies legacy probability wording without changing input', () => {
    renderWithClient(<SavedAssessment claim={claim} published />);
    expect(screen.getByText(/does not mean the statement is false/)).toBeTruthy();
    expect(screen.getByText(/Legacy heuristic score=0.29/)).toBeTruthy();
    expect(screen.queryByText(/P\(supported\)/)).toBeNull();
    expect(screen.getByText(/Evidence passages were not included/)).toBeTruthy();
    expect(claim.verdict_rationale).toContain('P(supported)=');
  });
  it('does not promote signal dictionaries or neighboring claims into source passages', () => {
    renderWithClient(<SavedAssessment claim={{ ...claim, verdict_evidence: { corroboration: { value: .9 }, checked_neighbors: [{ claim: 'Another model claim', url: 'https://example.org' }] } }} />);
    expect(screen.getByText(/No citable source passages are attached/)).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Stored evidence passages' })).toBeNull();
  });
  it('shows explicitly recorded passages and rejects unsafe source URLs', () => {
    renderWithClient(<SavedAssessment claim={{ ...claim, verdict_evidence: { evidence: [
      { passage: 'The listed RAM kit price changed.', url: 'https://example.org/price', stance: 'entailment' },
      { passage: 'Unsafe record', url: 'javascript:alert(1)' },
    ] } }} />);
    expect(screen.getByText('The listed RAM kit price changed.')).toBeTruthy();
    expect(screen.queryByText('Unsafe record')).toBeNull();
    expect(screen.getByRole('link', { name: /Open evidence source/ }).getAttribute('href')).toBe('https://example.org/price');
  });
});
