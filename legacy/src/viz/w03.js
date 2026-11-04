// Week 3 visualizers: boundary binary search, rotated arrays, search on the answer,
// flattened matrices, peaks, merge sort, three-way quicksort, merging from the back.
(function (g) {
  'use strict';
  const { el } = g.Core;
  const R = g.R, V = g.Viz;
  const sizeCheck = (a, lo, hi) => (a.length < lo ? 'Use at least ' + lo + ' element' + (lo > 1 ? 's.' : '.') : a.length > hi ? 'Keep it to ' + hi + ' elements so it fits on screen.' : null);
  const isSorted = (a) => a.every((x, i) => i === 0 || a[i - 1] <= x);
  const ptrsOf = (pairs) => { const p = {}; for (const [i, lab] of pairs) { if (i == null) continue; p[i] = p[i] ? [].concat(p[i], lab) : lab; } return p; };

  // ---------- boundary search: lower / upper bound (half-open) ----------
  function boundDef(id, title, op, predText, opFn) {
    V.define(id, {
      title,
      inputs: [{ key: 'nums', label: 'nums (sorted)', type: 'numbers', def: [1, 2, 2, 2, 5], wide: true }, { key: 'target', label: 'target', type: 'number', def: 2 }],
      presets: [{ label: 'Roadmap dry run', input: { nums: [1, 2, 2, 2, 5], target: 2 } }, { label: 'Target absent', input: { nums: [1, 3, 5, 7], target: 4 } }, { label: 'Past the end', input: { nums: [1, 3, 5], target: 9 } }, { label: 'Empty array', input: { nums: [], target: 3 } }, { label: 'All equal', input: { nums: [4, 4, 4, 4], target: 4 } }],
      legend: [['window', 'search range [lo, hi)'], ['current', 'mid'], ['done', 'predicate true'], ['dim', 'discarded']],
      code: `
function ${id === 'bs-lower' ? 'lowerBound' : 'upperBound'}(nums, target) {
  let lo = 0, hi = nums.length;              // answer in [lo, hi]  //@init
  while (lo < hi) {                                                 //@loop
    const mid = lo + ((hi - lo) >> 1);                              //@mid
    if (nums[mid] ${op} target) hi = mid;      // mid may be it     //@true
    else lo = mid + 1;                       // answer is right     //@false
  }
  return lo;                                 // first true index    //@ret
}`,
      validate: ({ nums }) => sizeCheck(nums, 0, 14) || (isSorted(nums) ? null : 'Binary search needs sorted input.'),
      run({ nums: a, target }) {
        const steps = []; let lo = 0, hi = a.length; const tested = {};
        const snap = (o) => Object.assign({ lo, hi, tested: { ...tested } }, o);
        steps.push(snap({ line: 'init', note: `Predicate: nums[i] ${op} ${target}. Over the array it reads ${a.map((x) => (opFn(x, target) ? 'T' : 'F')).join(' ') || '(nothing)'}${a.length ? '' : ''}. We want the first T, or ${a.length} if there is none.`, why: 'hi starts at nums.length, not length − 1, because "no element qualifies" is a valid answer: the insertion point at the end.' }));
        while (lo < hi) {
          const mid = lo + ((hi - lo) >> 1); const t = opFn(a[mid], target); tested[mid] = t;
          if (t) { steps.push(snap({ line: ['mid', 'true'], mid, note: `mid = ${mid}: nums[${mid}] = ${a[mid]} ${op} ${target} is true → hi = ${mid}.`, why: 'mid itself might be the first true index, so keep it in the range: hi = mid, not mid − 1.' })); hi = mid; }
          else { steps.push(snap({ line: ['mid', 'false'], mid, note: `mid = ${mid}: nums[${mid}] = ${a[mid]} ${op} ${target} is false → lo = ${mid + 1}.`, why: 'Everything up to mid is false (the predicate is monotone), so the first true index is strictly to the right.' })); lo = mid + 1; }
        }
        steps.push(snap({ line: 'ret', done: true, result: lo, note: `lo = hi = ${lo}: return ${lo}${lo === a.length ? ' (no element qualifies)' : ' (nums[' + lo + '] = ' + a[lo] + ')'}.`, why: `Each iteration at least halves hi − lo, so about log₂(${a.length + 1}) ≈ ${Math.ceil(Math.log2(a.length + 1))} iterations: O(log n). The range always shrinks, so there is no infinite loop.` }));
        return steps;
      },
      render(st, stage, { nums: a, target }) {
        const vals = [...a, '∅'];
        const states = {}; vals.forEach((_, i) => { if (i < st.lo || i >= st.hi) states[i] = 'dim'; });
        if (st.mid != null) states[st.mid] = 'current';
        if (st.done) states[st.lo] = 'done';
        const ptrs = ptrsOf([[st.lo, 'lo'], [st.hi, 'hi'], [st.done ? null : st.mid, 'mid']]);
        stage.append(R.cells(vals, { states, ptrs, window: st.done ? null : [st.lo, st.hi - 1], label: 'nums (∅ at index n stands for "none")' }));
        const pred = a.map((x, i) => (i in st.tested ? (st.tested[i] ? 'T' : 'F') : '?'));
        const ps = {}; pred.forEach((p, i) => { if (p === 'T') ps[i] = 'done'; else if (p === 'F') ps[i] = 'dim'; });
        stage.append(R.cells(pred, { states: ps, label: `predicate nums[i] ${op} ${target} (? = never evaluated)` }));
        stage.append(R.vars({ lo: st.lo, hi: st.hi, mid: st.mid ?? '·' }));
      },
    });
  }
  boundDef('bs-lower', 'Lower bound: first index with nums[i] ≥ target', '>=', '≥', (x, t) => x >= t);
  boundDef('bs-upper', 'Upper bound: first index with nums[i] > target', '>', '>', (x, t) => x > t);

  V.define('bs-closed', {
    title: 'Exact search with a closed interval [lo, hi] (problem 704)',
    inputs: [{ key: 'nums', label: 'nums (sorted)', type: 'numbers', def: [-1, 0, 3, 5, 9, 12], wide: true }, { key: 'target', label: 'target', type: 'number', def: 9 }],
    presets: [{ label: 'LeetCode example 1', input: { nums: [-1, 0, 3, 5, 9, 12], target: 9 } }, { label: 'LeetCode example 2 (absent)', input: { nums: [-1, 0, 3, 5, 9, 12], target: 2 } }, { label: 'One element', input: { nums: [5], target: 5 } }],
    legend: [['window', 'range [lo, hi]'], ['current', 'mid'], ['done', 'found']],
    code: `
function search(nums, target) {
  let lo = 0, hi = nums.length - 1;           //@init
  while (lo <= hi) {                          //@loop
    const mid = lo + ((hi - lo) >> 1);        //@mid
    if (nums[mid] === target) return mid;     //@hit
    if (nums[mid] < target) lo = mid + 1;     //@right
    else hi = mid - 1;                        //@left
  }
  return -1;                                  //@none
}`,
    validate: ({ nums }) => sizeCheck(nums, 1, 14) || (isSorted(nums) ? null : 'Binary search needs sorted input.'),
    run({ nums: a, target }) {
      const steps = []; let lo = 0, hi = a.length - 1;
      steps.push({ lo, hi, line: 'init', note: 'Closed range [0, n − 1]: every index in it is still a candidate.' });
      while (lo <= hi) {
        const mid = lo + ((hi - lo) >> 1);
        if (a[mid] === target) { steps.push({ lo, hi, mid, found: mid, line: ['mid', 'hit'], result: mid, note: `nums[${mid}] = ${a[mid]} = target: return ${mid}.` }); return steps; }
        if (a[mid] < target) { steps.push({ lo, hi, mid, line: ['mid', 'right'], note: `nums[${mid}] = ${a[mid]} < ${target}: the target can only be right of mid → lo = ${mid + 1}.`, why: 'mid has been checked and is not the target, so it is excluded: mid + 1.' }); lo = mid + 1; }
        else { steps.push({ lo, hi, mid, line: ['mid', 'left'], note: `nums[${mid}] = ${a[mid]} > ${target}: hi = ${mid - 1}.`, why: 'Closed intervals exclude mid on both sides; that is why this convention uses mid − 1 and lo <= hi.' }); hi = mid - 1; }
      }
      steps.push({ lo, hi, line: 'none', result: -1, done: true, note: `lo (${lo}) > hi (${hi}): the range is empty. Return −1.` });
      return steps;
    },
    render(st, stage, { nums: a }) {
      const states = {}; a.forEach((_, i) => { if (i < st.lo || i > st.hi) states[i] = 'dim'; }); if (st.mid != null) states[st.mid] = st.found != null ? 'done' : 'current';
      stage.append(R.cells(a, { states, window: st.lo <= st.hi ? [st.lo, st.hi] : null, ptrs: ptrsOf([[st.lo < a.length ? st.lo : null, 'lo'], [st.hi >= 0 ? st.hi : null, 'hi'], [st.mid, 'mid']]), label: 'nums' }));
      stage.append(R.vars({ lo: st.lo, hi: st.hi, mid: st.mid ?? '·' }));
    },
  });

  // ---------- rotated arrays ----------
  const rotatedCheck = (a) => { let drops = 0; for (let i = 1; i < a.length; i++) if (a[i] < a[i - 1]) drops++; if (new Set(a).size !== a.length) return 'Use distinct values (LeetCode 153 and 33 guarantee it).'; return drops <= 1 && (drops === 0 || a[a.length - 1] < a[0]) ? null : 'This is not a rotated sorted array.'; };
  V.define('bs-rotated-min', {
    title: 'Minimum of a rotated sorted array: compare mid with hi',
    inputs: [{ key: 'nums', label: 'nums (rotated, distinct)', type: 'numbers', def: [4, 5, 6, 7, 0, 1, 2], wide: true }],
    presets: [{ label: 'Day 2 trace 1', input: { nums: [4, 5, 6, 7, 0, 1, 2] } }, { label: 'Not rotated', input: { nums: [1, 2, 3] } }, { label: 'Two elements', input: { nums: [2, 1] } }, { label: 'Drop near the start', input: { nums: [9, 1, 2, 3, 4, 5] } }],
    legend: [['window', 'range [lo, hi]'], ['current', 'mid'], ['compare', 'nums[hi]'], ['done', 'minimum']],
    code: `
function findMin(nums) {
  let lo = 0, hi = nums.length - 1;      // min is in [lo, hi]   //@init
  while (lo < hi) {                                              //@loop
    const mid = lo + ((hi - lo) >> 1);                           //@mid
    if (nums[mid] > nums[hi]) lo = mid + 1;  // drop is right    //@right
    else hi = mid;                       // mid..hi sorted       //@left
  }
  return nums[lo];                                               //@ret
}`,
    validate: ({ nums }) => sizeCheck(nums, 1, 14) || rotatedCheck(nums),
    run({ nums: a }) {
      const steps = []; let lo = 0, hi = a.length - 1;
      steps.push({ lo, hi, line: 'init', note: 'The minimum is the element just after the "drop" (or index 0 if there is no drop).' });
      while (lo < hi) {
        const mid = lo + ((hi - lo) >> 1);
        if (a[mid] > a[hi]) { steps.push({ lo, hi, mid, line: ['mid', 'right'], note: `nums[mid] = ${a[mid]} > nums[hi] = ${a[hi]}: the values fall somewhere between mid and hi, so the drop (and the minimum) is right of mid → lo = ${mid + 1}.`, why: 'mid is larger than something to its right, so mid cannot be the minimum: excluding it is safe.' }); lo = mid + 1; }
        else { steps.push({ lo, hi, mid, line: ['mid', 'left'], note: `nums[mid] = ${a[mid]} ≤ nums[hi] = ${a[hi]}: mid..hi is sorted, so the minimum is mid or left of it → hi = ${mid}.`, why: 'Comparing with nums[hi] (not nums[lo]) means an unrotated array needs no special case: everything is ≤ nums[hi], so hi walks left to index 0.' }); hi = mid; }
      }
      steps.push({ lo, hi, done: true, line: 'ret', result: a[lo], note: `lo = hi = ${lo}: the minimum is ${a[lo]}.` });
      return steps;
    },
    render(st, stage, { nums: a }) {
      const states = {}; a.forEach((_, i) => { if (i < st.lo || i > st.hi) states[i] = 'dim'; });
      if (st.mid != null) { states[st.hi] = 'compare'; states[st.mid] = 'current'; } if (st.done) states[st.lo] = 'done';
      stage.append(R.bars(a.map((x) => x - Math.min(0, ...a)), { states, ptrs: ptrsOf([[st.lo, 'lo'], [st.hi, 'hi'], [st.done ? null : st.mid, 'mid']]), label: 'nums drawn as heights' + (Math.min(...a) < 0 ? ' (shifted up so all are ≥ 0)' : '') }));
      stage.append(R.cells(a, { states, window: st.done ? null : [st.lo, st.hi] }));
    },
  });
  V.define('bs-rotated-search', {
    title: 'Search a rotated sorted array: find the sorted half, then check the target range',
    inputs: [{ key: 'nums', label: 'nums (rotated, distinct)', type: 'numbers', def: [4, 5, 6, 7, 0, 1, 2], wide: true }, { key: 'target', label: 'target', type: 'number', def: 0 }],
    presets: [{ label: 'LeetCode example 1', input: { nums: [4, 5, 6, 7, 0, 1, 2], target: 0 } }, { label: 'LeetCode example 2 (absent)', input: { nums: [4, 5, 6, 7, 0, 1, 2], target: 3 } }, { label: 'Target in the left half', input: { nums: [5, 6, 7, 1, 2, 3, 4], target: 6 } }, { label: 'One element', input: { nums: [1], target: 0 } }],
    legend: [['window', 'range [lo, hi]'], ['current', 'mid'], ['done', 'the sorted half'], ['error', 'found']],
    code: `
function search(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {                                              //@loop
    const mid = lo + ((hi - lo) >> 1);                            //@mid
    if (nums[mid] === target) return mid;                         //@hit
    if (nums[lo] <= nums[mid]) {             // left half sorted  //@lsorted
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1; //@inl
      else lo = mid + 1;                                          //@outl
    } else {                                 // right half sorted //@rsorted
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1; //@inr
      else hi = mid - 1;                                          //@outr
    }
  }
  return -1;                                                      //@none
}`,
    validate: ({ nums }) => sizeCheck(nums, 1, 14) || rotatedCheck(nums),
    run({ nums: a, target: t }) {
      const steps = []; let lo = 0, hi = a.length - 1;
      while (lo <= hi) {
        const mid = lo + ((hi - lo) >> 1);
        if (a[mid] === t) { steps.push({ lo, hi, mid, found: mid, line: ['mid', 'hit'], result: mid, note: `nums[${mid}] = ${t}: found.` }); return steps; }
        if (a[lo] <= a[mid]) {
          const inside = a[lo] <= t && t < a[mid];
          steps.push({ lo, hi, mid, sorted: [lo, mid], line: ['mid', 'lsorted', inside ? 'inl' : 'outl'], note: `nums[lo] = ${a[lo]} ≤ nums[mid] = ${a[mid]}: the left half [${lo}..${mid}] is sorted. Is ${t} in [${a[lo]}, ${a[mid]})? ${inside ? 'Yes → search left: hi = ' + (mid - 1) : 'No → search right: lo = ' + (mid + 1)}.`, why: 'Only a sorted half has a known range of values, so only it can be ruled in or out with two comparisons.' });
          if (inside) hi = mid - 1; else lo = mid + 1;
        } else {
          const inside = a[mid] < t && t <= a[hi];
          steps.push({ lo, hi, mid, sorted: [mid, hi], line: ['mid', 'rsorted', inside ? 'inr' : 'outr'], note: `nums[lo] = ${a[lo]} > nums[mid] = ${a[mid]}: the drop is in the left half, so the right half [${mid}..${hi}] is sorted. Is ${t} in (${a[mid]}, ${a[hi]}]? ${inside ? 'Yes → lo = ' + (mid + 1) : 'No → hi = ' + (mid - 1)}.` });
          if (inside) lo = mid + 1; else hi = mid - 1;
        }
      }
      steps.push({ lo, hi, line: 'none', result: -1, done: true, note: 'Range empty: return −1.', why: 'Each step discards half: O(log n), the same as ordinary binary search.' });
      return steps;
    },
    render(st, stage, { nums: a }) {
      const states = {}; a.forEach((_, i) => { if (i < st.lo || i > st.hi) states[i] = 'dim'; });
      if (st.sorted) for (let i = st.sorted[0]; i <= st.sorted[1]; i++) states[i] = 'done';
      if (st.mid != null) states[st.mid] = st.found != null ? 'error' : 'current';
      stage.append(R.cells(a, { states, ptrs: ptrsOf([[st.lo < a.length ? st.lo : null, 'lo'], [st.hi >= 0 ? st.hi : null, 'hi'], [st.mid, 'mid']]), label: 'nums' }));
      stage.append(R.vars({ lo: st.lo, hi: st.hi, mid: st.mid ?? '·' }));
    },
  });

  // ---------- binary search on the answer ----------
  V.define('bs-answer', {
    title: 'Binary search on the answer: Koko Eating Bananas',
    inputs: [{ key: 'piles', label: 'piles', type: 'numbers', def: [3, 6, 7, 11], wide: true }, { key: 'h', label: 'h (hours)', type: 'int', def: 8 }],
    presets: [{ label: 'Day 3 trace', input: { piles: [3, 6, 7, 11], h: 8 } }, { label: 'LeetCode example 2', input: { piles: [30, 11, 23, 4, 20], h: 5 } }, { label: 'Plenty of time', input: { piles: [5, 9], h: 20 } }],
    legend: [['window', 'speeds still possible'], ['current', 'mid (being tested)'], ['done', 'feasible'], ['dim', 'too slow']],
    code: `
function minEatingSpeed(piles, h) {
  const hoursAt = (k) =>
    piles.reduce((sum, p) => sum + Math.ceil(p / k), 0);   //@hours
  let lo = 1, hi = Math.max(...piles);                      //@init
  while (lo < hi) {                                         //@loop
    const mid = Math.floor((lo + hi) / 2);                  //@mid
    if (hoursAt(mid) <= h) hi = mid;    // feasible: slower? //@true
    else lo = mid + 1;                  // too slow          //@false
  }
  return lo;                                                //@ret
}`,
    validate: ({ piles, h }) => sizeCheck(piles, 1, 8) || (piles.some((p) => p < 1 || !Number.isInteger(p)) ? 'Piles are positive integers.' : Math.max(...piles) > 40 ? 'Keep piles ≤ 40 so every speed fits on screen.' : h < piles.length ? 'h must be at least the number of piles (one hour per pile minimum).' : null),
    run({ piles, h }) {
      const hoursAt = (k) => piles.reduce((s, p) => s + Math.ceil(p / k), 0);
      const steps = []; let lo = 1, hi = Math.max(...piles); const tested = {};
      steps.push({ lo, hi, tested: {}, line: 'init', note: `Speeds from 1 to max(piles) = ${hi}. At speed ${hi} every pile takes one hour, so ${hi} is surely feasible (h ≥ number of piles).`, why: 'The predicate "hoursAt(k) ≤ h" is monotone: eating faster never takes more hours. So the speeds read F F … F T T … T and we want the first T.' });
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2); const hrs = hoursAt(mid); const ok = hrs <= h; tested[mid] = ok;
        steps.push({ lo, hi, mid, tested: { ...tested }, hrs, line: ['mid', 'hours', ok ? 'true' : 'false'], note: `Speed ${mid}: ${piles.map((p) => '⌈' + p + '/' + mid + '⌉').join(' + ')} = ${hrs} hours ${ok ? '≤' : '>'} ${h}. ${ok ? 'Feasible → hi = ' + mid + ' (try slower).' : 'Too slow → lo = ' + (mid + 1) + '.'}` });
        if (ok) hi = mid; else lo = mid + 1;
      }
      steps.push({ lo, hi, tested: { ...tested }, done: true, line: 'ret', result: lo, note: `Smallest feasible speed: ${lo} (${hoursAt(lo)} hours).`, why: `Only ${Object.keys(tested).length} of the ${Math.max(...piles)} speeds were tried, each check O(n): O(n log max) instead of O(n · max).` });
      return steps;
    },
    render(st, stage, { piles }) {
      const max = Math.max(...piles); const speeds = Array.from({ length: max }, (_, i) => i + 1);
      const states = {}; speeds.forEach((k, i) => { if (k in st.tested) states[i] = st.tested[k] ? 'done' : 'dim'; else if (k < st.lo || k > st.hi) states[i] = 'dim'; });
      if (st.mid != null) states[st.mid - 1] = 'current'; if (st.done) states[st.lo - 1] = 'done';
      stage.append(R.cells(speeds, { states, window: st.done ? null : [st.lo - 1, st.hi - 1], ptrs: ptrsOf([[st.lo - 1, 'lo'], [st.hi - 1, 'hi'], [st.done || st.mid == null ? null : st.mid - 1, 'mid']]), label: 'candidate speeds k (the answer space, not an input array)', noIndex: true }));
      stage.append(R.cells(speeds.map((k) => (k in st.tested ? (st.tested[k] ? 'T' : 'F') : '?')), { states: Object.fromEntries(speeds.map((k, i) => [i, k in st.tested ? (st.tested[k] ? 'done' : 'dim') : null]).filter(([, v]) => v)), label: 'hoursAt(k) ≤ h ? (? = never computed)', noIndex: true }));
      stage.append(R.vars({ lo: st.lo, hi: st.hi, mid: st.mid ?? '·', 'hoursAt(mid)': st.hrs ?? '·' }));
    },
  });

  V.define('bs-matrix', {
    title: 'A sorted matrix searched as one flattened array',
    inputs: [{ key: 'matrix', label: 'matrix (rows sorted, each row starts above the previous row\'s end)', type: 'json', def: [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], wide: true }, { key: 'target', label: 'target', type: 'number', def: 3 }],
    presets: [{ label: 'LeetCode example 1', input: { matrix: [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], target: 3 } }, { label: 'LeetCode example 2 (absent)', input: { matrix: [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], target: 13 } }, { label: 'Single column', input: { matrix: [[1], [3], [5]], target: 5 } }],
    legend: [['window', 'range [lo, hi]'], ['current', 'mid'], ['done', 'found']],
    code: `
function searchMatrix(matrix, target) {
  const m = matrix.length, n = matrix[0].length;
  let lo = 0, hi = m * n - 1;                          //@init
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);                 //@mid
    const v = matrix[Math.floor(mid / n)][mid % n];    //@map
    if (v === target) return true;                     //@hit
    if (v < target) lo = mid + 1;                      //@right
    else hi = mid - 1;                                 //@left
  }
  return false;                                        //@none
}`,
    validate: ({ matrix: m }) => { if (!Array.isArray(m) || !m.length || !m.every((r) => Array.isArray(r) && r.length === m[0].length && r.length)) return 'Enter a rectangular grid.'; if (m.length > 6 || m[0].length > 6) return 'Keep it to 6 × 6.'; const f = m.flat(); return isSorted(f) ? null : 'Read row by row, the values must be sorted.'; },
    run({ matrix: m, target }) {
      const n = m[0].length, steps = []; let lo = 0, hi = m.length * n - 1;
      steps.push({ lo, hi, line: 'init', note: `Treat the ${m.length} × ${n} matrix as one sorted array of ${m.length * n} elements, indices 0..${m.length * n - 1}.` });
      while (lo <= hi) {
        const mid = lo + ((hi - lo) >> 1), r = Math.floor(mid / n), c = mid % n, v = m[r][c];
        if (v === target) { steps.push({ lo, hi, mid, found: true, line: ['mid', 'map', 'hit'], result: true, note: `mid = ${mid} → row ⌊${mid}/${n}⌋ = ${r}, col ${mid} % ${n} = ${c}: value ${v} = target. Return true.` }); return steps; }
        steps.push({ lo, hi, mid, line: ['mid', 'map', v < target ? 'right' : 'left'], note: `mid = ${mid} → (${r}, ${c}) = ${v} ${v < target ? '<' : '>'} ${target} → ${v < target ? 'lo = ' + (mid + 1) : 'hi = ' + (mid - 1)}.`, why: mid === lo + ((hi - lo) >> 1) && steps.length === 1 ? 'Row = index divided by the number of columns; column = the remainder. No 2-D search logic is needed.' : null });
        if (v < target) lo = mid + 1; else hi = mid - 1;
      }
      steps.push({ lo, hi, line: 'none', done: true, result: false, note: 'Range empty: not found.', why: 'O(log(m·n)) time, O(1) space.' });
      return steps;
    },
    render(st, stage, { matrix: m }) {
      const n = m[0].length, states = {};
      m.forEach((row, r) => row.forEach((_, c) => { const i = r * n + c; if (i >= st.lo && i <= st.hi) states[r + ',' + c] = 'window'; else states[r + ',' + c] = 'dim'; }));
      if (st.mid != null) states[Math.floor(st.mid / n) + ',' + (st.mid % n)] = st.found ? 'done' : 'current';
      stage.append(R.grid(m, { states, label: 'matrix' }));
      const f = m.flat(); const fs = {}; f.forEach((_, i) => { if (i < st.lo || i > st.hi) fs[i] = 'dim'; }); if (st.mid != null) fs[st.mid] = st.found ? 'done' : 'current';
      stage.append(R.cells(f, { states: fs, ptrs: ptrsOf([[st.lo < f.length ? st.lo : null, 'lo'], [st.hi >= 0 ? st.hi : null, 'hi'], [st.mid, 'mid']]), label: 'the same values as one array' }));
    },
  });

  V.define('bs-peak', {
    title: 'Find a peak: walk uphill by halves',
    inputs: [{ key: 'nums', label: 'nums (neighbours distinct)', type: 'numbers', def: [1, 2, 1, 3, 5, 6, 4], wide: true }],
    presets: [{ label: 'LeetCode example 2', input: { nums: [1, 2, 1, 3, 5, 6, 4] } }, { label: 'LeetCode example 1', input: { nums: [1, 2, 3, 1] } }, { label: 'Increasing', input: { nums: [1, 2, 3, 4, 5] } }, { label: 'Decreasing', input: { nums: [5, 4, 3, 2, 1] } }],
    legend: [['window', 'range [lo, hi]'], ['current', 'mid'], ['compare', 'mid + 1'], ['done', 'peak']],
    code: `
function findPeakElement(nums) {
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) {                                           //@loop
    const mid = lo + ((hi - lo) >> 1);                        //@mid
    if (nums[mid] < nums[mid + 1]) lo = mid + 1;  // uphill → //@up
    else hi = mid;                    // mid is a peak or ←   //@down
  }
  return lo;                                                  //@ret
}`,
    validate: ({ nums }) => sizeCheck(nums, 1, 14) || (nums.some((x, i) => i && x === nums[i - 1]) ? 'Neighbouring values must differ (the problem guarantees it).' : null),
    run({ nums: a }) {
      const steps = []; let lo = 0, hi = a.length - 1;
      while (lo < hi) {
        const mid = lo + ((hi - lo) >> 1);
        if (a[mid] < a[mid + 1]) { steps.push({ lo, hi, mid, line: ['mid', 'up'], note: `nums[${mid}] = ${a[mid]} < nums[${mid + 1}] = ${a[mid + 1]}: uphill to the right → lo = ${mid + 1}.`, why: 'Keep walking up to the right: either it keeps rising until the end (the last element is a peak, since nums[n] = −∞) or it falls somewhere, and the top before the fall is a peak. So a peak exists in [mid + 1, hi].' }); lo = mid + 1; }
        else { steps.push({ lo, hi, mid, line: ['mid', 'down'], note: `nums[${mid}] = ${a[mid]} > nums[${mid + 1}] = ${a[mid + 1]}: downhill to the right → hi = ${mid}.`, why: 'By the mirror argument a peak exists in [lo, mid]; mid itself may be it, so keep it.' }); hi = mid; }
      }
      steps.push({ lo, hi, done: true, line: 'ret', result: lo, note: `lo = hi = ${lo}: nums[${lo}] = ${a[lo]} is a peak.`, why: 'The array is not sorted, yet binary search works: what matters is a rule that keeps a guaranteed answer inside the range.' });
      return steps;
    },
    render(st, stage, { nums: a }) {
      const off = Math.min(0, ...a); const states = {}; a.forEach((_, i) => { if (i < st.lo || i > st.hi) states[i] = 'dim'; });
      if (st.mid != null) { states[st.mid] = 'current'; states[st.mid + 1] = 'compare'; } if (st.done) states[st.lo] = 'done';
      stage.append(R.bars(a.map((x) => x - off), { states, ptrs: ptrsOf([[st.lo, 'lo'], [st.hi, 'hi'], [st.done ? null : st.mid, 'mid']]), label: 'nums as heights' }));
    },
  });

  // ---------- sorting ----------
  V.define('merge-sort', {
    title: 'Merge sort: split to single elements, then merge back up',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [5, 2, 4, 7, 1, 3, 2, 6], wide: true }],
    presets: [{ label: '8 elements', input: { nums: [5, 2, 4, 7, 1, 3, 2, 6] } }, { label: 'Odd length', input: { nums: [3, 1, 2, 5, 4] } }, { label: 'Already sorted', input: { nums: [1, 2, 3, 4] } }],
    legend: [['current', 'call running now'], ['frontier', 'waiting for its halves'], ['done', 'sorted and returned']],
    code: `
function mergeSort(a) {
  if (a.length <= 1) return a;                                   //@base
  const mid = a.length >> 1;                                     //@mid
  const left = mergeSort(a.slice(0, mid)), right = mergeSort(a.slice(mid));  //@rec
  const out = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length)
    out.push(left[i] <= right[j] ? left[i++] : right[j++]);      //@merge
  while (i < left.length) out.push(left[i++]);                   //@restl
  while (j < right.length) out.push(right[j++]);                 //@restr
  return out;                                                    //@ret
}`,
    validate: ({ nums }) => sizeCheck(nums, 1, 9),
    run({ nums }) {
      const steps = [], nodes = [], state = {}, label = {}; let id = 0, cmp = 0;
      const snap = (o) => ({ nodes: nodes.map((n) => ({ ...n, label: label[n.id], state: state[n.id] })), cmp, ...o });
      function sort(a, parent, depth) {
        const me = id++; nodes.push({ id: me, parent }); label[me] = '[' + a.join(',') + ']';
        state[me] = 'current';
        if (a.length <= 1) { state[me] = 'done'; steps.push(snap({ line: 'base', note: `${label[me]}: one element (or none) is already sorted.` })); return a; }
        const mid = a.length >> 1;
        steps.push(snap({ line: ['mid', 'rec'], note: `Split ${label[me]} into [${a.slice(0, mid).join(',')}] and [${a.slice(mid).join(',')}].`, why: me === 0 ? 'Splitting halves the length, so there are about log₂ n levels of calls.' : null }));
        state[me] = 'frontier';
        const L = sort(a.slice(0, mid), me, depth + 1); state[me] = 'frontier';
        const Rt = sort(a.slice(mid), me, depth + 1);
        state[me] = 'current';
        const out = []; let i = 0, j = 0;
        while (i < L.length && j < Rt.length) {
          cmp++; const takeL = L[i] <= Rt[j];
          out.push(takeL ? L[i++] : Rt[j++]);
          steps.push(snap({ line: 'merge', merge: { L, R: Rt, i, j, out: [...out], took: takeL ? 'L' : 'R' }, note: `Merge: ${takeL ? L[i - 1] + ' ≤ ' + Rt[j] : L[i] + ' > ' + Rt[j - 1]} → take ${out.at(-1)} from the ${takeL ? 'left' : 'right'}.`, why: takeL && L[i - 1] === Rt[j] ? 'On a tie, take from the left: that keeps equal elements in their original order (stability).' : null }));
        }
        while (i < L.length) out.push(L[i++]);
        while (j < Rt.length) out.push(Rt[j++]);
        label[me] = '[' + out.join(',') + ']'; state[me] = 'done';
        steps.push(snap({ line: ['restl', 'restr', 'ret'], merge: { L, R: Rt, i, j, out: [...out] }, note: `Copy what is left; return ${label[me]}.`, why: depth === 0 ? `Each level of the tree merges n elements in total, and there are ⌈log₂ n⌉ levels: O(n log n) time. Merging needs O(n) extra space.` : null }));
        return out;
      }
      const res = sort(nums, null, 0);
      steps.push(snap({ line: null, done: true, result: res, note: `Sorted: [${res.join(', ')}] with ${cmp} comparisons.` }));
      return steps;
    },
    render(st, stage) {
      stage.append(R.tree(st.nodes.map((n) => ({ ...n })), { dx: 74, dy: 52, label: 'recursion tree (labels show each call\'s array; merged calls show the sorted result)' }));
      if (st.merge) {
        const m = st.merge;
        stage.append(el('div.row', { style: { alignItems: 'flex-start', gap: '18px' } },
          R.cells(m.L, { ptrs: m.i < m.L.length ? { [m.i]: 'i' } : {}, states: Object.fromEntries(m.L.map((_, k) => [k, k < m.i ? 'dim' : null]).filter(([, v]) => v)), label: 'left' }),
          R.cells(m.R, { ptrs: m.j < m.R.length ? { [m.j]: 'j' } : {}, states: Object.fromEntries(m.R.map((_, k) => [k, k < m.j ? 'dim' : null]).filter(([, v]) => v)), label: 'right' }),
          R.cells(m.out, { states: m.out.length ? { [m.out.length - 1]: 'current' } : {}, label: 'out' })));
      }
      stage.append(R.vars({ comparisons: st.cmp }));
    },
  });

  function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  V.define('quicksort3', {
    title: 'Quicksort with three-way partitioning (reference 6.8)',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [3, 1, 3, 2, 3], wide: true }, { key: 'pivotRule', label: 'pivot', type: 'select', def: 'first', options: [{ value: 'first', label: 'a[lo] (for the dry run)' }, { value: 'random', label: 'random (seeded, as in 6.8)' }] }],
    presets: [{ label: 'Day 5 dry run', input: { nums: [3, 1, 3, 2, 3], pivotRule: 'first' } }, { label: 'Many duplicates', input: { nums: [2, 2, 1, 2, 3, 2, 2], pivotRule: 'random' } }, { label: 'Reversed', input: { nums: [6, 5, 4, 3, 2, 1], pivotRule: 'random' } }],
    legend: [['done', '< pivot: [lo, lt)'], ['window', '= pivot: [lt, i)'], ['frontier', '> pivot: (gt, hi]'], ['current', 'i'], ['dim', 'outside this call']],
    code: `
function quickSort(a, lo = 0, hi = a.length - 1) {
  if (lo >= hi) return a;                                         //@base
  const pivot = a[lo + Math.floor(Math.random() * (hi - lo + 1))]; //@pivot
  let lt = lo, i = lo, gt = hi;
  while (i <= gt) {                                               //@loop
    if (a[i] < pivot) swap(a, lt++, i++);                         //@less
    else if (a[i] > pivot) swap(a, i, gt--);  // i stays           //@more
    else i++;                                                     //@eq
  }
  quickSort(a, lo, lt - 1);                                       //@recl
  quickSort(a, gt + 1, hi);                                       //@recr
  return a;
}`,
    validate: ({ nums }) => sizeCheck(nums, 1, 12),
    run({ nums, pivotRule }) {
      const a = [...nums], steps = [], rng = mulberry(42); let swaps = 0;
      const swap = (i, j) => { [a[i], a[j]] = [a[j], a[i]]; swaps++; };
      function qs(lo, hi, depth) {
        if (lo >= hi) { if (lo === hi) steps.push({ a: [...a], lo, hi, line: 'base', note: `Range [${lo}..${hi}] has at most one element: nothing to do.` }); return; }
        const p = pivotRule === 'first' ? lo : lo + Math.floor(rng() * (hi - lo + 1)); const pivot = a[p];
        let lt = lo, i = lo, gt = hi;
        steps.push({ a: [...a], lo, hi, lt, i, gt, pivot, line: 'pivot', note: `Sort [${lo}..${hi}] with pivot ${pivot} (from index ${p}).`, why: depth === 0 ? 'A random pivot makes the O(n²) worst case (always picking the smallest element) very unlikely.' : null });
        while (i <= gt) {
          if (a[i] < pivot) { swap(lt, i); steps.push({ a: [...a], lo, hi, lt: lt + 1, i: i + 1, gt, pivot, line: 'less', note: `${a[lt]} < ${pivot}: swap into the "less" region; lt and i advance.` }); lt++; i++; }
          else if (a[i] > pivot) { const v = a[i]; swap(i, gt); steps.push({ a: [...a], lo, hi, lt, i, gt: gt - 1, pivot, line: 'more', note: `${v} > ${pivot}: swap to position ${gt}; gt shrinks; i stays because the value that arrived (${a[i]}) is unchecked.` }); gt--; }
          else { steps.push({ a: [...a], lo, hi, lt, i: i + 1, gt, pivot, line: 'eq', note: `${a[i]} = pivot: leave it in the middle region; i advances.` }); i++; }
        }
        steps.push({ a: [...a], lo, hi, lt, i, gt, pivot, line: ['recl', 'recr'], part: true, note: `Partition done: [${lo}..${lt - 1}] < ${pivot}, [${lt}..${gt}] = ${pivot}, [${gt + 1}..${hi}] > ${pivot}. Recurse on the two outer parts only.`, why: 'Every copy of the pivot is already in its final place. With many duplicates this is what keeps three-way quicksort fast.' });
        qs(lo, lt - 1, depth + 1); qs(gt + 1, hi, depth + 1);
      }
      qs(0, a.length - 1, 0);
      steps.push({ a: [...a], done: true, line: null, result: [...a], note: `Sorted with ${swaps} swaps.`, why: 'Average O(n log n) time, O(log n) stack on average. Not stable: swaps can reorder equal keys.' });
      return steps;
    },
    render(st, stage) {
      const states = {};
      st.a.forEach((_, k) => { if (st.done) return; if (k < st.lo || k > st.hi) states[k] = 'dim'; else if (st.lt != null) { if (k < st.lt) states[k] = 'done'; else if (k < st.i) states[k] = 'window'; else if (k > st.gt) states[k] = 'frontier'; } });
      if (!st.done && st.i != null && st.i <= st.gt) states[st.i] = 'current';
      stage.append(R.cells(st.a, { states, ptrs: st.done || st.lt == null ? {} : ptrsOf([[st.lt, 'lt'], [st.i <= st.hi ? st.i : null, 'i'], [st.gt >= st.lo ? st.gt : null, 'gt']]), label: 'a' }));
      stage.append(R.vars({ lo: st.lo ?? '·', hi: st.hi ?? '·', pivot: st.pivot ?? '·' }));
    },
  });

  V.define('merge-back', {
    title: 'Merge Sorted Array: fill nums1 from the back',
    inputs: [{ key: 'nums1', label: 'nums1 (first m sorted, then n zeros)', type: 'numbers', def: [1, 2, 3, 0, 0, 0], wide: true }, { key: 'm', label: 'm', type: 'int', def: 3 }, { key: 'nums2', label: 'nums2 (sorted)', type: 'numbers', def: [2, 5, 6] }],
    presets: [{ label: 'LeetCode example 1', input: { nums1: [1, 2, 3, 0, 0, 0], m: 3, nums2: [2, 5, 6] } }, { label: 'nums1 empty', input: { nums1: [0], m: 0, nums2: [1] } }, { label: 'nums2 all smaller', input: { nums1: [4, 5, 6, 0, 0, 0], m: 3, nums2: [1, 2, 3] } }],
    legend: [['done', 'final values'], ['current', 'written now'], ['compare', 'compared']],
    code: `
function merge(nums1, m, nums2, n) {
  let i = m - 1, j = n - 1, k = m + n - 1;                       //@init
  while (j >= 0) {                                               //@loop
    if (i >= 0 && nums1[i] > nums2[j]) nums1[k--] = nums1[i--];  //@take1
    else nums1[k--] = nums2[j--];                                //@take2
  }
}`,
    validate: ({ nums1, m, nums2 }) => (m < 0 || m + nums2.length !== nums1.length ? 'nums1 must have length m + n.' : !isSorted(nums1.slice(0, m)) || !isSorted(nums2) ? 'Both parts must be sorted.' : nums1.length > 12 ? 'Keep it to 12 elements.' : null),
    run({ nums1, m, nums2 }) {
      const a = [...nums1], n = nums2.length, steps = []; let i = m - 1, j = n - 1, k = m + n - 1;
      steps.push({ a: [...a], i, j, k, line: 'init', note: 'Start at the ends: the largest remaining element goes into the last free slot.', why: 'Filling from the front would overwrite elements of nums1 that have not been merged yet. The back of nums1 is empty space, so nothing is lost.' });
      while (j >= 0) {
        if (i >= 0 && a[i] > nums2[j]) { a[k] = a[i]; steps.push({ a: [...a], i: i - 1, j, k: k - 1, w: k, cmp: [i, j], line: 'take1', note: `nums1[${i}] = ${a[k]} > nums2[${j}] = ${nums2[j]}: write ${a[k]} at ${k}.` }); i--; k--; }
        else { a[k] = nums2[j]; steps.push({ a: [...a], i, j: j - 1, k: k - 1, w: k, cmp: [i, j], line: 'take2', note: i >= 0 ? `nums2[${j}] = ${nums2[j]} ≥ nums1[${i}] = ${a[i]}: write ${nums2[j]} at ${k}.` : `nums1 is exhausted: copy nums2[${j}] = ${nums2[j]} to ${k}.` }); j--; k--; }
      }
      steps.push({ a: [...a], i, j, k, done: true, line: null, result: [...a], note: 'nums2 is used up; the remaining nums1 elements are already in place.', why: 'O(m + n) time, O(1) extra space. This is the merge step of merge sort, run backwards.' });
      return steps;
    },
    render(st, stage, { nums2 }) {
      const states = {}; st.a.forEach((_, x) => { if (x > st.k) states[x] = 'done'; }); if (st.w != null) states[st.w] = 'current';
      stage.append(R.cells(st.a, { states, ptrs: st.done ? {} : ptrsOf([[st.i >= 0 ? st.i : null, 'i'], [st.k >= 0 ? st.k : null, 'k']]), label: 'nums1' }));
      const s2 = {}; nums2.forEach((_, x) => { if (x > st.j) s2[x] = 'dim'; });
      stage.append(R.cells(nums2, { states: s2, ptrs: st.j >= 0 && !st.done ? { [st.j]: 'j' } : {}, label: 'nums2' }));
    },
  });
})(window);
