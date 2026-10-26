#!/usr/bin/env node
/**
 * P81-A pass 2: rewrite one component's Mantine props into the framework's,
 * in the commit that flips that name in `src/ui/index.ts`.
 *
 * Pass 1 already moved every style prop the framework drops. This pass renames
 * what the framework keeps under another name, folds numeric gaps onto the
 * spacing rungs, and moves a direct `@mantine/core` import of the flipped
 * names to `@/ui` so the file renders the framework component too. Anything
 * it cannot map is reported, never guessed. The rules are written down in
 * docs/UI_SCALE_MAPPING.md.
 *
 *   node scripts/ui-codemod-pass2.mjs Stack,Group            dry run
 *   node scripts/ui-codemod-pass2.mjs Stack,Group --write    apply
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/** Numeric gaps onto the spacing rungs (designer, 2026-10-25). `review` sites are listed. */
const GAP_RUNGS = {
  0: { to: '{0}' },
  2: { to: '"4xs"' },
  3: { to: '"3xs"', review: '3px folded to 4px (3xs)' },
  4: { to: '"3xs"' },
  6: { to: '"2xs"' },
  8: { to: '"xs"', review: '8px folded to 10px (xs)' },
};

const PADDING = { p: 'padding', px: 'paddingInline', py: 'paddingBlock' };

/** Per component: renames, props handled specially, and Mantine props with no framework meaning. */
const RULES = {
  Stack: { gapProp: 'gap', rename: PADDING, unsupported: ['variant', 'classNames', 'styles', 'unstyled', 'mod', 'vars'] },
  Group: {
    gapProp: 'gap',
    rename: PADDING,
    unsupported: ['preventGrowOverflow', 'variant', 'classNames', 'styles', 'unstyled', 'mod', 'vars'],
  },
};

const args = process.argv.slice(2);
const names = (args.find((a) => !a.startsWith('--')) ?? '').split(',').filter(Boolean);
const write = args.includes('--write');
for (const n of names) if (!RULES[n]) throw new Error(`no pass-2 rules for ${n}`);
if (names.length === 0) throw new Error('usage: ui-codemod-pass2.mjs Name[,Name] [--write]');

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.tsx?$/.test(entry.name)) yield full;
  }
}

const report = { files: new Set(), edits: 0, imports: [], review: [], blocked: [] };

for (const file of [...walk('src'), ...walk('packages')]) {
  if (file.split(path.sep).slice(0, 2).join('/') === 'src/ui') continue;
  const text = fs.readFileSync(file, 'utf8');
  if (!/from ['"](@\/ui|@mantine\/core)['"]/.test(text)) continue;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const line = (node) => sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  const edits = [];

  // Which local names are the flipped components, and where a direct Mantine import names them.
  const local = new Map();
  const uiImport = sf.statements.find(
    (st) => ts.isImportDeclaration(st) && st.moduleSpecifier.text === '@/ui' && !st.importClause?.isTypeOnly,
  );
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st)) continue;
    const from = st.moduleSpecifier.text;
    if (from !== '@/ui' && from !== '@mantine/core') continue;
    const nb = st.importClause?.namedBindings;
    if (!nb || !ts.isNamedImports(nb)) continue;
    const moved = [];
    for (const el of nb.elements) {
      const imported = (el.propertyName ?? el.name).text;
      if (!names.includes(imported)) continue;
      local.set(el.name.text, imported);
      if (from === '@mantine/core') moved.push(el);
    }
    if (moved.length === 0) continue;
    if (file.startsWith('packages/shared-ui/')) {
      // That package cannot import `@/ui` (P78 Decision J); batch zero rehomes it.
      report.blocked.push(`${file}: ${moved.map((m) => m.getText()).join(', ')} stays on Mantine until batch zero`);
      for (const m of moved) local.delete(m.name.text);
      continue;
    }
    const kept = nb.elements.filter((el) => !moved.includes(el)).map((el) => el.getText());
    const movedText = moved.map((m) => m.getText());
    // Keep a multi-line import multi-line, one name per line as it was.
    const multiline = nb.getText().includes('\n');
    const list = (items) => (multiline ? `{\n${items.map((n) => `  ${n},`).join('\n')}\n}` : `{ ${items.join(', ')} }`);
    const uiNames = uiImport?.importClause?.namedBindings;
    if (uiNames && ts.isNamedImports(uiNames)) {
      // Join the file's existing `@/ui` import rather than add a second one.
      const uiMultiline = uiNames.getText().includes('\n');
      const all = [...uiNames.elements.map((el) => el.getText()), ...movedText];
      edits.push([
        uiNames.getStart(),
        uiNames.getEnd(),
        uiMultiline ? `{\n${all.map((n) => `  ${n},`).join('\n')}\n}` : `{ ${all.join(', ')} }`,
      ]);
      edits.push([st.getFullStart(), st.getEnd(), kept.length > 0 ? `\nimport ${list(kept)} from '@mantine/core';` : '']);
    } else {
      const replacement =
        (kept.length > 0 ? `import ${list(kept)} from '@mantine/core';\n` : '') +
        `import ${list(movedText)} from '@/ui';`;
      edits.push([st.getStart(), st.getEnd(), replacement]);
    }
    report.imports.push(`${file}: ${moved.map((m) => m.getText()).join(', ')}`);
  }
  if (local.size === 0) continue;

  const visit = (node) => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && local.has(node.tagName.getText())) {
      const comp = local.get(node.tagName.getText());
      const rule = RULES[comp];
      for (const attr of node.attributes.properties) {
        if (!ts.isJsxAttribute(attr)) continue;
        const name = attr.name.getText();
        const init = attr.initializer;
        const expr = init && ts.isJsxExpression(init) ? init.expression : undefined;
        const where = `${file}:${line(attr)}  ${comp} ${attr.getText()}`;
        if (rule.unsupported.includes(name)) {
          report.blocked.push(`${where}  (no framework equivalent)`);
        } else if (name in rule.rename) {
          if (expr && ts.isObjectLiteralExpression(expr)) report.blocked.push(`${where}  (responsive object)`);
          else edits.push([attr.name.getStart(), attr.name.getEnd(), rule.rename[name]]);
        } else if (name === rule.gapProp && expr && ts.isNumericLiteral(expr)) {
          const rung = GAP_RUNGS[Number(expr.text)];
          if (!rung) report.review.push(`${where}  (off the scale, kept as a number)`);
          else {
            edits.push([init.getStart(), init.getEnd(), rung.to]);
            if (rung.review) report.review.push(`${where}  ${rung.review}`);
          }
        } else if (name === 'component' && init && ts.isStringLiteral(init)) {
          edits.push([attr.getStart(), attr.getEnd(), `render={<${init.text} />}`]);
        } else if (name === 'component') {
          report.blocked.push(`${where}  (component is not a literal tag)`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  if (edits.length === 0) continue;
  report.files.add(file);
  report.edits += edits.length;
  if (write) {
    edits.sort((a, b) => b[0] - a[0]);
    let out = text;
    for (const [start, end, replacement] of edits) out = out.slice(0, start) + replacement + out.slice(end);
    fs.writeFileSync(file, out);
  }
}

console.log(`${write ? 'Made' : 'Would make'} ${report.edits} edits in ${report.files.size} files.`);
console.log(`\nImports moved from @mantine/core to @/ui (${report.imports.length}):`);
for (const r of report.imports) console.log(`  ${r}`);
console.log(`\nFor review (${report.review.length}):`);
for (const r of report.review) console.log(`  ${r}`);
console.log(`\nNot rewritten (${report.blocked.length}):`);
for (const r of report.blocked) console.log(`  ${r}`);
