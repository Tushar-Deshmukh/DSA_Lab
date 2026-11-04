// Week 11 visualizers: 0/1 knapsack direction, two-sequence tables, LIS (both methods),
// palindromes by centre expansion, a state machine, and bit operations shown bit by bit.
(function (g) {
  'use strict';
  const R = g.R, V = g.Viz;

  V.define('knap01', {
    title: '0/1 knapsack: why j must go downwards',
    inputs: [{ key: 'nums', label: 'items (weights)', type: 'numbers', def: [1, 5, 11, 5] }, { key: 'target', label: 'target (blank = total / 2)', type: 'string', def: '' }, { key: 'dir', label: 'direction of j', type: 'select', def: 'down', options: [{ value: 'down', label: 'downwards (correct, 0/1)' }, { value: 'up', label: 'upwards (reuses items)' }] }],
    presets: [{ label: '416: [1,5,11,5]', input: { nums: [1, 5, 11, 5], target: '', dir: 'down' } }, { label: 'Reuse bug: one item of 2, target 4', input: { nums: [2], target: '4', dir: 'up' } }, { label: 'Same, downwards', input: { nums: [2], target: '4', dir: 'down' } }, { label: '416: [1,2,3,5] (false)', input: { nums: [1, 2, 3, 5], target: '', dir: 'down' } }],
    legend: [['current', 'set now'], ['compare', 'read dp[j − x]'], ['done', 'answer']],
    code: `
const dp = new Array(target + 1).fill(false); dp[0] = true;   // empty subset   //@base
for (const x of nums)
  for (let j = target; j >= x; j--)          // downwards: dp[j-x] is from before x  //@down
    if (dp[j - x]) dp[j] = true;                                                  //@set
// upwards (for (let j = x; j <= target; j++)) reads values already updated with x //@up
return dp[target];                                                                //@ret`,
    validate: ({ nums, target }) => { if (nums.length < 1 || nums.length > 6 || nums.some((x) => x < 1)) return 'Use 1–6 positive weights.'; const t = target === '' ? nums.reduce((a, b) => a + b, 0) / 2 : Number(target); return !Number.isInteger(t) && target === '' ? null : !Number.isInteger(t) || t < 0 || t > 24 ? 'Use a whole target between 0 and 24.' : null; },
    run({ nums, target, dir }) {
      const total = nums.reduce((a, b) => a + b, 0); const steps = [];
      if (target === '' && total % 2) { steps.push({ dp: [], line: 'ret', done: true, result: false, note: `The total ${total} is odd, so no equal split exists: false before any table.`, why: 'Always check the cheap impossibility conditions first.' }); return steps; }
      const T = target === '' ? total / 2 : Number(target); const dp = new Array(T + 1).fill(false); dp[0] = true;
      steps.push({ dp: [...dp], cur: [0], line: 'base', note: `target = ${T}. dp[0] = true: the empty subset makes 0.` });
      nums.forEach((x, k) => {
        const js = []; if (dir === 'down') for (let j = T; j >= x; j--) js.push(j); else for (let j = x; j <= T; j++) js.push(j);
        for (const j of js) if (dp[j - x] && !dp[j]) { dp[j] = true; const reused = dir === 'up' && j - 2 * x >= 0 && steps.some((s) => s.item === k && s.cur && s.cur[0] === j - x); steps.push({ dp: [...dp], cur: [j], dep: [j - x], item: k, line: dir === 'down' ? ['down', 'set'] : ['up', 'set'], note: `Item ${x}: dp[${j - x}] is true, so dp[${j}] = true.${reused ? ` But dp[${j - x}] was itself set by item ${x} a moment ago: item ${x} is being used twice.` : ''}`, why: reused ? 'This is the reuse bug: upward iteration turns 0/1 knapsack into the unbounded knapsack from Week 10.' : dir === 'down' && k === 0 ? 'Going downwards, dp[j − x] has not been touched by this item yet, so it reflects only the earlier items.' : null }); }
        steps.push({ dp: [...dp], item: k, line: dir === 'down' ? 'down' : 'up', note: `After item ${k} (${x}): reachable sums ${dp.map((b, j) => (b ? j : -1)).filter((j) => j >= 0).join(', ')}.` });
      });
      steps.push({ dp, best: dp[T] ? [T] : [], line: 'ret', done: true, result: dp[T], note: `dp[${T}] = ${dp[T]}.`, why: 'O(n × target) time, O(target) space: pseudo-polynomial, fine for targets up to about 10⁴–10⁵.' });
      return steps;
    },
    render(st, stage, { nums }) {
      const states = {}; (st.dep || []).forEach((k) => (states[k] = 'dep')); (st.cur || []).forEach((k) => (states[k] = 'current')); (st.best || []).forEach((k) => (states[k] = 'best'));
      stage.append(R.cells(nums, { states: st.item != null ? { [st.item]: 'current' } : {}, label: 'items' }));
      if (st.dp.length) stage.append(R.row1d(st.dp.map((b) => (b ? 'T' : 'F')), { states, label: 'dp[j]: can the items so far make sum j?' }));
    },
  });

  V.define('two-seq', {
    title: 'Two-sequence DP: LCS and edit distance on the same table',
    inputs: [{ key: 'mode', label: 'problem', type: 'select', def: 'lcs', options: [{ value: 'lcs', label: '1143: longest common subsequence' }, { value: 'edit', label: '72: edit distance' }] }, { key: 'a', label: 'a (rows)', type: 'string', def: 'abcde' }, { key: 'b', label: 'b (columns)', type: 'string', def: 'ace' }],
    presets: [{ label: 'LCS "abcde" / "ace"', input: { mode: 'lcs', a: 'abcde', b: 'ace' } }, { label: 'Edit "horse" → "ros"', input: { mode: 'edit', a: 'horse', b: 'ros' } }, { label: 'Edit "intention" → "execution"', input: { mode: 'edit', a: 'intention', b: 'execution' } }, { label: 'LCS with nothing in common', input: { mode: 'lcs', a: 'abc', b: 'def' } }],
    legend: [['current', 'dp[i][j]'], ['compare', 'cells it reads'], ['done', 'answer']],
    code: `
// dp[i][j] = answer for the prefixes a[0..i) and b[0..j); row 0 / column 0 = empty prefix
for (let i = 1; i <= m; i++)
  for (let j = 1; j <= n; j++)
    if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + (lcs ? 1 : 0);   // match //@match
    else dp[i][j] = lcs ? Math.max(dp[i - 1][j], dp[i][j - 1])               //@lcs
                        : 1 + Math.min(dp[i - 1][j],      // delete a[i-1]   //@edit
                                       dp[i][j - 1],      // insert b[j-1]
                                       dp[i - 1][j - 1]); // replace
return dp[m][n];                                                            //@ret`,
    validate: ({ a, b }) => (a.length > 9 || b.length > 9 ? 'Use strings of at most 9 characters.' : null),
    run({ mode, a, b }) {
      const m = a.length, n = b.length, lcs = mode === 'lcs'; const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 || j === 0 ? (lcs ? 0 : i + j) : null))); const steps = [];
      steps.push({ dp: dp.map((r) => [...r]), line: null, note: lcs ? 'Row 0 and column 0 are 0: nothing is common with an empty prefix.' : 'dp[i][0] = i (delete all i characters) and dp[0][j] = j (insert all j characters).' });
      for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
        let note, dep, line;
        if (a[i - 1] === b[j - 1]) { dp[i][j] = dp[i - 1][j - 1] + (lcs ? 1 : 0); dep = [[i - 1, j - 1]]; line = 'match'; note = `"${a[i - 1]}" = "${b[j - 1]}": diagonal ${dp[i - 1][j - 1]}${lcs ? ' + 1' : ' (no operation needed)'} = ${dp[i][j]}.`; }
        else if (lcs) { dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]); dep = [[i - 1, j], [i, j - 1]]; line = 'lcs'; note = `"${a[i - 1]}" ≠ "${b[j - 1]}": max(top ${dp[i - 1][j]}, left ${dp[i][j - 1]}) = ${dp[i][j]}.`; }
        else { const del = dp[i - 1][j], ins = dp[i][j - 1], rep = dp[i - 1][j - 1]; dp[i][j] = 1 + Math.min(del, ins, rep); dep = [[i - 1, j], [i, j - 1], [i - 1, j - 1]]; line = 'edit'; const op = rep <= del && rep <= ins ? 'replace' : del <= ins ? 'delete' : 'insert'; note = `"${a[i - 1]}" ≠ "${b[j - 1]}": 1 + min(delete ${del}, insert ${ins}, replace ${rep}) = ${dp[i][j]} (${op}).`; }
        steps.push({ dp: dp.map((r) => [...r]), cur: [i, j], dep, line, note, why: i === 1 && j === 1 ? (lcs ? 'Any common subsequence of the two prefixes either uses both last characters (only if they match) or drops one of them.' : 'Any way to turn a[0..i) into b[0..j) ends with one of: a match, deleting a[i−1], inserting b[j−1], or replacing a[i−1] by b[j−1].') : null });
      }
      steps.push({ dp, best: [m, n], line: 'ret', done: true, result: dp[m][n], note: `Answer: dp[${m}][${n}] = ${dp[m][n]}.`, why: 'O(m·n) time. Each row reads only the row above, so two rows (O(min(m, n)) space) are enough.' });
      return steps;
    },
    render(st, stage, { a, b }) {
      const states = {}; (st.dep || []).forEach(([i, j]) => (states[i + ',' + j] = 'dep')); if (st.cur) states[st.cur.join(',')] = 'current'; if (st.best) states[st.best.join(',')] = 'best';
      stage.append(R.table(st.dp, { states, colHead: ['""', ...b], rowHead: ['""', ...a], label: 'dp[i][j] for prefixes a[0..i) (rows) and b[0..j) (columns)' }));
    },
  });

  V.define('lis', {
    title: 'Longest increasing subsequence: O(n²) table, then the tails method',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [10, 9, 2, 5, 3, 7, 101, 18], wide: true }, { key: 'method', label: 'method', type: 'select', def: 'dp', options: [{ value: 'dp', label: 'O(n²): dp[i] ending at i' }, { value: 'tails', label: 'O(n log n): tails + binary search' }] }],
    presets: [{ label: 'Roadmap example, O(n²)', input: { nums: [10, 9, 2, 5, 3, 7, 101, 18], method: 'dp' } }, { label: 'Roadmap example, tails', input: { nums: [10, 9, 2, 5, 3, 7, 101, 18], method: 'tails' } }, { label: 'Duplicates (strictly increasing)', input: { nums: [7, 7, 7, 7], method: 'tails' } }, { label: '[0,1,0,3,2,3]', input: { nums: [0, 1, 0, 3, 2, 3], method: 'dp' } }],
    legend: [['current', 'i'], ['compare', 'j with nums[j] < nums[i] (dp) / replaced slot (tails)'], ['done', 'best']],
    code: `
// O(n²): dp[i] = length of the longest increasing subsequence ENDING at i
for (let i = 0; i < n; i++) { dp[i] = 1;
  for (let j = 0; j < i; j++) if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1); }  //@dp
// O(n log n): tails[k] = smallest tail of an increasing subsequence of length k + 1
for (const x of nums) {
  const k = lowerBound(tails, x);           // first tail >= x (Week 3)    //@lb
  tails[k] = x;                             // append (k = length) or replace  //@put
}
return tails.length;`,
    validate: ({ nums }) => (nums.length < 1 || nums.length > 12 ? 'Use 1–12 numbers.' : null),
    run({ nums, method }) {
      const steps = [];
      if (method === 'dp') {
        const dp = new Array(nums.length).fill(null); let best = 0;
        for (let i = 0; i < nums.length; i++) {
          dp[i] = 1; const from = [];
          for (let j = 0; j < i; j++) if (nums[j] < nums[i]) { from.push(j); dp[i] = Math.max(dp[i], dp[j] + 1); }
          best = Math.max(best, dp[i]);
          steps.push({ dp: [...dp], i, dep: from, best, line: 'dp', note: from.length ? `nums[${i}] = ${nums[i]} can extend ${from.map((j) => nums[j]).join(', ')}: dp[${i}] = 1 + max(${from.map((j) => dp[j]).join(', ')}) = ${dp[i]}.` : `nums[${i}] = ${nums[i]}: nothing smaller before it, dp[${i}] = 1.`, why: i === 3 ? '"Ending at i" is the restriction that makes the transition possible: to extend a subsequence you need to know its last element.' : null });
        }
        steps.push({ dp, i: null, best, done: true, line: null, result: best, note: `LIS length = max(dp) = ${best}. The answer is not dp[n − 1]: the best subsequence may end anywhere.` });
      } else {
        const tails = [];
        for (let i = 0; i < nums.length; i++) {
          const x = nums[i]; let lo = 0, hi = tails.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (tails[mid] < x) lo = mid + 1; else hi = mid; }
          const app = lo === tails.length; const old = tails[lo]; tails[lo] = x;
          steps.push({ tails: [...tails], i, slot: lo, line: ['lb', 'put'], note: app ? `${x} is larger than every tail: append. Length ${tails.length}.` : `${x}: first tail ≥ ${x} is ${old} at index ${lo}; replace it with ${x}.`, why: !app && lo === 0 && i < 3 ? 'A smaller tail for the same length can only help later numbers extend it. tails stays sorted because each replacement keeps tails[k − 1] < x ≤ old tails[k].' : null });
        }
        steps.push({ tails, i: null, done: true, line: null, result: tails.length, note: `Length ${tails.length}. tails = [${tails.join(', ')}] is not necessarily a real subsequence; only its length is meaningful.` });
      }
      return steps;
    },
    render(st, stage, { nums, method }) {
      const s0 = {}; if (st.i != null) s0[st.i] = 'current'; (st.dep || []).forEach((j) => (s0[j] = 'compare'));
      stage.append(R.cells(nums, { states: s0, ptrs: st.i != null ? { [st.i]: 'i' } : {}, label: 'nums' }));
      if (method === 'dp') { const s = {}; if (st.i != null) s[st.i] = 'current'; (st.dep || []).forEach((j) => (s[j] = 'dep')); stage.append(R.row1d(st.dp, { states: s, label: 'dp[i] = LIS ending at i' })); stage.append(R.vars({ best: st.best })); }
      else stage.append(R.cells(st.tails.length ? st.tails : ['·'], { states: st.slot != null ? { [st.slot]: 'compare' } : {}, label: 'tails (sorted)' }));
    },
  });

  V.define('pal-expand', {
    title: 'Palindromes: expand around all 2n − 1 centres',
    inputs: [{ key: 's', label: 's', type: 'string', def: 'babad' }, { key: 'goal', label: 'goal', type: 'select', def: 'longest', options: [{ value: 'longest', label: '5: longest palindromic substring' }, { value: 'count', label: '647: count palindromic substrings' }] }],
    presets: [{ label: '"babad" (longest)', input: { s: 'babad', goal: 'longest' } }, { label: '"cbbd" (even centre)', input: { s: 'cbbd', goal: 'longest' } }, { label: '"aaa" (count)', input: { s: 'aaa', goal: 'count' } }],
    legend: [['window', 'current palindrome'], ['current', 'the centre'], ['done', 'best so far']],
    code: `
for (let c = 0; c < 2 * n - 1; c++) {          // even c: a letter; odd c: a gap
  let l = c >> 1, r = l + (c & 1);
  while (l >= 0 && r < n && s[l] === s[r]) {   // still a palindrome          //@expand
    count++; if (r - l + 1 > bestLen) [bestL, bestLen] = [l, r - l + 1];       //@record
    l--; r++;
  }
}`,
    validate: ({ s }) => (s.length < 1 || s.length > 12 ? 'Use 1–12 characters.' : null),
    run({ s, goal }) {
      const n = s.length, steps = []; let count = 0, bl = 0, blen = 0, evenShown = false;
      for (let c = 0; c < 2 * n - 1; c++) {
        let l = c >> 1, r = l + (c & 1); let any = false;
        while (l >= 0 && r < n && s[l] === s[r]) {
          any = true; count++; if (r - l + 1 > blen) { bl = l; blen = r - l + 1; }
          steps.push({ c, l, r, count, bl, blen, line: ['expand', 'record'], note: `Centre ${c & 1 ? 'between ' + (c >> 1) + ' and ' + ((c >> 1) + 1) : 'at ' + (c >> 1)}: "${s.slice(l, r + 1)}" is a palindrome. Count ${count}${r - l + 1 === blen && bl === l ? ', new longest' : ''}.`, why: (c & 1) && !evenShown && (evenShown = true) ? 'Even-length palindromes have a gap as their centre, which is why there are 2n − 1 centres, not n.' : null });
          l--; r++;
        }
        if (!any) steps.push({ c, l: null, r: null, count, bl, blen, line: 'expand', note: `Centre between ${c >> 1} and ${(c >> 1) + 1}: "${s[c >> 1]}" ≠ "${s[(c >> 1) + 1]}", no even palindrome here.` });
      }
      const res = goal === 'longest' ? s.slice(bl, bl + blen) : count;
      steps.push({ c: null, l: null, r: null, count, bl, blen, done: true, line: null, result: goal === 'longest' ? blen : count, note: goal === 'longest' ? `Longest: "${res}" (length ${blen}).` : `${count} palindromic substrings.`, why: 'O(n²) time in the worst case ("aaaa…"), O(1) space. Interval DP gives the same time with an O(n²) table, useful only when later steps need the table.' });
      return steps;
    },
    render(st, stage, { s }) {
      const states = {}; if (st.bl != null && st.blen) for (let k = st.bl; k < st.bl + st.blen; k++) states[k] = 'done';
      if (st.l != null) for (let k = st.l; k <= st.r; k++) states[k] = 'window';
      if (st.c != null && !(st.c & 1)) states[st.c >> 1] = 'current';
      stage.append(R.cells([...s], { states, ptrs: st.l != null ? (st.l === st.r ? { [st.l]: 'l=r' } : { [st.l]: 'l', [st.r]: 'r' }) : {}, label: 's' }));
      stage.append(R.vars({ count: st.count, 'longest so far': st.blen ? '"' + s.slice(st.bl, st.bl + st.blen) + '"' : '""' }));
    },
  });

  V.define('stock-cooldown', {
    title: 'State machine: hold, sold, rest (stock with cooldown, 309)',
    inputs: [{ key: 'prices', label: 'prices', type: 'numbers', def: [1, 2, 3, 0, 2], wide: true }],
    presets: [{ label: 'LeetCode example', input: { prices: [1, 2, 3, 0, 2] } }, { label: 'Falling prices', input: { prices: [5, 4, 3, 2] } }, { label: 'Cooldown matters', input: { prices: [1, 4, 2, 7] } }],
    legend: [['current', 'today']],
    code: `
let hold = -Infinity, sold = 0, rest = 0;      // best profit in each mode
for (const p of prices) {
  const prevSold = sold;                       // keep yesterday's values  //@save
  sold = hold + p;                             // sell today               //@sell
  hold = Math.max(hold, rest - p);             // keep holding, or buy (only from rest) //@buy
  rest = Math.max(rest, prevSold);             // cooldown ends → rest     //@rest
}
return Math.max(sold, rest);                                               //@ret`,
    validate: ({ prices }) => (prices.length < 1 || prices.length > 12 || prices.some((p) => p < 0) ? 'Use 1–12 non-negative prices.' : null),
    run({ prices }) {
      let hold = -Infinity, sold = 0, rest = 0; const steps = [{ day: null, hold, sold, rest, line: 'save', note: 'Before day 0: cannot be holding (−∞), 0 profit otherwise.' }];
      prices.forEach((p, d) => {
        const ps = sold, ph = hold, pr = rest; sold = ph + p; hold = Math.max(ph, pr - p); rest = Math.max(pr, ps);
        steps.push({ day: d, hold, sold, rest, line: ['save', 'sell', 'buy', 'rest'], note: `Day ${d}, price ${p}: sold = hold + ${p} = ${sold === -Infinity ? '−∞' : sold}; hold = max(${ph === -Infinity ? '−∞' : ph}, rest ${pr} − ${p}) = ${hold}; rest = max(${pr}, yesterday's sold ${ps}) = ${rest}.`, why: d === 0 ? 'Buying is only allowed from rest, never straight after selling: that is the cooldown, encoded as the missing arrow sold → hold.' : null });
      });
      const ans = Math.max(sold, rest);
      steps.push({ day: null, hold, sold, rest, done: true, line: 'ret', result: ans, note: `Best profit: max(sold, rest) = ${ans}.`, why: 'O(n) time, O(1) space. Compute all three from yesterday\'s values: overwriting one before the others are computed is the classic bug.' });
      return steps;
    },
    render(st, stage, { prices }) {
      stage.append(R.cells(prices, { states: st.day != null ? { [st.day]: 'current' } : {}, ptrs: st.day != null ? { [st.day]: 'today' } : {}, label: 'prices' }));
      stage.append(R.vars({ hold: st.hold, sold: st.sold, rest: st.rest }));
      stage.append(R.graph({ nodes: [{ id: 'rest', x: 0.1, y: 0.75 }, { id: 'hold', x: 0.5, y: 0.2 }, { id: 'sold', x: 0.9, y: 0.75 }], edges: [{ u: 'rest', v: 'hold', w: 'buy' }, { u: 'hold', v: 'sold', w: 'sell' }, { u: 'sold', v: 'rest', w: 'cooldown' }], directed: true }, { w: 300, h: 170, r: 22, pad: 34, label: 'modes (hold and rest may also stay as they are)', subs: { rest: st.rest, hold: st.hold, sold: st.sold } }));
    },
  });

  // ---------- bits ----------
  V.define('bit-count', {
    title: "Kernighan's trick: x & (x − 1) removes the lowest set bit",
    inputs: [{ key: 'x', label: 'x (32-bit integer)', type: 'int', def: 44 }],
    presets: [{ label: '44 = 101100', input: { x: 44 } }, { label: '255', input: { x: 255 } }, { label: '−1 (all 32 bits)', input: { x: -1 } }, { label: '2³¹ − 1', input: { x: 2147483647 } }],
    legend: [],
    code: `
function hammingWeight(n) {
  let count = 0;
  while (n !== 0) {
    n &= n - 1;            // clears exactly the lowest set bit   //@clear
    count++;                                                    //@count
  }
  return count;                                                 //@ret
}`,
    validate: ({ x }) => (x < -2147483648 || x > 4294967295 ? 'Use a value that fits in 32 bits.' : null),
    run({ x }) {
      let n = x | 0, count = 0; const steps = [{ n, prev: null, count, line: null, note: `n = ${x}${x < 0 ? ' (two\'s complement: all leading bits are 1)' : ''}.` }];
      while (n !== 0) { const prev = n; n &= n - 1; count++; let low = 0; while (!((prev >>> low) & 1)) low++; steps.push({ n, prev, low, count, line: ['clear', 'count'], note: `n & (n − 1): bit ${low} was the lowest 1; it is now 0. count = ${count}.`, why: count === 1 ? 'n − 1 flips the lowest 1 to 0 and every 0 below it to 1; AND with n keeps everything above and clears the rest.' : null }); }
      steps.push({ n, prev: null, count, done: true, line: 'ret', result: count, note: `${count} set bit${count === 1 ? '' : 's'}: the loop ran once per set bit, not once per bit position.` });
      return steps;
    },
    render(st, stage, { x }) {
      const width = x >= 0 && x < 65536 ? 16 : 32;
      if (st.prev != null) { stage.append(R.bits(st.prev, { label: 'n before', width })); stage.append(R.bits(st.prev - 1, { label: 'n − 1', width })); }
      stage.append(R.bits(st.n, { label: st.prev != null ? 'n & (n − 1)' : 'n', changed: st.low != null ? [st.low] : [], width }));
      stage.append(R.vars({ count: st.count }));
    },
  });

  V.define('xor-fold', {
    title: 'XOR folding: every pair cancels',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [4, 1, 2, 1, 2] }, { key: 'mode', label: 'problem', type: 'select', def: 'single', options: [{ value: 'single', label: '136: single number' }, { value: 'missing', label: '268: missing number (XOR indices too)' }] }],
    presets: [{ label: '136: [4,1,2,1,2]', input: { nums: [4, 1, 2, 1, 2], mode: 'single' } }, { label: '268: [3,0,1]', input: { nums: [3, 0, 1], mode: 'missing' } }, { label: '268: [9,6,4,2,3,5,7,0,1]', input: { nums: [9, 6, 4, 2, 3, 5, 7, 0, 1], mode: 'missing' } }],
    legend: [['current', 'folded now']],
    code: `
// 136: let acc = 0; for (const x of nums) acc ^= x;
// 268: let acc = nums.length; nums.forEach((x, i) => { acc ^= i ^ x; });
acc ^= value;            // x ^ x = 0, x ^ 0 = x, order does not matter   //@fold
return acc;                                                             //@ret`,
    validate: ({ nums, mode }) => { if (nums.length < 1 || nums.length > 12 || nums.some((x) => x < 0 || x > 255)) return 'Use 1–12 numbers between 0 and 255.'; if (mode === 'single') { const c = {}; nums.forEach((x) => (c[x] = (c[x] || 0) + 1)); const odd = Object.values(c).filter((v) => v % 2).length; return odd === 1 && Object.values(c).every((v) => v <= 2) ? null : 'For 136, every value appears twice except one.'; } const s = new Set(nums); return s.size === nums.length && nums.every((x) => x <= nums.length) ? null : 'For 268, use distinct values from 0..n with one missing.'; },
    run({ nums, mode }) {
      const steps = []; let acc = mode === 'missing' ? nums.length : 0;
      steps.push({ acc, i: null, v: null, line: null, note: mode === 'missing' ? `Start with acc = n = ${nums.length}: the one index the loop below never visits.` : 'acc = 0.' });
      nums.forEach((x, i) => { const v = mode === 'missing' ? i ^ x : x; acc ^= v; steps.push({ acc, i, v, line: 'fold', note: mode === 'missing' ? `acc ^= ${i} ^ ${x} → ${acc}.` : `acc ^= ${x} → ${acc}.`, why: i === nums.length - 1 ? (mode === 'missing' ? 'Every number 0..n that is present appears twice (once as an index, once as a value) and cancels; the missing one appears once.' : 'Values that appear twice cancel; the single one survives.') : null }); });
      steps.push({ acc, i: null, v: null, done: true, line: 'ret', result: acc, note: `Answer: ${acc}.`, why: 'O(n) time, O(1) space, against O(n) space for a hash set.' });
      return steps;
    },
    render(st, stage, { nums }) {
      stage.append(R.cells(nums, { states: st.i != null ? { [st.i]: 'current' } : {}, label: 'nums' }));
      stage.append(R.bits(st.acc, { width: 8, label: 'acc (low 8 bits)', signed: false }));
    },
  });

  V.define('count-bits-dp', {
    title: 'Counting Bits: bits[i] = bits[i >> 1] + (i & 1)',
    inputs: [{ key: 'n', label: 'n', type: 'int', def: 8 }],
    presets: [{ label: 'n = 8', input: { n: 8 } }, { label: 'n = 5', input: { n: 5 } }, { label: 'n = 0', input: { n: 0 } }],
    legend: [['current', 'bits[i]'], ['compare', 'bits[i >> 1]']],
    code: `
const bits = new Array(n + 1).fill(0);
for (let i = 1; i <= n; i++)
  bits[i] = bits[i >> 1] + (i & 1);    // drop the last bit, then add it back  //@step
return bits;`,
    validate: ({ n }) => (n < 0 || n > 20 ? 'Use 0 ≤ n ≤ 20.' : null),
    run({ n }) {
      const b = new Array(n + 1).fill(null); b[0] = 0; const steps = [{ b: [...b], i: 0, line: null, note: 'bits[0] = 0.' }];
      for (let i = 1; i <= n; i++) { b[i] = b[i >> 1] + (i & 1); steps.push({ b: [...b], i, dep: i >> 1, line: 'step', note: `${i} = ${i.toString(2)}₂: drop the last bit → ${i >> 1} (${(i >> 1).toString(2) || '0'}₂, ${b[i >> 1]} ones), add ${i & 1}. bits[${i}] = ${b[i]}.`, why: i === 3 ? 'i >> 1 is smaller than i, so its answer is already in the table: DP over the binary structure.' : null }); }
      steps.push({ b, i: null, done: true, line: null, result: b, note: `[${b.join(', ')}]`, why: 'O(n) total, instead of O(n log n) for counting each number separately.' });
      return steps;
    },
    render(st, stage) {
      const states = {}; if (st.dep != null) states[st.dep] = 'dep'; if (st.i != null) states[st.i] = 'current';
      stage.append(R.row1d(st.b, { states, label: 'bits[i] = number of 1s in i' }));
      if (st.i) stage.append(R.bits(st.i, { width: 5, label: 'i in binary', signed: false }));
    },
  });
})(window);
