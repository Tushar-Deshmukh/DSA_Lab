// The parts of legacy/src/viz/player.js that have nothing to do with the screen: reading a definition, parsing input
// fields, running a visualizer and collecting a view.
import type { InputField, LineRef, Rng, Stage, Viz, VizDefinition, VizNode, VizStep } from './types';

export const MAX_STEPS = 600;

/** Turns a definition into a visualizer: `//@tag` markers come off the code and go into a line table. */
export function defineViz<I, S extends VizStep>(id: string, def: VizDefinition<I, S>): Viz<I, S> {
  const lines: Record<string, number> = {};
  const code = String(def.code)
    .replace(/^\n+|\s+$/g, '')
    .split('\n')
    .map((ln, i) => {
      const m = ln.match(/\s*\/\/@([\w-]+)\s*$/);
      if (m) {
        lines[m[1] as string] = i + 1;
        return ln.slice(0, m.index);
      }
      return ln;
    })
    .join('\n');
  return { ...def, id, code, lines };
}

export type ResolvedLine = number | number[] | null;

export function resolveLine(
  viz: { id: string; lines: Record<string, number> },
  line: VizStep['line'],
): ResolvedLine {
  if (line == null) return null;
  const one = (x: LineRef): number => {
    if (typeof x === 'number') return x;
    const n = viz.lines[x];
    if (!n) throw new Error(`visualizer ${viz.id}: unknown line tag ${x}`);
    return n;
  };
  return Array.isArray(line) ? line.map(one) : one(line);
}

export type ResolvedStep<S extends VizStep> = Omit<S, 'line'> & { line?: ResolvedLine };

/**
 * Validates the input, runs the algorithm, and turns line tags into line numbers, in the order the legacy player did.
 * Throws what the learner should read.
 */
export function runViz<I, S extends VizStep>(viz: Viz<I, S>, input: I): ResolvedStep<S>[] {
  const message = viz.validate?.(input);
  if (message) throw new Error(message);
  const steps = viz.run(input);
  for (const s of steps) s.line = resolveLine(viz, s.line);
  if (!steps.length) throw new Error('Nothing to show for this input.');
  if (steps.length > MAX_STEPS) {
    throw new Error(`This input needs ${steps.length} steps; use a smaller one (at most ${MAX_STEPS}).`);
  }
  return steps as unknown as ResolvedStep<S>[];
}

/** Adds the random-input generator to a visualizer that a factory made. */
export function withRandom<I, S extends VizStep>(viz: Viz<I, S>, random: (rng: Rng) => I): Viz<I, S> {
  return { ...viz, random };
}

/** What one step looks like, as data for the primitives. */
export function viewOf<I, S extends VizStep>(viz: Viz<I, S>, step: ResolvedStep<S>, input: I): VizNode[] {
  const nodes: VizNode[] = [];
  const stage: Stage = {
    append: (...items) => {
      for (const item of items) if (item) nodes.push(item);
    },
  };
  viz.view(step as unknown as S, stage, input);
  return nodes;
}

export function defaultInput<I>(viz: Pick<Viz<I, VizStep>, 'inputs'>): I {
  return Object.fromEntries((viz.inputs ?? []).map((f) => [f.key, f.def])) as I;
}

const parsers = {
  array(s: string): unknown[] {
    const v: unknown = JSON.parse(s.trim().startsWith('[') ? s : `[${s}]`);
    if (!Array.isArray(v)) throw new Error('Enter a list such as 2, 7, 11, 15');
    return v;
  },
  numbers(s: string): number[] {
    const v = parsers.array(s);
    if (v.some((x) => typeof x !== 'number' || !isFinite(x)))
      throw new Error('Use numbers only, separated by commas');
    return v as number[];
  },
  number(s: string): number {
    const v = Number(s);
    if (!isFinite(v) || String(s).trim() === '') throw new Error('Enter a number');
    return v;
  },
  int(s: string): number {
    const v = Number(s);
    if (!Number.isInteger(v)) throw new Error('Enter a whole number');
    return v;
  },
  string: (s: string): string => String(s),
  json: (s: string): unknown => JSON.parse(s),
};

/** Reads one input field. Messages are the ones the legacy player showed. */
export function parseField(field: InputField, text: string): unknown {
  try {
    if (field.type === 'select') {
      const first = field.options?.[0];
      return first && typeof first === 'object' && typeof first.value === 'number' ? Number(text) : text;
    }
    return parsers[field.type](text);
  } catch (e) {
    const message = (e as Error).message;
    throw new Error(
      `${field.label}: ${message.startsWith('Unexpected') || message.includes('JSON') ? 'could not read this value' : message}`,
    );
  }
}

/** How a value is shown in its input field: lists without their outer brackets, except for JSON fields. */
export function showField(field: InputField, value: unknown): string {
  if (field.type === 'string' || field.type === 'select' || field.type === 'number' || field.type === 'int') {
    return String(value as string | number);
  }
  return JSON.stringify(value)
    .replace(/^\[|\]$/g, (m) => (field.type === 'json' ? m : ''))
    .replace(/,/g, ', ');
}
