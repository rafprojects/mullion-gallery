#!/usr/bin/env node
/**
 * P81-A pass 2 for the compound overlays: Mantine's `Menu` and `Popover` onto
 * the framework's, which differ in shape rather than in prop names.
 *
 * Mantine places a popup from its root (`position`, `width`) and takes the
 * trigger as the child of `Menu.Target`; the framework places it from
 * `Menu.Content` and takes the trigger as `Menu.Trigger`'s `render`. So the
 * root's placement moves onto the content, the target's child becomes the
 * trigger's `render` with its own children kept, and `Dropdown` becomes
 * `Content`. Rule 20 drops every arrow; popups mount in their trigger's root
 * (P80-F), so `withinPortal` goes. Anything it cannot map is listed.
 *
 *   node scripts/ui-codemod-overlays.mjs           dry run
 *   node scripts/ui-codemod-overlays.mjs --write   apply
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const write = process.argv.includes('--write');
const ROOTS = new Set(['Menu', 'Popover']);
const DROPPED = new Set(['shadow', 'withArrow', 'withinPortal', 'arrowSize', 'arrowOffset', 'arrowPosition']);
const report = { files: 0, edits: 0, blocked: [] };

const literal = (attr) => {
  const init = attr.initializer;
  if (!init) return true;
  if (ts.isStringLiteral(init)) return init.text;
  const e = ts.isJsxExpression(init) ? init.expression : undefined;
  if (e && ts.isStringLiteral(e)) return e.text;
  if (e && ts.isNumericLiteral(e)) return Number(e.text);
  if (e && e.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (e && e.kind === ts.SyntaxKind.FalseKeyword) return false;
  return undefined;
};
const exprText = (attr) =>
  attr.initializer && ts.isJsxExpression(attr.initializer) && attr.initializer.expression
    ? attr.initializer.expression.getText()
    : attr.initializer?.getText();

/** Mantine's `bottom-end` is the framework's side and align. */
function placement(value) {
  const [side, align] = String(value).split('-');
  const out = [`side="${side}"`];
  if (align) out.push(`align="${align}"`);
  return out;
}

function walkFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!['node_modules', 'ui'].includes(e.name)) walkFiles(p, out);
    } else if (p.endsWith('.tsx') && !/\.(test|stories)\./.test(p)) out.push(p);
  }
  return out;
}

const tagName = (el) => (ts.isJsxElement(el) ? el.openingElement.tagName : el.tagName).getText();

for (const file of walkFiles('src')) {
  const text = fs.readFileSync(file, 'utf8');
  if (!/<(Menu|Popover)\b/.test(text)) continue;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  const where = (node) => `${file}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;

  const visit = (node) => {
    if (ts.isJsxElement(node) && ROOTS.has(tagName(node))) rewriteRoot(node);
    if ((ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) && tagName(node) === 'Menu.Item') rewriteItem(node);
    ts.forEachChild(node, visit);
  };

  function rewriteItem(node) {
    const open = ts.isJsxElement(node) ? node.openingElement : node;
    for (const attr of open.attributes.properties) {
      if (!ts.isJsxAttribute(attr) || attr.name.getText() !== 'color') continue;
      if (literal(attr) === 'red') edits.push([attr.getStart(), attr.getEnd(), 'tone="danger"']);
      else report.blocked.push(`${where(attr)}  Menu.Item ${attr.getText()}  (no tone for this colour)`);
    }
  }

  function rewriteRoot(node) {
    const root = tagName(node);
    const open = node.openingElement;
    const contentAttrs = [];
    const onChange = [];
    let existingOnChange;
    for (const attr of open.attributes.properties) {
      if (!ts.isJsxAttribute(attr)) continue;
      const name = attr.name.getText();
      const drop = () => edits.push([attr.getFullStart(), attr.getEnd(), '']);
      if (DROPPED.has(name)) drop();
      else if (name === 'position') {
        const v = literal(attr);
        if (typeof v !== 'string') report.blocked.push(`${where(attr)}  ${root} position is an expression`);
        else { contentAttrs.push(...placement(v)); drop(); }
      } else if (name === 'width' || name === 'offset') {
        contentAttrs.push(`${name}={${exprText(attr)}}`);
        drop();
      } else if ((name === 'closeOnClickOutside' || name === 'closeOnEscape') && literal(attr) === true) drop();
      else if (name === 'onOpen') { onChange.push(`if (opened) (${exprText(attr)})();`); drop(); }
      else if (name === 'onClose') { onChange.push(`if (!opened) (${exprText(attr)})();`); drop(); }
      else if (name === 'onChange') existingOnChange = attr;
      else if (['opened', 'defaultOpened', 'key'].includes(name) || name.startsWith('data-')) continue;
      else report.blocked.push(`${where(attr)}  ${root} ${attr.getText().slice(0, 80)}  (no framework equivalent)`);
    }
    if (onChange.length) {
      if (existingOnChange) report.blocked.push(`${where(existingOnChange)}  ${root} has onChange and onOpen/onClose; merge by hand`);
      else edits.push([open.attributes.getEnd(), open.attributes.getEnd(), ` onChange={(opened) => { ${onChange.join(' ')} }}`]);
    }

    for (const child of node.children) {
      if (!ts.isJsxElement(child) && !ts.isJsxSelfClosingElement(child)) continue;
      const name = tagName(child);
      if (name === `${root}.Target` && ts.isJsxElement(child)) {
        const inner = child.children.filter((c) => ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c));
        if (inner.length !== 1) {
          report.blocked.push(`${where(child)}  ${root}.Target does not wrap exactly one element`);
          continue;
        }
        const target = inner[0];
        let trigger;
        if (ts.isJsxSelfClosingElement(target)) {
          trigger = `<${root}.Trigger render={${target.getText()}} />`;
        } else {
          const o = target.openingElement;
          const selfClosed = `<${o.tagName.getText()}${o.attributes.properties.length ? ' ' + o.attributes.getText() : ''} />`;
          const kids = text.slice(o.getEnd(), target.closingElement.getStart());
          trigger = `<${root}.Trigger render={${selfClosed}}>${kids}</${root}.Trigger>`;
        }
        edits.push([child.getStart(), child.getEnd(), trigger]);
      } else if (name === `${root}.Dropdown`) {
        const tag = ts.isJsxElement(child) ? child.openingElement.tagName : child.tagName;
        const extra = contentAttrs.length ? ` ${contentAttrs.join(' ')}` : '';
        edits.push([tag.getStart(), tag.getEnd(), `${root}.Content${extra}`]);
        if (ts.isJsxElement(child)) {
          const close = child.closingElement.tagName;
          edits.push([close.getStart(), close.getEnd(), `${root}.Content`]);
        }
      }
    }
  }

  visit(sf);
  if (!edits.length) continue;
  report.files += 1;
  report.edits += edits.length;
  edits.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  let out = text;
  for (const [a, b, t] of edits) out = out.slice(0, a) + t + out.slice(b);
  if (write) fs.writeFileSync(file, out);
}

console.log(`${write ? 'Made' : 'Would make'} ${report.edits} edits in ${report.files} files.`);
console.log(`\nNot rewritten (${report.blocked.length}):`);
for (const b of report.blocked) console.log(`  ${b}`);
