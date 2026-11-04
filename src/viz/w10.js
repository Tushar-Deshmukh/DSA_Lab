// Week 10 visualizers: DP tables filled step by step. Every step shows the cell being computed
// (current) and the cells it reads (compare), so the transition is visible, not just the numbers.
(function (g) {
  'use strict';
  const R = g.R, V = g.Viz;
  const blankRow = (n) => new Array(n).fill(null);

  V.define('dp-stairs', {
    title: 'A 1-D table, then two variables: Climbing Stairs and Min Cost Climbing Stairs',
    inputs: [{ key: 'problem', label: 'problem', type: 'select', def: 'ways', options: [{ value: 'ways', label: '70: number of ways' }, { value: 'cost', label: '746: minimum cost' }] }, { key: 'n', label: 'n (for 70)', type: 'int', def: 5 }, { key: 'cost', label: 'cost (for 746)', type: 'numbers', def: [10, 15, 20], wide: true }],
    presets: [{ label: '70 with n = 5', input: { problem: 'ways', n: 5 } }, { label: '746 on [10, 15, 20]', input: { problem: 'cost', cost: [10, 15, 20] } }, { label: '746 on LeetCode example 2', input: { problem: 'cost', cost: [1, 100, 1, 1, 1, 100, 1, 1, 100, 1] } }],
    legend: [['current', 'computing'], ['compare', 'read by the transition'], ['done', 'answer']],
    code: `
// 70: dp[i] = ways to stand on step i       746: dp[i] = min cost to stand on step i
dp[0] = base0; dp[1] = base1;                                         //@base
for (let i = 2; i <= n; i++)
  dp[i] = ways ? dp[i - 1] + dp[i - 2]                                //@trans
               : Math.min(dp[i - 1] + cost[i - 1], dp[i - 2] + cost[i - 2]);
return dp[n];        // only dp[i-1] and dp[i-2] are ever read → two variables   //@ret`,
    validate: ({ problem, n, cost }) => (problem === 'ways' ? (n < 1 || n > 15 ? 'Use 1 ≤ n ≤ 15.' : null) : cost.length < 2 || cost.length > 15 || cost.some((c) => c < 0) ? 'Use 2–15 non-negative costs.' : null),
    run({ problem, n, cost }) {
      const ways = problem === 'ways'; const N = ways ? n : cost.length; const dp = blankRow(N + 1); const steps = [];
      dp[0] = ways ? 1 : 0; dp[1] = ways ? 1 : 0;
      steps.push({ dp: [...dp], cur: [0, 1], line: 'base', note: ways ? 'dp[0] = 1 (one way to stand at the bottom: do nothing), dp[1] = 1.' : 'You may start on step 0 or step 1 for free: dp[0] = dp[1] = 0. The top is index n = ' + N + ', one past the last step.', why: 'Base cases are the states that need no choices.' });
      for (let i = 2; i <= N; i++) {
        let note;
        if (ways) { dp[i] = dp[i - 1] + dp[i - 2]; note = `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${dp[i - 1]} + ${dp[i - 2]} = ${dp[i]}: the last move was 1 step or 2 steps.`; }
        else { const a = dp[i - 1] + cost[i - 1], b = dp[i - 2] + cost[i - 2]; dp[i] = Math.min(a, b); note = `dp[${i}] = min(dp[${i - 1}] + cost[${i - 1}], dp[${i - 2}] + cost[${i - 2}]) = min(${a}, ${b}) = ${dp[i]}.`; }
        steps.push({ dp: [...dp], cur: [i], dep: [i - 1, i - 2], line: 'trans', note, why: i === 2 ? 'Each cell reads only the two cells before it, so left to right is a valid order, and only two numbers ever need to be kept.' : null });
      }
      steps.push({ dp, best: N, line: 'ret', done: true, result: dp[N], note: `Answer: dp[${N}] = ${dp[N]}.`, why: 'O(n) time. The table is O(n) space; keeping prev2 and prev1 instead makes it O(1).' });
      return steps;
    },
    render(st, stage, { problem, cost }) {
      const states = {}; (st.dep || []).forEach((k) => (states[k] = 'dep')); (st.cur || []).forEach((k) => (states[k] = 'current')); if (st.best != null) states[st.best] = 'best';
      if (problem === 'cost') stage.append(R.cells(cost, { label: 'cost[i]' }));
      stage.append(R.row1d(st.dp, { states, label: problem === 'ways' ? 'dp[i] = ways to reach step i' : 'dp[i] = min cost to stand on step i (index n is the top)' }));
      const i = (st.cur || [st.dp.length - 1]).slice(-1)[0];
      if (i >= 1) stage.append(R.vars({ prev2: st.dp[i - 1 >= 1 ? i - 1 : 0], prev1: st.dp[i] }));
    },
  });

  V.define('house-robber', {
    title: 'House Robber: skip house i, or rob it on top of dp[i − 2]',
    inputs: [{ key: 'nums', label: 'nums (money per house)', type: 'numbers', def: [2, 7, 9, 3, 1], wide: true }, { key: 'circle', label: 'houses in a circle? (213)', type: 'select', def: 'no', options: [{ value: 'no', label: 'no (198)' }, { value: 'yes', label: 'yes (213): two runs' }] }],
    presets: [{ label: 'Roadmap dry run', input: { nums: [2, 7, 9, 3, 1], circle: 'no' } }, { label: 'Greedy "every other" fails', input: { nums: [2, 1, 1, 2], circle: 'no' } }, { label: '213 on [2, 3, 2]', input: { nums: [2, 3, 2], circle: 'yes' } }],
    legend: [['current', 'dp[i]'], ['compare', 'dp[i − 1] (skip) and dp[i − 2] (rob)'], ['done', 'answer']],
    code: `
function rob(nums) {                      // dp[i] = most money from houses 0..i
  let prev2 = 0, prev1 = 0;               // dp[i-2], dp[i-1]
  for (const x of nums) {
    const cur = Math.max(prev1, prev2 + x);     // skip i, or rob i   //@trans
    prev2 = prev1; prev1 = cur;                                     //@shift
  }
  return prev1;                                                     //@ret
}
// 213: Math.max(rob(nums.slice(0, -1)), rob(nums.slice(1)))         //@circle`,
    validate: ({ nums }) => (nums.length < 1 || nums.length > 12 || nums.some((x) => x < 0) ? 'Use 1–12 non-negative amounts.' : null),
    run({ nums, circle }) {
      const steps = [];
      const runOn = (lo, hi, tag) => {
        const dp = blankRow(nums.length);
        for (let i = lo; i <= hi; i++) {
          const skip = i - 1 >= lo ? dp[i - 1] : 0, take = (i - 2 >= lo ? dp[i - 2] : 0) + nums[i]; dp[i] = Math.max(skip, take);
          steps.push({ dp: [...dp], cur: i, dep: [i - 1, i - 2].filter((k) => k >= lo), range: [lo, hi], tag, line: ['trans', 'shift'], note: `${tag}i = ${i}: skip → ${skip}, rob → ${i - 2 >= lo ? 'dp[' + (i - 2) + ']' : '0'} + ${nums[i]} = ${take}. dp[${i}] = ${dp[i]}.`, why: i === lo + 2 && !tag ? 'The state sentence "most money from houses 0..i" is enough: whether house i − 1 was robbed is already accounted for inside dp[i − 1].' : null });
        }
        return hi >= lo ? dp[hi] : 0;
      };
      let ans;
      if (circle === 'yes' && nums.length > 1) {
        const a = runOn(0, nums.length - 2, 'Run 1 (without the last house): '), b = runOn(1, nums.length - 1, 'Run 2 (without the first house): ');
        ans = Math.max(a, b);
        steps.push({ dp: steps[steps.length - 1].dp, line: 'circle', done: true, result: ans, note: `First and last houses are neighbours, so at most one of them is robbed: answer = max(${a}, ${b}) = ${ans}.`, why: 'Reducing to a solved problem: two linear runs, each excluding one end.' });
      } else {
        ans = runOn(0, nums.length - 1, '');
        steps.push({ dp: steps[steps.length - 1].dp, best: nums.length - 1, line: 'ret', done: true, result: ans, note: `Answer: ${ans}.`, why: 'O(n) time, O(1) space with two variables.' });
      }
      return steps;
    },
    render(st, stage, { nums }) {
      const states = {}; (st.dep || []).forEach((k) => (states[k] = 'dep')); if (st.cur != null) states[st.cur] = 'current'; if (st.best != null) states[st.best] = 'best';
      stage.append(R.cells(nums, { window: st.range, label: 'nums (window = houses in this run)' }));
      stage.append(R.row1d(st.dp, { states, label: 'dp[i] = most money from the houses up to i' }));
    },
  });

  V.define('coin-change', {
    title: 'Coin Change: dp[a] = 1 + the best dp[a − c]',
    inputs: [{ key: 'coins', label: 'coins', type: 'numbers', def: [1, 3, 4] }, { key: 'amount', label: 'amount', type: 'int', def: 6 }],
    presets: [{ label: 'Roadmap: [1,3,4], 6', input: { coins: [1, 3, 4], amount: 6 } }, { label: 'LeetCode: [1,2,5], 11', input: { coins: [1, 2, 5], amount: 11 } }, { label: 'Impossible: [2], 3', input: { coins: [2], amount: 3 } }],
    legend: [['current', 'dp[a]'], ['compare', 'dp[a − c] for each coin'], ['done', 'answer']],
    code: `
const dp = new Array(amount + 1).fill(Infinity);   // ∞ = cannot be made
dp[0] = 0;                                                         //@base
for (let a = 1; a <= amount; a++)
  for (const c of coins)
    if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;   // last coin is c  //@trans
return dp[amount] === Infinity ? -1 : dp[amount];                  //@ret`,
    validate: ({ coins, amount }) => (coins.length < 1 || coins.length > 5 || coins.some((c) => c < 1) ? 'Use 1–5 positive coins.' : amount < 0 || amount > 20 ? 'Use 0 ≤ amount ≤ 20.' : null),
    run({ coins, amount }) {
      const dp = new Array(amount + 1).fill(Infinity); dp[0] = 0; const steps = [{ dp: [...dp], cur: 0, line: 'base', note: 'dp[0] = 0 coins. Everything else starts at ∞ ("not reachable yet"): 0 would wrongly look like the best possible value.' }];
      for (let a = 1; a <= amount; a++) {
        const parts = [];
        for (const c of coins) if (c <= a) { parts.push(`${c} → dp[${a - c}] + 1 = ${dp[a - c] === Infinity ? '∞' : dp[a - c] + 1}`); if (dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1; }
        steps.push({ dp: [...dp], cur: a, dep: coins.filter((c) => c <= a).map((c) => a - c), line: 'trans', note: `a = ${a}: ${parts.length ? parts.join('; ') : 'no coin fits'}. dp[${a}] = ${dp[a] === Infinity ? '∞' : dp[a]}.`, why: a === amount && coins.length > 1 ? 'Optimal substructure: the best way to make a ends with some coin c, and what remains (a − c) must itself be made optimally.' : null });
      }
      const ans = dp[amount] === Infinity ? -1 : dp[amount];
      steps.push({ dp, best: amount, line: 'ret', done: true, result: ans, note: ans < 0 ? `dp[${amount}] is still ∞: return −1.` : `Fewest coins for ${amount}: ${ans}.`, why: 'O(amount × coins) time, O(amount) space.' });
      return steps;
    },
    render(st, stage) {
      const states = {}; (st.dep || []).forEach((k) => (states[k] = 'dep')); if (st.cur != null) states[st.cur] = 'current'; if (st.best != null) states[st.best] = 'best';
      stage.append(R.row1d(st.dp, { states, label: 'dp[a] = fewest coins that make a', rowLabel: 'dp' }));
    },
  });

  V.define('coin-ways', {
    title: 'Coin Change II: the loop order decides combinations or sequences',
    inputs: [{ key: 'coins', label: 'coins', type: 'numbers', def: [1, 2] }, { key: 'amount', label: 'amount', type: 'int', def: 3 }, { key: 'order', label: 'outer loop', type: 'select', def: 'coins', options: [{ value: 'coins', label: 'coins outer (518: combinations)' }, { value: 'amounts', label: 'amounts outer (377: ordered sequences)' }] }],
    presets: [{ label: '518 dry run: [1,2], 3', input: { coins: [1, 2], amount: 3, order: 'coins' } }, { label: 'Same, loops swapped', input: { coins: [1, 2], amount: 3, order: 'amounts' } }, { label: 'LeetCode: [1,2,5], 5', input: { coins: [1, 2, 5], amount: 5, order: 'coins' } }],
    legend: [['current', 'updated now'], ['compare', 'dp[a − c] added in']],
    code: `
const dp = new Array(amount + 1).fill(0); dp[0] = 1;   // one way to make 0  //@base
// 518 (combinations): each combination is built in coin order
for (const c of coins) for (let a = c; a <= amount; a++) dp[a] += dp[a - c];  //@coins
// 377 (sequences): every coin may be the last one at every amount
for (let a = 1; a <= amount; a++) for (const c of coins) if (c <= a) dp[a] += dp[a - c];  //@amounts
return dp[amount];                                                              //@ret`,
    validate: ({ coins, amount }) => (coins.length < 1 || coins.length > 4 || coins.some((c) => c < 1) || new Set(coins).size !== coins.length ? 'Use 1–4 distinct positive coins.' : amount < 0 || amount > 12 ? 'Use 0 ≤ amount ≤ 12.' : null),
    run({ coins, amount, order }) {
      const dp = new Array(amount + 1).fill(0); dp[0] = 1; const steps = [{ dp: [...dp], cur: 0, line: 'base', note: 'dp[0] = 1: the empty combination makes 0.' }];
      if (order === 'coins') {
        for (const c of coins) for (let a = c; a <= amount; a++) { const add = dp[a - c]; dp[a] += add; steps.push({ dp: [...dp], cur: a, dep: [a - c], line: 'coins', head: `coin ${c}`, note: `Coin ${c}, a = ${a}: dp[${a}] += dp[${a - c}] (${add}) → ${dp[a]}.`, why: a === c && c === coins[coins.length - 1] && coins.length > 1 ? 'With coins outer, coin c is only ever added after all smaller-index coins, so {1, 2} is counted once and never again as {2, 1}.' : null }); }
      } else {
        for (let a = 1; a <= amount; a++) for (const c of coins) if (c <= a) { const add = dp[a - c]; dp[a] += add; steps.push({ dp: [...dp], cur: a, dep: [a - c], line: 'amounts', head: `a = ${a}`, note: `a = ${a}, last coin ${c}: dp[${a}] += dp[${a - c}] (${add}) → ${dp[a]}.`, why: a === amount && c === coins[0] ? 'Any coin can be the last one at any amount, so 1 + 2 and 2 + 1 both count: these are ordered sequences (problem 377), not combinations.' : null }); }
      }
      steps.push({ dp, line: 'ret', done: true, result: dp[amount], note: `${order === 'coins' ? 'Combinations' : 'Ordered sequences'} that make ${amount}: ${dp[amount]}.`, why: 'Same table, same O(amount × coins) work: only the loop order changes the meaning.' });
      return steps;
    },
    render(st, stage) {
      const states = {}; (st.dep || []).forEach((k) => (states[k] = 'dep')); if (st.cur != null) states[st.cur] = 'current';
      stage.append(R.row1d(st.dp, { states, label: 'dp[a] = number of ways to make a' + (st.head ? ' (' + st.head + ')' : '') }));
    },
  });

  V.define('grid-dp', {
    title: 'Grid DP: each cell from the cell above and the cell to the left',
    inputs: [{ key: 'mode', label: 'problem', type: 'select', def: 'paths', options: [{ value: 'paths', label: '62/63: count paths (1 = obstacle)' }, { value: 'sum', label: '64: minimum path sum' }] }, { key: 'grid', label: 'grid', type: 'json', def: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], wide: true }],
    presets: [{ label: '62: 3 × 3', input: { mode: 'paths', grid: [[0, 0, 0], [0, 0, 0], [0, 0, 0]] } }, { label: '63: obstacle in the middle', input: { mode: 'paths', grid: [[0, 0, 0], [0, 1, 0], [0, 0, 0]] } }, { label: '63: obstacle on the first row', input: { mode: 'paths', grid: [[0, 1, 0], [0, 0, 0]] } }, { label: '64: LeetCode example', input: { mode: 'sum', grid: [[1, 3, 1], [1, 5, 1], [4, 2, 1]] } }],
    legend: [['current', 'dp[r][c]'], ['compare', 'top and left'], ['done', 'answer']],
    code: `
// one row is enough: row[c] holds the row above until it is overwritten
for (let r = 0; r < m; r++)
  for (let c = 0; c < n; c++) {
    if (r === 0 && c === 0) row[0] = start;                     // base  //@base
    else row[c] = combine(r > 0 ? row[c] : none,                // top   //@trans
                          c > 0 ? row[c - 1] : none) + cell;    // left
  }
return row[n - 1];                                              //@ret
// paths: combine = +, none = 0, obstacle → 0.   sum: combine = min, none = ∞`,
    validate: ({ mode, grid }) => (!Array.isArray(grid) || !grid.length || grid.length > 6 || grid.some((r) => !Array.isArray(r) || r.length !== grid[0].length || r.length > 6) ? 'Use a rectangular grid up to 6 × 6.' : mode === 'paths' && grid.flat().some((v) => v !== 0 && v !== 1) ? 'For paths, use 0 (open) and 1 (obstacle).' : mode === 'sum' && grid.flat().some((v) => v < 0) ? 'Use non-negative cell costs.' : null),
    run({ mode, grid }) {
      const m = grid.length, n = grid[0].length, dp = grid.map((r) => r.map(() => null)), steps = [];
      for (let r = 0; r < m; r++) for (let c = 0; c < n; c++) {
        const top = r > 0 ? dp[r - 1][c] : null, left = c > 0 ? dp[r][c - 1] : null; let note;
        if (mode === 'paths') {
          if (grid[r][c] === 1) { dp[r][c] = 0; note = `(${r},${c}) is an obstacle: 0 paths.`; }
          else if (!r && !c) { dp[r][c] = 1; note = 'Start: 1 path.'; }
          else { dp[r][c] = (top || 0) + (left || 0); note = `(${r},${c}) = top ${top ?? '—'} + left ${left ?? '—'} = ${dp[r][c]}.`; }
        } else {
          if (!r && !c) { dp[r][c] = grid[0][0]; note = `Start: cost ${grid[0][0]}.`; }
          else { const best = Math.min(top ?? Infinity, left ?? Infinity); dp[r][c] = best + grid[r][c]; note = `(${r},${c}) = min(top ${top ?? '—'}, left ${left ?? '—'}) + ${grid[r][c]} = ${dp[r][c]}.`; }
        }
        steps.push({ dp: dp.map((x) => [...x]), cur: [r, c], dep: [r > 0 && [r - 1, c], c > 0 && [r, c - 1]].filter(Boolean), line: !r && !c ? 'base' : 'trans', note, why: r === 1 && c === 1 ? 'Every path into (r, c) arrives from above or from the left, so those two cells are all it needs. When filling row r, the row above is only read at column c, so one array updated left to right holds both.' : r === 0 && c === 1 && mode === 'paths' && grid[0].includes(1) ? 'On the first row an obstacle blocks everything after it: those cells have only a left neighbour.' : null });
      }
      steps.push({ dp, best: [m - 1, n - 1], line: 'ret', done: true, result: dp[m - 1][n - 1], note: `Answer: ${dp[m - 1][n - 1]}.`, why: 'O(m·n) time; O(n) extra space with one row.' });
      return steps;
    },
    render(st, stage, { mode, grid }) {
      const states = {}; (st.dep || []).forEach(([r, c]) => (states[r + ',' + c] = 'dep')); if (st.cur) states[st.cur.join(',')] = 'current'; if (st.best) states[st.best.join(',')] = 'best';
      if (mode === 'sum') stage.append(R.grid(grid, { label: 'cell costs' }));
      else stage.append(R.grid(grid, { label: 'grid (1 = obstacle)', states: Object.fromEntries(grid.flatMap((row, r) => row.map((v, c) => [r + ',' + c, v ? 'wall' : null])).filter(([, v]) => v)) }));
      stage.append(R.table(st.dp, { states, label: mode === 'paths' ? 'dp[r][c] = paths to (r, c)' : 'dp[r][c] = cheapest path sum to (r, c)', colHead: st.dp[0].map((_, c) => c), rowHead: st.dp.map((_, r) => r) }));
    },
  });

  V.define('word-break', {
    title: 'Word Break: dp[i] = the first i characters can be segmented',
    inputs: [{ key: 's', label: 's', type: 'string', def: 'leetcode' }, { key: 'words', label: 'wordDict', type: 'json', def: ['leet', 'code'], wide: true }],
    presets: [{ label: 'Day 5: "leetcode"', input: { s: 'leetcode', words: ['leet', 'code'] } }, { label: '"applepenapple"', input: { s: 'applepenapple', words: ['apple', 'pen'] } }, { label: 'False: "catsandog"', input: { s: 'catsandog', words: ['cats', 'dog', 'sand', 'and', 'cat'] } }],
    legend: [['current', 'dp[i]'], ['compare', 'dp[j] that made it true']],
    code: `
const dict = new Set(wordDict), dp = new Array(n + 1).fill(false);
dp[0] = true;                                // the empty prefix   //@base
for (let i = 1; i <= n; i++)
  for (let j = 0; j < i; j++)
    if (dp[j] && dict.has(s.slice(j, i))) { dp[i] = true; break; }   //@trans
return dp[n];                                                    //@ret`,
    validate: ({ s, words }) => (s.length < 1 || s.length > 16 ? 'Use a string of 1–16 characters.' : !Array.isArray(words) || words.length > 8 || words.some((w) => typeof w !== 'string' || !w) ? 'wordDict is a list of up to 8 non-empty strings.' : null),
    run({ s, words }) {
      const dict = new Set(words), n = s.length, dp = new Array(n + 1).fill(false); dp[0] = true; const steps = [{ dp: [...dp], cur: 0, line: 'base', note: 'dp[0] = true: the empty prefix needs no words.' }];
      for (let i = 1; i <= n; i++) {
        let hit = -1; for (let j = 0; j < i; j++) if (dp[j] && dict.has(s.slice(j, i))) { hit = j; dp[i] = true; break; }
        steps.push({ dp: [...dp], cur: i, dep: hit >= 0 ? [hit] : [], piece: hit >= 0 ? [hit, i - 1] : null, line: 'trans', note: hit >= 0 ? `dp[${i}] = true: dp[${hit}] is true and "${s.slice(hit, i)}" is a word.` : `dp[${i}] = false: no true dp[j] is followed by a dictionary word ending at ${i}.`, why: i === n && hit >= 0 ? 'The prefix s[0..i) splits iff some valid prefix s[0..j) is followed by one word s[j..i).' : null });
      }
      steps.push({ dp, line: 'ret', done: true, result: dp[n], note: `dp[${n}] = ${dp[n]}.`, why: 'O(n²) pairs (j, i), each with an O(n) slice: O(n³) worst case; bounding j by the longest word makes it O(n · L²).' });
      return steps;
    },
    render(st, stage, { s }) {
      const states = {}; (st.dep || []).forEach((k) => (states[k] = 'dep')); if (st.cur != null) states[st.cur] = 'current';
      const cs = {}; if (st.piece) for (let k = st.piece[0]; k <= st.piece[1]; k++) cs[k] = 'window';
      stage.append(R.cells([...s], { states: cs, label: 's (window = the last word)' }));
      stage.append(R.row1d(st.dp.map((b, k) => (st.done || k <= st.cur ? (b ? 'T' : 'F') : null)), { states, label: 'dp[i]: can s[0..i) be split into words?' }));
    },
  });

  V.define('decode-ways', {
    title: 'Decode Ways: a one-digit piece and a two-digit piece',
    inputs: [{ key: 's', label: 'digits', type: 'string', def: '226' }],
    presets: [{ label: '"226"', input: { s: '226' } }, { label: '"06" (invalid start)', input: { s: '06' } }, { label: '"2101"', input: { s: '2101' } }, { label: '"11106"', input: { s: '11106' } }],
    legend: [['current', 'dp[i]'], ['compare', 'contributions from dp[i − 1] and dp[i − 2]']],
    code: `
const dp = new Array(n + 1).fill(0); dp[0] = 1;       // empty prefix  //@base
for (let i = 1; i <= n; i++) {
  if (s[i - 1] !== '0') dp[i] += dp[i - 1];          // one digit 1–9 //@one
  const two = Number(s.slice(i - 2, i));
  if (i >= 2 && two >= 10 && two <= 26) dp[i] += dp[i - 2];  // 10–26  //@two
}
return dp[n];                                                       //@ret`,
    validate: ({ s }) => (!/^\d{1,14}$/.test(s) ? 'Use 1–14 digits.' : null),
    run({ s }) {
      const n = s.length, dp = new Array(n + 1).fill(0); dp[0] = 1; const steps = [{ dp: [...dp], cur: 0, line: 'base', note: 'dp[0] = 1: one way to decode the empty prefix.' }];
      for (let i = 1; i <= n; i++) {
        const parts = [], dep = [], lines = [];
        if (s[i - 1] !== '0') { dp[i] += dp[i - 1]; parts.push(`"${s[i - 1]}" alone → +dp[${i - 1}] (${dp[i - 1]})`); dep.push(i - 1); lines.push('one'); } else parts.push('"0" cannot stand alone');
        if (i >= 2) { const two = Number(s.slice(i - 2, i)); if (s[i - 2] !== '0' && two >= 10 && two <= 26) { dp[i] += dp[i - 2]; parts.push(`"${s.slice(i - 2, i)}" → +dp[${i - 2}] (${dp[i - 2]})`); dep.push(i - 2); lines.push('two'); } else parts.push(`"${s.slice(i - 2, i)}" is not 10–26`); }
        steps.push({ dp: [...dp], cur: i, dep, line: lines.length ? lines : 'one', note: `dp[${i}]: ${parts.join('; ')}. dp[${i}] = ${dp[i]}.`, why: s[i - 1] === '0' ? 'A 0 must be the second digit of 10 or 20; otherwise the count drops to 0 and stays there.' : null });
      }
      steps.push({ dp, line: 'ret', done: true, result: dp[n], note: `${dp[n]} decoding${dp[n] === 1 ? '' : 's'}.`, why: 'O(n) time; O(1) space with two variables, as in Climbing Stairs, but each step is conditional.' });
      return steps;
    },
    render(st, stage, { s }) {
      const states = {}; (st.dep || []).forEach((k) => (states[k] = 'dep')); if (st.cur != null) states[st.cur] = 'current';
      stage.append(R.cells([...s], { states: st.cur ? { [st.cur - 1]: 'current' } : {}, label: 's' }));
      stage.append(R.row1d(st.dp.map((v, k) => (st.done || k <= st.cur ? v : null)), { states, label: 'dp[i] = ways to decode the first i digits' }));
    },
  });

  V.define('max-product', {
    title: 'Maximum Product Subarray: keep the largest and the smallest product',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [2, 3, -2, 4], wide: true }],
    presets: [{ label: 'LeetCode example 1', input: { nums: [2, 3, -2, 4] } }, { label: 'Two negatives', input: { nums: [-2, 3, -4] } }, { label: 'Zeros reset', input: { nums: [-2, 0, -1] } }],
    legend: [['current', 'i'], ['done', 'best so far']],
    code: `
let curMax = nums[0], curMin = nums[0], best = nums[0];
for (let i = 1; i < nums.length; i++) {
  const x = nums[i];
  if (x < 0) [curMax, curMin] = [curMin, curMax];   // a negative swaps them  //@swap
  curMax = Math.max(x, curMax * x);                                          //@upd
  curMin = Math.min(x, curMin * x);
  best = Math.max(best, curMax);                                             //@best
}
return best;`,
    validate: ({ nums }) => (nums.length < 1 || nums.length > 12 || nums.some((x) => Math.abs(x) > 9) ? 'Use 1–12 numbers between −9 and 9.' : null),
    run({ nums }) {
      let mx = nums[0], mn = nums[0], best = nums[0]; const steps = [{ i: 0, mx, mn, best, line: 'best', note: `Start: curMax = curMin = best = ${nums[0]}.` }];
      for (let i = 1; i < nums.length; i++) {
        const x = nums[i]; const sw = x < 0; if (sw) [mx, mn] = [mn, mx];
        mx = Math.max(x, mx * x); mn = Math.min(x, mn * x); best = Math.max(best, mx);
        steps.push({ i, mx, mn, best, line: sw ? ['swap', 'upd', 'best'] : ['upd', 'best'], note: `x = ${x}${sw ? ' (negative: swap first)' : ''}: curMax = ${mx}, curMin = ${mn}, best = ${best}.`, why: sw && i < 4 ? 'Multiplying by a negative turns the smallest product into the largest, so the minimum must be tracked too. Kadane with one variable would lose it.' : x === 0 ? 'A zero resets both: any subarray through it has product 0.' : null });
      }
      steps.push({ i: null, mx, mn, best, done: true, line: null, result: best, note: `Maximum product: ${best}.`, why: 'O(n) time, O(1) space.' });
      return steps;
    },
    render(st, stage, { nums }) {
      stage.append(R.cells(nums, { states: st.i != null ? { [st.i]: 'current' } : {}, ptrs: st.i != null ? { [st.i]: 'i' } : {}, label: 'nums' }));
      stage.append(R.vars({ curMax: st.mx, curMin: st.mn, best: st.best }));
    },
  });
})(window);
