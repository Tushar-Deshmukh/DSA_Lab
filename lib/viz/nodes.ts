// The drawing vocabulary visualizers use. Each function has the signature of its legacy renderer in
// legacy/src/viz/render.js, but returns plain data instead of DOM nodes, so a view can be checked without a browser.
import type {
  BarsNode,
  BitsNode,
  CaptionNode,
  CellsNode,
  ChipRowsNode,
  FramesNode,
  GraphData,
  GraphNode,
  GridNode,
  IntervalsNode,
  KvNode,
  ListNode,
  LogBarsNode,
  QueueNode,
  RowNode,
  StackNode,
  TableNode,
  TreeNode,
  TreeNodeItem,
  VizNode,
} from './types';

type Options<T extends { kind: string }, Omitted extends string = never> = Omit<T, 'kind' | Omitted>;
type Falsy = null | undefined | false;
const present = (nodes: (VizNode | Falsy)[]): VizNode[] => nodes.filter((n): n is VizNode => Boolean(n));

/** How a value is shown in a cell. */
export function fmt(v: unknown): string {
  if (v === Infinity) return '∞';
  if (v === -Infinity) return '−∞';
  if (v === null || v === undefined) return '·';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v as string | number | boolean | bigint);
}

export interface BinTreeLayoutNode {
  idx: number;
  val: unknown;
  parent: number | null;
  side: 'L' | 'R' | null;
}

/** Binary tree nodes from a LeetCode level-order array. */
export function binTreeNodes(arr: readonly unknown[]): BinTreeLayoutNode[] {
  const nodes: BinTreeLayoutNode[] = [];
  if (!arr.length || arr[0] == null) return nodes;
  nodes.push({ idx: 0, val: arr[0], parent: null, side: null });
  const q = [0];
  let i = 1;
  let h = 0;
  while (i < arr.length && h < q.length) {
    const p = q[h++] as number;
    for (const side of ['L', 'R'] as const) {
      if (i >= arr.length) break;
      if (arr[i] != null) {
        nodes.push({ idx: i, val: arr[i], parent: p, side });
        q.push(i);
      }
      i++;
    }
  }
  return nodes;
}

export interface BinTreeOptions {
  states?: Record<string | number, string | null | undefined | false>;
  subs?: Record<string | number, unknown>;
  edges?: Record<string | number, string | null | undefined>;
  dx?: number;
  dy?: number;
  r?: number;
  label?: string;
}

/** Nodes for the tree primitive. Invisible placeholder leaves keep left and right children on their own side. */
function binTreeItems(arr: readonly unknown[], o: BinTreeOptions): TreeNodeItem[] {
  const ns = binTreeNodes(arr);
  const out: TreeNodeItem[] = [];
  let ghost = -1;
  const kids = new Map<number, { L: number | null; R: number | null }>();
  ns.forEach((n) => kids.set(n.idx, { L: null, R: null }));
  ns.forEach((n) => {
    if (n.parent != null && n.side)
      (kids.get(n.parent) as { L: number | null; R: number | null })[n.side] = n.idx;
  });
  const add = (idx: number, parent: number | null) => {
    const n = ns.find((x) => x.idx === idx) as BinTreeLayoutNode;
    const state = o.states?.[idx];
    out.push({
      id: idx,
      label: n.val,
      parent,
      state: state || undefined,
      sub: o.subs?.[idx],
      edge: o.edges?.[idx],
    });
    const k = kids.get(idx) as { L: number | null; R: number | null };
    if (!k.L && !k.R) return;
    if (k.L != null) add(k.L, idx);
    else out.push({ id: ghost--, label: '', parent: idx, ghost: true });
    if (k.R != null) add(k.R, idx);
    else out.push({ id: ghost--, label: '', parent: idx, ghost: true });
  };
  if (ns.length) add(0, null);
  return out;
}

