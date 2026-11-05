// Writes lib/viz/defs/ from legacy/src/viz/ (plan 7.1, D-013). The legacy code is copied, not rewritten:
//  1. VIEW_PATCHES swap the few lines of render code that built DOM by hand for the matching primitive;
//  2. date and timetable wording in string literals is rewritten and logged in docs/import/viz-changes.json;
//  3. `render` becomes `view`, and each visualizer gets the random-input generator its legacy test used;
//  4. types: Input and Step from what the code produced on the test inputs, empty containers from what they held,
//     and whatever else the compiler cannot infer from what was recorded at that spot (viz-sample.ts);
//  5. each visualizer becomes its own module, so a page loads only the ones it shows.
// tests/viz/parity.test.ts runs the result against the legacy code on every test input.
//
//   npx tsx scripts/import/port-visualizers.ts --force
import fs from 'node:fs';
import path from 'node:path';
import { ESLint } from 'eslint';
import * as prettier from 'prettier';
import ts from 'typescript';
import { EditedText, type Rendered } from './edited-text';
import { CHANGE_LOG, LEGACY_DIR, ROOT } from './paths';
import { writeChangeDocs } from './report';
import { applyGenericRules, type RuleId } from './rewrite-engine';
import { PROTECTED_PHRASES } from './rewrites-content';
import { MODULES } from './slugs';
import { declarationOf, isFunctionNode, sample, type FunctionNode, type Samples } from './viz-sample';
import { mergeShapes, onlyUndefined, renderShape, type RenderOptions, type Shape } from './viz-shapes';
import {
  applyViewPatches,
  legacyVizText,
  moduleOf,
  replayVizChanges,
  VIZ_CHANGE_LOG,
  VIZ_FILES,
  type VizChange,
} from './viz-text';
import { STEP_FIELD_FIXES, TYPE_FIXES } from './viz-type-fixes';

const OUT_DIR = path.join(ROOT, 'lib/viz/defs');

const parseJs = (file: string, text: string) =>
  ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);

function iifeOf(sf: ts.SourceFile): { statement: ts.ExpressionStatement; body: ts.Block } {
  for (const n of sf.statements) {
    if (ts.isExpressionStatement(n) && ts.isCallExpression(n.expression)) {
      const callee = n.expression.expression;
      if (ts.isParenthesizedExpression(callee) && ts.isFunctionExpression(callee.expression)) {
        return { statement: n, body: callee.expression.body };
      }
    }
  }
  throw new Error(`${sf.fileName}: no IIFE`);
}

/** The id of the visualizer a top-level statement defines: `V.define('id', …)` or `factory('id', …)`. */
function defineTarget(
  st: ts.Statement,
  sf: ts.SourceFile,
): { id: string; call: ts.CallExpression; factory: string | null } | null {
  if (!ts.isExpressionStatement(st) || !ts.isCallExpression(st.expression)) return null;
  const call = st.expression;
  const first = call.arguments[0];
  if (!first || !ts.isStringLiteral(first)) return null;
  const callee = call.expression.getText(sf);
  return { id: first.text, call, factory: callee === 'V.define' ? null : callee };
}

// ---- text changes, logged

export function rewriteVizLiterals(file: string, text: string): { text: string; changes: VizChange[] } {
  const sf = parseJs(file, text);
  const owners: { start: number; end: number; id: string }[] = [];
  for (const st of iifeOf(sf).body.statements) {
    const target = defineTarget(st, sf);
    if (target) owners.push({ start: st.getStart(sf), end: st.getEnd(), id: target.id });
  }
  const changes: VizChange[] = [];
  const consider = (start: number, end: number) => {
    const before = text.slice(start, end);
    const rules: RuleId[] = [];
    let after = applyGenericRules(before, PROTECTED_PHRASES, (r) => {
      if (!rules.includes(r)) rules.push(r);
    });
    if (/\bRoadmap\b/.test(after)) {
      after = after.replace(/\bRoadmap\b/g, 'Handbook');
      if (!rules.includes('rename-roadmap')) rules.push('rename-roadmap');
    }
    if (after === before) return;
    changes.push({
      file: `src/viz/${file}`,
      item: owners.find((o) => start >= o.start && start < o.end)?.id ?? 'shared helper',
      line: sf.getLineAndCharacterOfPosition(start).line + 1,
      start,
      before,
      after,
      rules,
    });
  };
  const visit = (n: ts.Node) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n))
      consider(n.getStart(sf) + 1, n.getEnd() - 1);
    else if (ts.isTemplateHead(n) || ts.isTemplateMiddle(n)) consider(n.getStart(sf) + 1, n.getEnd() - 2);
    else if (ts.isTemplateTail(n)) consider(n.getStart(sf) + 1, n.getEnd() - 1);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { text: replayVizChanges(text, changes), changes };
}

// ---- structure: render → view, factories return, random generators

interface RefEntry {
  gen?: string;
}

export function parseRefs(): Record<string, RefEntry> {
  const text = fs.readFileSync(path.join(LEGACY_DIR, 'tests/refs.mjs'), 'utf8');
  const sf = parseJs('refs.mjs', text);
  const entries: Record<string, RefEntry> = {};
  for (const n of sf.statements) {
    if (!ts.isVariableStatement(n)) continue;
    const d = n.declarationList.declarations[0];
    if (d?.name.getText(sf) !== 'REFS' || !d.initializer || !ts.isObjectLiteralExpression(d.initializer))
      continue;
    for (const p of d.initializer.properties) {
      if (!ts.isPropertyAssignment(p) || !ts.isObjectLiteralExpression(p.initializer))
        throw new Error('unexpected REFS entry');
      const id = ts.isStringLiteral(p.name) ? p.name.text : p.name.getText(sf);
      const gen = p.initializer.properties.find((q) => q.name?.getText(sf) === 'gen');
      entries[id] = gen && ts.isPropertyAssignment(gen) ? { gen: gen.initializer.getText(sf) } : {};
    }
  }
  return entries;
}

export interface DefInfo {
  id: string;
  factory: string | null;
}

