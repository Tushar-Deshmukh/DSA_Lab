// Week 12 visualizers: the method itself. One steps through the recognition checklist on an
// unlabeled problem, narrowing the candidate patterns; the other walks a 45-minute interview.
(function (g) {
  'use strict';
  const R = g.R, V = g.Viz; const { el } = g.Core;

  const PATTERNS = ['Hash map', 'Two pointers', 'Sliding window', 'Prefix sums', 'Binary search', 'Monotonic stack', 'Heap', 'BFS', 'Backtracking', 'Union-Find', 'Greedy', 'DP'];
  const PROBLEMS = {
    window: {
      text: 'An array of n ≤ 10⁵ integers and k. Return the length of the longest contiguous subarray with at most k distinct values.',
      steps: [
        ['Constraints → target complexity', 'n ≤ 10⁵: aim for O(n) or O(n log n). Anything that tries every subarray (O(n²)) is out.', ['Hash map', 'Two pointers', 'Sliding window', 'Prefix sums', 'Binary search', 'Monotonic stack', 'Heap', 'Greedy', 'DP']],
        ['Input shape', 'A plain, unsorted array: no graph, no tree, no grid.', ['Hash map', 'Two pointers', 'Sliding window', 'Prefix sums', 'Binary search', 'Monotonic stack', 'Heap', 'Greedy', 'DP']],
        ['What is asked', 'The longest **contiguous** subarray satisfying a condition.', ['Sliding window', 'Prefix sums', 'Two pointers', 'DP']],
        ['Clues', '"At most k distinct": validity is monotone. Shrinking a valid window keeps it valid; growing an invalid one keeps it invalid.', ['Sliding window']],
        ['Solve a tiny example by hand', 'On [1,2,1,3], k = 2 you extend right while ≤ 2 distinct, then drop from the left when a third appears. That is a variable window with a count map.', ['Sliding window']],
      ],
      answer: 'Sliding window',
    },
    teams: {
      text: 'n ≤ 14 people. Return every way to split them into two teams of equal size.',
      steps: [
        ['Constraints → target complexity', 'n ≤ 14 is tiny: exponential (2ⁿ ≈ 16 000) is allowed, and probably expected.', ['Backtracking', 'DP', 'Greedy', 'Hash map']],
        ['Input shape', 'A set of people with no order or values.', ['Backtracking', 'DP', 'Greedy']],
        ['What is asked', 'Every way: the output itself is exponential in size.', ['Backtracking']],
        ['Clues', '"Return all" / "every way" → enumerate. DP counts or optimises; it does not list.', ['Backtracking']],
        ['Solve a tiny example by hand', 'With 4 people you pick 2 for team A, the rest go to B: choose, recurse, undo.', ['Backtracking']],
      ],
      answer: 'Backtracking',
    },
    maze: {
      text: 'A grid of 0s (open) and 1s (walls), up to 300 × 300. Return the fewest moves from the top-left to the bottom-right cell, moving up, down, left or right.',
      steps: [
        ['Constraints → target complexity', '9·10⁴ cells: O(cells) or O(cells · log) is fine.', ['BFS', 'DP', 'Backtracking', 'Greedy', 'Heap', 'Union-Find']],
        ['Input shape', 'A grid: an implicit graph with up to 4 neighbours per cell.', ['BFS', 'DP', 'Backtracking', 'Union-Find']],
        ['What is asked', 'The minimum number of moves: a shortest path.', ['BFS', 'DP']],
        ['Clues', 'All moves cost the same, and movement goes in all four directions (cycles), so there is no fill order for DP.', ['BFS']],
        ['Solve a tiny example by hand', 'By hand you would mark the cells 1 step away, then 2, then 3: layers. That is BFS.', ['BFS']],
      ],
      answer: 'BFS',
    },
    stairs: {
      text: 'Count the ways to climb n ≤ 45 stairs if each move climbs 1, 2 or 3 stairs.',
      steps: [
        ['Constraints → target complexity', 'n ≤ 45, but the count itself grows exponentially, so enumerating paths is out; O(n) states are cheap.', ['DP', 'Backtracking', 'Greedy', 'Hash map']],
        ['Input shape', 'A single number.', ['DP', 'Backtracking', 'Greedy']],
        ['What is asked', 'A count, not a list.', ['DP', 'Greedy']],
        ['Clues', 'ways(n) depends on ways(n − 1), ways(n − 2), ways(n − 3): overlapping subproblems.', ['DP']],
        ['Solve a tiny example by hand', 'For n = 4 you would count by the last move: ways(3) + ways(2) + ways(1). That sentence is the transition.', ['DP']],
      ],
      answer: 'DP',
    },
    queries: {
      text: 'A sorted array of n ≤ 10⁶ numbers and q ≤ 10⁵ queries x. For each query, return how many elements are ≤ x.',
      steps: [
        ['Constraints → target complexity', 'n · q = 10¹¹: scanning per query is far too slow. Each query needs O(log n) or O(1).', ['Binary search', 'Prefix sums', 'Hash map', 'Heap']],
        ['Input shape', 'The array is **sorted**: the strongest clue there is.', ['Binary search', 'Two pointers', 'Prefix sums']],
        ['What is asked', 'For each x, a count of elements ≤ x: the position of the first element > x.', ['Binary search']],
        ['Clues', '"Sorted" + "how many ≤ x" → upper bound.', ['Binary search']],
        ['Solve a tiny example by hand', 'In [1,3,3,7] with x = 3 you would find where 3s end: index 3. Halving the range each time is binary search.', ['Binary search']],
      ],
      answer: 'Binary search',
    },
  };

  V.define('recognise', {
    title: 'The recognition checklist, step by step, on an unlabeled problem',
    inputs: [{ key: 'problem', label: 'problem', type: 'select', def: 'window', options: [{ value: 'window', label: 'At most k distinct values' }, { value: 'teams', label: 'Every equal split into teams' }, { value: 'maze', label: 'Fewest moves through a maze' }, { value: 'stairs', label: 'Ways to climb with 1, 2 or 3' }, { value: 'queries', label: 'Count ≤ x in a sorted array' }] }],
    presets: [{ label: 'At most k distinct', input: { problem: 'window' } }, { label: 'Every team split', input: { problem: 'teams' } }, { label: 'Maze', input: { problem: 'maze' } }, { label: 'Stairs', input: { problem: 'stairs' } }, { label: 'Sorted queries', input: { problem: 'queries' } }],
    legend: [['current', 'still possible'], ['dim', 'ruled out']],
    code: `
1. Constraints → target complexity        //@c1
2. Input shape (sorted? array, string, tree, graph, grid, intervals?)   //@c2
3. What is asked (count, optimum, all solutions, yes/no, k-th, order)   //@c3
4. Keyword clues                          //@c4
5. Solve a tiny example by hand and watch what you do                   //@c5
→ Name the pattern, then state brute force and its complexity           //@done`,
    validate: () => null,
    run({ problem }) {
      const P = PROBLEMS[problem]; const steps = [{ keep: PATTERNS, line: null, k: -1, note: P.text, why: 'Before you open any approach, run the five checks in order. Each one rules patterns out.' }];
      P.steps.forEach(([q, a, keep], k) => steps.push({ keep, k, line: 'c' + (k + 1), note: q + ': ' + a.replace(/\*\*/g, ''), why: k === 0 ? 'Constraints are the fastest filter: n ≤ 20 invites exponential search, n ≤ 10⁵ demands about O(n log n), n ≤ 10⁹ (a value, not a length) suggests binary search on the answer or math.' : k === 4 ? 'Your manual method often is the algorithm: say out loud what you just did.' : null }));
      steps.push({ keep: [P.answer], k: 5, line: 'done', done: true, result: P.answer, note: `Pattern: ${P.answer}. Now state the brute force and its complexity before coding.` });
      return steps;
    },
    render(st, stage, { problem }) {
      stage.append(el('div.panel-label', 'the problem (no label)'), el('p.viz-problem', PROBLEMS[problem].text));
      stage.append(R.kv(PATTERNS.map((p) => [p]), { states: Object.fromEntries(PATTERNS.map((p) => [p, st.keep.includes(p) ? (st.done ? 'done' : 'current') : 'dim'])), label: 'candidate patterns' }));
    },
  });

  const PHASES = [['0–5', 'Clarify'], ['5–15', 'Approach'], ['15–35', 'Code'], ['35–42', 'Verify'], ['42–45', 'Wrap up']];
  const SCRIPTS = {
    smooth: [
      [0, 'Restate the problem, ask about input size, duplicates, empty input and output format. Agree on 2–3 test cases.', 'Problem understanding: the interviewer sees you will not solve the wrong problem.'],
      [1, 'Say the brute force and its complexity, name the bottleneck, and propose the optimised approach with a reason. Wait for agreement.', 'Approach and optimisation: a reasoned improvement scores more than a remembered answer.'],
      [2, 'Code block by block, narrating what each part does. Use clear names and small helpers.', 'Coding and communication are scored at the same time here.'],
      [3, 'Dry-run one example by hand, then the edge cases, before pressing run.', 'Verification: finding your own bug is a strong signal; relying on the run button is a weak one.'],
      [4, 'State the final time and space complexity, mention possible improvements, ask your questions.', 'A clean finish leaves the last impression.'],
    ],
    stuck: [
      [0, 'Clarify as usual: restate, constraints, examples.', null],
      [1, 'Propose a greedy idea and try a counterexample out loud. It fails on a 3-element input.', 'Trying to break your own idea is scored under problem solving.'],
      [1, 'Minute 15: no working approach yet. Say: "This greedy fails on [2, 3, 2]. I\'ll fall back to a DP over prefixes, O(n), and code that." Then switch.', 'Interviewers reward the switch more than the struggle. Do not patch a broken greedy with special cases.'],
      [2, 'Code the DP; it takes longer, so keep narrating and skip polish.', null],
      [3, 'Verify on the counterexample that broke the greedy: it is the best test you have.', null],
      [4, 'Wrap up with complexity and what you would try with more time.', null],
    ],
    bug: [
      [0, 'Clarify and agree on test cases, including an empty input.', null],
      [1, 'Brute force → optimised approach, agreed.', null],
      [2, 'Code, narrating.', null],
      [3, 'Minute 36: the dry run on the empty input fails, because the code indexes nums[0]. Say what you found and fix the guard.', 'Finding a bug by hand is a positive signal, not a failure.'],
      [3, 'Re-run the dry run on the original example to check that the fix did not break it.', 'Always re-verify after a fix.'],
      [4, 'Final complexity; mention the edge case you caught.', null],
    ],
  };

  V.define('interview-clock', {
    title: 'The 45-minute interview, phase by phase',
    inputs: [{ key: 'scenario', label: 'scenario', type: 'select', def: 'smooth', options: [{ value: 'smooth', label: 'On track' }, { value: 'stuck', label: 'The first idea fails' }, { value: 'bug', label: 'The dry run finds a bug' }] }],
    presets: [{ label: 'On track', input: { scenario: 'smooth' } }, { label: 'The first idea fails', input: { scenario: 'stuck' } }, { label: 'The dry run finds a bug', input: { scenario: 'bug' } }],
    legend: [['current', 'now'], ['done', 'finished']],
    code: `
0–5    Clarify: restate, constraints, examples, edge cases        //@p0
5–15   Brute force → bottleneck → optimised approach + complexity //@p1
15–35  Code, narrating each block                                 //@p2
35–42  Dry run on an example, then edge cases; fix bugs           //@p3
42–45  Final complexity, improvements, questions                  //@p4`,
    validate: () => null,
    run({ scenario }) {
      const steps = SCRIPTS[scenario].map(([ph, note, why]) => ({ ph, line: 'p' + ph, note, why }));
      steps[steps.length - 1].done = true; steps[steps.length - 1].result = scenario;
      return steps;
    },
    render(st, stage) {
      const states = {}; PHASES.forEach((_, i) => { if (i < st.ph || st.done) states[i] = 'done'; }); if (!st.done) states[st.ph] = 'current';
      stage.append(R.cells(PHASES.map(([, n]) => n), { states, label: 'phase', noIndex: true }));
      stage.append(R.vars({ minutes: PHASES[st.ph][0] }));
    },
  });
})(window);
