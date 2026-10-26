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
  if (e && e.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (e && e.kind === ts.SyntaxKind.FalseKeyword) return false;
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
 * Badges by what they are (designer, 2026-10-26): a state takes its role tone
 * and glyph, a count that annotates a control takes `primary`, an urgent count
 * is a state, and everything else (categories, roles, names, tags, counts) is
 * the neutral badge. Matched by file and by text inside the element, since a
 * badge's meaning is not in its props.
 */
const BADGE_TONES = [
  ['AnalyticsDashboard.tsx', 'admin_analytics_offline', 'danger'],
  ['KeyboardShortcutsModal.tsx', "'admin_ksc_custom'", 'info'],
  ['KeyboardShortcutsModal.tsx', "'admin_ksc_customized'", 'info'],
  ['PendingRequestsPanel.tsx', 'admin_req_n_pending', 'warning'],
  ['CampaignCard.tsx', 'campcard_access', 'success'],
  ['NearDuplicateWarning.tsx', 'ndw_identical', 'warning'],
  ['TypographyEditor.tsx', 'typo_font_failed', 'warning'],
  ['AdvancedSettingsSection.tsx', 'set_adv_cache_active', 'success'],
  ['AdminPanel.tsx', 'activeFilterCount', 'primary'],
  ['useCampaignsRows.tsx', 'pendingRequestCount', 'warning'],
];

function badgeElement(open, file, elementText) {
  const attr = (name) => open.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText() === name);
  const colour = attr('color');
  const colourExpr = colour?.initializer && ts.isJsxExpression(colour.initializer) && !ts.isStringLiteral(colour.initializer.expression);
  if (colourExpr) return { blocked: 'colour is an expression; classify by hand' };
  const hit = BADGE_TONES.find(([f, text]) => file.endsWith(f) && elementText.includes(text));
  const inserts = [`tone="${hit ? hit[2] : 'default'}"`];
  // Mantine's defaults, spelled out so the flip keeps each badge's shape.
  if (!attr('variant')) inserts.push('variant="filled"');
  if (!attr('size')) inserts.push('size="md"');
  return { inserts, review: hit ? `${hit[2]}` : null };
}

/**
 * Mantine colour names on a control (designer, 2026-10-25): blue is the brand
 * action, gray and dark the quiet neutral control, the rest their roles.
 */
const CONTROL_TONES = { red: 'danger', blue: 'primary', green: 'success', orange: 'warning', yellow: 'warning', gray: 'default', dark: 'default' };
const controlColour = (attr) => {
  const v = literal(attr);
  if (typeof v !== 'string') return { blocked: 'colour is an expression' };
  if (CONTROL_TONES[v]) return { replace: `tone="${CONTROL_TONES[v]}"` };
  if (v === 'teal') return { replace: 'tone="primary"', review: 'teal on a control: primary unless it reports an outcome' };
  return { blocked: 'no role for this colour' };
};

/**
 * Mantine hands a toggle's `onChange` the change event; the framework hands it
 * the boolean (P80). An inline arrow that only reads `e.currentTarget.checked`
 * is rewritten to take the boolean; anything else is listed for a hand check.
 */
