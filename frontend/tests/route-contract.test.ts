import { describe, expect, it } from 'vitest';
import { resolveRoute } from '../src/app/routing/resolveRoute';

describe('existing URL contract', () => {
  it.each(['overview','graph','vector','cache','fullgraph','timeline','masala','factcheck','eval','corpus','project','casebook'])('retains the legacy %s workspace', tab => {
    expect(resolveRoute(`#/dashboard/${tab}`)).toMatchObject({ kind: 'advanced', tab, dashboard: true });
  });
  it.each(['browse','compare','check'])('keeps reader %s queries intact', view => {
    const raw = `dashboard/${view}?q=flood&offset=6`;
    expect(resolveRoute(`#/${raw}`)).toMatchObject({ kind: 'reader', view, raw });
  });
  it('retains article/claim context and returns invalid article tabs for the existing error view', () => {
    const id = '11111111-1111-1111-1111-111111111111';
    const claim = '22222222-2222-2222-2222-222222222222';
    expect(resolveRoute(`#/dashboard/articles/${id}/claims?claim=${claim}`)).toMatchObject({ kind: 'article', detail: { id, tab: 'claims', claim, valid: true } });
    expect(resolveRoute(`#/dashboard/articles/${id}/unknown`)).toMatchObject({ kind: 'article', detail: { valid: false } });
    expect(resolveRoute('#/dashboard/no-such-page')).toMatchObject({ kind: 'not-found', dashboard: true });
  });
  it('keeps the public controls separate from protected research/developer routes', () => {
    expect(resolveRoute('#/project')).toMatchObject({ kind: 'public-project', dashboard: false });
    expect(resolveRoute('#/dashboard/project')).toMatchObject({ kind: 'advanced', dashboard: true });
    expect(resolveRoute('#/dashboard/developer')).toMatchObject({ kind: 'developer', dashboard: true });
    expect(resolveRoute('#/dashboard/upload')).toMatchObject({ kind: 'upload', dashboard: true });
    expect(resolveRoute('#/dashboard/claims')).toMatchObject({ kind: 'claims', dashboard: true });
    expect(resolveRoute('#/dashboard/claims?q=water&offset=20')).toMatchObject({ kind: 'claims', dashboard: true });
  });
});