/** Still JavaScript: the sampler runs this text. */
function structural(
  file: string,
  text: string,
  refs: Record<string, RefEntry>,
): { text: string; defs: DefInfo[] } {
  const sf = parseJs(file, text);
  const ed = new EditedText(text);
  const { body } = iifeOf(sf);
  const defs: DefInfo[] = [];
  const factories = new Set<string>();
  for (const st of body.statements) {
    const target = defineTarget(st, sf);
    if (target?.factory) factories.add(target.factory);
  }
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n) && n.expression.getText(sf) === 'V.define') {
      const obj = n.arguments[1];
      if (!obj || !ts.isObjectLiteralExpression(obj)) throw new Error(`${file}: V.define without an object`);
      const render = obj.properties.find((p) => p.name?.getText(sf) === 'render');
      if (render?.name) ed.replace(render.name.getStart(sf), render.name.getEnd(), 'view');
      const fn = (() => {
        for (let p = n.parent; p; p = p.parent) if (isFunctionNode(p)) return p;
        return undefined;
      })();
      if (fn && ts.isFunctionDeclaration(fn) && fn.name && factories.has(fn.name.text))
        ed.insert(n.getStart(sf), 'return ');
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  for (const st of body.statements) {
    const target = defineTarget(st, sf);
    if (!target) continue;
    defs.push({ id: target.id, factory: target.factory });
    const gen = refs[target.id]?.gen;
    if (!gen) continue;
    if (target.factory) {
      ed.insert(target.call.getStart(sf), 'withRandom(');
      ed.insert(target.call.getEnd(), `, ${gen})`);
    } else {
      const obj = target.call.arguments[1] as ts.ObjectLiteralExpression;
      const close = obj.getEnd() - 1;
      ed.insert(
        close,
        obj.properties.hasTrailingComma ? `  random: ${gen},\n  ` : `,\n    random: ${gen}\n  `,
      );
    }
  }
  return { text: ed.render().text, defs };
}

// ---- types

const safe = (id: string) => id.replace(/[^A-Za-z0-9]/g, '_');
const pascal = (name: string) => name[0]?.toUpperCase() + name.slice(1);
export const inputTypeName = (d: DefInfo) =>
  d.factory ? `${pascal(d.factory)}Input` : `Input_${safe(d.id)}`;
export const stepTypeName = (d: DefInfo) => (d.factory ? `${pascal(d.factory)}Step` : `Step_${safe(d.id)}`);

const STEP_BASE_KEYS = ['line', 'note', 'why'];

function interfaceText(
  name: string,
  base: string,
  shape: Shape,
  skip: string[],
  fixes: Record<string, string> = {},
): string {
  const lines = [`interface ${name}${base ? ` extends ${base}` : ''} {`];
  for (const [k, e] of shape.obj ?? []) {
    if (skip.includes(k)) continue;
    if (onlyUndefined(e.shape)) continue;
    const optional = e.count < shape.objCount || e.shape.prims.has('undefined');
    const type =
      fixes[k] ??
      renderShape(e.shape, { dropUndefined: true }) ??
      (e.shape.prims.has('undefined') ? 'undefined' : 'unknown');
    lines.push(`  ${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}${optional ? '?' : ''}: ${type};`);
  }
  lines.push('}');
  if (lines.length === 2 && !base) return `type ${name} = Record<string, never>;`;
  return lines.join('\n');
}

const IMPORTS = [
  "import { defineViz, withRandom } from '@/lib/viz/engine';",
  "import { R } from '@/lib/viz/nodes';",
  "import { fromT, randBST, randTree, rarr, rint, rstr, sorted, toT, type TreeValue } from '@/lib/viz/random';",
  "import type { PointerMap, Rng, Stage, StateMap, TreeNodeItem, VizNode, VizStep } from '@/lib/viz/types';",
];

interface Whole {
  file: string;
  module: string;
  vfile: string;
  base: string;
  ed: EditedText;
  defs: DefInfo[];
  interfaces: Map<string, string>;
  rendered: Rendered;
  annotated: Set<number>;
  unresolved: string[];
}

