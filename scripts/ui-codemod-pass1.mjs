#!/usr/bin/env node
/**
 * P81-A pass 1: move the Mantine style props the framework drops into `style`.
 *
 * Mantine renders every non-responsive style prop as an inline style, so
 * rewriting `mt="sm"` as `style={{ marginTop: ... }}` on the same element is
 * pixel-neutral by construction, whichever library renders it. Values keep
 * Mantine's reading exactly: a scale step becomes the framework token with the
 * Mantine token as fallback (the wp-admin apps have no `--mullion-*` tokens
 * until P81-B), and a number becomes rem, as Mantine's `rem()` makes it.
 *
 * Only props with no framework equivalent move here. Renames (`c` to `tone`,
 * `fw` to `weight`, `p` to `padding` and the rest) run in pass 2, in the
 * commit that flips each name in `src/ui/index.ts`. Colour props are never
 * rewritten: choosing a token for `c="red"` is a judgement. See
 * docs/UI_SCALE_MAPPING.md for the full table.
 *
 *   node scripts/ui-codemod-pass1.mjs            dry run, prints the report
 *   node scripts/ui-codemod-pass1.mjs --write    applies the edits
 *   node scripts/ui-codemod-pass1.mjs --write src/components/Foo.tsx ...
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const SOURCES = new Set(['@/ui', '@mantine/core']);
const STEPS = ['xs', 'sm', 'md', 'lg', 'xl'];

/** Mantine's style-prop table, restricted to what this pass may move: prop to [CSS property, resolver]. */
const STYLE_PROPS = {
  m: ['margin', 'spacing'],
  mt: ['marginTop', 'spacing'],
  mb: ['marginBottom', 'spacing'],
  ml: ['marginLeft', 'spacing'],
  mr: ['marginRight', 'spacing'],
  ms: ['marginInlineStart', 'spacing'],
  me: ['marginInlineEnd', 'spacing'],
  mx: ['marginInline', 'spacing'],
  my: ['marginBlock', 'spacing'],
  p: ['padding', 'spacing'],
  pt: ['paddingTop', 'spacing'],
  pb: ['paddingBottom', 'spacing'],
  pl: ['paddingLeft', 'spacing'],
  pr: ['paddingRight', 'spacing'],
  px: ['paddingInline', 'spacing'],
  py: ['paddingBlock', 'spacing'],
  w: ['width', 'spacing'],
  miw: ['minWidth', 'spacing'],
  maw: ['maxWidth', 'spacing'],
  h: ['height', 'spacing'],
  mih: ['minHeight', 'spacing'],
  mah: ['maxHeight', 'spacing'],
  pos: ['position', 'identity'],
  top: ['top', 'size'],
  left: ['left', 'size'],
  right: ['right', 'size'],
  bottom: ['bottom', 'size'],
  inset: ['inset', 'size'],
  display: ['display', 'identity'],
  flex: ['flex', 'identity'],
  opacity: ['opacity', 'identity'],
  ta: ['textAlign', 'identity'],
  fw: ['fontWeight', 'identity'],
  fs: ['fontStyle', 'identity'],
  tt: ['textTransform', 'identity'],
  td: ['textDecoration', 'identity'],
  fz: ['fontSize', 'fontSize'],
  lh: ['lineHeight', 'lineHeight'],
  lts: ['letterSpacing', 'size'],
};

/** Never moved by this pass: a colour is a token choice, not a mechanical rewrite. */
const COLOUR_PROPS = new Set(['c', 'bg', 'ff']);

const PADDED = [
  'Box', 'Stack', 'Group', 'Center', 'Container', 'Grid', 'SimpleGrid',
  'Paper', 'Card', 'Card.Section', 'Alert',
];

/** Props the framework component renames rather than drops; pass 2 owns these. */
const RENAMED = {
  Text: ['fw', 'ta', 'tt', 'fs', 'fz'],
  Title: ['ta'],
  Image: ['w', 'h'],
  ...Object.fromEntries(PADDED.map((name) => [name, ['p', 'px', 'py']])),
};

