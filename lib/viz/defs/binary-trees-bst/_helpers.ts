// Helpers shared by this module's visualizers, from legacy/src/viz/w06.js.
import { R } from '@/lib/viz/nodes';

export // Level-order array (LeetCode format) -> { root, nodes: {idx: {val, left, right}} } keyed by array index.
function parseTree(arr: (number | null)[]) {
  const nodes: Record<string, { val: number; left: number | null; right: number | null }> = {};
  if (!arr.length || arr[0] == null) return { root: null, nodes };
  nodes[0] = { val: arr[0], left: null, right: null };
  const q = [0];
  let i = 1,
    h = 0;
  while (i < arr.length && h < q.length) {
    const p = q[h++];
    if (i < arr.length && arr[i] != null) {
      nodes[i] = { val: arr[i]!, left: null, right: null };
      nodes[p].left = i;
      q.push(i);
    }
    i++;
    if (i < arr.length && arr[i] != null) {
      nodes[i] = { val: arr[i]!, left: null, right: null };
      nodes[p].right = i;
      q.push(i);
    }
    i++;
  }
  return { root: 0, nodes };
}

export const treeCheck = (arr: (number | null)[]) =>
  !Array.isArray(arr)
    ? 'Enter a level-order array such as [3,9,20,null,null,15,7].'
    : arr.length > 15
      ? 'Keep the array to 15 entries.'
      : arr.length && arr[0] == null
        ? 'The root cannot be null (use [] for an empty tree).'
        : arr.some((x) => x !== null && typeof x !== 'number')
          ? 'Use numbers and null only.'
          : null;

export const T = (
  arr: (number | null)[],
  o: { states: Record<string, string>; subs?: Record<string, string>; dy?: number; dx?: number },
) => R.binTree(arr, Object.assign({ dx: 50, dy: 56, r: 17 }, o));
