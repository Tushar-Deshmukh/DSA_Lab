// Types that the recorded values cannot provide: parameters that receive functions or drawing nodes, and a few legacy
// idioms TypeScript reads differently from JavaScript. Every fix adds types only; the code that runs stays the same,
// which tests/viz/parity.test.ts checks.

export type TypeFix =
  /** Replaces text that occurs exactly once, or everywhere with `all`. */
  | { replace: string; with: string; all?: true }
  /** Types the parameter `param` of the function or method named `of`. */
  | { param: string; of: string; type: string }
  /** Types a variable, every declaration with that name. */
  | { variable: string; type: string };

/** `[].concat(a, b)` flattens a pointer label into a list; TypeScript types the empty array as `never[]`. */
const CONCAT: TypeFix = { replace: '[].concat(', with: '([] as string[]).concat(', all: true };

/** A letter and its count, built by `map`, which TypeScript types as a plain array rather than a pair. */
const letterCount = (base: number): TypeFix => ({
  replace: `[String.fromCharCode(${base} + i), c]`,
  with: `[String.fromCharCode(${base} + i), c] as [string, number]`,
});

/**
 * Step fields whose recorded values miss a case the code allows. The test inputs never pop an empty queue, but the
 * code handles it and records undefined.
 */
export const STEP_FIELD_FIXES: Record<string, Record<string, string>> = {
  'queue-2stacks': { res: '(number | null | undefined)[]', result: '(number | null | undefined)[]' },
};

export const TYPE_FIXES: Record<string, TypeFix[]> = {
  'algo-map.js': [
    { variable: 'N', type: '[string, string, number, number][]' },
    { variable: 'E', type: '[string, string][]' },
  ],
  'w01.js': [
    {
      replace: 'loopDef(id, title, code, body, formula, why)',
      with: 'loopDef(id: string, title: string, code: string, body: (n: number, hit: (vars: Record<string, number>, line: string) => void) => void, formula: (n: number) => string, why: string)',
    },
    { variable: 'CLASSES', type: '[string, (n: number) => number, string][]' },
    // When read and write point at the same cell, the label becomes a list; until then it is a string.
    { replace: "[ptrs[st.write], 'write']", with: "[ptrs[st.write] as string, 'write']", all: true },
    letterCount(97),
  ],
  'w02.js': [
    CONCAT,
    { replace: 'a.concat([null])', with: '(a as (number | null)[]).concat([null])' },
    letterCount(65),
  ],
  'w03.js': [
    {
      replace: 'boundDef(id, title, op, predText, opFn)',
      with: 'boundDef(id: string, title: string, op: string, predText: string, opFn: (x: number, t: number) => boolean)',
    },
    CONCAT,
  ],
  'w04.js': [
    CONCAT,
    { replace: "(v, k) => ['a', i + k, v]", with: "(v, k): [string, number, number] => ['a', i + k, v]" },
    { replace: "(v, k) => ['b', j + k, v]", with: "(v, k): [string, number, number] => ['b', j + k, v]" },
    { replace: 'new Map(st.vals)', with: 'new Map(st.vals as [number, number][])' },
    // readList is called with value lists of either kind, and only number lists reach the push.
    { replace: '{ out.push(vals[c]); c = next[c]; }', with: '{ out.push(vals[c] as number); c = next[c]; }' },
    { replace: 'let c = head, guard = 0;', with: 'let c: number | null | undefined = head, guard = 0;' },
  ],
  'w05.js': [
    { param: 'stage', of: 'renderBT', type: 'Stage' },
    { param: 'extra', of: 'renderBT', type: 'VizNode | null' },
    // `map` is indexed by a digit character, which JavaScript turns into the number it reads as.
    { replace: 'map[digits[i]]', with: 'map[digits[i] as unknown as number]', all: true },
  ],
  'w07.js': [
    { replace: 'cmp = (a, b) => a - b', with: 'cmp: (a: number, b: number) => number = (a, b) => a - b' },
    { replace: '{ d: [], out: [] }', with: '{ d: [] as number[], out: [] as number[] }' },
  ],
  // inf() shows an unreachable node's distance as ∞.
  'w09.js': [
    { variable: 'subs', type: 'Record<string, number | string>' },
    // An operation list's arguments: slice() of ['union', 0, 1] loses the tuple type.
    {
      replace: 'o.slice(1).some((x) => x < 0 || x >= n)',
      with: '(o.slice(1) as number[]).some((x) => x < 0 || x >= n)',
    },
  ],
  'w10.js': [
    {
      replace: '[r > 0 && [r - 1, c], c > 0 && [r, c - 1]].filter(Boolean)',
      with: '([r > 0 && [r - 1, c], c > 0 && [r, c - 1]].filter(Boolean) as number[][])',
    },
  ],
  // The random input: the list is never empty, so pop() always returns a number.
  'w11.js': [{ replace: 'const single = vals.pop();', with: 'const single = vals.pop()!;' }],
  // Indexed by the scenario the learner picks.
  'w12.js': [{ variable: 'SCRIPTS', type: 'Record<string, [number, string, string | null][]>' }],
};
