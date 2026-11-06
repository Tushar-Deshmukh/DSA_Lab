// Ported from legacy/src/viz/w12.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import type { VizStep } from '@/lib/viz/types';

interface Input {
  scenario: string;
}

interface Step extends VizStep {
  ph: number;
  done?: boolean;
  result?: string;
}

const PHASES = [
  ['0–5', 'Clarify'],
  ['5–15', 'Approach'],
  ['15–35', 'Code'],
  ['35–42', 'Verify'],
  ['42–45', 'Wrap up'],
];

const SCRIPTS: Record<string, [number, string, string | null][]> = {
  smooth: [
    [
      0,
      'Restate the problem, ask about input size, duplicates, empty input and output format. Agree on 2–3 test cases.',
      'Problem understanding: the interviewer sees you will not solve the wrong problem.',
    ],
    [
      1,
      'Say the brute force and its complexity, name the bottleneck, and propose the optimised approach with a reason. Wait for agreement.',
      'Approach and optimisation: a reasoned improvement scores more than a remembered answer.',
    ],
    [
      2,
      'Code block by block, narrating what each part does. Use clear names and small helpers.',
      'Coding and communication are scored at the same time here.',
    ],
    [
      3,
      'Dry-run one example by hand, then the edge cases, before pressing run.',
      'Verification: finding your own bug is a strong signal; relying on the run button is a weak one.',
    ],
    [
      4,
      'State the final time and space complexity, mention possible improvements, ask your questions.',
      'A clean finish leaves the last impression.',
    ],
  ],
  stuck: [
    [0, 'Clarify as usual: restate, constraints, examples.', null],
    [
      1,
      'Propose a greedy idea and try a counterexample out loud. It fails on a 3-element input.',
      'Trying to break your own idea is scored under problem solving.',
    ],
    [
      1,
      'Minute 15: no working approach yet. Say: "This greedy fails on [2, 3, 2]. I\'ll fall back to a DP over prefixes, O(n), and code that." Then switch.',
      'Interviewers reward the switch more than the struggle. Do not patch a broken greedy with special cases.',
    ],
    [2, 'Code the DP; it takes longer, so keep narrating and skip polish.', null],
    [3, 'Verify on the counterexample that broke the greedy: it is the best test you have.', null],
    [4, 'Wrap up with complexity and what you would try with more time.', null],
  ],
  bug: [
    [0, 'Clarify and agree on test cases, including an empty input.', null],
    [1, 'Brute force → optimised approach, agreed.', null],
    [2, 'Code, narrating.', null],
    [
      3,
      'Minute 36: the dry run on the empty input fails, because the code indexes nums[0]. Say what you found and fix the guard.',
      'Finding a bug by hand is a positive signal, not a failure.',
    ],
    [
      3,
      'Re-run the dry run on the original example to check that the fix did not break it.',
      'Always re-verify after a fix.',
    ],
    [4, 'Final complexity; mention the edge case you caught.', null],
  ],
};

export default defineViz<Input, Step>('interview-clock', {
  title: 'The 45-minute interview, phase by phase',
  inputs: [
    {
      key: 'scenario',
      label: 'scenario',
      type: 'select',
      def: 'smooth',
      options: [
        { value: 'smooth', label: 'On track' },
        { value: 'stuck', label: 'The first idea fails' },
        { value: 'bug', label: 'The dry run finds a bug' },
      ],
    },
  ],
  presets: [
    { label: 'On track', input: { scenario: 'smooth' } },
    { label: 'The first idea fails', input: { scenario: 'stuck' } },
    { label: 'The dry run finds a bug', input: { scenario: 'bug' } },
  ],
  legend: [
    ['current', 'now'],
    ['done', 'finished'],
  ],
  code: `
0–5    Clarify: restate, constraints, examples, edge cases        //@p0
5–15   Brute force → bottleneck → optimised approach + complexity //@p1
15–35  Code, narrating each block                                 //@p2
35–42  Dry run on an example, then edge cases; fix bugs           //@p3
42–45  Final complexity, improvements, questions                  //@p4`,
  validate: () => null,
  run({ scenario }: { scenario: string }) {
    const steps: {
      ph: number;
      line?: VizStep['line'];
      note?: string;
      why?: string | null;
      done?: boolean;
      result?: string;
    }[] = SCRIPTS[scenario].map(([ph, note, why]) => ({ ph, line: 'p' + ph, note, why }));
    steps[steps.length - 1].done = true;
    steps[steps.length - 1].result = scenario;
    return steps;
  },
  view(st, stage) {
    const states: Record<string, string> = {};
    PHASES.forEach((_, i) => {
      if (i < st.ph || st.done) states[i] = 'done';
    });
    if (!st.done) states[st.ph] = 'current';
    stage.append(
      R.cells(
        PHASES.map(([, n]) => n),
        { states, label: 'phase', noIndex: true },
      ),
    );
    stage.append(R.vars({ minutes: PHASES[st.ph][0] }));
  },
});
