import type { AtlasArticle } from '../../../shared/api/articleMap';
import type { GraphScene } from './graphScene';

const COLORS = ['#F07178', '#83B4F5', '#A6D89A', '#F4A275', '#BDA0EF', '#DCC477', '#7ACDC1', '#E7ABC1', '#92A4E7', '#DAD9D4'];
export function topicColor(id: string | null): string {
  if (!id) return '#897d79';
  let hash = 0; for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}

export function atlasScene(articles: AtlasArticle[]): GraphScene {
  let tray = 0;
  const nodes = articles.map(article => {
    // Unavailable-language/text records occupy a clearly labelled separate tray;
    // their coordinates are presentation only, never a semantic embedding.
    const index = tray;
    if (article.x === null) tray++;
    return { id: article.id, title: article.title, domain: article.domain,
      x: article.x ?? 1300 + (index % 40) * 8, y: article.y ?? -1000 + Math.floor(index / 40) * 8, radius: 2 };
  });
  return { nodes, edges: [], components: 0, isolated: nodes.length, ticks: 0, settled: true };
}