function wholeFile(file: string, base: string, defs: DefInfo[], samples: Samples): Whole {
  const sf = parseJs(file, base);
  const ed = new EditedText(base);
  const { statement, body } = iifeOf(sf);

  const annotated = new Set<number>();
  for (const fix of TYPE_FIXES[file] ?? []) {
    if ('replace' in fix) {
      // Code only: the same text inside a string, such as the algorithm a learner reads, stays as it is.
      const hits: number[] = [];
      for (let at = base.indexOf(fix.replace); at >= 0; at = base.indexOf(fix.replace, at + 1)) {
        if (!inLiteralText(sf, at)) hits.push(at);
      }
      if (!hits.length || (!fix.all && hits.length > 1))
        throw new Error(`${file}: a type fix matches ${hits.length} times: ${fix.replace}`);
      for (const at of hits) ed.replace(at, at + fix.replace.length, fix.with);
    } else if ('param' in fix) {
      const fn = functionNamed(sf, fix.of);
      const p = fn?.parameters.find((q) => q.name.getText(sf) === fix.param);
      if (!p) throw new Error(`${file}: no parameter ${fix.param} of ${fix.of}`);
      ed.insert(p.name.getEnd(), `: ${fix.type}`);
      annotated.add(p.name.getEnd());
    } else {
      let n = 0;
      const visit = (x: ts.Node) => {
        if (ts.isVariableDeclaration(x) && x.name.getText(sf) === fix.variable) {
          ed.insert(x.name.getEnd(), `: ${fix.type}`);
          annotated.add(x.name.getEnd());
          n++;
        }
        ts.forEachChild(x, visit);
      };
      visit(sf);
      if (!n) throw new Error(`${file}: no variable ${fix.variable}`);
    }
  }

  // The legacy `snap(o)` helpers spread their argument into a step. Generic, each call keeps its own step type.
  const generic = (n: ts.Node) => {
    if (isFunctionNode(n) && n.parameters.length === 1 && n.body) {
      const p = n.parameters[0] as ts.ParameterDeclaration;
      if (
        ts.isIdentifier(p.name) &&
        p.name.text === 'o' &&
        !p.initializer &&
        /\.\.\.o\b|,\s*o\s*\)/.test(n.body.getText(sf))
      ) {
        const open = n.getChildren(sf).find((c) => c.kind === ts.SyntaxKind.OpenParenToken);
        if (open) {
          ed.insert(open.getStart(sf), '<O extends object>');
          ed.insert(p.name.getEnd(), ': O');
        } else {
          ed.insert(p.getStart(sf), '<O extends object>(');
          ed.insert(p.name.getEnd(), ': O)');
        }
        annotated.add(p.name.getEnd());
      }
    }
    ts.forEachChild(n, generic);
  };
  generic(sf);

  // Interfaces: one pair per visualizer, or per factory.
  const interfaces = new Map<string, string>();
  const byType = new Map<string, DefInfo[]>();
  for (const d of defs) byType.set(inputTypeName(d), [...(byType.get(inputTypeName(d)) ?? []), d]);
  for (const group of byType.values()) {
    const d = group[0] as DefInfo;
    const inputs = mergeShapes(group.map((g) => samples.inputs.get(g.id) as Shape));
    const steps = mergeShapes(group.map((g) => samples.steps.get(g.id) as Shape));
    interfaces.set(inputTypeName(d), interfaceText(inputTypeName(d), '', inputs, []));
    const fixes = Object.assign({}, ...group.map((g) => STEP_FIELD_FIXES[g.id] ?? {})) as Record<
      string,
      string
    >;
    interfaces.set(stepTypeName(d), interfaceText(stepTypeName(d), 'VizStep', steps, STEP_BASE_KEYS, fixes));
  }

  ed.insert(
    0,
    `${IMPORTS.join('\n')}\n\nconst V = { define: defineViz };\n\n${[...interfaces.values()].join('\n\n')}\n\n`,
  );
  ed.replace(statement.getStart(sf), body.getStart(sf) + 1, '{');
  ed.replace(body.getEnd() - 1, statement.getEnd(), '}');
  for (const st of body.statements) {
    const text = st.getText(sf);
    if (text === "'use strict';" || (ts.isVariableStatement(st) && /=\s*g\.\w+/.test(text))) {
      ed.replace(st.getStart(sf), st.getEnd(), '');
    }
  }

  // Type arguments for every define, and the steps array inside it.
  const factoryOf = new Map(defs.filter((d) => d.factory).map((d) => [d.factory as string, d]));
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n) && n.expression.getText(sf) === 'V.define') {
      const id = n.arguments[0];
      let info: DefInfo | undefined;
      if (id && ts.isStringLiteral(id)) info = defs.find((d) => d.id === id.text && !d.factory);
      else {
        for (let p = n.parent; p && !info; p = p.parent) {
          if (ts.isFunctionDeclaration(p) && p.name) info = factoryOf.get(p.name.text);
        }
      }
      if (!info) throw new Error(`${file}: cannot tell which visualizer a define belongs to`);
      ed.insert(n.expression.getEnd(), `<${inputTypeName(info)}, ${stepTypeName(info)}>`);
      const stepType = stepTypeName(info);
      const mark = (m: ts.Node) => {
        if (
          ts.isVariableDeclaration(m) &&
          ts.isIdentifier(m.name) &&
          m.name.text === 'steps' &&
          m.initializer &&
          ts.isArrayLiteralExpression(m.initializer)
        ) {
          ed.insert(m.name.getEnd(), `: ${stepType}[]`);
          annotated.add(m.name.getEnd());
        }
        ts.forEachChild(m, mark);
      };
      mark(n);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);

  const w: Whole = {
    file,
    module: moduleOf(file),
    vfile: path.join(ROOT, 'lib/viz/__whole__', file.replace(/\.js$/, '.ts')).replace(/\\/g, '/'),
    base,
    ed,
    defs,
    interfaces,
    rendered: ed.render(),
    annotated,
    unresolved: [],
  };

  // Empty containers and variables that start empty get their type now: inference cannot see what goes in later.
  const containers = (n: ts.Node) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && !n.type) {
      const init = n.initializer;
      const empty =
        !init ||
        init.kind === ts.SyntaxKind.NullKeyword ||
        (ts.isIdentifier(init) && init.text === 'undefined') ||
        (ts.isArrayLiteralExpression(init) && !init.elements.length) ||
        (ts.isObjectLiteralExpression(init) && !init.properties.length) ||
        (ts.isNewExpression(init) &&
          /^(Set|Map)$/.test(init.expression.getText(sf)) &&
          !init.arguments?.length);
      const inLoopHead =
        n.parent.parent && (ts.isForOfStatement(n.parent.parent) || ts.isForInStatement(n.parent.parent));
      // A literal holding null: TypeScript would type that property as null for good.
      const holdsNull =
        !!init &&
        (ts.isArrayLiteralExpression(init) || ts.isObjectLiteralExpression(init)) &&
        /\bnull\b/.test(init.getText(sf));
      if ((empty || holdsNull) && !inLoopHead) {
        const record = !!init && ts.isObjectLiteralExpression(init) && !init.properties.length;
        const key = `V${file}#${n.name.getStart(sf)}`;
        annotateAt(
          w,
          key,
          n.name.getEnd(),
          { record },
          undefined,
          literalInflow(n, sf),
          literalElements(n, sf),
        );
      }
    }
    ts.forEachChild(n, containers);
  };
  containers(sf);
  return w;
}

/** True when a position is inside the text of a string or template, not inside code. */
function inLiteralText(sf: ts.SourceFile, pos: number): boolean {
  let found: ts.Node = sf;
  const visit = (n: ts.Node) => {
    if (pos >= n.getStart(sf) && pos < n.getEnd()) {
      found = n;
      ts.forEachChild(n, visit);
    }
  };
  ts.forEachChild(sf, visit);
  return (
    ts.isStringLiteral(found) ||
    ts.isNoSubstitutionTemplateLiteral(found) ||
    ts.isTemplateHead(found) ||
    ts.isTemplateMiddle(found) ||
    ts.isTemplateTail(found)
  );
}

