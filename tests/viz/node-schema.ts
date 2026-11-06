// What a view may return: each primitive's props, with every state drawn from the legend's vocabulary. A typo in a
// state name, or a prop no primitive reads, fails the test instead of drawing nothing.
import { z } from 'zod';
import type { VizNode } from '@/lib/viz/types';

export const STATES = [
  'current',
  'compare',
  'done',
  'frontier',
  'error',
  'dim',
  'window',
  'wall',
  'dep',
  'best',
  'out',
] as const;

const state = z.union([z.enum(STATES), z.null(), z.undefined(), z.literal(false), z.literal('')]);
const states = z.record(z.string(), state).optional();
const label = z.string().optional();
const ptrs = z.record(z.string(), z.union([z.string(), z.array(z.string()), z.undefined()])).optional();
const bounds = z.array(z.union([z.number(), z.null(), z.undefined()]));

export const VizNodeSchema: z.ZodType<VizNode> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('cells'),
      values: z.array(z.unknown()),
      states,
      ptrs,
      window: bounds.nullable().optional(),
      dimOutside: bounds.optional(),
      noIndex: z.boolean().optional(),
      indexBase: z.number().optional(),
      label,
    }),
    z.strictObject({
      kind: z.literal('vars'),
      values: z.record(z.string(), z.unknown()),
      changed: z.array(z.string()).optional(),
    }),
    z.strictObject({
      kind: z.literal('kv'),
      entries: z.array(z.array(z.unknown())),
      states,
      empty: z.string().optional(),
      label,
    }),
    z.strictObject({ kind: z.literal('stack'), items: z.array(z.unknown()), states, label }),
    z.strictObject({ kind: z.literal('queue'), items: z.array(z.unknown()), states, label }),
    z.strictObject({
      kind: z.literal('frames'),
      frames: z.array(z.strictObject({ text: z.string(), state: z.string().optional() })),
      label,
    }),
    z.strictObject({
      kind: z.literal('tree'),
      nodes: z.array(
        z.strictObject({
          id: z.union([z.string(), z.number()]),
          label: z.unknown(),
          parent: z.union([z.string(), z.number(), z.null()]).optional(),
          state: state.optional(),
          sub: z.unknown().optional(),
          edge: state.optional(),
          edgeLabel: z.union([z.string(), z.null()]).optional(),
          ghost: z.boolean().optional(),
        }),
      ),
      dx: z.number().optional(),
      dy: z.number().optional(),
      r: z.number().optional(),
      label,
    }),
    z.strictObject({
      kind: z.literal('graph'),
      graph: z.strictObject({
        nodes: z.array(
          z.strictObject({
            id: z.union([z.string(), z.number()]),
            label: z.unknown().optional(),
            x: z.number(),
            y: z.number(),
          }),
        ),
        edges: z.array(
          z.strictObject({
            u: z.union([z.string(), z.number()]),
            v: z.union([z.string(), z.number()]),
            w: z.unknown().optional(),
          }),
        ),
        directed: z.boolean().optional(),
      }),
      states,
      edgeStates: states,
      subs: z.record(z.string(), z.unknown()).optional(),
      w: z.number().optional(),
      h: z.number().optional(),
      r: z.number().optional(),
      pad: z.number().optional(),
      box: z.boolean().optional(),
      label,
    }),
    z.strictObject({
      kind: z.literal('grid'),
      rows: z.array(z.array(z.unknown())),
      states,
      small: z.boolean().optional(),
      label,
    }),
    z.strictObject({
      kind: z.literal('table'),
      rows: z.array(z.array(z.unknown())),
      colHead: z.array(z.unknown()).optional(),
      rowHead: z.array(z.unknown()).optional(),
      states,
      label,
    }),
    z.strictObject({
      kind: z.literal('list'),
      nodes: z.array(z.strictObject({ id: z.union([z.string(), z.number()]), val: z.unknown() })),
      next: z.record(z.string(), z.union([z.string(), z.number(), z.null(), z.undefined()])),
      ptrs,
      states,
      edgeStates: states,
      nullPtrs: z.array(z.string()).optional(),
      label,
    }),
    z.strictObject({
      kind: z.literal('intervals'),
      list: z.array(z.array(z.number())),
      merged: z.array(z.array(z.number())).optional(),
      mergedLabel: z.string().optional(),
      extra: z.array(z.array(z.number())).optional(),
      states,
      label,
    }),
    z.strictObject({
      kind: z.literal('bits'),
      value: z.number(),
      width: z.number().optional(),
      changed: z.array(z.number()).optional(),
      signed: z.boolean().optional(),
      label,
    }),
    z.strictObject({
      kind: z.literal('bars'),
      values: z.array(z.number()),
      states,
      ptrs,
      rect: z
        .strictObject({ l: z.number(), r: z.number(), h: z.number(), cls: z.string().optional() })
        .nullable()
        .optional(),
      water: z.record(z.string(), z.number()).optional(),
      levels: z.array(z.number()).optional(),
      maxH: z.number().optional(),
      label,
    }),
    z.strictObject({ kind: z.literal('panel'), label: z.string(), children: z.array(VizNodeSchema) }),
    z.strictObject({
      kind: z.literal('row'),
      align: z.enum(['start', 'end']).optional(),
      gap: z.enum(['normal', 'wide']).optional(),
      direction: z.literal('column').optional(),
      children: z.array(VizNodeSchema),
    }),
    z.strictObject({
      kind: z.literal('caption'),
      text: z.string(),
      tone: z.enum(['normal', 'muted', 'error']).optional(),
      mono: z.boolean().optional(),
    }),
    z.strictObject({ kind: z.literal('marks'), count: z.number(), current: z.number().optional() }),
    z.strictObject({
      kind: z.literal('chiprows'),
      rows: z.array(
        z.strictObject({
          label: z.string(),
          state: state.optional(),
          chips: z.array(z.strictObject({ text: z.string(), state: state.optional() })),
          joiner: z.string().optional(),
          empty: z.string().optional(),
          trailing: z.string().optional(),
        }),
      ),
    }),
    z.strictObject({
      kind: z.literal('logbars'),
      rows: z.array(
        z.strictObject({
          name: z.string(),
          fraction: z.number().nullable(),
          text: z.string().optional(),
          state: state.optional(),
        }),
      ),
      ariaLabel: z.string(),
    }),
    z.strictObject({ kind: z.literal('problem'), text: z.string() }),
    z.strictObject({ kind: z.literal('codelines'), lines: z.array(z.string()) }),
  ]),
) as z.ZodType<VizNode>;