const toggleOnChange = (attr) => {
  const fn = attr.initializer && ts.isJsxExpression(attr.initializer) ? attr.initializer.expression : undefined;
  if (!fn || !ts.isArrowFunction(fn)) return { blocked: 'handler is not an inline arrow; check its signature' };
  if (fn.parameters.length === 0) return null;
  const param = fn.parameters[0];
  if (fn.parameters.length > 1 || !ts.isIdentifier(param.name)) return { blocked: 'unexpected handler parameters' };
  const name = param.name.text;
  const reads = [];
  let other = false;
  let usesChecked = false;
  const visit = (node) => {
    if (ts.isIdentifier(node) && node.text === name && node !== param.name) {
      const access = node.parent;
      const outer = access?.parent;
      if (
        ts.isPropertyAccessExpression(access) && access.expression === node &&
        ['currentTarget', 'target'].includes(access.name.text) &&
        ts.isPropertyAccessExpression(outer) && outer.expression === access && outer.name.text === 'checked'
      ) reads.push(outer);
      else other = true;
    }
    if (ts.isIdentifier(node) && node.text === 'checked') {
      const parent = node.parent;
      const isMember = ts.isPropertyAccessExpression(parent) && parent.name === node;
      const isKey = ts.isPropertyAssignment(parent) && parent.name === node;
      if (!isMember && !isKey) usesChecked = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(fn.body);
  if (other || reads.length === 0) return { blocked: 'handler uses the event for more than `checked`' };
  const next = usesChecked ? 'nextChecked' : 'checked';
  const start = attr.initializer.getStart();
  let text = attr.initializer.getText();
  const cuts = [[param.getStart() - start, param.getEnd() - start, next], ...reads.map((r) => [r.getStart() - start, r.getEnd() - start, next])];
  cuts.sort((a, b) => b[0] - a[0]);
  for (const [a, b, t] of cuts) text = text.slice(0, a) + t + text.slice(b);
  return { replace: `onChange=${text}` };
};

/** Mantine's `suffix=" px"` is text after the value; the framework draws it in the unit slot. */
const numberSuffix = (attr) => {
  const v = literal(attr);
  if (typeof v !== 'string') return { blocked: 'suffix is an expression' };
  return { replace: `unit="${v.trim()}"` };
};

/** `size="compact-xs"` is the xs step with the compact flag. */
const buttonSize = (attr) => {
  const v = literal(attr);
  if (typeof v === 'string' && v.startsWith('compact-')) return { replace: `size="${v.slice(8)}" compact` };
  return null;
};

/** Mantine's ActionIcon is filled by default; the framework's is subtle, so a site that relied on the default says so. */
function actionIconElement(open) {
  const has = open.attributes.properties.some((a) => ts.isJsxAttribute(a) && a.name.getText() === 'variant');
  return { inserts: has ? [] : ['variant="filled"'] };
}

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
/** One field look (designer, 2026-10-26): `filled` goes, and an edit-in-place `unstyled` field is `bare`. */
const fieldVariant = (attr) => {
  const v = literal(attr);
  if (v === 'filled' || v === 'default') return { replace: '' };
  if (v === 'unstyled') return { replace: 'variant="bare"', review: 'unstyled is bare: check it is edited in place' };
  return { blocked: 'variant is an expression' };
};

const FIELD_UNSUPPORTED = [
  'classNames', 'styles', 'unstyled', 'inputWrapperOrder', 'withAsterisk', 'labelProps', 'descriptionProps',
  'errorProps', 'wrapperProps', 'inputContainer', 'pointer', 'rightSectionPointerEvents', 'rightSectionWidth',
  'leftSectionPointerEvents', 'leftSectionWidth',
];
const TOGGLE_UNSUPPORTED = ['color', 'radius', 'labelPosition', 'icon', 'iconColor', 'variant', 'classNames', 'styles', 'unstyled', 'wrapperProps'];

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
  Button: {
    rename: {},
    unsupported: ['justify', 'gradient', 'autoContrast', 'styles', 'classNames', 'unstyled'],
    props: { color: controlColour, size: buttonSize },
  },
  ActionIcon: {
    rename: {},
    unsupported: ['gradient', 'autoContrast', 'styles', 'classNames', 'unstyled'],
    element: actionIconElement,
    props: { color: controlColour, c: (attr) => (literal(attr) === 'dimmed' ? { replace: 'tone="muted"' } : { blocked: 'icon colour' }) },
  },
  UnstyledButton: { rename: {}, unsupported: ['mod', 'classNames', 'styles', 'unstyled'] },
  // One look whatever the variant (designer, 2026-10-26), so a literal variant is dropped.
  Chip: {
    rename: {},
    unsupported: ['color', 'radius', 'icon', 'classNames', 'styles', 'unstyled'],
    props: { variant: (attr) => (typeof literal(attr) === 'string' ? { replace: '' } : { blocked: 'variant is an expression' }) },
  },
  'Chip.Group': { rename: {}, unsupported: [] },
  CopyButton: { rename: {}, unsupported: [] },
  FileButton: { rename: {}, unsupported: ['capture', 'form', 'name', 'inputProps'] },
  // [P81-A] The input family.
  TextInput: { rename: {}, unsupported: FIELD_UNSUPPORTED, props: { variant: fieldVariant } },
  PasswordInput: { rename: {}, unsupported: FIELD_UNSUPPORTED, props: { variant: fieldVariant } },
  Textarea: {
    rename: {},
    unsupported: [...FIELD_UNSUPPORTED, 'resize'],
    // The framework textarea always grows with its content between minRows and maxRows.
    props: {
      variant: fieldVariant,
      autosize: (attr) => (literal(attr) === true ? { replace: '' } : { blocked: 'autosize is an expression' }),
    },
  },
  NumberInput: {
    rename: {},
    unsupported: [...FIELD_UNSUPPORTED, 'prefix', 'thousandSeparator', 'allowNegative', 'clampBehavior'],
    props: {
      variant: fieldVariant,
      suffix: numberSuffix,
      hideControls: (attr) => (literal(attr) === true ? { replace: 'controls="none"' } : { blocked: 'hideControls is an expression' }),
      allowDecimal: (attr) => (literal(attr) === false ? { replace: 'decimalScale={0}' } : { blocked: 'allowDecimal is not false' }),
    },
  },
  Checkbox: { rename: {}, unsupported: TOGGLE_UNSUPPORTED, props: { onChange: toggleOnChange } },
  Switch: { rename: {}, unsupported: [...TOGGLE_UNSUPPORTED, 'onLabel', 'offLabel', 'thumbIcon'], props: { onChange: toggleOnChange } },
  Slider: {
    rename: {},
    unsupported: ['color', 'radius', 'thumbSize', 'thumbChildren', 'showLabelOnHover', 'labelTransitionProps', 'inverted', 'restrictToMarks', 'scale', 'classNames', 'styles', 'unstyled'],
  },
  SegmentedControl: {
    rename: {},
    unsupported: ['color', 'radius', 'transitionDuration', 'transitionTimingFunction', 'orientation', 'withItemsBorders', 'autoContrast', 'readOnly', 'classNames', 'styles', 'unstyled'],
  },
  Badge: {
    rename: { leftSection: 'icon' },
    unsupported: ['rightSection', 'circle', 'gradient', 'autoContrast', 'fullWidth', 'classNames', 'styles', 'unstyled'],
    element: badgeElement,
    props: {
      // The element hook sets the tone; the Mantine colour goes.
      color: () => ({ replace: '' }),
      variant: (attr) => (literal(attr) === 'dot' ? { replace: 'variant="outline"' } : null),
    },
  },
  Paper: { rename: PADDING, unsupported: ['variant', 'mod', 'classNames', 'styles', 'unstyled'] },
  Card: { rename: PADDING, unsupported: ['variant', 'orientation', 'mod', 'classNames', 'styles', 'unstyled'] },
  'Card.Section': { rename: PADDING, unsupported: ['inheritPadding', 'mod', 'classNames', 'styles', 'unstyled'] },
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
    // A compound tag (`Card.Section`) takes its parent's import and its own rules.
    const [tagHead, ...tagTail] = (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) ? node.tagName.getText().split('.') : [];
    const comp = tagHead && local.has(tagHead) ? [local.get(tagHead), ...tagTail].join('.') : undefined;
    if (comp && RULES[comp]) {
      const rule = RULES[comp];
      if (rule.element) {
        const element = ts.isJsxOpeningElement(node) ? node.parent : node;
        const outcome = rule.element(node, file, element.getText());
        const where = `${file}:${line(node)}  ${comp}`;
        if (outcome.blocked) {
          report.blocked.push(`${where}  (${outcome.blocked})`);
          ts.forEachChild(node, visit);
          return;
        }
        const at = node.tagName.getEnd();
        if (outcome.inserts.length > 0) edits.push([at, at, ` ${outcome.inserts.join(' ')}`]);
        if (outcome.review) report.review.push(`${where}  tone ${outcome.review}`);
      }
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
    // From the end, so earlier offsets stay valid. At one offset the wider edit
    // goes first: an insertion applied before a deletion that starts at the same
    // place had its text eaten by the deletion.
    edits.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
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