/** The function, method or function-valued variable with this name. */
function functionNamed(sf: ts.SourceFile, name: string): FunctionNode | undefined {
  let found: FunctionNode | undefined;
  const visit = (n: ts.Node) => {
    if (found) return;
    if (isFunctionNode(n)) {
      const own = !ts.isArrowFunction(n) && n.name ? n.name.getText(sf) : undefined;
      const holder =
        ts.isVariableDeclaration(n.parent) || ts.isPropertyAssignment(n.parent)
          ? n.parent.name.getText(sf)
          : undefined;
      if ((own ?? holder) === name) {
        found = n;
        return;
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

/** Adds `: Type` after a name that ends at `at` (a position in the base text). */
function annotateAt(
  w: Whole,
  key: string,
  at: number,
  opts: RenderOptions,
  parens?: number,
  extra: string[] = [],
  elementInflow?: string[],
): boolean {
  if (w.annotated.has(at) || w.ed.covers(at)) return false;
  const shape = samplesRef.current?.values.get(key);
  if (!shape) return false;
  const sampled = renderShape(elementInflow ? withElements(shape, elementInflow) : shape, opts);
  const missing = extra.filter((k) => !sampled?.split(' | ').includes(k));
  const type = sampled && missing.length ? `${sampled} | ${missing.join(' | ')}` : sampled;
  if (!type) return false;
  w.annotated.add(at);
  if (parens !== undefined) {
    w.ed.insert(parens, '(');
    w.ed.insert(at, `: ${type})`);
  } else w.ed.insert(at, `: ${type}`);
  return true;
}

const samplesRef: { current: Samples | null } = { current: null };

// ---- the compiler loop

function compilerOptions(): ts.CompilerOptions {
  const configPath = path.join(ROOT, 'tsconfig.json');
  const cfg = ts.readConfigFile(configPath, (f) => ts.sys.readFile(f));
  const parsed = ts.parseJsonConfigFileContent(cfg.config as object, ts.sys, ROOT);
  return { ...parsed.options, noEmit: true, incremental: false, plugins: [] };
}

function deepestAt(sf: ts.SourceFile, pos: number): ts.Node {
  let found: ts.Node = sf;
  const visit = (n: ts.Node) => {
    if (pos >= n.getStart(sf) && pos < n.getEnd()) {
      found = n;
      ts.forEachChild(n, visit);
    }
  };
  ts.forEachChild(sf, visit);
  return found;
}

function ancestor<T extends ts.Node>(n: ts.Node, test: (x: ts.Node) => x is T): T | undefined {
  for (let p: ts.Node | undefined = n; p; p = p.parent) if (test(p)) return p;
  return undefined;
}

const PARAM_CODES = new Set([7006, 7031, 7019]);
const VAR_CODES = new Set([7005, 7034, 7022]);
const RETURN_CODES = new Set([7023, 7024, 7010, 7011]);
const NULLISH_CODES = new Set([18048, 18047, 18049, 2531, 2532, 2533]);
const SOURCE_CODES = new Set([7053, 7015, 2339, 2538, 18046, 2571, 2362, 2363, 2365, 2349, 2488]);

interface Fixer {
  w: Whole;
  sf: ts.SourceFile;
  checker: ts.TypeChecker;
}

function annotateParam(f: Fixer, p: ts.ParameterDeclaration): boolean {
  if (p.type) return false;
  const fn = p.parent as FunctionNode;
  const index = fn.parameters.indexOf(p);
  const base = f.w.rendered.toBase;
  const key = `P${f.w.file}#${base(fn.getStart(f.sf))}:${index}`;
  const at = base(p.name.getEnd());
  const bare =
    ts.isArrowFunction(fn) && !fn.getChildren(f.sf).some((c) => c.kind === ts.SyntaxKind.OpenParenToken);
  const opts = { dropUndefined: !!p.initializer || !!p.questionToken };
  return annotateAt(f.w, key, at, opts, bare ? base(p.getStart(f.sf)) : undefined);
}

function annotateVariable(f: Fixer, d: ts.VariableDeclaration, asMap = false): boolean {
  if (d.type || !ts.isIdentifier(d.name)) return false;
  const base = f.w.rendered.toBase;
  const record =
    asMap ||
    (!!d.initializer && ts.isObjectLiteralExpression(d.initializer) && !d.initializer.properties.length);
  const extra = literalInflow(d, f.sf);
  const key = `V${f.w.file}#${base(d.name.getStart(f.sf))}`;
  return annotateAt(f.w, key, base(d.name.getEnd()), { record }, undefined, extra, literalElements(d, f.sf));
}

/** A copy of a shape whose elements also include these kinds of literal. */
function withElements(shape: Shape, kinds: string[]): Shape {
  const copy = mergeShapes([shape]);
  if (!copy.arrayCount || !copy.array) return copy;
  for (const k of kinds) copy.array.prims.add(k as 'null');
  return copy;
}

/** Kinds of literal pushed into a container somewhere in the code: `x.push(undefined)` adds undefined. */
function literalElements(d: ts.VariableDeclaration, sf: ts.SourceFile): string[] {
  const kinds = new Set<string>();
  const visit = (n: ts.Node) => {
    if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      /^(push|unshift)$/.test(n.expression.name.text) &&
      ts.isIdentifier(n.expression.expression) &&
      declarationOf(n.expression.expression) === d
    ) {
      for (const a of n.arguments) {
        if (a.kind === ts.SyntaxKind.NullKeyword) kinds.add('null');
        else if (ts.isIdentifier(a) && a.text === 'undefined') kinds.add('undefined');
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return [...kinds];
}

/** Kinds of literal that flow into a variable somewhere in the code: `x = c ? 1 : null` adds null. */
function literalInflow(d: ts.VariableDeclaration, sf: ts.SourceFile): string[] {
  const kinds = new Set<string>();
  const add = (e: ts.Expression | undefined): void => {
    if (!e) return;
    if (ts.isParenthesizedExpression(e)) return add(e.expression);
    if (ts.isConditionalExpression(e)) {
      add(e.whenTrue);
      add(e.whenFalse);
    } else if (e.kind === ts.SyntaxKind.NullKeyword) kinds.add('null');
    else if (ts.isIdentifier(e) && e.text === 'undefined') kinds.add('undefined');
    else if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e) || ts.isTemplateExpression(e))
      kinds.add('string');
  };
  add(d.initializer);
  const visit = (n: ts.Node) => {
    if (
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(n.left)
    ) {
      if (declarationOf(n.left) === d) add(n.right);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return [...kinds];
}

function annotateReturn(f: Fixer, fn: FunctionNode): boolean {
  if (fn.type) return false;
  const close = fn.getChildren(f.sf).find((c) => c.kind === ts.SyntaxKind.CloseParenToken);
  if (!close) return false;
  const base = f.w.rendered.toBase;
  return annotateAt(f.w, `R${f.w.file}#${base(fn.getStart(f.sf))}`, base(close.getEnd()), {});
}

const isNullish = (t: ts.Type) =>
  (t.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void)) !== 0;

/** `!` after an expression the compiler thinks may be missing, where the recorded values say it never was. */
function assertPresent(f: Fixer, e: ts.Expression): boolean {
  if (!f.w.rendered.isBase(e.getStart(f.sf), e.getEnd())) return false;
  if (e.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(e) && e.text === 'undefined')) return false;
  if (ts.isNonNullExpression(e)) return false;
  const type = f.checker.getTypeAtLocation(e);
  if (!isNullish(type) && !(type.isUnion() && type.types.some(isNullish))) return false;
  const at = f.w.rendered.toBase(e.getEnd());
  if (f.w.ed.hasInsertion(at, '!')) return false;
  f.w.ed.insert(at, '!');
  return true;
}

/** Finds the values that may be missing inside a literal, a conditional or a shorthand property. */
function assertDeep(f: Fixer, e: ts.Expression, message: string, depth = 0): boolean {
  if (depth > 5) return false;
  const all = (xs: boolean[]) => xs.some(Boolean);
  if (ts.isParenthesizedExpression(e)) return assertDeep(f, e.expression, message, depth + 1);
  if (ts.isConditionalExpression(e)) {
    return all([e.whenTrue, e.whenFalse].map((x) => assertDeep(f, x, message, depth + 1)));
  }
  if (ts.isArrayLiteralExpression(e)) {
    return all(e.elements.map((x) => !ts.isSpreadElement(x) && assertDeep(f, x, message, depth + 1)));
  }
  if (ts.isObjectLiteralExpression(e)) {
    const named = new Set([...message.matchAll(/property '([\w$]+)'/g)].map((m) => m[1]));
    return all(
      e.properties.map((p) => {
        if (named.size && !named.has(p.name?.getText(f.sf) ?? '')) return false;
        if (ts.isPropertyAssignment(p)) return assertDeep(f, p.initializer, message, depth + 1);
        if (ts.isShorthandPropertyAssignment(p)) return assertShorthand(f, p);
        return false;
      }),
    );
  }
  return assertPresent(f, e);
}

function assertShorthand(f: Fixer, p: ts.ShorthandPropertyAssignment): boolean {
  if (!f.w.rendered.isBase(p.getStart(f.sf), p.getEnd())) return false;
  const symbol = f.checker.getShorthandAssignmentValueSymbol(p);
  if (!symbol) return false;
  const type = f.checker.getTypeOfSymbolAtLocation(symbol, p.name);
  if (!isNullish(type) && !(type.isUnion() && type.types.some(isNullish))) return false;
  const at = f.w.rendered.toBase(p.name.getEnd());
  const text = `: ${p.name.text}!`;
  if (f.w.ed.hasInsertion(at, text)) return false;
  f.w.ed.insert(at, text);
  return true;
}

/** Where an assignability error points: a property name, a declared name, the left side, or the expression itself. */
function assignedValue(
  f: Fixer,
  node: ts.Node,
  start: number,
  end: number,
): ts.Expression | ts.ShorthandPropertyAssignment | undefined {
  if (ts.isReturnStatement(node)) return node.expression;
  const p = node.parent;
  if (ts.isIdentifier(node) && p) {
    if (ts.isPropertyAssignment(p) && p.name === node) return p.initializer;
    if (ts.isShorthandPropertyAssignment(p)) return p;
    if (ts.isVariableDeclaration(p) && p.name === node) return p.initializer;
  }
  let exact: ts.Expression | undefined;
  for (let x: ts.Node | undefined = node; x; x = x.parent) {
    if (ts.isExpression(x) && x.getStart(f.sf) === start && x.getEnd() === end) exact = x;
  }
  const parent = exact?.parent;
  if (
    exact &&
    parent &&
    ts.isBinaryExpression(parent) &&
    parent.left === exact &&
    parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
  ) {
    return parent.right;
  }
  return exact;
}

/** Makes the parameters a call leaves out optional, as JavaScript treats them. */
function optionalParams(f: Fixer, node: ts.Node): boolean {
  const call = ancestor(node, ts.isCallExpression);
  if (!call) return false;
  const decl = f.checker.getResolvedSignature(call)?.declaration;
  if (!decl || !isFunctionNode(decl) || decl.getSourceFile() !== f.sf) return false;
  let changed = false;
  for (const p of decl.parameters.slice(call.arguments.length)) {
    if (p.questionToken || p.initializer || p.dotDotDotToken) continue;
    const at = f.w.rendered.toBase(p.name.getEnd());
    if (f.w.ed.hasInsertion(at, '?')) continue;
    f.w.ed.insert(at, '?', -1);
    changed = true;
  }
  return changed;
}

function rootOf(e: ts.Expression): ts.Expression {
  for (;;) {
    if (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e))
      e = e.expression;
    else if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) e = e.expression;
    else if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression)) {
      const callee = e.expression.expression;
      if (ts.isIdentifier(callee) && callee.text === 'Object' && e.arguments[0]) e = e.arguments[0];
      else e = callee;
    } else return e;
  }
}

