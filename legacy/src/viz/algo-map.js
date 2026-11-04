// Course-level visualizer: the dependency chain from roadmap section 2, one link at a time.
(function (g) {
  'use strict';
  const R = g.R, V = g.Viz;
  const N = [
    ['cx', 'Complexity', 0.5, 0.02], ['hash', 'Hashing', 0.12, 0.2], ['sort', 'Sorting', 0.42, 0.2], ['ll', 'Linked lists', 0.63, 0.2], ['sq', 'Stacks & queues', 0.91, 0.2],
    ['tp', 'Two pointers', 0.04, 0.4], ['ps', 'Prefix sums', 0.18, 0.54], ['bs', 'Binary search', 0.33, 0.4], ['iv', 'Intervals', 0.5, 0.54], ['rec', 'Recursion', 0.7, 0.4],
    ['gr', 'Greedy', 0.4, 0.72], ['bt', 'Backtracking', 0.64, 0.6], ['tree', 'Trees', 0.9, 0.55],
    ['dp', 'DP', 0.4, 0.95], ['graph', 'Graphs', 0.7, 0.95], ['heap', 'Heaps', 0.95, 0.78],
  ];
  const E = [['cx', 'hash'], ['cx', 'sort'], ['cx', 'll'], ['cx', 'sq'], ['hash', 'tp'], ['hash', 'ps'], ['sort', 'bs'], ['sort', 'iv'], ['sort', 'gr'], ['ll', 'rec'], ['sq', 'tree'], ['sq', 'graph'], ['rec', 'bt'], ['bt', 'tree'], ['tree', 'graph'], ['tree', 'heap'], ['heap', 'graph'], ['gr', 'dp'], ['rec', 'dp']];
  const STEPS = [
    [[0, 1, 2, 3], ['cx'], 'Complexity → everything: you cannot judge an optimisation without it (Week 1).'],
    [[4, 5], ['hash', 'tp', 'ps'], 'Hashing → two pointers and prefix sums: 1 Two Sum (hash) versus 167 Two Sum II (pointers) shows when sorted input lets you drop the map; 560 needs prefix sums plus a map.'],
    [[6, 7, 8], ['sort', 'bs', 'iv', 'gr'], 'Sorting → binary search, intervals, greedy: sorted order is the precondition for all three.'],
    [[9], ['ll', 'rec'], 'Linked lists → recursion: recursive reversal (206) is the bridge from loops to recursive thinking.'],
    [[10, 11], ['sq', 'tree', 'graph'], 'Stacks and queues → trees and graphs: iterative DFS uses a stack; BFS uses a queue.'],
    [[12, 13, 14], ['rec', 'bt', 'tree', 'graph'], 'Recursion → backtracking → trees → graphs: the same "a function returns information about a subproblem" idea, adding visited state as you go.'],
    [[15], ['tree', 'heap'], 'Trees → heaps: a heap is a complete binary tree stored in an array.'],
    [[16], ['heap', 'graph'], 'Heaps + BFS → Dijkstra (Week 9): Dijkstra is BFS with a priority queue.'],
    [[17], ['gr', 'dp'], 'Greedy → DP: Coin Change (322) is where greedy fails and DP takes over; seeing greedy first makes that lesson concrete.'],
    [[18], ['rec', 'dp'], 'Recursion + memoisation → DP: DP is taught as "brute-force recursion, then cache, then table".'],
  ];
  V.define('depmap', {
    title: 'How the topics depend on each other',
    inputs: [],
    presets: [],
    legend: [['current', 'this link'], ['done', 'covered so far']],
    code: `
Week 1        complexity, arrays, hashing             //@w1
Weeks 2–3     two pointers, windows, prefix sums, binary search, sorting   //@w2
Weeks 4–6     lists, stacks, recursion, backtracking, trees                //@w4
Weeks 7–9     heaps, intervals, graphs, Dijkstra, greedy                   //@w7
Weeks 10–11   dynamic programming                                          //@w10`,
    validate: () => null,
    run() {
      const lines = ['w1', 'w2', 'w2', 'w4', 'w4', 'w4', 'w7', 'w7', 'w10', 'w10'];
      return STEPS.map(([edges, nodes, note], k) => ({ k, edges, nodes, line: lines[k], note, done: k === STEPS.length - 1, result: k === STEPS.length - 1 ? STEPS.length : undefined }));
    },
    render(st, stage) {
      const states = {}, es = {};
      for (let k = 0; k < st.k; k++) { STEPS[k][1].forEach((n) => (states[n] = 'done')); STEPS[k][0].forEach((e) => (es[e] = 'done')); }
      st.nodes.forEach((n) => (states[n] = 'current')); st.edges.forEach((e) => (es[e] = 'current'));
      stage.append(R.graph({ nodes: N.map(([id, label, x, y]) => ({ id, label, x, y })), edges: E.map(([u, v]) => ({ u, v })), directed: true }, { states, edgeStates: es, w: 660, h: 440, box: true, pad: 58, label: 'prerequisite → topic that builds on it' }));
    },
  });
})(window);
