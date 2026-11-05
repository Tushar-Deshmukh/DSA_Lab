// Types from sampled values: what the legacy visualizer code really passes around, recorded while it runs on the test
// inputs, and written out as TypeScript. Values from the vm sandbox fail `instanceof`, so kinds are read from their tag.

type Prim = 'number' | 'string' | 'boolean' | 'null' | 'undefined' | 'function' | 'unknown';

export interface Shape {
  prims: Set<Prim>;
  /** Element shape across every array seen here. */
  array?: Shape;
  /** Per-slot shapes for arrays of length 2 to 4, by length; used to spot tuples. */
  tuples?: Map<number, Shape[]>;
  longArrays: boolean;
  /** First element and the rest, for lists like ['push', 3] whose first item says what the rest are. */
  head?: Shape;
  tail?: Shape;
  minLength?: number;
  set?: Shape;
  map?: { key: Shape; value: Shape };
  obj?: Map<string, { shape: Shape; count: number }>;
  objCount: number;
  arrayCount: number;
}

export const newShape = (): Shape => ({ prims: new Set(), longArrays: false, objCount: 0, arrayCount: 0 });

const tagOf = (v: object) => Object.prototype.toString.call(v).slice(8, -1);
const MAX_ITEMS = 200;
const MAX_DEPTH = 9;

export function addValue(shape: Shape, v: unknown, depth = 0, seen: Set<object> = new Set()): void {
  if (v === null) shape.prims.add('null');
  else if (v === undefined) shape.prims.add('undefined');
  else if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean')
    shape.prims.add(typeof v as Prim);
  else if (typeof v === 'function') shape.prims.add('function');
  else if (typeof v !== 'object' || depth > MAX_DEPTH || seen.has(v)) shape.prims.add('unknown');
  else {
    seen.add(v);
    const tag = tagOf(v);
    if (tag === 'Array') {
      const a = v as unknown[];
      shape.arrayCount++;
      shape.array ??= newShape();
      const items = a.length > MAX_ITEMS ? [...a.slice(0, MAX_ITEMS / 2), ...a.slice(-MAX_ITEMS / 2)] : a;
      for (const x of items) addValue(shape.array, x, depth + 1, seen);
      shape.minLength = Math.min(shape.minLength ?? Infinity, a.length);
      if (a.length) {
        addValue((shape.head ??= newShape()), a[0], depth + 1, seen);
        for (const x of items.slice(1)) addValue((shape.tail ??= newShape()), x, depth + 1, seen);
      }
      if (a.length >= 2 && a.length <= 4) {
        shape.tuples ??= new Map();
        // By index, not with map or forEach, which skip the holes in arrays made with `new Array(n)`.
        const slots = shape.tuples.get(a.length) ?? Array.from({ length: a.length }, () => newShape());
        for (let i = 0; i < a.length; i++) addValue(slots[i] as Shape, a[i], depth + 1, seen);
        shape.tuples.set(a.length, slots);
      } else shape.longArrays = true;
    } else if (tag === 'Set') {
      shape.set ??= newShape();
      let n = 0;
      for (const x of v as Set<unknown>) if (n++ < MAX_ITEMS) addValue(shape.set, x, depth + 1, seen);
    } else if (tag === 'Map') {
      shape.map ??= { key: newShape(), value: newShape() };
      let n = 0;
      for (const [k, x] of v as Map<unknown, unknown>) {
        if (n++ >= MAX_ITEMS) break;
        addValue(shape.map.key, k, depth + 1, seen);
        addValue(shape.map.value, x, depth + 1, seen);
      }
    } else {
      shape.objCount++;
      shape.obj ??= new Map();
      let n = 0;
      for (const [k, x] of Object.entries(v)) {
        if (n++ >= MAX_ITEMS * 2) break;
        const entry = shape.obj.get(k) ?? { shape: newShape(), count: 0 };
        entry.count++;
        addValue(entry.shape, x, depth + 1, seen);
        shape.obj.set(k, entry);
      }
    }
    seen.delete(v);
  }
}

export function mergeShapes(shapes: Shape[]): Shape {
  const out = newShape();
  for (const s of shapes) {
    s.prims.forEach((p) => out.prims.add(p));
    if (s.array) out.array = mergeShapes(out.array ? [out.array, s.array] : [s.array]);
    if (s.head) out.head = mergeShapes(out.head ? [out.head, s.head] : [s.head]);
    if (s.tail) out.tail = mergeShapes(out.tail ? [out.tail, s.tail] : [s.tail]);
    if (s.minLength !== undefined) out.minLength = Math.min(out.minLength ?? Infinity, s.minLength);
    if (s.set) out.set = mergeShapes(out.set ? [out.set, s.set] : [s.set]);
    if (s.map) {
      out.map = {
        key: mergeShapes(out.map ? [out.map.key, s.map.key] : [s.map.key]),
        value: mergeShapes(out.map ? [out.map.value, s.map.value] : [s.map.value]),
      };
    }
    if (s.tuples) {
      out.tuples ??= new Map();
      for (const [len, slots] of s.tuples) {
        const cur = out.tuples.get(len);
        out.tuples.set(len, cur ? cur.map((c, i) => mergeShapes([c, slots[i] as Shape])) : slots);
      }
    }
    if (s.obj) {
      out.obj ??= new Map();
      for (const [k, e] of s.obj) {
        const cur = out.obj.get(k);
        out.obj.set(
          k,
          cur ? { shape: mergeShapes([cur.shape, e.shape]), count: cur.count + e.count } : { ...e },
        );
      }
    }
    out.longArrays ||= s.longArrays;
    out.objCount += s.objCount;
    out.arrayCount += s.arrayCount;
  }
  return out;
}