/** Gives a type to whatever an expression's value comes from: a variable, a parameter, or a container it was read from. */
function annotateSourceOf(f: Fixer, e: ts.Expression, depth = 0, asMap = false): boolean {
  if (depth > 4) return false;
  const root = rootOf(e);
  if (!ts.isIdentifier(root)) return false;
  const symbol = f.checker.getSymbolAtLocation(root);
  const decl = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
  if (!decl || decl.getSourceFile() !== f.sf) return false;
  if (ts.isVariableDeclaration(decl)) {
    const loop = decl.parent.parent;
    if (!decl.initializer && loop && ts.isForOfStatement(loop))
      return annotateSourceOf(f, loop.expression, depth + 1);
    return annotateVariable(f, decl, asMap);
  }
  if (ts.isParameter(decl)) {
    const fn = decl.parent;
    const call = fn.parent;
    if (ts.isCallExpression(call) && ts.isPropertyAccessExpression(call.expression)) {
      if (annotateSourceOf(f, call.expression.expression, depth + 1)) return true;
    }
    return annotateParam(f, decl);
  }
  if (ts.isBindingElement(decl)) {
    let p: ts.Node = decl;
    while (ts.isBindingElement(p) || ts.isObjectBindingPattern(p) || ts.isArrayBindingPattern(p))
      p = p.parent;
    if (ts.isParameter(p)) return annotateParam(f, p);
    if (ts.isVariableDeclaration(p)) {
      const loop = p.parent.parent;
      if (loop && ts.isForOfStatement(loop)) return annotateSourceOf(f, loop.expression, depth + 1);
      if (p.initializer) return annotateSourceOf(f, p.initializer, depth + 1);
    }
  }
  return false;
}

