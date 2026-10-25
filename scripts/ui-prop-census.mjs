#!/usr/bin/env node
/**
 * Census of the props passed to `@/ui` components outside `src/ui/` (P81-A).
 *
 * Walks every non-test .tsx under src/ and packages/, finds JSX elements whose
 * tag is a name imported from `@/ui` or `@mantine/core`, and counts each prop
 * by component and value kind. The scale-mapping document is written from this
 * output, and the codemod's dry run is checked against it.
 *
 *   node scripts/ui-prop-census.mjs [--json] [--component Text] [--prop c]
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOTS = ['src', 'packages'];
const SOURCES = new Set(['@/ui', '@mantine/core']);
const args = process.argv.slice(2);
const json = args.includes('--json');
const only = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const onlyComponent = only('--component');
const onlyProp = only('--prop');

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.tsx$/.test(entry.name) && !/\.(test|spec|stories)\.tsx$/.test(entry.name)) yield full;
  }
}

/** A short description of a prop value's shape, so literal and computed sites are counted apart. */
function valueKind(init) {
  if (!init) return 'true';
  if (ts.isStringLiteral(init)) return `"${init.text}"`;
  if (ts.isJsxExpression(init) && init.expression) {
    const e = init.expression;
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return `"${e.text}"`;
    if (ts.isNumericLiteral(e)) return e.text;
    if (ts.isPrefixUnaryExpression(e) && ts.isNumericLiteral(e.operand)) return `-${e.operand.text}`;
    if (e.kind === ts.SyntaxKind.TrueKeyword || e.kind === ts.SyntaxKind.FalseKeyword) return e.getText();
    if (ts.isObjectLiteralExpression(e)) return '{object}';
    return '{expr}';
  }
  return '{other}';
}

const counts = new Map(); // component -> prop -> kind -> n
const files = new Map(); // component.prop -> Set(files)
let fileCount = 0;

for (const root of ROOTS) {
  for (const file of walk(root)) {
    if (file.startsWith(path.join('src', 'ui') + path.sep)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (!/from ['"](@\/ui|@mantine\/core)['"]/.test(text)) continue;
    fileCount++;
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const local = new Map(); // local name -> imported name
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || !SOURCES.has(st.moduleSpecifier.text)) continue;
      const nb = st.importClause?.namedBindings;
      if (nb && ts.isNamedImports(nb)) {
        for (const el of nb.elements) local.set(el.name.text, (el.propertyName ?? el.name).text);
      }
    }
    const visit = (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText();
        const [head, ...tail] = tag.split('.');
        const imported = local.get(head);
        if (imported) {
          const comp = [imported, ...tail].join('.');
          for (const attr of node.attributes.properties) {
            if (!ts.isJsxAttribute(attr)) continue;
            const prop = attr.name.getText();
            const kind = valueKind(attr.initializer);
            const byProp = counts.get(comp) ?? new Map();
            counts.set(comp, byProp);
            const byKind = byProp.get(prop) ?? new Map();
            byProp.set(prop, byKind);
            byKind.set(kind, (byKind.get(kind) ?? 0) + 1);
            const key = `${comp}.${prop}`;
            (files.get(key) ?? files.set(key, new Set()).get(key)).add(file);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
}

const out = {};
for (const [comp, byProp] of [...counts].sort()) {
  if (onlyComponent && comp !== onlyComponent) continue;
  for (const [prop, byKind] of [...byProp].sort()) {
    if (onlyProp && prop !== onlyProp) continue;
    const total = [...byKind.values()].reduce((a, b) => a + b, 0);
    out[comp] = out[comp] ?? {};
    out[comp][prop] = {
      total,
      files: files.get(`${comp}.${prop}`).size,
      kinds: Object.fromEntries([...byKind].sort((a, b) => b[1] - a[1])),
    };
  }
}

if (json) {
  console.log(JSON.stringify({ fileCount, components: out }, null, 2));
} else {
  console.log(`${fileCount} files import @/ui or @mantine/core`);
  for (const [comp, props] of Object.entries(out)) {
    console.log(`\n${comp}`);
    for (const [prop, { total, files: n, kinds }] of Object.entries(props)) {
      const shown = Object.entries(kinds).slice(0, 8).map(([k, v]) => `${k}:${v}`).join(' ');
      console.log(`  ${prop.padEnd(18)} ${String(total).padStart(4)} in ${String(n).padStart(3)} files  ${shown}`);
    }
  }
}
