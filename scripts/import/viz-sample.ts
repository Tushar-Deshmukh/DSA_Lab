// Records what every parameter, return value and variable of the legacy visualizer code holds, by running an
// instrumented copy on the inputs the tests use. Keys are positions in the uninstrumented text:
//   P<file>#<fn>:<i>  the i-th argument of the function starting at <fn>
//   R<file>#<fn>      what that function returns
//   V<file>#<name>    a variable, by the position of its name in its declaration
import vm from 'node:vm';
import ts from 'typescript';
import { defineViz, runViz } from '../../lib/viz/engine';
import { R } from '../../lib/viz/nodes';
import * as random from '../../lib/viz/random';
import { testInputs } from '../../lib/viz/test-inputs';
import type { Viz, VizStep } from '../../lib/viz/types';
import { EditedText } from './edited-text';
import { addValue, newShape, type Shape } from './viz-shapes';

export type FunctionNode =
  ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | ts.MethodDeclaration;

export const isFunctionNode = (n: ts.Node): n is FunctionNode =>
  ts.isFunctionDeclaration(n) ||
  ts.isFunctionExpression(n) ||
  ts.isArrowFunction(n) ||
  ts.isMethodDeclaration(n);

const isFunctionValue = (n: ts.Expression) =>
  ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isClassExpression(n);

function enclosingFunction(n: ts.Node): FunctionNode | undefined {
  for (let p = n.parent; p; p = p.parent) if (isFunctionNode(p)) return p;
  return undefined;
}

/** The declaration an assigned identifier refers to, found by walking out through the enclosing scopes. */
export function declarationOf(id: ts.Identifier): ts.VariableDeclaration | 'parameter' | undefined {
  const name = id.text;
  const inList = (list: ts.VariableDeclarationList | undefined) =>
    list?.declarations.find((d) => ts.isIdentifier(d.name) && d.name.text === name);
  for (let p: ts.Node | undefined = id.parent; p; p = p.parent) {
    if (isFunctionNode(p) && p.parameters.some((q) => ts.isIdentifier(q.name) && q.name.text === name))
      return 'parameter';
    if ((ts.isForStatement(p) || ts.isForOfStatement(p) || ts.isForInStatement(p)) && p.initializer) {
      const found = ts.isVariableDeclarationList(p.initializer) ? inList(p.initializer) : undefined;
      if (found) return found;
    }
    if (ts.isBlock(p) || ts.isSourceFile(p) || ts.isCaseClause(p) || ts.isDefaultClause(p)) {
      for (const st of p.statements) {
        if (ts.isVariableStatement(st)) {
          const found = inList(st.declarationList);
          if (found) return found;
        }
      }
    }
  }
  return undefined;
}

/** True when evaluating an expression a second time could behave differently: calls, assignments, ++ and --. */
function hasEffects(e: ts.Node): boolean {
  if (ts.isCallExpression(e) || ts.isNewExpression(e)) return true;
  if (
    (ts.isPrefixUnaryExpression(e) || ts.isPostfixUnaryExpression(e)) &&
    (e.operator === ts.SyntaxKind.PlusPlusToken || e.operator === ts.SyntaxKind.MinusMinusToken)
  )
    return true;
  if (
    ts.isBinaryExpression(e) &&
    e.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
    e.operatorToken.kind <= ts.SyntaxKind.LastAssignment
  )
    return true;
  return ts.forEachChild(e, (c) => (hasEffects(c) ? true : undefined)) ?? false;
}

