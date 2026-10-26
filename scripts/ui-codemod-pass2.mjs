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

/** A prop's literal value, or undefined when it is an expression. */
function literal(attr) {
  const init = attr.initializer;
  if (!init) return true;
  if (ts.isStringLiteral(init)) return init.text;
  const e = ts.isJsxExpression(init) ? init.expression : undefined;
  if (e && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e))) return e.text;
  if (e && ts.isNumericLiteral(e)) return Number(e.text);
  return undefined;
}

/**
 * Mantine colour names on text to roles (designer, 2026-10-25): a name maps to
 * a role, never to a hex. `teal` and `blue` are read per site, so they are
 * rewritten to the default and listed.
 */
const TEXT_TONES = { dimmed: 'muted', gray: 'muted', red: 'danger', green: 'success', orange: 'warning', yellow: 'warning' };
const TEXT_TONES_REVIEW = { teal: ['primary', 'teal is primary unless it reports an outcome'], blue: ['info', 'blue on text: info unless it is an action'] };

/** Alerts are states, so the colour table applies as written (designer, 2026-10-25). */
const ALERT_TONES = { red: 'danger', green: 'success', orange: 'warning', yellow: 'warning', blue: 'info' };
const alertColour = (attr) => {
  const v = literal(attr);
  if (typeof v !== 'string') return { blocked: 'colour is an expression' };
  if (ALERT_TONES[v]) return { replace: `tone="${ALERT_TONES[v]}"` };
  if (v === 'teal') return { replace: 'tone="success"', review: 'teal on an alert: success, since an alert reports an outcome' };
  return { blocked: 'no role for this colour' };
};

/**
 * Mantine style props pass 1 left for pass 2. Any still on a flipped element
 * after its rules ran would reach the DOM as a stray attribute, so it is
 * reported rather than left (P81-A).
 */
const LEFTOVER_STYLE_PROPS = new Set([
  'm', 'mt', 'mb', 'ml', 'mr', 'mx', 'my', 'p', 'pt', 'pb', 'pl', 'pr', 'px', 'py',
  'w', 'h', 'miw', 'maw', 'mih', 'mah', 'c', 'bg', 'fw', 'fz', 'ff', 'fs', 'ta', 'tt', 'lh', 'lts',
  'pos', 'top', 'left', 'right', 'bottom', 'inset', 'display', 'flex', 'opacity',
]);

/** Text sizes below the smallest token floor to it and are listed (designer, 2026-10-25). */
const SMALLEST_TEXT_PX = 12;

const textColour = (attr) => {
  const v = literal(attr);
  if (typeof v !== 'string') return { blocked: 'colour is an expression' };
  if (v === 'dark' || v === 'inherit') return { replace: '' };
  if (TEXT_TONES[v]) return { replace: `tone="${TEXT_TONES[v]}"` };
  if (TEXT_TONES_REVIEW[v]) return { replace: `tone="${TEXT_TONES_REVIEW[v][0]}"`, review: TEXT_TONES_REVIEW[v][1] };
  return { blocked: 'a shade or a literal colour has no role yet' };
};
const rename = (to) => (attr) => ({ replace: `${to}${attr.initializer ? `=${attr.initializer.getText()}` : ''}` });
const textSize = (attr) => {
  const v = literal(attr);
  if (typeof v === 'string' && /^\d+(\.\d+)?px$/.test(v) && parseFloat(v) < SMALLEST_TEXT_PX) {
    return { replace: 'size="xs"', review: `${v} floored to xs` };
  }
  return null;
};