export const R = {
  fmt,
  binTreeNodes,

  cells: (values: readonly unknown[], o: Options<CellsNode, 'values'> = {}): CellsNode => ({
    kind: 'cells',
    values: [...values],
    ...o,
  }),
  vars: (values: Record<string, unknown>, changed: string[] = []): VizNode => ({
    kind: 'vars',
    values,
    changed,
  }),
  kv: (entries: readonly (readonly unknown[])[], o: Options<KvNode, 'entries'> = {}): KvNode => ({
    kind: 'kv',
    entries,
    ...o,
  }),
  stack: (items: readonly unknown[], o: Options<StackNode, 'items'> = {}): StackNode => ({
    kind: 'stack',
    items: [...items],
    ...o,
  }),
  queue: (items: readonly unknown[], o: Options<QueueNode, 'items'> = {}): QueueNode => ({
    kind: 'queue',
    items: [...items],
    ...o,
  }),
  frames: (frames: FramesNode['frames'], o: Options<FramesNode, 'frames'> = {}): FramesNode => ({
    kind: 'frames',
    frames,
    ...o,
  }),
  tree: (nodes: TreeNodeItem[], o: Options<TreeNode, 'nodes'> = {}): TreeNode => ({
    kind: 'tree',
    nodes,
    ...o,
  }),
  binTree: (arr: readonly unknown[], o: BinTreeOptions = {}): TreeNode => ({
    kind: 'tree',
    nodes: binTreeItems(arr, o),
    dx: o.dx,
    dy: o.dy,
    r: o.r,
    label: o.label,
  }),
  graph: (graph: GraphData, o: Options<GraphNode, 'graph'> = {}): GraphNode => ({
    kind: 'graph',
    graph,
    ...o,
  }),
  grid: (
    rows: readonly (readonly unknown[])[],
    o: Options<GridNode, 'rows'> & { show?: (v: unknown, r: number, c: number) => unknown } = {},
  ): GridNode => {
    const { show, ...rest } = o;
    return {
      kind: 'grid',
      rows: rows.map((row, r) => row.map((v, c) => (show ? show(v, r, c) : v))),
      ...rest,
    };
  },
  table: (rows: readonly (readonly unknown[])[], o: Options<TableNode, 'rows'> = {}): TableNode => ({
    kind: 'table',
    rows: rows.map((row) => [...row]),
    ...o,
  }),
  /** One table row: `states` is keyed by column, and the column heads default to the indexes. */
  row1d: (
    values: readonly unknown[],
    o: {
      colHead?: unknown[];
      rowLabel?: string;
      states?: Record<string | number, string | null | undefined>;
      label?: string;
    } = {},
  ): TableNode => ({
    kind: 'table',
    rows: [[...values]],
    colHead: o.colHead ?? values.map((_, i) => i),
    rowHead: [o.rowLabel ?? 'dp'],
    states: Object.fromEntries(Object.entries(o.states ?? {}).map(([j, s]) => [`0,${j}`, s])),
    label: o.label,
  }),
  list: (nodes: ListNode['nodes'], o: Options<ListNode, 'nodes'>): ListNode => ({
    kind: 'list',
    nodes,
    ...o,
  }),
  /** The heap array, and the same heap drawn as a tree. */
  heap: (arr: readonly unknown[], o: { states?: CellsNode['states']; label?: string } = {}): VizNode => {
    const array: CellsNode = {
      kind: 'cells',
      values: [...arr],
      states: o.states,
      label: o.label ?? 'heap array',
    };
    if (!arr.length) return { kind: 'row', direction: 'column', align: 'start', children: [array] };
    const subs = Object.fromEntries(arr.map((_, i) => [i, `i=${i}`]));
    return {
      kind: 'row',
      direction: 'column',
      align: 'start',
      children: [
        array,
        {
          kind: 'tree',
          nodes: binTreeItems(arr, { states: o.states, subs }),
          label: 'same heap drawn as a tree',
        },
      ],
    };
  },
  intervals: (
    list: readonly (readonly number[])[],
    o: Options<IntervalsNode, 'list'> = {},
  ): IntervalsNode => ({
    kind: 'intervals',
    list: list.map((iv) => [...iv]),
    ...o,
  }),
  bits: (value: number, o: Options<BitsNode, 'value'> = {}): BitsNode => ({ kind: 'bits', value, ...o }),
  bars: (values: readonly number[], o: Options<BarsNode, 'values'> = {}): BarsNode => ({
    kind: 'bars',
    values: [...values],
    ...o,
  }),

  // ---- what the legacy views built by hand
  panel: (label: string, ...children: (VizNode | Falsy)[]): VizNode => ({
    kind: 'panel',
    label,
    children: present(children),
  }),
  row: (o: Pick<RowNode, 'align' | 'gap'>, ...children: (VizNode | Falsy)[]): VizNode => ({
    kind: 'row',
    ...o,
    children: present(children),
  }),
  caption: (text: string, o: Pick<CaptionNode, 'tone' | 'mono'> = {}): VizNode => ({
    kind: 'caption',
    text,
    ...o,
  }),
  marks: (count: number, current?: number): VizNode => ({ kind: 'marks', count, current }),
  chipRows: (rows: ChipRowsNode['rows']): VizNode => ({ kind: 'chiprows', rows }),
  logBars: (rows: LogBarsNode['rows'], ariaLabel: string): VizNode => ({ kind: 'logbars', rows, ariaLabel }),
  problem: (text: string): VizNode => ({ kind: 'problem', text }),
  codeLines: (lines: string[]): VizNode => ({ kind: 'codelines', lines }),
};
