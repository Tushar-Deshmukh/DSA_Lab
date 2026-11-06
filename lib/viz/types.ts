// The shape of a visualizer (D-013). `run()` computes every step up front; `view()` turns one step into plain data
// that the shared primitives draw. Neither touches the DOM, so all of this can be tested in Node.

/** The semantic states from the legacy legend, plus the three the DP tables, grids and intervals use. */
export type VizState =
  'current' | 'compare' | 'done' | 'frontier' | 'error' | 'dim' | 'window' | 'wall' | 'dep' | 'best' | 'out';

/** Index, id or `"row,col"` to state. Falsy means no state. */
export type StateMap = Record<string | number, string | null | undefined | false>;
export type PointerMap = Record<string | number, string | string[] | undefined>;

export type InputType = 'array' | 'numbers' | 'number' | 'int' | 'string' | 'json' | 'select';

export interface InputField {
  key: string;
  label: string;
  type: InputType;
  def: unknown;
  options?: (string | { value: string | number; label: string })[];
  wide?: boolean;
}

export interface Preset {
  label: string;
  input: Record<string, unknown>;
}

export type LineRef = string | number;

/** What every step has. A visualizer's own steps add the state its view draws. */
export interface VizStep {
  line?: LineRef | LineRef[] | null;
  note?: string;
  why?: string | null;
  result?: unknown;
}

export interface Stage {
  append: (...nodes: (VizNode | null | undefined | false)[]) => void;
}

/** A pseudo-random source in [0, 1), so random inputs can be reproduced from a seed. */
export type Rng = () => number;

// The callbacks are declared as methods, so that a list of visualizers with different inputs can share one type.
export interface VizDefinition<I, S extends VizStep> {
  title: string;
  inputs?: InputField[];
  presets?: { label: string; input: Partial<I> }[];
  legend?: [string, string][];
  /** Lines may end in `//@tag`; steps then name the tag instead of a line number. */
  code: string;
  validate?(input: I): string | null | undefined | false;
  run(input: I): S[];
  view(step: S, stage: Stage, input: I): void;
  /** Produces a valid random input. Three visualizers have no meaningful one. */
  random?(rng: Rng): I;
}

/** A definition with its code cleaned of tags and the tag-to-line table worked out. */
export interface Viz<I = unknown, S extends VizStep = VizStep> extends VizDefinition<I, S> {
  id: string;
  lines: Record<string, number>;
}

/** Any visualizer, whatever its input and steps. */
export type AnyViz = Viz<unknown, VizStep>;

// ---- what `view()` returns: plain data, one entry per primitive

export interface CellsNode {
  kind: 'cells';
  values: unknown[];
  states?: StateMap;
  ptrs?: PointerMap;
  /** Legacy views pass bounds that may be missing; a window with a missing bound shades nothing. */
  window?: readonly (number | null | undefined)[] | null;
  dimOutside?: readonly (number | null | undefined)[];
  noIndex?: boolean;
  indexBase?: number;
  label?: string;
}
export interface VarsNode {
  kind: 'vars';
  values: Record<string, unknown>;
  changed?: string[];
}
export interface KvNode {
  kind: 'kv';
  entries: readonly (readonly unknown[])[];
  states?: StateMap;
  empty?: string;
  label?: string;
}
export interface StackNode {
  kind: 'stack';
  items: unknown[];
  states?: StateMap;
  label?: string;
}
export interface QueueNode {
  kind: 'queue';
  items: unknown[];
  states?: StateMap;
  label?: string;
}
export interface FramesNode {
  kind: 'frames';
  frames: { text: string; state?: string }[];
  label?: string;
}
export interface TreeNodeItem {
  id: string | number;
  label: unknown;
  parent?: string | number | null;
  state?: string | null;
  sub?: unknown;
  edge?: string | null;
  edgeLabel?: string | null;
  ghost?: boolean;
}
export interface TreeNode {
  kind: 'tree';
  nodes: TreeNodeItem[];
  dx?: number;
  dy?: number;
  r?: number;
  label?: string;
}
export interface GraphData {
  nodes: { id: string | number; label?: unknown; x: number; y: number }[];
  edges: { u: string | number; v: string | number; w?: unknown }[];
  directed?: boolean;
}
export interface GraphNode {
  kind: 'graph';
  graph: GraphData;
  states?: StateMap;
  edgeStates?: StateMap;
  subs?: Record<string | number, unknown>;
  w?: number;
  h?: number;
  r?: number;
  pad?: number;
  box?: boolean;
  label?: string;
}
export interface GridNode {
  kind: 'grid';
  rows: unknown[][];
  states?: StateMap;
  small?: boolean;
  label?: string;
}
export interface TableNode {
  kind: 'table';
  rows: unknown[][];
  colHead?: unknown[];
  rowHead?: unknown[];
  states?: StateMap;
  label?: string;
}
export interface ListNode {
  kind: 'list';
  nodes: { id: string | number; val: unknown }[];
  next: Record<string | number, string | number | null | undefined>;
  ptrs?: PointerMap;
  states?: StateMap;
  edgeStates?: StateMap;
  nullPtrs?: string[];
  label?: string;
}
export interface IntervalsNode {
  kind: 'intervals';
  list: number[][];
  merged?: number[][];
  mergedLabel?: string;
  extra?: number[][];
  states?: StateMap;
  label?: string;
}
export interface BitsNode {
  kind: 'bits';
  value: number;
  width?: number;
  changed?: number[];
  signed?: boolean;
  label?: string;
}
export interface BarsNode {
  kind: 'bars';
  values: number[];
  states?: StateMap;
  ptrs?: PointerMap;
  rect?: { l: number; r: number; h: number; cls?: string } | null;
  water?: Record<string | number, number>;
  levels?: number[];
  maxH?: number;
  label?: string;
}
export interface PanelNode {
  kind: 'panel';
  label: string;
  children: VizNode[];
}
export interface RowNode {
  kind: 'row';
  align?: 'start' | 'end';
  gap?: 'normal' | 'wide';
  /** A column instead of a row: the heap draws its array above its tree. */
  direction?: 'column';
  children: VizNode[];
}
export interface CaptionNode {
  kind: 'caption';
  text: string;
  tone?: 'normal' | 'muted' | 'error';
  mono?: boolean;
}
/** One mark per event: `loopDef` draws one for each work() call. */
export interface MarksNode {
  kind: 'marks';
  count: number;
  current?: number;
}
/** Rows that start with a label, followed by chips: hash buckets and anagram groups. */
export interface ChipRowsNode {
  kind: 'chiprows';
  rows: {
    label: string;
    state?: string | null;
    chips: { text: string; state?: string | null }[];
    joiner?: string;
    empty?: string;
    trailing?: string;
  }[];
}
/** The `growth` chart: bars on a logarithmic scale. */
export interface LogBarsNode {
  kind: 'logbars';
  rows: { name: string; fraction: number | null; text?: string; state?: string }[];
  ariaLabel: string;
}
export interface ProblemTextNode {
  kind: 'problem';
  text: string;
}
/** Lines of monospaced text, such as an adjacency list. */
export interface CodeLinesNode {
  kind: 'codelines';
  lines: string[];
}

export type VizNode =
  | CellsNode
  | VarsNode
  | KvNode
  | StackNode
  | QueueNode
  | FramesNode
  | TreeNode
  | GraphNode
  | GridNode
  | TableNode
  | ListNode
  | IntervalsNode
  | BitsNode
  | BarsNode
  | PanelNode
  | RowNode
  | CaptionNode
  | MarksNode
  | ChipRowsNode
  | LogBarsNode
  | ProblemTextNode
  | CodeLinesNode;
