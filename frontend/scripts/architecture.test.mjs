import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import { checkArchitecture } from './architecture.mjs';

function fixture(t, files) {
  const root = mkdtempSync(path.join(tmpdir(), 'gmee-architecture-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [name, code] of Object.entries(files)) {
    const file = path.join(root, name);
    mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, code);
  }
  return checkArchitecture(root).errors;
}

test('allows a feature to use shared code and the shared transport to fetch', t => {
  assert.deepEqual(fixture(t, { 'features/articles/page.ts': "import '../../shared/api/client';", 'shared/api/client.ts': "fetch('/api/v1');" }), []);
});
test('rejects reverse dependencies, dynamic fetch bypasses and missing imports', t => {
  const errors = fixture(t, { 'shared/util.ts': "export * from '../features/page';", 'features/page.ts': "import('../app/router'); fetch('/raw'); import './missing';", 'app/router.ts': 'export {};' });
  for (const message of ['shared code must not import', 'feature must not import', 'shared API transport', 'unresolved import']) assert.ok(errors.some(error => error.includes(message)), message);
});
test('rejects runtime cycles but permits type-only references', t => {
  assert.ok(fixture(t, { 'shared/a.ts': "import './b';", 'shared/b.ts': "import './a';" }).some(error => error.includes('Runtime import cycle')));
  assert.deepEqual(fixture(t, { 'shared/a.ts': "import type { B } from './b';", 'shared/b.ts': "import type { A } from './a';" }), []);
});
