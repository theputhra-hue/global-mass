import type { ArticleDetail } from '../../../shared/api/articles';

export function extractionLabel(article: ArticleDetail, published: boolean): string {
  if (published || article.nlp_status === 'published' || article.nlp_status === 'not_recorded') return 'Completion not recorded in archive';
  if (article.nlp_status === 'completed' && typeof article.body === 'string' && !article.body.trim()) return 'Marked complete · source text missing';
  return article.nlp_status || 'Not recorded';
}
