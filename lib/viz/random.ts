// Random-input helpers, from legacy/tests/refs.mjs. The sequence of values is part of the test baseline: the same seed
// must produce the same inputs as the legacy suite.
import type { Rng } from './types';

export const rint = (rng: Rng, lo: number, hi: number): number => lo + Math.floor(rng() * (hi - lo + 1));

export const rarr = (rng: Rng, n: number, lo: number, hi: number): number[] =>
  Array.from({ length: n }, () => rint(rng, lo, hi));

export const sorted = (a: readonly number[]): number[] => [...a].sort((x, y) => x - y);

export const rstr = (rng: Rng, n: number, alpha: string): string =>
  Array.from({ length: n }, () => alpha[rint(rng, 0, alpha.length - 1)]).join('');

export interface TreeValue {
  val: number;
  left: TreeValue | null;
  right: TreeValue | null;
}

/** A tree from LeetCode level-order form. */
export function toT(arr: readonly (number | null)[]): TreeValue | null {
  if (!arr.length || arr[0] == null) return null;
  const root: TreeValue = { val: arr[0], left: null, right: null };
  const q = [root];
  let i = 1,
    h = 0;
  while (i < arr.length && h < q.length) {
    const n = q[h++] as TreeValue;
    const a = arr[i];
    if (a != null) {
      n.left = { val: a, left: null, right: null };
      q.push(n.left);
    }
    i++;
    const b = arr[i];
    if (i < arr.length && b != null) {
      n.right = { val: b, left: null, right: null };
      q.push(n.right);
    }
    i++;
  }
  return root;
}

/** LeetCode level-order form of a tree, without trailing nulls. */
export function fromT(root: TreeValue | null): (number | null)[] {
  const o: (number | null)[] = [];
  const q = [root];
  let h = 0;
  while (h < q.length) {
    const n = q[h++];
    if (!n) {
      o.push(null);
      continue;
    }
    o.push(n.val);
    q.push(n.left, n.right);
  }
  while (o.length && o[o.length - 1] === null) o.pop();
  return o;
}

export function randTree(g: Rng, n: number, distinct?: boolean): (number | null)[] {
  if (!n) return [];
  let next = 1;
  const val = () => (distinct ? next++ : rint(g, 0, 9));
  const root: TreeValue = { val: val(), left: null, right: null };
  const all = [root];
  while (all.length < n) {
    const p = all[rint(g, 0, all.length - 1)] as TreeValue;
    const side = g() < 0.5 ? 'left' : 'right';
    if (p[side]) continue;
    const node: TreeValue = { val: val(), left: null, right: null };
    p[side] = node;
    all.push(node);
  }
  const out = fromT(root);
  return out.length > 15 ? randTree(g, Math.max(1, n - 2), distinct) : out;
}

export function randBST(g: Rng, n: number): (number | null)[] {
  const vals = [...new Set(Array.from({ length: n }, () => rint(g, 0, 30)))];
  let root: TreeValue | null = null;
  const ins = (t: TreeValue | null, v: number): TreeValue => {
    if (!t) return { val: v, left: null, right: null };
    if (v < t.val) t.left = ins(t.left, v);
    else t.right = ins(t.right, v);
    return t;
  };
  for (const v of vals) root = ins(root, v);
  const out = fromT(root);
  return out.length > 15 ? randBST(g, Math.max(1, n - 2)) : out;
}
