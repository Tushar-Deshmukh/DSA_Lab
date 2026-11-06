// Ported from legacy/src/viz/w04.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint, rstr } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  s: string;
}

interface Step extends VizStep {
  i: number | null;
  stack: string[];
  matched: Set<number>;
  done?: boolean;
  result?: boolean;
  bad?: [number, number | undefined];
}

// ---------- stacks and queues ----------
export default defineViz<Input, Step>('stack-match', {
  title: 'Valid Parentheses: the most recent opener must close first',
  inputs: [{ key: 's', label: 's', type: 'string', def: '{[()()]}', wide: true }],
  presets: [
    { label: 'Valid, nested', input: { s: '{[()()]}' } },
    { label: 'Wrong order', input: { s: '([)]' } },
    { label: 'Unclosed', input: { s: '((' } },
    { label: 'Closer first', input: { s: ')(' } },
  ],
  legend: [
    ['current', 'character being read'],
    ['done', 'matched'],
    ['error', 'mismatch'],
  ],
  code: `
function isValid(s) {
  const match = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const c of s) {
    if (!(c in match)) stack.push(c);                 // opener  //@push
    else if (stack.pop() !== match[c]) return false;  // closer  //@pop
  }
  return stack.length === 0;                                     //@end
}`,
  validate: ({ s }) =>
    !/^[()[\]{}]*$/.test(s)
      ? 'Use only ()[]{} characters.'
      : s.length > 20
        ? 'Keep it to 20 characters.'
        : null,
  run({ s }) {
    const match: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
    const stack: string[] = [],
      steps: Step[] = [],
      matched: Set<number> = new Set(),
      openIdx: number[] = [];
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (!(c in match)) {
        stack.push(c);
        openIdx.push(i);
        steps.push({
          i,
          stack: [...stack],
          matched: new Set(matched),
          line: 'push',
          note: `"${c}" opens: push it.`,
        });
        continue;
      }
      const top = stack.pop();
      const oi = openIdx.pop();
      if (top !== match[c]) {
        steps.push({
          i,
          stack: [...stack],
          matched: new Set(matched),
          bad: [i, oi],
          line: 'pop',
          done: true,
          result: false,
          note:
            top === undefined
              ? `"${c}" closes, but the stack is empty: nothing to match. Return false.`
              : `"${c}" closes, but the most recent opener is "${top}". Return false.`,
          why: 'Nesting means the last opened bracket must be the first closed: that is exactly LIFO.',
        });
        return steps;
      }
      matched.add(i);
      matched.add(oi!);
      steps.push({
        i,
        stack: [...stack],
        matched: new Set(matched),
        line: 'pop',
        note: `"${c}" matches the top "${top}": pop.`,
      });
    }
    const ok = stack.length === 0;
    steps.push({
      i: null,
      stack: [...stack],
      matched,
      line: 'end',
      done: true,
      result: ok,
      note: ok
        ? 'Every opener was closed: return true.'
        : `${stack.length} opener${stack.length > 1 ? 's are' : ' is'} still waiting: return false.`,
      why: 'O(n) time; O(n) space in the worst case (all openers).',
    });
    return steps;
  },
  view(st, stage, { s }) {
    const states: Record<string, string> = {};
    st.matched.forEach((k) => (states[k] = 'done'));
    if (st.i != null) states[st.i] = 'current';
    if (st.bad)
      st.bad.forEach((k) => {
        if (k != null) states[k] = 'error';
      });
    stage.append(R.cells([...s], { states, label: 's' }));
    stage.append(R.stack(st.stack));
  },
  random: (g) => ({ s: rstr(g, rint(g, 0, 12), '()[]{}') }),
});