/** Mantine's `rem()` for a literal, with `--mantine-scale` at its default of 1. */
function rem(value) {
  if (value === 0 || value === '0') return '0';
  if (typeof value === 'number') return `${value / 16}rem`;
  if (value === '' || value.startsWith('calc(') || value.startsWith('clamp(')) return value;
  if (value.includes(' ') || value.includes(',')) return null; // multi-value: by hand
  const n = Number(value.replace('px', ''));
  return Number.isNaN(n) ? value : `${n / 16}rem`;
}

const token = (group, step) => `var(--mullion-${group}-${step}, var(--mantine-${group}-${step}))`;

/**
 * The value expression for one prop, as source text, or null when the site
 * needs a person. Only literals are resolved; an expression is passed through
 * only where Mantine's resolver is the identity.
 */
function resolve(kind, init) {
  let literal;
  if (!init) return null;
  if (ts.isStringLiteral(init)) literal = init.text;
  else if (ts.isJsxExpression(init) && init.expression) {
    const e = init.expression;
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) literal = e.text;
    else if (ts.isNumericLiteral(e)) literal = Number(e.text);
    else if (ts.isPrefixUnaryExpression(e) && ts.isNumericLiteral(e.operand) && e.operator === ts.SyntaxKind.MinusToken) {
      literal = -Number(e.operand.text);
    } else if (kind === 'identity' && !ts.isObjectLiteralExpression(e)) return e.getText();
    else return null;
  } else return null;

  const quote = (s) => `'${s}'`;
  switch (kind) {
    case 'identity':
      return typeof literal === 'number' ? String(literal) : quote(literal);
    case 'spacing': {
      if (typeof literal === 'string' && STEPS.includes(literal)) return quote(token('spacing', literal));
      if (typeof literal === 'string' && literal.startsWith('-') && STEPS.includes(literal.slice(1))) {
        return quote(`calc(${token('spacing', literal.slice(1))} * -1)`);
      }
      const r = rem(literal);
      return r === null ? null : quote(r);
    }
    case 'size': {
      const r = rem(literal);
      return r === null ? null : quote(r);
    }
    case 'fontSize': {
      if (typeof literal === 'string' && STEPS.includes(literal)) return quote(token('font-size', literal));
      if (typeof literal === 'string' && /^h[1-6]$/.test(literal)) return null;
      const r = rem(literal);
      return r === null ? null : quote(r);
    }
    case 'lineHeight':
      return typeof literal === 'number' ? String(literal) : null;
    default:
      return null;
  }
}

/**
 * A spread that provably carries no `style`: `getMullionDebugProps()` returns
 * only `data-*` attributes, and an object literal (or a conditional of them)
 * can be read. Any other spread might carry a `style` that would replace ours.
 */
function spreadIsStyleFree(expr) {
  while (ts.isParenthesizedExpression(expr)) expr = expr.expression;
  if (ts.isCallExpression(expr)) return expr.expression.getText() === 'getMullionDebugProps';
  if (ts.isConditionalExpression(expr)) return spreadIsStyleFree(expr.whenTrue) && spreadIsStyleFree(expr.whenFalse);
  if (ts.isObjectLiteralExpression(expr)) {
    return expr.properties.every((p) => !ts.isSpreadAssignment(p) && p.name && p.name.getText() !== 'style');
  }
  return false;
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.tsx$/.test(entry.name) && !/\.(test|spec)\.tsx$/.test(entry.name)) yield full;
  }
}

const args = process.argv.slice(2);
const write = args.includes('--write');
const explicit = args.filter((a) => !a.startsWith('--'));
const targets = explicit.length > 0 ? explicit : [...walk('src'), ...walk('packages')];

const report = { moved: 0, elements: 0, files: new Set(), hand: [], colour: 0 };