export interface RenderOptions {
  /** The value was built from `{}` by assignment, so it is a map from whatever keys were used. */
  record?: boolean;
  /** Leave `undefined` out: optional fields and parameters say it already. */
  dropUndefined?: boolean;
}

const IDENT = /^[A-Za-z_$][\w$]*$/;
const STEP_FIELDS: Record<string, string> = { line: "VizStep['line']", note: 'string', why: 'string | null' };

function isMapLike(shape: Shape): boolean {
  const keys = [...(shape.obj?.keys() ?? [])];
  if (!keys.length) return true;
  if (keys.some((k) => !IDENT.test(k))) return true;
  // Counts per letter: { a: 2, e: 1 }.
  if (keys.every((k) => k.length === 1)) return true;
  const entries = [...(shape.obj?.values() ?? [])];
  return keys.length > 16 && entries.reduce((n, e) => n + e.count, 0) / keys.length < shape.objCount / 2;
}

/** Every value seen here was undefined: a field that never held anything. */
export const onlyUndefined = (s: Shape): boolean =>
  s.prims.size > 0 &&
  [...s.prims].every((p) => p === 'undefined') &&
  !s.objCount &&
  !s.arrayCount &&
  !s.set &&
  !s.map;

const needsParens = (t: string) => /[|&]|=>/.test(t) && !/^[[{(]/.test(t);

/** TypeScript for a sampled shape, or null when the samples cannot say: a function, or nothing seen. */
export function renderShape(shape: Shape, opts: RenderOptions = {}): string | null {
  if (shape.prims.has('function')) return null;
  const parts: string[] = [];
  for (const p of ['number', 'string', 'boolean'] as const) if (shape.prims.has(p)) parts.push(p);
  if (shape.prims.has('unknown')) parts.push('unknown');
  if (shape.arrayCount && shape.array) {
    const lengths = [...(shape.tuples?.keys() ?? [])];
    const slots =
      !shape.longArrays && lengths.length === 1 ? shape.tuples?.get(lengths[0] as number) : undefined;
    const rendered = slots?.map((s) => renderShape(s, { dropUndefined: false }));
    const head = shape.head && renderShape(shape.head, { dropUndefined: false });
    const tail = shape.tail && renderShape(shape.tail, { dropUndefined: false });
    const plain = slots?.every((s) => !s.objCount && !s.set && !s.map);
    if (plain && rendered && rendered.every((r) => r !== null) && new Set(rendered).size > 1)
      parts.push(`[${rendered.join(', ')}]`);
    // An operation list such as ['push', 3] or ['union', 1, 2]: a name, then numbers.
    else if (
      (shape.minLength ?? 0) >= 1 &&
      head === 'string' &&
      tail &&
      /^(number|boolean|null)( | (number|boolean|null))*$/.test(tail)
    ) {
      parts.push(`[${head}, ...${needsParens(tail) ? `(${tail})` : tail}[]]`);
    } else {
      const inner = renderShape(shape.array);
      if (inner === null && shape.array.prims.has('function')) return null;
      const el = inner ?? 'unknown';
      parts.push(needsParens(el) ? `(${el})[]` : `${el}[]`);
    }
  }
  if (shape.set) parts.push(`Set<${renderShape(shape.set) ?? 'unknown'}>`);
  if (shape.map)
    parts.push(
      `Map<${renderShape(shape.map.key) ?? 'unknown'}, ${renderShape(shape.map.value) ?? 'unknown'}>`,
    );
  if (shape.objCount && shape.obj) {
    const keys = [...shape.obj.keys()];
    const nested = (k: string) => (shape.obj?.get(k)?.shape.objCount ?? 0) > 0;
    if (
      !opts.record &&
      keys.every((k) => k === 'val' || k === 'left' || k === 'right') &&
      (nested('left') || nested('right'))
    ) {
      // A binary-tree node: the shape is recursive, so it has a name.
      parts.push('TreeValue');
    } else if (opts.record || isMapLike(shape)) {
      const value = mergeShapes([...shape.obj.values()].map((e) => e.shape));
      const v = renderShape(value);
      if (v === null && value.prims.has('function')) return null;
      parts.push(`Record<string, ${v ?? 'unknown'}>`);
    } else {
      const fields: string[] = [];
      for (const [k, e] of shape.obj) {
        if (onlyUndefined(e.shape)) continue;
        const optional = e.count < shape.objCount || e.shape.prims.has('undefined');
        const t = renderShape(e.shape, { dropUndefined: true });
        if (t === null && e.shape.prims.has('function')) return null;
        // An object with these may be a step: its line is a tag in `run` and a number once resolved, and a step
        // passed on to a helper need not have them.
        const stepLike = STEP_FIELDS[k];
        const fallback = e.shape.prims.has('undefined') ? 'undefined' : 'unknown';
        fields.push(
          `${IDENT.test(k) ? k : JSON.stringify(k)}${optional || stepLike ? '?' : ''}: ${stepLike ?? t ?? fallback}`,
        );
      }
      parts.push(`{ ${fields.join('; ')} }`);
    }
  } else if (shape.objCount) parts.push('Record<string, unknown>');
  if (shape.prims.has('null')) parts.push('null');
  if (shape.prims.has('undefined') && !opts.dropUndefined) parts.push('undefined');
  if (!parts.length) return null;
  return parts.join(' | ');
}
