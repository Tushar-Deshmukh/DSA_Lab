// Ported from legacy/src/viz/w06.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { randTree, rint } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { parseTree, treeCheck, T } from './_helpers';

interface Input {
  tree: (number | null)[];
  mode: string;
}

interface Step extends VizStep {
  q: number[];
  head: number;
  res: (number | number[])[];
  done: Set<number>;
  cur?: number;
  level?: number[];
  finished?: boolean;
  result?: (number | number[])[];
}

export default defineViz<Input, Step>('tree-bfs', {
  title: 'Level-order BFS with a level-size snapshot',
  inputs: [
    {
      key: 'tree',
      label: 'tree (level order)',
      type: 'json',
      def: [3, 9, 20, null, null, 15, 7],
      wide: true,
    },
    {
      key: 'mode',
      label: 'record',
      type: 'select',
      def: 'levels',
      options: [
        { value: 'levels', label: 'every level (102)' },
        { value: 'right', label: 'last node per level (199)' },
      ],
    },
  ],
  presets: [
    { label: 'Level order (102)', input: { tree: [3, 9, 20, null, null, 15, 7], mode: 'levels' } },
    { label: 'Right side view (199)', input: { tree: [1, 2, 3, null, 5, null, 4], mode: 'right' } },
    { label: 'Deeper left side', input: { tree: [1, 2, 3, 4], mode: 'right' } },
  ],
  legend: [
    ['current', 'dequeued now'],
    ['frontier', 'in the queue'],
    ['done', 'processed'],
  ],
  code: `
function levelOrder(root) {
  if (!root) return [];
  const res = [], queue = [root]; let head = 0;
  while (head < queue.length) {
    const levelSize = queue.length - head, level = [];   // snapshot  //@size
    for (let i = 0; i < levelSize; i++) {
      const node = queue[head++];                                    //@deq
      level.push(node.val);
      if (node.left) queue.push(node.left);                          //@kids
      if (node.right) queue.push(node.right);
    }
    res.push(level);            // 199: push level.at(-1) instead   //@record
  }
  return res;
}`,
  validate: ({ tree }) => treeCheck(tree),
  run({ tree: arr, mode }) {
    const { root, nodes } = parseTree(arr);
    const steps: Step[] = [],
      res: (number | number[])[] = [],
      done: Set<number> = new Set();
    if (root == null)
      return [{ q: [], head: 0, res: [], done, line: null, result: [], note: 'Empty tree: return [].' }];
    const q = [root];
    let head = 0;
    while (head < q.length) {
      const size = q.length - head,
        level: number[] = [];
      steps.push({
        q: [...q],
        head,
        res: res.map((r) => (Array.isArray(r) ? [...r] : r)),
        done: new Set(done),
        line: 'size',
        note: `The queue holds ${size} node${size > 1 ? 's' : ''}: exactly one level.`,
        why:
          res.length === 0
            ? 'Reading the size before the inner loop is what separates levels: children pushed during the loop belong to the next level.'
            : null,
      });
      for (let i = 0; i < size; i++) {
        const n = q[head++];
        level.push(nodes[n].val);
        done.add(n);
        const kids = [nodes[n].left, nodes[n].right].filter((x) => x != null);
        kids.forEach((c) => q.push(c));
        steps.push({
          q: [...q],
          head,
          cur: n,
          res: res.map((r) => (Array.isArray(r) ? [...r] : r)),
          level: [...level],
          done: new Set(done),
          line: ['deq', 'kids'],
          note: `Dequeue ${nodes[n].val}${kids.length ? '; enqueue ' + kids.map((c) => nodes[c].val).join(', ') : ''}.`,
        });
      }
      res.push(mode === 'right' ? level.at(-1)! : level);
      steps.push({
        q: [...q],
        head,
        res: res.map((r) => (Array.isArray(r) ? [...r] : r)),
        done: new Set(done),
        line: 'record',
        note:
          mode === 'right'
            ? `Level done: the rightmost node is ${level.at(-1)}.`
            : `Level done: [${level.join(', ')}].`,
      });
    }
    steps.push({
      q,
      head,
      res,
      done,
      line: null,
      finished: true,
      result: res,
      note: `Result: ${JSON.stringify(res)}.`,
      why: 'Each node is enqueued and dequeued once: O(n) time; the queue holds at most one level plus the next: O(width).',
    });
    return steps;
  },
  view(st, stage, { tree: arr }) {
    const { nodes } = parseTree(arr);
    const states: Record<string, string> = {};
    st.done.forEach((i) => (states[i] = 'done'));
    st.q.slice(st.head).forEach((i) => (states[i] = 'frontier'));
    if (st.cur != null) states[st.cur] = 'current';
    stage.append(T(arr, { states }));
    stage.append(R.queue(st.q.slice(st.head).map((i) => nodes[i].val)));
    stage.append(
      R.vars({
        result: JSON.stringify(st.res),
        'current level': st.level ? '[' + st.level.join(', ') + ']' : '·',
      }),
    );
  },
  random: (g) => ({ tree: randTree(g, rint(g, 0, 10)), mode: g() < 0.5 ? 'levels' : 'right' }),
});