/** The legacy text with recording calls added. Behaviour is unchanged: every wrapper returns what it was given. */
export function instrument(file: string, text: string): string {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  const ed = new EditedText(text);
  const wrap = (node: ts.Node, fn: string, key: string) => {
    ed.insert(node.getStart(sf), `${fn}(${JSON.stringify(key)},`);
    ed.insert(node.getEnd(), ')');
  };
  const visit = (n: ts.Node) => {
    if (isFunctionNode(n)) {
      const key = `${file}#${n.getStart(sf)}`;
      if (ts.isArrowFunction(n)) wrap(n, '__W', key);
      else if (n.body) ed.insert(n.body.getStart(sf) + 1, `__P(${JSON.stringify(key)},arguments);`);
    }
    if (ts.isReturnStatement(n) && n.expression) {
      const fn = enclosingFunction(n);
      if (fn && !ts.isArrowFunction(fn)) wrap(n.expression, '__R', `${file}#${fn.getStart(sf)}`);
    }
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.initializer &&
      !isFunctionValue(n.initializer)
    ) {
      wrap(n.initializer, '__V', `${file}#${n.name.getStart(sf)}`);
    }
    if (
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(n.left) &&
      !isFunctionValue(n.right)
    ) {
      const decl = declarationOf(n.left);
      if (decl && decl !== 'parameter')
        wrap(n.right, '__V', `${file}#${(decl.name as ts.Identifier).getStart(sf)}`);
    }
    // What goes into a container, which may be empty again by the time it is sampled: x.push(v), x.add(v),
    // x.set(k, v) and x[i] = v.
    const containerKey = (e: ts.Expression) => {
      if (!ts.isIdentifier(e)) return undefined;
      const decl = declarationOf(e);
      return decl && decl !== 'parameter'
        ? `${file}#${(decl.name as ts.Identifier).getStart(sf)}`
        : undefined;
    };
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      const method = n.expression.name.text;
      const key = containerKey(n.expression.expression);
      if (key && (method === 'push' || method === 'unshift' || method === 'add')) {
        for (const arg of n.arguments)
          if (!ts.isSpreadElement(arg)) wrap(arg, method === 'add' ? '__S' : '__A', key);
      }
      if (key && method === 'set' && n.arguments.length === 2) {
        wrap(n.arguments[0] as ts.Expression, '__MK', key);
        wrap(n.arguments[1] as ts.Expression, '__MV', key);
      }
    }
    if (
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isElementAccessExpression(n.left) &&
      !isFunctionValue(n.right)
    ) {
      const key = containerKey(n.left.expression);
      // The index is evaluated once more, so only when that cannot change anything.
      if (key && !hasEffects(n.left.argumentExpression)) {
        ed.insert(n.right.getStart(sf), `__I(${JSON.stringify(key)},${n.left.expression.getText(sf)},`);
        ed.insert(n.right.getEnd(), ')');
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return ed.render().text;
}

export interface Recorder {
  shapes: Map<string, Shape>;
  globals: Record<string, unknown>;
  /** Samples the objects recorded since the last flush in their final state, after a run or a view has finished. */
  flush: () => void;
}

/** A cheap description of a value's kind, one level deep. */
function kindOf(v: unknown, deep = true): string {
  if (v === null) return 'null';
  if (typeof v !== 'object') return typeof v;
  const tag = Object.prototype.toString.call(v).slice(8, -1);
  if (tag === 'Array') {
    const a = v as unknown[];
    return deep ? `[${a.length ? `${kindOf(a[0], false)},${kindOf(a[a.length - 1], false)}` : ''}]` : 'array';
  }
  if (tag !== 'Object') return tag;
  return deep ? `{${Object.keys(v).slice(0, 12).join(',')}}` : 'object';
}

/** Recording at most a few thousand values per key, and then one in a hundred, keeps a full run fast. */
export function createRecorder(): Recorder {
  const shapes = new Map<string, Shape>();
  const counts = new Map<string, number>();
  let pending: [string, unknown][] = [];
  const shapeOf = (key: string) => {
    let s = shapes.get(key);
    if (!s) shapes.set(key, (s = newShape()));
    return s;
  };
  const kinds = new Map<string, Set<string>>();
  /** After the first few thousand values at a spot, only every hundred-and-first, or one of a kind not seen yet. */
  const keep = (key: string, v: unknown): boolean => {
    const c = (counts.get(key) ?? 0) + 1;
    counts.set(key, c);
    const seen = kinds.get(key) ?? new Set<string>();
    kinds.set(key, seen);
    const kind = kindOf(v);
    const fresh = !seen.has(kind);
    seen.add(kind);
    return c <= 3000 || c % 101 === 0 || fresh;
  };
  const rec = (key: string, v: unknown): boolean => {
    if (!keep(key, v)) return false;
    addValue(shapeOf(key), v);
    if (v !== null && typeof v === 'object') pending.push([key, v]);
    return true;
  };
  const __P = (key: string, args: ArrayLike<unknown>) => {
    for (let i = 0; i < args.length; i++) rec(`P${key}:${i}`, args[i]);
  };
  const __R = (key: string, v: unknown) => {
    rec(`R${key}`, v);
    return v;
  };
  const __V = (key: string, v: unknown) => {
    rec(`V${key}`, v);
    return v;
  };
  const __W = (key: string, fn: (...args: unknown[]) => unknown) =>
    function (this: unknown, ...args: unknown[]) {
      __P(key, args);
      return __R(key, fn.apply(this, args));
    };
  const flush = () => {
    for (const [key, v] of pending) addValue(shapeOf(key), v);
    pending = [];
  };
  // Elements, set members, map entries and indexed values, recorded as they go in.
  const element = (key: string, v: unknown, kind: 'array' | 'set' | 'mapKey' | 'mapValue') => {
    if (!keep(`E${key}`, v)) return v;
    const s = shapeOf(`V${key}`);
    if (kind === 'array') {
      s.arrayCount ||= 1;
      s.longArrays = true;
      addValue((s.array ??= newShape()), v);
    } else if (kind === 'set') addValue((s.set ??= newShape()), v);
    else {
      s.map ??= { key: newShape(), value: newShape() };
      addValue(kind === 'mapKey' ? s.map.key : s.map.value, v);
    }
    return v;
  };
  const __A = (key: string, v: unknown) => element(key, v, 'array');
  const __S = (key: string, v: unknown) => element(key, v, 'set');
  const __MK = (key: string, v: unknown) => element(key, v, 'mapKey');
  const __MV = (key: string, v: unknown) => element(key, v, 'mapValue');
  const __I = (key: string, container: unknown, v: unknown) => {
    if (Array.isArray(container)) return element(key, v, 'array');
    const s = shapeOf(`V${key}`);
    s.objCount ||= 1;
    s.obj ??= new Map();
    const entry = s.obj.get('\u0000') ?? { shape: newShape(), count: 0 };
    entry.count++;
    addValue(entry.shape, v);
    s.obj.set('\u0000', entry);
    return v;
  };
  return { shapes, globals: { __P, __R, __V, __W, __A, __S, __MK, __MV, __I }, flush };
}

export interface LoadedViz {
  defs: Record<string, Viz<unknown, VizStep>>;
}

/**
 * Loads prepared legacy visualizer files in a sandbox. `R` is the port's own drawing vocabulary, which takes and
 * returns plain data, and `V.define` is the port's `defineViz`, so the sandboxed code builds the same definitions
 * the generated modules will.
 */
export function loadInSandbox(
  files: { file: string; code: string }[],
  globals: Record<string, unknown> = {},
): LoadedViz {
  const defs: LoadedViz['defs'] = {};
  const ctx: Record<string, unknown> = {
    ...globals,
    ...random,
    R,
    Core: {
      el: () => {
        throw new Error('a view built DOM directly');
      },
    },
    Viz: {
      define: (id: string, def: Parameters<typeof defineViz>[1]) =>
        (defs[id] = defineViz(id, def) as Viz<unknown, VizStep>),
    },
    withRandom: (def: Viz<unknown, VizStep>, gen: Viz<unknown, VizStep>['random']) => {
      def.random = gen;
      return def;
    },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const { file, code } of files) vm.runInContext(code, ctx, { filename: file });
  return { defs };
}

export interface Samples {
  titles: Map<string, string>;
  values: Map<string, Shape>;
  inputs: Map<string, Shape>;
  steps: Map<string, Shape>;
}

/** Runs every visualizer on every test input, and every view on every step, recording as it goes. */
export function sample(files: { file: string; text: string }[]): Samples {
  const recorder = createRecorder();
  const { defs } = loadInSandbox(
    files.map(({ file, text }) => ({ file, code: instrument(file, text) })),
    recorder.globals,
  );
  const titles = new Map<string, string>();
  const inputs = new Map<string, Shape>();
  const steps = new Map<string, Shape>();
  const stage = { append: () => undefined };
  for (const [id, viz] of Object.entries(defs)) {
    titles.set(id, viz.title);
    const inputShape = newShape();
    const stepShape = newShape();
    for (const { input } of testInputs(viz)) {
      addValue(inputShape, input);
      const copy = JSON.parse(JSON.stringify(input)) as unknown;
      let run: VizStep[];
      try {
        run = runViz(viz, copy) as VizStep[];
      } catch {
        recorder.flush();
        continue;
      }
      recorder.flush();
      for (const s of run) {
        addValue(stepShape, s);
        try {
          viz.view(s, stage, copy);
        } catch {
          // A view that throws is reported by the parity test, which compares it with the legacy view.
        }
        recorder.flush();
      }
    }
    inputs.set(id, inputShape);
    steps.set(id, stepShape);
  }
  return { titles, values: recorder.shapes, inputs, steps };
}