/** Per component: renames, props handled specially, and Mantine props with no framework meaning. */
const RULES = {
  Stack: { gapProp: 'gap', rename: PADDING, unsupported: ['variant', 'classNames', 'styles', 'unstyled', 'mod', 'vars'] },
  Group: {
    gapProp: 'gap',
    rename: PADDING,
    unsupported: ['preventGrowOverflow', 'variant', 'classNames', 'styles', 'unstyled', 'mod', 'vars'],
  },
  Text: {
    rename: {},
    unsupported: ['inherit', 'variant', 'gradient', 'classNames', 'styles', 'unstyled', 'mod', 'vars', 'inline'],
    props: {
      c: textColour,
      fw: rename('weight'),
      ta: rename('align'),
      tt: rename('transform'),
      fz: rename('size'),
      size: textSize,
      fs: (attr) => (literal(attr) === 'italic' ? { replace: 'italic' } : { blocked: 'font style other than italic' }),
      ff: (attr) => (literal(attr) === 'monospace' ? { replace: 'font="mono"' } : { blocked: 'font family other than monospace' }),
      truncate: (attr) => (literal(attr) === 'end' ? { replace: 'truncate' } : null),
    },
  },
  Container: { rename: PADDING, unsupported: ['strategy', 'mod', 'classNames', 'styles', 'unstyled'] },
  Box: { rename: PADDING, unsupported: ['variant', 'mod', 'classNames', 'styles', 'unstyled'] },
  Center: { rename: PADDING, unsupported: ['mod', 'classNames', 'styles', 'unstyled'] },
  Grid: { gapProp: 'gap', rename: PADDING, unsupported: ['gutter', 'grow', 'columns', 'overflow', 'breakpoints', 'type', 'rowGap', 'columnGap'] },
  SimpleGrid: {
    rename: PADDING,
    unsupported: ['verticalSpacing', 'type', 'minColWidth', 'autoFlow', 'autoRows'],
    props: {
      spacing: (attr) => {
        const init = attr.initializer;
        const e = init && ts.isJsxExpression(init) ? init.expression : undefined;
        return e && ts.isObjectLiteralExpression(e) ? { blocked: 'responsive spacing' } : null;
      },
    },
  },
  Alert: {
    rename: PADDING,
    unsupported: ['radius', 'onClose', 'withCloseButton', 'closeButtonLabel', 'autoContrast', 'classNames', 'styles', 'unstyled'],
    props: { color: alertColour },
  },
  Title: {
    rename: {},
    unsupported: ['variant', 'classNames', 'styles', 'unstyled', 'mod', 'vars', 'lineClamp'],
    props: {
      c: textColour,
      ta: rename('align'),
      size: (attr) => {
        const v = literal(attr);
        if (typeof v === 'string' && /^h[1-6]$/.test(v)) return { replace: `size={${v.slice(1)}}` };
        return { blocked: 'a title size that is not a heading level' };
      },
    },
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
  // Every moved name lands in one `@/ui` import, however many Mantine imports
  // it came from: two edits to the same import range corrupted it.
  const movedAll = [];
  let firstMoved;
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
    // Keep a multi-line import multi-line, one name per line as it was.
    const multiline = nb.getText().includes('\n');
    const list = (items) => (multiline ? `{\n${items.map((n) => `  ${n},`).join('\n')}\n}` : `{ ${items.join(', ')} }`);
    movedAll.push(...moved.map((m) => m.getText()));
    if (!firstMoved) firstMoved = { st, kept, list };
    else edits.push([st.getFullStart(), st.getEnd(), kept.length > 0 ? `\nimport ${list(kept)} from '@mantine/core';` : '']);
    report.imports.push(`${file}: ${moved.map((m) => m.getText()).join(', ')}`);
  }
  if (firstMoved) {
    const { st, kept, list } = firstMoved;
    const uiNames = uiImport?.importClause?.namedBindings;
    if (uiNames && ts.isNamedImports(uiNames)) {
      // Join the file's existing `@/ui` import rather than add a second one.
      const uiMultiline = uiNames.getText().includes('\n');
      const all = [...uiNames.elements.map((el) => el.getText()), ...movedAll];
      edits.push([
        uiNames.getStart(),
        uiNames.getEnd(),
        uiMultiline ? `{\n${all.map((n) => `  ${n},`).join('\n')}\n}` : `{ ${all.join(', ')} }`,
      ]);
      edits.push([st.getFullStart(), st.getEnd(), kept.length > 0 ? `\nimport ${list(kept)} from '@mantine/core';` : '']);
    } else {
      const replacement =
        (kept.length > 0 ? `import ${list(kept)} from '@mantine/core';\n` : '') + `import ${list(movedAll)} from '@/ui';`;
      edits.push([st.getStart(), st.getEnd(), replacement]);
    }
    report.imports.push(`${file}: ${movedAll.join(', ')}`);
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
        const handler = rule.props?.[name];
        const outcome = handler ? handler(attr) : null;
        if (outcome?.blocked) {
          report.blocked.push(`${where}  (${outcome.blocked})`);
        } else if (outcome) {
          // An empty replacement drops the attribute with the space before it.
          if (outcome.replace === '') edits.push([attr.getFullStart(), attr.getEnd(), '']);
          else edits.push([attr.getStart(), attr.getEnd(), outcome.replace]);
          if (outcome.review) report.review.push(`${where}  ${outcome.review}`);
        } else if (rule.unsupported.includes(name)) {
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
        } else if (LEFTOVER_STYLE_PROPS.has(name)) {
          report.blocked.push(`${where}  (a Mantine style prop with no rule here)`);
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
