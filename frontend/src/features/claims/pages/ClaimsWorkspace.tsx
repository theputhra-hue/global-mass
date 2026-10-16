import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowRight, ExternalLink, ShieldAlert } from 'lucide-react';
import { apiClient } from '../../../shared/api/client';
import { corpusApi } from '../../../shared/api/corpus';
import { articlesApi, type ArticleClaim } from '../../../shared/api/articles';
import { articleHref, navigateHash } from '../../../shared/navigation/articleRoutes';
import { usePublicationRuntime } from '../../../shared/runtime/publicationRuntime';
import { QueryError } from '../../../shared/ui/QueryError';

export function ClaimsWorkspace() {
  const runtime = usePublicationRuntime();
  const cloud = runtime.mode === 'published';

  // Read URL parameters
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const initialQ = params.get('q') || '';
  const initialOffset = Number(params.get('offset') || 0);

  const [draft, setDraft] = useState(initialQ);
  const [q, setQ] = useState(initialQ);
  const [offset, setOffset] = useState(Number.isSafeInteger(initialOffset) && initialOffset >= 0 ? initialOffset : 0);

  // Local mode state
  const [selectedArticleId, setSelectedArticleId] = useState('');
  const [articleFilter, setArticleFilter] = useState('');

  // 1. Published cloud mode: Global claim text search
  const publishedClaims = useQuery({
    queryKey: ['published-claims', q, offset],
    queryFn: ({ signal }) =>
      apiClient.get<{
        total: number;
        items: Array<{
          id: string;
          article_id: string;
          text: string;
          title: string;
          domain: string;
          verdict: string | null;
          verdict_probability?: number | null;
        }>;
      }>(`/corpus/claims?${new URLSearchParams({ q, offset: String(offset), limit: '20' })}`, { signal }),
    enabled: cloud,
  });

  // 2. Local mode: Bounded article selector
  const localArticles = useQuery({
    queryKey: ['local-articles-for-claims', articleFilter],
    queryFn: ({ signal }) => corpusApi.list({ q: articleFilter, limit: 12, offset: 0 }, { signal }),
    enabled: !cloud,
  });

  // 3. Local mode: Claims for selected article
  const localClaims = useQuery({
    queryKey: ['local-article-claims', selectedArticleId, offset],
    queryFn: ({ signal }) => articlesApi.claims(selectedArticleId, offset, '', { signal }),
    enabled: !cloud && Boolean(selectedArticleId),
  });

  const currentHref = `#/dashboard/claims${q || offset ? `?${new URLSearchParams({ ...(q ? { q } : {}), ...(offset ? { offset: String(offset) } : {}) })}` : ''}`;

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const query = draft.trim();
    setQ(query);
    setOffset(0);
    const searchParams = new URLSearchParams();
    if (query) searchParams.set('q', query);
    navigateHash(`#/dashboard/claims${searchParams.size ? `?${searchParams}` : ''}`);
  }

  function handlePageChange(nextOffset: number) {
    setOffset(nextOffset);
    const searchParams = new URLSearchParams();
    if (q) searchParams.set('q', q);
    if (nextOffset > 0) searchParams.set('offset', String(nextOffset));
    navigateHash(`#/dashboard/claims${searchParams.size ? `?${searchParams}` : ''}`);
  }

  return (
    <div className="space-y-8">
      {/* Header and Scope Explanation */}
      <section className="space-y-4 max-w-3xl">
        <p className="text-[10px] uppercase tracking-widest text-hermes-red-bright">
          Explore data / Extracted statements
        </p>
        <h1 className="font-display text-4xl md:text-5xl">Extracted claims.</h1>
        <p className="text-sm leading-relaxed text-hermes-bone/70">
          {cloud
            ? 'Search statements extracted from collected reports during earlier analysis. Selecting a claim opens its source article with recorded evidence context. This does not run a new AI check.'
            : 'Explore statements extracted from articles in the local workspace. Select an article below to inspect its recorded claims.'}
        </p>
      </section>

      {/* Cloud Mode: Published Saved Claims Search */}
      {cloud ? (
        <section aria-label="Search published claims" className="space-y-6">
          <div className="card-brutal-dark p-5 md:p-6 space-y-4">
            <form onSubmit={submitSearch} className="space-y-3">
              <label htmlFor="claims-search-input" className="block text-xs uppercase tracking-wider text-hermes-bone/60">
                Search claim statements
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="claims-search-input"
                  aria-label="Search published claims"
                  className="field-brutal flex-1 min-w-0 !py-3.5"
                  maxLength={300}
                  placeholder="Enter keywords or words from a statement…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button type="submit" className="btn-brutal inline-flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  <span>Search claims</span>
                </button>
              </div>
            </form>
            <p className="text-xs text-hermes-bone/50">
              Literal statement matching in the published archive · Opening a claim does not run a new AI check
            </p>
          </div>

          {publishedClaims.isPending && <p role="status" className="text-sm font-mono">Loading saved claims…</p>}
          {publishedClaims.isError && (
            <QueryError title="Published claims unavailable" error={publishedClaims.error} onRetry={() => publishedClaims.refetch()} />
          )}

          {publishedClaims.data && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-hermes-bone/60 border-b border-hermes-bone/15 pb-3">
                <span>
                  {publishedClaims.data.total.toLocaleString()} matching statements
                  {publishedClaims.data.total > 0 && ` · Showing ${offset + 1}–${Math.min(offset + 20, publishedClaims.data.total)}`}
                </span>
                {q && (
                  <button
                    onClick={() => {
                      setDraft('');
                      setQ('');
                      setOffset(0);
                      navigateHash('#/dashboard/claims');
                    }}
                    className="underline underline-offset-4 hover:text-hermes-bone"
                  >
                    Clear search
                  </button>
                )}
              </div>

              {publishedClaims.data.items.length === 0 ? (
                <p className="border border-dashed border-hermes-bone/25 p-8 text-sm text-hermes-bone/65">
                  {q ? 'No claims matched this phrase. Try broader keywords.' : 'No claims are available in this release.'}
                </p>
              ) : (
                <div className="space-y-4">
                  {publishedClaims.data.items.map((claim) => {
                    const href = articleHref(claim.article_id, 'evidence', {
                      claim: claim.id,
                      back: currentHref,
                    });
                    return (
                      <article key={claim.id} className="card-brutal-dark p-5 md:p-6 space-y-3">
                        <p className="text-sm md:text-base leading-relaxed text-hermes-bone whitespace-pre-wrap">
                          {claim.text}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-hermes-bone/60 pt-2 border-t border-hermes-bone/10">
                          <span className="font-medium text-hermes-bone/80">{claim.domain || 'Source unknown'}</span>
                          {claim.title && <span className="truncate max-w-md">· {claim.title}</span>}
                          {claim.verdict && (
                            <span className="chip-brutal text-[10px]">
                              {claim.verdict}
                              {claim.verdict_probability != null && ` · ${(claim.verdict_probability * 100).toFixed(0)}%`}
                            </span>
                          )}
                        </div>
                        <div className="pt-2">
                          <a href={href} className="btn-outline-dark inline-flex items-center gap-2 text-xs">
                            <span>Open owning article with this claim</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Bounded Pagination */}
              {publishedClaims.data.total > 20 && (
                <div className="flex gap-3 pt-3">
                  <button
                    className="btn-outline-dark"
                    disabled={offset === 0 || publishedClaims.isFetching}
                    onClick={() => handlePageChange(Math.max(0, offset - 20))}
                  >
                    Previous claims
                  </button>
                  <button
                    className="btn-outline-dark"
                    disabled={offset + 20 >= publishedClaims.data.total || publishedClaims.isFetching}
                    onClick={() => handlePageChange(offset + 20)}
                  >
                    Next claims
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      ) : (
        /* Local Mode: Bounded Article Selector & Article Claims */
        <section aria-label="Local article claim explorer" className="space-y-6">
          <div className="border border-hermes-bone/20 bg-hermes-panel/40 p-4 text-xs text-hermes-bone/70 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-semibold">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Local analysis workspace notice</span>
            </div>
            <p className="leading-relaxed">
              Global claim text search requires the published cloud API. In the local workspace, claim discovery
              operates across individual articles. Choose an article below to inspect its extracted claims.
            </p>
          </div>

          {/* Article Selector */}
          <div className="card-brutal-dark p-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                className="field-brutal flex-1 min-w-0 !py-2.5 text-xs"
                placeholder="Filter articles by title…"
                value={articleFilter}
                onChange={(e) => setArticleFilter(e.target.value)}
              />
            </div>

            {localArticles.isLoading && <p className="text-xs">Loading articles…</p>}
            {localArticles.isError && <QueryError title="Articles unavailable" error={localArticles.error} />}

            {localArticles.data && (
              <div className="space-y-2">
                <label htmlFor="article-claim-selector" className="block text-xs uppercase tracking-wider text-hermes-bone/60">
                  Select an article to view its claims ({localArticles.data.items.length} returned)
                </label>
                <select
                  id="article-claim-selector"
                  className="field-brutal w-full text-xs"
                  value={selectedArticleId}
                  onChange={(e) => {
                    setSelectedArticleId(e.target.value);
                    setOffset(0);
                  }}
                >
                  <option value="">— Select an article —</option>
                  {localArticles.data.items.map((art) => (
                    <option key={art.id} value={art.id}>
                      {art.title.slice(0, 90)} ({art.domain || 'Source'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Display claims for selected article */}
          {selectedArticleId && (
            <div className="space-y-4">
              {localClaims.isLoading && <p className="text-xs">Loading claims for this article…</p>}
              {localClaims.isError && <QueryError title="Claims unavailable" error={localClaims.error} />}

              {localClaims.data && (
                <>
                  <div className="flex items-center justify-between text-xs text-hermes-bone/60 border-b border-hermes-bone/15 pb-2">
                    <span>
                      {localClaims.data.total} claims recorded for this article · Showing {localClaims.data.items.length ? offset + 1 : 0}–{offset + localClaims.data.items.length}
                    </span>
                    <a
                      href={articleHref(selectedArticleId, 'overview', { back: '#/dashboard/claims' })}
                      className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-hermes-bone"
                    >
                      <span>Open full article</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {localClaims.data.items.length === 0 ? (
                    <p className="border border-dashed border-hermes-bone/25 p-6 text-sm text-hermes-bone/65">
                      No claims were extracted for this article.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {localClaims.data.items.map((claim: ArticleClaim) => {
                        const href = articleHref(selectedArticleId, 'evidence', {
                          claim: claim.id,
                          back: '#/dashboard/claims',
                        });
                        return (
                          <article key={claim.id} className="card-brutal-dark p-5 space-y-3">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{claim.text}</p>
                            <p className="text-xs text-hermes-bone/55">
                              Extracted {claim.extracted_at ? new Date(claim.extracted_at).toLocaleDateString() : 'Unknown date'}
                              {claim.confidence != null && ` · Confidence ${claim.confidence.toFixed(2)}`}
                            </p>
                            <div className="flex flex-wrap gap-3 pt-2">
                              <a href={href} className="btn-outline-dark text-xs inline-flex items-center gap-2">
                                <span>Open owning article with this claim</span>
                                <ArrowRight className="w-3 h-3" />
                              </a>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}

                  {localClaims.data.total > 20 && (
                    <div className="flex gap-3 pt-3">
                      <button
                        className="btn-outline-dark"
                        disabled={offset === 0}
                        onClick={() => setOffset(Math.max(0, offset - 20))}
                      >
                        Previous claims
                      </button>
                      <button
                        className="btn-outline-dark"
                        disabled={offset + 20 >= localClaims.data.total}
                        onClick={() => setOffset(offset + 20)}
                      >
                        Next claims
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