for (const file of targets) {
  if (file.split(path.sep).slice(0, 2).join('/') === 'src/ui') continue;
  const text = fs.readFileSync(file, 'utf8');
  if (!/from ['"](@\/ui|@mantine\/core)['"]/.test(text)) continue;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const local = new Map();
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !SOURCES.has(st.moduleSpecifier.text)) continue;
    const nb = st.importClause?.namedBindings;
    if (nb && ts.isNamedImports(nb)) {
      for (const el of nb.elements) local.set(el.name.text, (el.propertyName ?? el.name).text);
    }
  }

  const edits = [];
  const line = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const hand = (node, comp, prop, why) =>
    report.hand.push(`${file}:${line(node.getStart())}  ${comp} ${prop}  ${why}`);

  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const [head, ...tail] = node.tagName.getText().split('.');
      const imported = local.get(head);
      if (imported) {
        const comp = [imported, ...tail].join('.');
        const renamed = new Set(RENAMED[comp] ?? []);
        const attrs = node.attributes.properties;
        const moves = [];
        let style;
        for (const attr of attrs) {
          if (!ts.isJsxAttribute(attr)) continue;
          const name = attr.name.getText();
          if (name === 'style') style = attr;
          if (COLOUR_PROPS.has(name)) report.colour += 1;
          if (!(name in STYLE_PROPS) || renamed.has(name)) continue;
          const [property, kind] = STYLE_PROPS[name];
          const value = resolve(kind, attr.initializer);
          if (value === null) hand(attr, comp, name, `value ${attr.initializer?.getText() ?? 'true'} needs a person`);
          else moves.push({ attr, entry: `${property}: ${value}` });
        }
        const spread = attrs.some((a) => ts.isJsxSpreadAttribute(a) && !spreadIsStyleFree(a.expression));
        const styleExpr = style?.initializer && ts.isJsxExpression(style.initializer) ? style.initializer.expression : undefined;
        const literalStyle = styleExpr && ts.isObjectLiteralExpression(styleExpr);
        if (moves.length > 0 && spread) {
          for (const m of moves) hand(m.attr, comp, m.attr.name.getText(), 'element has a spread attribute');
        } else if (moves.length > 0 && style && !literalStyle) {
          for (const m of moves) hand(m.attr, comp, m.attr.name.getText(), 'style is not an object literal');
        } else if (moves.length > 0) {
          const entries = moves.map((m) => m.entry).join(', ');
          // Remove each moved attribute with the whitespace before it; without a
          // literal style, the first one is replaced in place so line layout survives.
          const replaceFirst = !literalStyle;
          moves.forEach((m, i) => {
            if (replaceFirst && i === 0) edits.push([m.attr.getStart(), m.attr.getEnd(), `style={{ ${entries} }}`]);
            else edits.push([m.attr.getFullStart(), m.attr.getEnd(), '']);
          });
          if (literalStyle) {
            // Prepend, so an entry the caller already wrote still wins, as `style` beats style props in Mantine's Box.
            const open = styleExpr.getStart() + 1;
            const empty = styleExpr.properties.length === 0;
            const next = /^\s/.test(text.slice(open)) ? '' : ' ';
            edits.push([open, open, empty ? ` ${entries} ` : ` ${entries},${next}`]);
          }
          report.moved += moves.length;
          report.elements += 1;
          report.files.add(file);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  if (write && edits.length > 0) {
    // Apply from the end so earlier offsets stay valid; insertions at one offset keep their order.
    edits.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
    let out = text;
    for (const [start, end, replacement] of edits) out = out.slice(0, start) + replacement + out.slice(end);
    fs.writeFileSync(file, out);
  }
}

console.log(`${write ? 'Moved' : 'Would move'} ${report.moved} props on ${report.elements} elements in ${report.files.size} files.`);
console.log(`${report.colour} colour props (c, bg, ff) left for pass 2.`);
console.log(`\n${report.hand.length} sites left for a person:`);
for (const h of report.hand) console.log(`  ${h}`);