function fixDiagnostic(f: Fixer, d: ts.Diagnostic): boolean {
  const start = d.start ?? 0;
  const node = deepestAt(f.sf, start);
  const base = f.w.rendered.toBase;
  if (PARAM_CODES.has(d.code)) {
    const p = ancestor(node, ts.isParameter);
    const call = p?.parent.parent;
    if (p && call && ts.isCallExpression(call) && ts.isPropertyAccessExpression(call.expression)) {
      if (annotateSourceOf(f, call.expression.expression)) return true;
    }
    if (p) return annotateParam(f, p);
    const v = ancestor(node, ts.isVariableDeclaration);
    return v?.initializer ? annotateSourceOf(f, v.initializer) : false;
  }
  if (VAR_CODES.has(d.code)) {
    const v = ancestor(node, ts.isVariableDeclaration);
    return v ? annotateVariable(f, v) : false;
  }
  if (RETURN_CODES.has(d.code)) {
    const v = ancestor(node, ts.isVariableDeclaration);
    if (v?.initializer && isFunctionNode(v.initializer) && start < v.name.getEnd())
      return annotateReturn(f, v.initializer);
    const fn = ancestor(node, isFunctionNode);
    return fn ? annotateReturn(f, fn) : false;
  }
  const end = start + (d.length ?? 0);
  if (NULLISH_CODES.has(d.code)) {
    const target = assignedValue(f, node, start, end);
    return !!target && !ts.isShorthandPropertyAssignment(target) && assertPresent(f, target);
  }
  const message = ts.flattenDiagnosticMessageText(d.messageText, ' ');
  if (
    (d.code === 2322 || d.code === 2345) &&
    /Type '(undefined|null)' is not assignable to type/.test(message)
  ) {
    const target = assignedValue(f, node, start, end);
    const fixed =
      !!target &&
      (ts.isShorthandPropertyAssignment(target)
        ? assertShorthand(f, target)
        : assertDeep(f, target, message));
    if (fixed) return true;
  }
  if (d.code === 2554) return optionalParams(f, node);
  // An index or a computed key that may be missing: the samples say it never was.
  if (d.code === 2464) {
    const key = ancestor(node, ts.isComputedPropertyName);
    if (key && assertPresent(f, key.expression)) return true;
  }
  if (d.code === 2488 && /undefined' must have/.test(message)) {
    const decl = ancestor(node, ts.isVariableDeclaration);
    const target = decl?.initializer ?? assignedValue(f, node, start, end);
    if (target && !ts.isShorthandPropertyAssignment(target) && assertPresent(f, target)) return true;
  }
  if (d.code === 2538 && /'(undefined|null)'/.test(message)) {
    const target = assignedValue(f, node, start, end);
    if (target && !ts.isShorthandPropertyAssignment(target) && assertPresent(f, target)) return true;
  }
  // Pushing into a container the compiler typed from an empty start, such as Array.from(..., () => []).
  if (d.code === 2345 && /parameter of type 'never'/.test(message)) {
    const call = ancestor(node, ts.isCallExpression);
    if (
      call &&
      ts.isPropertyAccessExpression(call.expression) &&
      annotateSourceOf(f, call.expression.expression)
    )
      return true;
  }
  // Assigning into a container whose type came from its initializer: the samples know what went in.
  if (d.code === 2322) {
    const assign = ancestor(node, ts.isBinaryExpression);
    if (
      assign &&
      ts.isIdentifier(assign.left) &&
      assign.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      annotateSourceOf(f, assign.left)
    ) {
      return true;
    }
    const left = assign?.left;
    const inLeft = left && left.getStart(f.sf) <= start && start < left.getEnd();
    if (left && inLeft && (ts.isElementAccessExpression(left) || ts.isPropertyAccessExpression(left))) {
      if (annotateSourceOf(f, left.expression)) return true;
    }
  }
  void base;
  if (SOURCE_CODES.has(d.code)) {
    const expr = ancestor(node, (x): x is ts.Expression => ts.isExpression(x));
    const access = ancestor(
      node,
      (x): x is ts.ElementAccessExpression | ts.PropertyAccessExpression =>
        ts.isElementAccessExpression(x) || ts.isPropertyAccessExpression(x),
    );
    const tried: ts.Expression[] = [];
    if (access && ts.isElementAccessExpression(access) && (d.code === 7053 || d.code === 7015)) {
      if (annotateSourceOf(f, access.expression, 0, true)) return true;
    }
    if (access && ts.isElementAccessExpression(access))
      tried.push(access.argumentExpression, access.expression);
    if (access && ts.isPropertyAccessExpression(access)) tried.push(access.expression);
    if (expr) tried.push(expr);
    const bin = ancestor(node, ts.isBinaryExpression);
    if (bin) tried.push(bin.left, bin.right);
    for (const e of tried) if (annotateSourceOf(f, e)) return true;
  }
  return false;
}

function runCompilerLoop(wholes: Whole[]): ts.Diagnostic[] {
  const options = compilerOptions();
  const texts = new Map<string, string>();
  const versions = new Map<string, number>();
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => wholes.map((w) => w.vfile),
    getScriptVersion: (f) => String(versions.get(f.replace(/\\/g, '/')) ?? 0),
    getScriptSnapshot: (f) => {
      const name = f.replace(/\\/g, '/');
      const text = texts.get(name) ?? (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : undefined);
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => ROOT,
    getCompilationSettings: () => options,
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: (f) => texts.has(f.replace(/\\/g, '/')) || ts.sys.fileExists(f),
    readFile: (f) => texts.get(f.replace(/\\/g, '/')) ?? ts.sys.readFile(f),
    readDirectory: (...args) => ts.sys.readDirectory(...args),
    directoryExists: (f) => ts.sys.directoryExists(f),
    getDirectories: (f) => ts.sys.getDirectories(f),
  };
  const service = ts.createLanguageService(host);
  let remaining: ts.Diagnostic[] = [];
  for (let round = 0; round < 12; round++) {
    for (const w of wholes) {
      w.rendered = w.ed.render();
      texts.set(w.vfile, w.rendered.text);
      versions.set(w.vfile, (versions.get(w.vfile) ?? 0) + 1);
    }
    const program = service.getProgram();
    if (!program) throw new Error('no program');
    const checker = program.getTypeChecker();
    remaining = [];
    let fixed = 0;
    for (const w of wholes) {
      const sf = program.getSourceFile(w.vfile);
      if (!sf) throw new Error(`no source file ${w.vfile}`);
      const diags = [...service.getSyntacticDiagnostics(w.vfile), ...service.getSemanticDiagnostics(w.vfile)];
      const fixer = { w, sf, checker };
      for (const d of diags) {
        if (fixDiagnostic(fixer, d)) fixed++;
        else remaining.push(d);
      }
    }
    console.log(`round ${round + 1}: fixed ${fixed}, ${remaining.length} left`);
    if (!fixed) break;
  }
  return remaining;
}

