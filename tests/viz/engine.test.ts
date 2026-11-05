// The parts of the legacy player that do not draw: definitions, line tags, the run order and its messages, and the input
// fields. The field format is the legacy one, and every default and preset survives being shown and read back.
import { beforeAll, describe, expect, it } from 'vitest';
import { defineViz, MAX_STEPS, parseField, resolveLine, runViz, showField } from '@/lib/viz/engine';
import { VIZ_CATALOG, VIZ_LOADERS } from '@/lib/viz/registry';
import type { AnyViz, InputField, VizStep } from '@/lib/viz/types';

const port = new Map<string, AnyViz>();

beforeAll(async () => {
  for (const { id } of VIZ_CATALOG) port.set(id, await (VIZ_LOADERS[id] as () => Promise<AnyViz>)());
}, 120_000);

const field = (type: InputField['type'], extra: Partial<InputField> = {}): InputField => ({
  key: 'k',
  label: 'Numbers',
  type,
  def: null,
  ...extra,
});

describe('defineViz', () => {
  it('moves //@tags out of the code and into a line table', () => {
    const viz = defineViz<Record<string, never>, VizStep>('t', {
      title: 't',
      code: '\n\nlet a = 1; //@init\nwhile (a) { //@loop\n  a--;\n}\n\n',
      run: () => [{ line: 'loop', note: 'n' }],
      view: () => {},
    });
    expect(viz.code).toBe('let a = 1;\nwhile (a) {\n  a--;\n}');
    expect(viz.lines).toEqual({ init: 1, loop: 2 });
    expect(resolveLine(viz, ['init', 3])).toEqual([1, 3]);
    expect(() => resolveLine(viz, 'nope')).toThrow('visualizer t: unknown line tag nope');
  });
});

describe('runViz', () => {
  const make = (run: () => VizStep[], validate?: () => string | null) =>
    defineViz<Record<string, never>, VizStep>('t', {
      title: 't',
      code: 'x //@a',
      run,
      view: () => {},
      validate,
    });

  it('stops on the validate() message before running', () => {
    let ran = false;
    const viz = make(
      () => {
        ran = true;
        return [];
      },
      () => 'Use at most 8 numbers.',
    );
    expect(() => runViz(viz, {})).toThrow('Use at most 8 numbers.');
    expect(ran).toBe(false);
  });

  it('says so when there is nothing to show, or too much', () => {
    expect(() =>
      runViz(
        make(() => []),
        {},
      ),
    ).toThrow('Nothing to show for this input.');
    const many = Array.from({ length: MAX_STEPS + 1 }, () => ({ note: 'n' }));
    expect(() =>
      runViz(
        make(() => many),
        {},
      ),
    ).toThrow(`This input needs ${MAX_STEPS + 1} steps; use a smaller one (at most ${MAX_STEPS}).`);
  });

  it('resolves line tags to numbers', () => {
    expect(
      runViz(
        make(() => [{ line: 'a', note: 'n' }]),
        {},
      )[0]?.line,
    ).toBe(1);
  });
});

describe('input fields', () => {
  it('read values with the legacy messages', () => {
    expect(parseField(field('numbers'), '2, 7, 11')).toEqual([2, 7, 11]);
    expect(parseField(field('array'), '[1, "a"]')).toEqual([1, 'a']);
    expect(() => parseField(field('numbers'), '1, x')).toThrow('Numbers: could not read this value');
    expect(() => parseField(field('numbers'), '1, "x"')).toThrow(
      'Numbers: Use numbers only, separated by commas',
    );
    expect(() => parseField(field('int'), '2.5')).toThrow('Numbers: Enter a whole number');
    expect(() => parseField(field('number'), ' ')).toThrow('Numbers: Enter a number');
    expect(parseField(field('select', { options: [{ value: 2, label: 'two' }] }), '2')).toBe(2);
    expect(parseField(field('select', { options: ['a', 'b'] }), 'b')).toBe('b');
  });

  it('show values as the legacy player did', () => {
    expect(showField(field('numbers'), [2, 7, 11])).toBe('2, 7, 11');
    expect(showField(field('array'), [[1, 2], [3]])).toBe('[1, 2], [3]');
    expect(showField(field('json'), [[1, 2], [3]])).toBe('[[1, 2], [3]]');
    expect(showField(field('string'), 'abc')).toBe('abc');
    expect(showField(field('int'), 7)).toBe('7');
  });

  it('read back every default and preset of every visualizer unchanged', () => {
    let checked = 0;
    for (const viz of port.values()) {
      const values = (f: InputField) => [
        f.def,
        ...(viz.presets ?? []).map((p) => (p.input as Record<string, unknown>)[f.key]),
      ];
      for (const f of viz.inputs ?? []) {
        for (const v of values(f)) {
          if (v === undefined) continue;
          expect(parseField(f, showField(f, v)), `${viz.id}.${f.key}`).toEqual(v);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(300);
  });
});
