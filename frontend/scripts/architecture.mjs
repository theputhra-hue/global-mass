import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : /\.tsx?$/.test(entry.name) ? [target] : [];
  });
}

function imports(file) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const result = [];
  let directFetch = false;
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      result.push({ specifier: node.moduleSpecifier.text, typeOnly: ts.isImportDeclaration(node) ? Boolean(node.importClause?.isTypeOnly) : Boolean(node.isTypeOnly) });
    }
    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) result.push({ specifier: node.arguments[0].text, typeOnly: false });
      const expression = node.expression.getText(source);
      if (['fetch', 'window.fetch', 'globalThis.fetch'].includes(expression)) directFetch = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return { imports: result, directFetch };
}

/** Checks source boundaries and runtime import cycles; never imports app code. */
export function checkArchitecture(directory) {
  const root = path.resolve(directory);
  const files = sourceFiles(root);
  const errors = [];
  const graph = new Map(files.map(file => [file, []]));
  const relative = file => path.relative(root, file).replaceAll(path.sep, '/');
  for (const file of files) {
    const owner = relative(file);
    const parsed = imports(file);
    if (parsed.directFetch && owner !== 'shared/api/client.ts') errors.push(`${owner}: use the shared API transport instead of direct fetch`);
    for (const dependency of parsed.imports) {
      if (!dependency.specifier.startsWith('.')) continue;
      const base = path.resolve(path.dirname(file), dependency.specifier);
      const target = ['', '.ts', '.tsx', '.js', '.json', '/index.ts', '/index.tsx'].map(suffix => base + suffix).find(candidate => existsSync(candidate) && statSync(candidate).isFile());
      if (!target) { errors.push(`${owner}: unresolved import ${dependency.specifier}`); continue; }
      const destination = relative(target);
      if (destination.startsWith('../')) errors.push(`${owner}: source imports outside src are not allowed`);
      if (owner.startsWith('shared/') && /^(features|app)\//.test(destination)) errors.push(`${owner}: shared code must not import ${destination}`);
      if (owner.startsWith('features/') && destination.startsWith('app/')) errors.push(`${owner}: a feature must not import the application shell`);
      if (!dependency.typeOnly && graph.has(target)) graph.get(file).push(target);
    }
  }
  const complete = new Set(), active = new Set();
  function visit(file, trail) {
    if (active.has(file)) { errors.push(`Runtime import cycle: ${[...trail, file].map(relative).join(' → ')}`); return; }
    if (complete.has(file)) return;
    active.add(file);
    for (const target of graph.get(file) ?? []) visit(target, [...trail, file]);
    active.delete(file); complete.add(file);
  }
  for (const file of files) visit(file, []);
  return { files: files.length, errors };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkArchitecture(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src'));
  if (result.errors.length) { process.stderr.write(result.errors.join('\n') + '\n'); process.exitCode = 1; }
  else process.stdout.write(`PASS architecture: ${result.files} source files; no reversed dependencies, direct-fetch bypasses or runtime cycles\n`);
}