// ---- splitting into modules

interface Piece {
  name: string;
  text: string;
  uses: Set<string>;
}

function identifiersIn(node: ts.Node): Set<string> {
  const out = new Set<string>();
  const visit = (n: ts.Node) => {
    if (ts.isIdentifier(n)) {
      const p = n.parent;
      const isName =
        (ts.isPropertyAccessExpression(p) && p.name === n) ||
        ((ts.isPropertyAssignment(p) || ts.isMethodDeclaration(p) || ts.isPropertySignature(p)) &&
          p.name === n) ||
        (ts.isBindingElement(p) && p.propertyName === n);
      if (!isName) out.add(n.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return out;
}

function importsFor(text: string, helperNames: string[], helpersFile: boolean): string[] {
  const sf = ts.createSourceFile('x.ts', text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const used = identifiersIn(sf);
  const lines: string[] = [];
  const engine = ['defineViz', 'withRandom'].filter((n) => used.has(n));
  if (engine.length) lines.push(`import { ${engine.join(', ')} } from '@/lib/viz/engine';`);
  if (used.has('R')) lines.push("import { R } from '@/lib/viz/nodes';");
  const rnd = ['fromT', 'randBST', 'randTree', 'rarr', 'rint', 'rstr', 'sorted', 'toT'].filter((n) =>
    used.has(n),
  );
  if (rnd.length) lines.push(`import { ${rnd.join(', ')} } from '@/lib/viz/random';`);
  if (used.has('TreeValue')) lines.push("import type { TreeValue } from '@/lib/viz/random';");
  const types = ['PointerMap', 'Rng', 'Stage', 'StateMap', 'TreeNodeItem', 'VizNode', 'VizStep'].filter((n) =>
    used.has(n),
  );
  if (types.length) lines.push(`import type { ${types.join(', ')} } from '@/lib/viz/types';`);
  if (!helpersFile) {
    const helpers = helperNames.filter((n) => used.has(n));
    if (helpers.length) lines.push(`import { ${helpers.join(', ')} } from './_helpers';`);
  }
  return lines;
}

export interface CatalogEntry {
  id: string;
  module: string;
  title: string;
  file: string;
}

/** Comments on the lines before a statement, which `getText` leaves out. */
function leadingComments(text: string, st: ts.Node, sf: ts.SourceFile): string {
  const lead = text.slice(st.pos, st.getStart(sf)).trim();
  return lead ? `${lead}\n` : '';
}

function split(
  w: Whole,
  titles: Map<string, string>,
): { files: Map<string, string>; catalog: CatalogEntry[] } {
  const text = w.rendered.text;
  const sf = ts.createSourceFile(w.vfile, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const block = sf.statements.find((s): s is ts.Block => ts.isBlock(s));
  if (!block) throw new Error(`${w.file}: no block`);
  const helpers = new Map<string, Piece>();
  const defs: { info: DefInfo; lead: string; text: string; uses: Set<string> }[] = [];
  for (const st of block.statements) {
    if (ts.isEmptyStatement(st)) continue;
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        const name = d.name.getText(sf);
        const keyword = st.declarationList.flags & ts.NodeFlags.Let ? 'let' : 'const';
        const lead = d === st.declarationList.declarations[0] ? leadingComments(text, st, sf) : '';
        helpers.set(name, { name, text: `${lead}${keyword} ${d.getText(sf)};`, uses: identifiersIn(d) });
      }
    } else if (ts.isFunctionDeclaration(st) && st.name) {
      const fnText = leadingComments(text, st, sf) + st.getText(sf);
      helpers.set(st.name.text, { name: st.name.text, text: fnText, uses: identifiersIn(st) });
    } else if (ts.isExpressionStatement(st)) {
      const call = st.expression;
      const inner =
        ts.isCallExpression(call) && call.expression.getText(sf) === 'withRandom' ? call.arguments[0] : call;
      if (!inner || !ts.isCallExpression(inner)) throw new Error(`${w.file}: unexpected statement`);
      const id = inner.arguments[0];
      if (!id || !ts.isStringLiteral(id))
        throw new Error(`${w.file}: unexpected call: ${st.getText(sf).slice(0, 200)}`);
      const info = w.defs.find((d) => d.id === id.text) as DefInfo;
      defs.push({
        info,
        lead: leadingComments(text, st, sf),
        text: st.getText(sf).replace(/;\s*$/, ''),
        uses: identifiersIn(st),
      });
    } else throw new Error(`${w.file}: unexpected ${ts.SyntaxKind[st.kind]}`);
  }

  // A helper used by one visualizer alone goes into that visualizer's module.
  const names = [...helpers.keys()];
  const users = (name: string) => defs.filter((d) => d.uses.has(name)).length;
  const shared = new Set(
    names.filter((n) => users(n) > 1 || names.some((h) => h !== n && helpers.get(h)?.uses.has(n))),
  );
  for (let grew = true; grew;) {
    grew = false;
    for (const s of [...shared]) {
      for (const n of names) {
        if (helpers.get(s)?.uses.has(n) && !shared.has(n)) {
          shared.add(n);
          grew = true;
        }
      }
    }
  }

  const files = new Map<string, string>();
  const catalog: CatalogEntry[] = [];
  const source = `legacy/src/viz/${w.file}`;
  const sharedNames = names.filter((n) => shared.has(n));
  if (sharedNames.length) {
    const factoryTypes = [...w.interfaces.entries()]
      .filter(([k]) => !/^(Input|Step)_/.test(k))
      .map(([, v]) => v);
    const body = [
      ...factoryTypes,
      ...sharedNames.map((n) =>
        `export ${(helpers.get(n) as Piece).text}`.replace(/\bV\.define\b/g, 'defineViz'),
      ),
    ].join('\n\n');
    files.set(
      `${w.module}/_helpers.ts`,
      `// Helpers shared by this module's visualizers, from ${source}.\n${importsFor(body, [], true).join('\n')}\n\n${body}\n`,
    );
  }
  for (const d of defs) {
    const local = names.filter((n) => !shared.has(n) && d.uses.has(n));
    for (let grew = true; grew;) {
      grew = false;
      for (const n of names) {
        if (!shared.has(n) && !local.includes(n) && local.some((l) => helpers.get(l)?.uses.has(n))) {
          local.push(n);
          grew = true;
        }
      }
    }
    local.sort((a, b) => names.indexOf(a) - names.indexOf(b));
    const types = d.info.factory
      ? []
      : [
          (w.interfaces.get(inputTypeName(d.info)) as string).replace(inputTypeName(d.info), 'Input'),
          (w.interfaces.get(stepTypeName(d.info)) as string).replace(stepTypeName(d.info), 'Step'),
        ];
    const def = d.text
      .replace(/\bV\.define\b/g, 'defineViz')
      .replace(new RegExp(`\\b${inputTypeName(d.info)}\\b`, 'g'), 'Input')
      .replace(new RegExp(`\\b${stepTypeName(d.info)}\\b`, 'g'), 'Step');
    const body = [
      ...types,
      ...local.map((n) => (helpers.get(n) as Piece).text),
      `${d.lead}export default ${def};`,
    ].join('\n\n');
    files.set(
      `${w.module}/${d.info.id}.ts`,
      `// Ported from ${source} (D-013). \`run\` and \`validate\` are unchanged; \`view\` draws what \`render\` drew.\n${importsFor(body, sharedNames, false).join('\n')}\n\n${body}\n`,
    );
    const title = titles.get(d.info.id) ?? d.info.id;
    catalog.push({ id: d.info.id, module: w.module, title, file: `${w.module}/${d.info.id}` });
  }
  return { files, catalog };
}

function registryText(catalog: CatalogEntry[]): string {
  const sorted = [...catalog].sort(
    (a, b) =>
      MODULES.findIndex((m) => m.slug === a.module) - MODULES.findIndex((m) => m.slug === b.module) ||
      a.id.localeCompare(b.id),
  );
  return [
    '// Generated by scripts/import/port-visualizers.ts. Each visualizer is its own chunk: a page loads only the ones it shows.',
    "import type { AnyViz } from './types';",
    '',
    'export interface VizEntry {',
    '  id: string;',
    '  title: string;',
    '  /** The module whose legacy file defined it. */',
    '  module: string;',
    '}',
    '',
    `export const VIZ_CATALOG: VizEntry[] = ${JSON.stringify(
      sorted.map(({ id, title, module }) => ({ id, title, module })),
      null,
      2,
    )};`,
    '',
    'export const VIZ_LOADERS: Record<string, () => Promise<AnyViz>> = {',
    ...sorted.map(
      (c) => `  ${JSON.stringify(c.id)}: () => import('./defs/${c.file}').then((m) => m.default as AnyViz),`,
    ),
    '};',
    '',
  ].join('\n');
}

export interface PortResult {
  files: Map<string, string>;
  changes: VizChange[];
  remaining: string[];
}

export async function portVisualizers(): Promise<PortResult> {
  const refs = parseRefs();
  const changes: VizChange[] = [];
  const prepared = VIZ_FILES.map((file) => {
    const patched = applyViewPatches(file, legacyVizText(file));
    const rewritten = rewriteVizLiterals(file, patched);
    changes.push(...rewritten.changes);
    return { file, ...structural(file, rewritten.text, refs) };
  });
  const samples = sample(prepared.map(({ file, text }) => ({ file, text })));
  samplesRef.current = samples;
  const wholes = prepared.map(({ file, text, defs }) => wholeFile(file, text, defs, samples));
  const remaining = runCompilerLoop(wholes).map((d) => {
    const w = wholes.find((x) => x.vfile === d.file?.fileName.replace(/\\/g, '/'));
    const pos = d.file?.getLineAndCharacterOfPosition(d.start ?? 0);
    const line = w && pos ? w.rendered.text.split('\n')[pos.line]?.trim().slice(0, 140) : '';
    return `${w?.file}:${(pos?.line ?? 0) + 1} TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, ' ').slice(0, 700)}\n    ${line}`;
  });
  if (process.env.VIZ_DUMP) {
    for (const w of wholes)
      fs.writeFileSync(path.join(process.env.VIZ_DUMP, w.file.replace(/.js$/, '.ts')), w.rendered.text);
  }
  const files = new Map<string, string>();
  const catalog: CatalogEntry[] = [];
  for (const w of wholes) {
    const out = split(w, samples.titles);
    out.files.forEach((v, k) => files.set(`defs/${k}`, v));
    catalog.push(...out.catalog);
  }
  files.set('registry.ts', registryText(catalog));
  return { files, changes, remaining };
}

async function main(): Promise<void> {
  if (fs.existsSync(OUT_DIR) && !process.argv.includes('--force')) {
    console.error('lib/viz/defs already exists. Pass --force to rebuild it from legacy/.');
    process.exit(1);
  }
  const result = await portVisualizers();
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  const vizDir = path.join(ROOT, 'lib/viz');
  for (const [rel, text] of result.files) {
    const file = path.join(vizDir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const config = await prettier.resolveConfig(file);
    try {
      fs.writeFileSync(file, await prettier.format(text, { ...config, parser: 'typescript' }));
    } catch (err) {
      fs.writeFileSync(file, text);
      result.remaining.push(`${rel}: does not parse: ${(err as Error).message.split('\n')[0]}`);
    }
  }
  const eslint = new ESLint({ cwd: ROOT, fix: true, ruleFilter: ({ ruleId }) => ruleId === 'prefer-const' });
  await ESLint.outputFixes(await eslint.lintFiles([path.join(vizDir, 'defs')]));
  fs.mkdirSync(path.dirname(VIZ_CHANGE_LOG), { recursive: true });
  fs.writeFileSync(VIZ_CHANGE_LOG, JSON.stringify(result.changes, null, 1) + '\n');
  writeChangeDocs(
    JSON.parse(fs.readFileSync(CHANGE_LOG, 'utf8')) as Parameters<typeof writeChangeDocs>[0],
    result.changes,
  );
  console.log(`Wrote ${result.files.size} files; ${result.changes.length} text changes.`);
  if (result.remaining.length) {
    console.log(`\n${result.remaining.length} type errors left:`);
    for (const r of result.remaining) console.log(r);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith(path.join('import', 'port-visualizers.ts')))
  void main();
