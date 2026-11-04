// Week 2 visualizers: two pointers, partitioning, Kadane, sliding windows, prefix sums.
// Each run() executes the real algorithm on the input and records a step at every decision.
(function (g) {
  'use strict';
  const { el } = g.Core;
  const R = g.R, V = g.Viz;
  const isSorted = (a) => a.every((x, i) => i === 0 || a[i - 1] <= x);
  const sizeCheck = (a, lo, hi, what = 'array') => (a.length < lo ? 'Use at least ' + lo + ' elements.' : a.length > hi ? 'Keep the ' + what + ' to ' + hi + ' elements or fewer so it fits on screen.' : null);
  const isAlnum = (c) => { const x = c.charCodeAt(0); return (x >= 48 && x <= 57) || (x >= 65 && x <= 90) || (x >= 97 && x <= 122); };
  const show = (s) => (s === ' ' ? '␣' : s);

  // ---------- pair grid shared by brute force and two pointers ----------
  function pairGrid(a, st) {
    const n = a.length;
    const m = a.map((x, i) => a.map((y, j) => (j > i ? x + y : '')));
    const states = {};
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (j <= i) states[i + ',' + j] = 'out';
      else if (st.found && st.found[0] === i && st.found[1] === j) states[i + ',' + j] = 'done';
      else if (st.cur && st.cur[0] === i && st.cur[1] === j) states[i + ',' + j] = 'current';
      else if (st.elim && st.elim.has(i + ',' + j)) states[i + ',' + j] = 'dim';
      else if (st.checked && st.checked.has(i + ',' + j)) states[i + ',' + j] = 'compare';
    }
    const box = R.grid(m, { states, label: 'Every pair (i, j) with i < j · cell = numbers[i] + numbers[j]' });
    box.querySelector('.gridv').classList.add('small');
    return box;
  }
  const totalPairs = (n) => (n * (n - 1)) / 2;

  V.define('pair-brute', {
    title: 'Brute force: check every pair',
    inputs: [{ key: 'numbers', label: 'numbers (sorted)', type: 'numbers', def: [1, 3, 4, 6, 8, 11], wide: true }, { key: 'target', label: 'target', type: 'number', def: 17 }],
    presets: [{ label: 'Pair near the end', input: { numbers: [1, 3, 4, 6, 8, 11], target: 17 } }, { label: 'No pair exists', input: { numbers: [1, 2, 5, 9], target: 4 } }],
    legend: [['current', 'pair being checked'], ['compare', 'already checked'], ['done', 'answer']],
    code: `
function twoSumBrute(numbers, target) {
  for (let i = 0; i < numbers.length; i++) {        //@i
    for (let j = i + 1; j < numbers.length; j++) {  //@j
      if (numbers[i] + numbers[j] === target)       //@test
        return [i + 1, j + 1];                      //@found
    }
  }
  return [];                                        //@none
}`,
    validate: ({ numbers }) => sizeCheck(numbers, 2, 10),
    run({ numbers: a, target }) {
      const steps = [], checked = new Set();
      let count = 0;
      for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
        count++;
        const sum = a[i] + a[j];
        const ok = sum === target;
        steps.push({ result: ok ? [i + 1, j + 1] : undefined, line: ok ? ['test', 'found'] : 'test', i, j, cur: [i, j], checked: new Set(checked), found: ok ? [i, j] : null, count, sum,
          note: `Pair (${i}, ${j}): ${a[i]} + ${a[j]} = ${sum}${ok ? ' = target. Return [' + (i + 1) + ', ' + (j + 1) + '].' : ' ≠ ' + target + '.'}`,
          why: ok ? `It took ${count} of the ${totalPairs(a.length)} possible pairs. In the worst case brute force checks all of them: n(n−1)/2, which is O(n²).` : count === 1 ? 'Brute force ignores that the array is sorted: it learns nothing from a failed pair.' : null });
        checked.add(i + ',' + j);
        if (ok) return steps;
      }
      steps.push({ result: [], line: 'none', checked, count, note: `All ${count} pairs checked; none sums to ${target}. Return [].`, why: 'This is the worst case: every one of the n(n−1)/2 pairs was examined.' });
      return steps;
    },
    render(st, stage, { numbers: a, target }) {
      stage.append(R.cells(a, { ptrs: st.cur ? { [st.cur[0]]: 'i', [st.cur[1]]: 'j' } : {}, states: st.cur ? { [st.cur[0]]: 'current', [st.cur[1]]: 'current' } : {}, label: 'numbers' }));
      stage.append(R.vars({ target, sum: st.sum ?? '·', 'pairs checked': st.count + ' / ' + totalPairs(a.length) }));
      stage.append(pairGrid(a, st));
    },
  });

  V.define('two-sum-sorted', {
    title: 'Two pointers on a sorted array (Two Sum II)',
    inputs: [{ key: 'numbers', label: 'numbers (sorted)', type: 'numbers', def: [1, 3, 4, 6, 8, 11], wide: true }, { key: 'target', label: 'target', type: 'number', def: 17 }],
    presets: [{ label: 'Pair near the end', input: { numbers: [1, 3, 4, 6, 8, 11], target: 17 } }, { label: 'Roadmap example', input: { numbers: [2, 7, 11, 15], target: 9 } }, { label: 'Negative numbers', input: { numbers: [-5, -2, 0, 3, 7], target: 1 } }, { label: 'Duplicates', input: { numbers: [1, 2, 2, 4, 4], target: 8 } }, { label: 'No pair exists', input: { numbers: [1, 2, 5, 9], target: 4 } }],
    legend: [['current', 'pair (l, r) being checked'], ['dim', 'ruled out without checking'], ['done', 'answer']],
    code: `
function twoSumSorted(numbers, target) {
  let l = 0, r = numbers.length - 1;            //@init
  while (l < r) {                               //@loop
    const sum = numbers[l] + numbers[r];        //@sum
    if (sum === target) return [l + 1, r + 1];  //@found
    if (sum < target) l++;  // too small: drop left    //@left
    else r--;               // too large: drop right   //@right
  }
  return [];                                    //@none
}`,
    validate: ({ numbers }) => sizeCheck(numbers, 2, 10) || (isSorted(numbers) ? null : 'Two pointers needs sorted input: sort the numbers first (non-decreasing).'),
    run({ numbers: a, target }) {
      const steps = [], elim = new Set();
      let l = 0, r = a.length - 1, checks = 0;
      const snap = (o) => Object.assign({ l, r, elim: new Set(elim), checks }, o);
      steps.push(snap({ line: 'init', note: `Start at both ends: l = 0 (smallest value ${a[0]}), r = ${r} (largest value ${a[r]}).`, why: 'Every pair is still possible; the grid shows all of them.' }));
      while (l < r) {
        const sum = a[l] + a[r]; checks++;
        if (sum === target) { steps.push(snap({ result: [l + 1, r + 1], line: ['sum', 'found'], cur: [l, r], found: [l, r], sum, note: `${a[l]} + ${a[r]} = ${sum} = target. Return [${l + 1}, ${r + 1}] (1-based).`, why: `${checks} pair${checks > 1 ? 's' : ''} checked out of ${totalPairs(a.length)}. Every other pair that was ruled out was ruled out by proof, not by checking.` })); return steps; }
        steps.push(snap({ line: 'sum', cur: [l, r], sum, note: `sum = ${a[l]} + ${a[r]} = ${sum}, target ${target}: ${sum < target ? 'too small' : 'too large'}.` }));
        if (sum < target) {
          let k = 0; for (let j = l + 1; j <= r; j++) { if (!elim.has(l + ',' + j)) k++; elim.add(l + ',' + j); }
          steps.push(snap({ line: 'left', cur: [l, r], sum, note: `Discard index ${l} (value ${a[l]}): l → ${l + 1}.`, why: `${a[l]} + ${a[r]} is the largest sum ${a[l]} can make with any remaining partner, and it is still below ${target}. So no pair using ${a[l]} works: that removes ${k} pair${k === 1 ? '' : 's'} (a whole row) in one step.` }));
          l++;
        } else {
          let k = 0; for (let i = l; i < r; i++) { if (!elim.has(i + ',' + r)) k++; elim.add(i + ',' + r); }
          steps.push(snap({ line: 'right', cur: [l, r], sum, note: `Discard index ${r} (value ${a[r]}): r → ${r - 1}.`, why: `${a[l]} + ${a[r]} is the smallest sum ${a[r]} can make with any remaining partner, and it is still above ${target}. So no pair using ${a[r]} works: that removes ${k} pair${k === 1 ? '' : 's'} (a whole column).` }));
          r--;
        }
      }
      steps.push(snap({ result: [], line: 'none', note: `l and r met: no pair sums to ${target}. Return [].`, why: `Only ${checks} sums were computed, at most n − 1. That is why this is O(n) time with O(1) extra space.` }));
      return steps;
    },
    render(st, stage, { numbers: a, target }) {
      const states = {}, ptrs = {};
      a.forEach((_, i) => { if (i < st.l || i > st.r) states[i] = 'dim'; });
      if (st.found) { states[st.found[0]] = 'done'; states[st.found[1]] = 'done'; }
      else if (st.cur) { states[st.l] = 'current'; states[st.r] = 'current'; }
      if (st.l === st.r) ptrs[st.l] = ['l', 'r']; else { if (st.l < a.length) ptrs[st.l] = 'l'; if (st.r >= 0) ptrs[st.r] = 'r'; }
      stage.append(R.cells(a, { states, ptrs, label: 'numbers' }));
      stage.append(R.vars({ target, sum: st.sum ?? '·', 'sums computed': st.checks, 'pairs ruled out': st.elim.size + ' / ' + totalPairs(a.length) }));
      stage.append(pairGrid(a, st));
    },
  });

  V.define('palindrome', {
    title: 'Valid palindrome: two pointers that skip characters',
    inputs: [{ key: 's', label: 's', type: 'string', def: "No 'x' in Nixon", wide: true }],
    presets: [{ label: 'Classic sentence', input: { s: 'A man, a plan, a canal: Panama' } }, { label: 'Not a palindrome', input: { s: 'race a car' } }, { label: 'Only punctuation', input: { s: ' .,' } }, { label: 'Digit vs letter trap', input: { s: '0P' } }],
    legend: [['compare', 'pair being compared'], ['done', 'matched'], ['dim', 'skipped (not alphanumeric)'], ['error', 'mismatch']],
    code: `
function isPalindrome(s) {
  let l = 0, r = s.length - 1;                     //@init
  while (l < r) {                                  //@loop
    if (!isAlnum(s[l])) { l++; continue; }         //@skipl
    if (!isAlnum(s[r])) { r--; continue; }         //@skipr
    if (s[l].toLowerCase() !== s[r].toLowerCase()) //@cmp
      return false;                                //@no
    l++; r--;                                      //@move
  }
  return true;                                     //@yes
}
function isAlnum(c) {
  const x = c.charCodeAt(0);
  return (x >= 48 && x <= 57) || (x >= 65 && x <= 90) || (x >= 97 && x <= 122);
}`,
    validate: ({ s }) => (s.length > 34 ? 'Keep the string to 34 characters so it fits on screen.' : s.length ? null : 'Type at least one character.'),
    run({ s }) {
      const steps = [], skipped = new Set(), matched = new Set();
      let l = 0, r = s.length - 1;
      const snap = (o) => Object.assign({ l, r, skipped: new Set(skipped), matched: new Set(matched) }, o);
      steps.push(snap({ line: 'init', note: `l = 0, r = ${r}. Compare from both ends inward.` }));
      while (l < r) {
        if (!isAlnum(s[l])) { skipped.add(l); steps.push(snap({ line: 'skipl', note: `s[${l}] = "${show(s[l])}" is not a letter or digit: skip it, l → ${l + 1}.`, why: 'Skipping one side and re-checking the loop condition keeps l < r valid at every comparison.' })); l++; continue; }
        if (!isAlnum(s[r])) { skipped.add(r); steps.push(snap({ line: 'skipr', note: `s[${r}] = "${show(s[r])}" is not a letter or digit: skip it, r → ${r - 1}.` })); r--; continue; }
        const a = s[l].toLowerCase(), b = s[r].toLowerCase();
        if (a !== b) { steps.push(snap({ result: false, line: ['cmp', 'no'], cmp: [l, r], bad: true, note: `"${s[l]}" vs "${s[r]}": lower-cased "${a}" ≠ "${b}". Return false.`, why: 'One mismatch is enough; the remaining characters cannot fix it.' })); return steps; }
        steps.push(snap({ line: 'cmp', cmp: [l, r], note: `"${s[l]}" vs "${s[r]}": both "${a}" in lower case. They match.` }));
        matched.add(l); matched.add(r); l++; r--;
        steps.push(snap({ line: 'move', note: `Move both inward: l = ${l}, r = ${r}.` }));
      }
      steps.push(snap({ result: true, line: 'yes', note: l === r ? `l = r = ${l}: the middle character needs no partner. Return true.` : 'l passed r: every pair matched. Return true.', why: `Each index was visited once by one pointer: O(n) time, O(1) extra space (no cleaned copy of the string).` }));
      return steps;
    },
    render(st, stage, { s }) {
      const states = {}, ptrs = {};
      st.skipped.forEach((i) => (states[i] = 'dim'));
      st.matched.forEach((i) => (states[i] = 'done'));
      if (st.cmp) { states[st.cmp[0]] = st.bad ? 'error' : 'compare'; states[st.cmp[1]] = st.bad ? 'error' : 'compare'; }
      if (st.l === st.r) ptrs[st.l] = ['l', 'r']; else { if (st.l < s.length) ptrs[st.l] = 'l'; if (st.r >= 0) ptrs[st.r] = 'r'; }
      stage.append(R.cells([...s].map(show), { states, ptrs, label: 's' }));
      stage.append(R.vars({ l: st.l, r: st.r }));
    },
  });

  V.define('container', {
    title: 'Container With Most Water: move the shorter wall',
    inputs: [{ key: 'height', label: 'height', type: 'numbers', def: [1, 8, 6, 2, 5, 4, 8, 3, 7], wide: true }],
    presets: [{ label: 'LeetCode example', input: { height: [1, 8, 6, 2, 5, 4, 8, 3, 7] } }, { label: 'Equal walls', input: { height: [4, 3, 2, 1, 4] } }, { label: 'Two walls', input: { height: [1, 1] } }],
    legend: [['current', 'walls l and r'], ['dim', 'ruled out'], ['best', 'best container so far']],
    code: `
function maxArea(height) {
  let l = 0, r = height.length - 1, best = 0;   //@init
  while (l < r) {                               //@loop
    const h = Math.min(height[l], height[r]);   //@h
    best = Math.max(best, h * (r - l));         //@best
    if (height[l] < height[r]) l++;             //@movel
    else r--;                                   //@mover
  }
  return best;                                  //@ret
}`,
    validate: ({ height }) => sizeCheck(height, 2, 14) || (height.some((x) => x < 0) ? 'Heights must be 0 or more.' : null),
    run({ height: a }) {
      const steps = []; let l = 0, r = a.length - 1, best = 0, bestLR = null;
      const snap = (o) => Object.assign({ l, r, best, bestLR }, o);
      steps.push(snap({ line: 'init', note: 'Start with the widest container: walls at both ends.' }));
      while (l < r) {
        const h = Math.min(a[l], a[r]), area = h * (r - l);
        const improved = area > best;
        if (improved) { best = area; bestLR = [l, r]; }
        steps.push(snap({ line: ['h', 'best'], area, h, note: `Width ${r - l} × height min(${a[l]}, ${a[r]}) = ${h} → area ${area}.${improved ? ' New best.' : ' Best stays ' + best + '.'}` }));
        if (a[l] < a[r]) {
          steps.push(snap({ line: 'movel', area, h, note: `Left wall ${a[l]} is shorter: l → ${l + 1}.`, why: `Every other container using wall ${l} is narrower and still capped at height ${a[l]}, so none can beat ${area}. Moving the taller wall instead could never help.` })); l++;
        } else {
          steps.push(snap({ line: 'mover', area, h, note: `Right wall ${a[r]} is ${a[l] === a[r] ? 'equal' : 'shorter'}: r → ${r - 1}.`, why: a[l] === a[r] ? 'With equal walls, either move is safe: any better container would need both walls taller than this height, so neither of these walls can be in it.' : `Every other container using wall ${r} is narrower and capped at ${a[r]}.` })); r--;
        }
      }
      steps.push(snap({ result: best, line: 'ret', note: `Pointers met. Answer: ${best}.`, why: 'n − 1 moves in total, so O(n) time and O(1) space, against O(n²) for trying every pair.' }));
      return steps;
    },
    render(st, stage, { height: a }) {
      const states = {}, ptrs = {};
      a.forEach((_, i) => { if (i < st.l || i > st.r) states[i] = 'dim'; });
      if (st.l < st.r) { states[st.l] = 'current'; states[st.r] = 'current'; ptrs[st.l] = 'l'; ptrs[st.r] = 'r'; } else ptrs[st.l] = 'l,r';
      const rect = st.h != null ? { l: st.l, r: st.r, h: st.h } : st.bestLR ? { l: st.bestLR[0], r: st.bestLR[1], h: Math.min(a[st.bestLR[0]], a[st.bestLR[1]]), cls: 'best' } : null;
      stage.append(R.bars(a, { states, ptrs, rect, label: 'height (shaded: water the current walls hold)' }));
      stage.append(R.vars({ area: st.area ?? '·', best: st.best, 'best walls': st.bestLR ? st.bestLR.join(' & ') : '·' }));
    },
  });

  V.define('trap', {
    title: 'Trapping Rain Water: two pointers with running maxima',
    inputs: [{ key: 'height', label: 'height', type: 'numbers', def: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1], wide: true }],
    presets: [{ label: 'LeetCode example 1', input: { height: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] } }, { label: 'LeetCode example 2', input: { height: [4, 2, 0, 3, 2, 5] } }],
    legend: [['current', 'index being settled'], ['done', 'water settled']],
    code: `
function trap(height) {
  let l = 0, r = height.length - 1;                 //@init
  let leftMax = 0, rightMax = 0, water = 0;          //@init2
  while (l < r) {                                    //@loop
    if (height[l] < height[r]) {                     //@cmp
      leftMax = Math.max(leftMax, height[l]);        //@lmax
      water += leftMax - height[l];                  //@ladd
      l++;                                           //@lmove
    } else {
      rightMax = Math.max(rightMax, height[r]);      //@rmax
      water += rightMax - height[r];                 //@radd
      r--;                                           //@rmove
    }
  }
  return water;                                      //@ret
}`,
    validate: ({ height }) => sizeCheck(height, 1, 16) || (height.some((x) => x < 0) ? 'Heights must be 0 or more.' : null),
    run({ height: a }) {
      const steps = []; let l = 0, r = a.length - 1, lm = 0, rm = 0, water = 0; const settled = {};
      const snap = (o) => Object.assign({ l, r, lm, rm, water, settled: { ...settled } }, o);
      steps.push(snap({ line: ['init', 'init2'], note: 'Water above index i = min(highest wall to its left, highest wall to its right) − height[i].' }));
      while (l < r) {
        if (a[l] < a[r]) {
          lm = Math.max(lm, a[l]); const w = lm - a[l]; water += w; settled[l] = w;
          steps.push(snap({ line: ['cmp', 'lmax', 'ladd'], cur: l, note: `height[l] = ${a[l]} < height[r] = ${a[r]}: settle index ${l}. leftMax = ${lm}, so it holds ${w}.`, why: `The right side already has a wall of ${a[r]} ≥ leftMax, so the true right maximum is at least leftMax: the left maximum is the limit.` }));
          l++;
        } else {
          rm = Math.max(rm, a[r]); const w = rm - a[r]; water += w; settled[r] = w;
          steps.push(snap({ line: ['cmp', 'rmax', 'radd'], cur: r, note: `height[r] = ${a[r]} ≤ height[l] = ${a[l]}: settle index ${r}. rightMax = ${rm}, so it holds ${w}.`, why: `The left side has a wall of ${a[l]} ≥ rightMax, so the right maximum is the limit.` }));
          r--;
        }
      }
      steps.push(snap({ result: water, line: 'ret', note: `Total water: ${water}.`, why: 'Each index is settled exactly once: O(n) time, O(1) space. The prefix-max version uses two O(n) arrays instead.' }));
      return steps;
    },
    render(st, stage, { height: a }) {
      const states = {}, ptrs = {};
      Object.keys(st.settled).forEach((i) => (states[i] = 'done'));
      if (st.cur != null) states[st.cur] = 'current';
      if (st.l === st.r) ptrs[st.l] = 'l,r'; else { ptrs[st.l] = 'l'; ptrs[st.r] = 'r'; }
      stage.append(R.bars(a, { states, ptrs, water: st.settled, label: 'height (shaded: water settled so far)' }));
      stage.append(R.vars({ leftMax: st.lm, rightMax: st.rm, water: st.water }));
    },
  });

  V.define('dutch-flag', {
    title: 'Dutch national flag: three-way partition in one pass',
    inputs: [{ key: 'nums', label: 'nums (0, 1 or 2)', type: 'numbers', def: [2, 0, 2, 1, 1, 0], wide: true }],
    presets: [{ label: 'Roadmap trace', input: { nums: [2, 0, 2, 1, 1, 0] } }, { label: 'Already sorted', input: { nums: [0, 0, 1, 2, 2] } }, { label: 'Reversed', input: { nums: [2, 2, 1, 0, 0] } }, { label: 'One value', input: { nums: [1] } }],
    legend: [['done', '0s: [0, low)'], ['window', '1s: [low, mid)'], ['frontier', '2s: (high, n−1]'], ['current', 'mid (being classified)']],
    code: `
function sortColors(nums) {
  let low = 0, mid = 0, high = nums.length - 1;          //@init
  while (mid <= high) {                                  //@loop
    if (nums[mid] === 0) {                               //@is0
      [nums[low], nums[mid]] = [nums[mid], nums[low]];   //@swap0
      low++; mid++;                                      //@adv0
    } else if (nums[mid] === 1) {                        //@is1
      mid++;                                             //@adv1
    } else {                                             //@is2
      [nums[mid], nums[high]] = [nums[high], nums[mid]]; //@swap2
      high--;                                            //@dec2
    }
  }
}`,
    validate: ({ nums }) => sizeCheck(nums, 1, 14) || (nums.every((x) => x === 0 || x === 1 || x === 2) ? null : 'Use only 0, 1 and 2.'),
    run({ nums }) {
      const a = [...nums]; const steps = []; let low = 0, mid = 0, high = a.length - 1;
      const snap = (o) => Object.assign({ a: [...a], low, mid, high }, o);
      steps.push(snap({ line: 'init', note: 'Everything is "unknown" ([mid, high]). Regions grow until the unknown region is empty.', why: 'Invariant: [0, low) = 0s, [low, mid) = 1s, (high, n−1] = 2s.' }));
      while (mid <= high) {
        const v = a[mid];
        if (v === 0) {
          [a[low], a[mid]] = [a[mid], a[low]];
          const note = low === mid ? `nums[mid] = 0 and low = mid: the swap does nothing; advance both.` : `nums[mid] = 0: swap it with nums[low] (a 1), then advance low and mid.`;
          low++; mid++;
          steps.push(snap({ line: ['is0', 'swap0', 'adv0'], note, why: 'The value coming back from low is already classified (a 1, or the same 0), so mid may move on.' }));
        } else if (v === 1) { mid++; steps.push(snap({ line: ['is1', 'adv1'], note: 'nums[mid] = 1: it is already in the 1s region; mid++.' })); }
        else {
          [a[mid], a[high]] = [a[high], a[mid]]; high--;
          steps.push(snap({ line: ['is2', 'swap2', 'dec2'], note: `nums[mid] = 2: swap it to position ${high + 1} and shrink high. mid stays: the value that came back (${a[mid]}) is unchecked.`, why: 'Advancing mid here is the classic bug: an unexamined 0 or 2 would be left in the 1s region.' }));
        }
      }
      steps.push(snap({ result: [...a], line: 'loop', note: `mid > high: unknown region is empty. Result: [${a.join(', ')}].`, why: 'Each step either grows a classified region or shrinks the unknown one: at most n steps, O(n) time, O(1) space.' }));
      return steps;
    },
    render(st, stage) {
      const states = {}, ptrs = {};
      st.a.forEach((_, i) => { if (i < st.low) states[i] = 'done'; else if (i < st.mid) states[i] = 'window'; else if (i > st.high) states[i] = 'frontier'; });
      if (st.mid <= st.high) states[st.mid] = 'current';
      const add = (i, lab) => { if (i < 0 || i >= st.a.length) return; ptrs[i] = ptrs[i] ? [].concat(ptrs[i], lab) : lab; };
      add(st.low, 'low'); add(st.mid, 'mid'); add(st.high, 'high');
      stage.append(R.cells(st.a, { states, ptrs, label: 'nums' }));
      stage.append(R.vars({ low: st.low, mid: st.mid, high: st.high, unknown: Math.max(0, st.high - st.mid + 1) }));
    },
  });

  V.define('kadane', {
    title: 'Kadane: best subarray ending here',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [-2, 1, -3, 4, -1, 2, 1, -5, 4], wide: true }],
    presets: [{ label: 'Roadmap trace', input: { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] } }, { label: 'All negative', input: { nums: [-3, -1, -2] } }, { label: 'All positive', input: { nums: [2, 3, 1] } }, { label: 'Restart twice', input: { nums: [5, -9, 3, -1, -7, 4, 4] } }],
    legend: [['window', 'subarray behind cur'], ['current', 'index i'], ['best', 'best value in the table']],
    code: `
function maxSubArray(nums) {
  let cur = nums[0], best = nums[0];          //@init
  for (let i = 1; i < nums.length; i++) {     //@loop
    cur = Math.max(nums[i], cur + nums[i]);   //@cur
    best = Math.max(best, cur);               //@best
  }
  return best;                                //@ret
}`,
    validate: ({ nums }) => sizeCheck(nums, 1, 14),
    run({ nums: a }) {
      const steps = []; let cur = a[0], best = a[0], start = 0, bs = 0, be = 0; const curAt = [a[0]];
      steps.push({ line: 'init', i: 0, cur, best, start, bs, be, curAt: [...curAt], note: `cur = best = nums[0] = ${a[0]}.`, why: 'Not 0: with all-negative input the answer is the largest element, and a 0 start would wrongly return 0.' });
      for (let i = 1; i < a.length; i++) {
        const ext = cur + a[i];
        const restart = a[i] > ext;
        const prev = cur;
        cur = restart ? a[i] : ext; if (restart) start = i;
        curAt.push(cur);
        const nb = cur > best; if (nb) { best = cur; bs = start; be = i; }
        steps.push({ line: ['cur', 'best'], i, cur, best, start, bs, be, curAt: [...curAt],
          note: `i = ${i}: extend gives ${prev} + ${a[i]} = ${ext}; restart gives ${a[i]}. ${restart ? 'Restart' : 'Extend'}: cur = ${cur}.${nb ? ' New best ' + best + '.' : ''}`,
          why: restart ? `The best subarray ending at ${i - 1} had sum ${prev} < 0; carrying a negative sum can only make the subarray ending here worse, so drop it.` : prev >= 0 ? `A non-negative running sum (${prev}) always helps, so extending is at least as good as restarting.` : null });
      }
      steps.push({ result: best, line: 'ret', i: a.length - 1, cur, best, start, bs, be, curAt, done: true, note: `Answer ${best}: subarray [${bs}..${be}] = [${a.slice(bs, be + 1).join(', ')}].`, why: 'One pass with two variables: O(n) time, O(1) space. The table row is the DP "best sum ending at i"; Kadane keeps only its last value.' });
      return steps;
    },
    render(st, stage, { nums: a }) {
      const states = {};
      if (!st.done) states[st.i] = 'current';
      stage.append(R.cells(a, { states, window: st.done ? [st.bs, st.be] : [st.start, st.i], ptrs: st.done ? {} : { [st.i]: 'i' }, label: st.done ? 'nums (best subarray shaded)' : 'nums (shaded: the subarray whose sum is cur)' }));
      const vals = a.map((_, i) => (i < st.curAt.length ? st.curAt[i] : null));
      const bi = st.curAt.indexOf(st.best);
      stage.append(R.row1d(vals, { rowLabel: 'best ending at i', states: Object.assign(bi >= 0 ? { [bi]: 'best' } : {}, st.done ? {} : { [st.i]: 'current' }) }));
      stage.append(R.vars({ cur: st.cur, best: st.best, 'best range': '[' + st.bs + '..' + st.be + ']' }));
    },
  });

  // ---------- sliding windows ----------
  V.define('win-fixed', {
    title: 'Fixed-size window: add the new element, drop the old one',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [1, 12, -5, -6, 50, 3], wide: true }, { key: 'k', label: 'k', type: 'int', def: 4 }],
    presets: [{ label: 'LeetCode 643 example', input: { nums: [1, 12, -5, -6, 50, 3], k: 4 } }, { label: 'k = 1', input: { nums: [5, -1, 7], k: 1 } }, { label: 'k = n', input: { nums: [3, 1, 2], k: 3 } }],
    legend: [['window', 'window of size k'], ['current', 'entering'], ['error', 'leaving']],
    code: `
function findMaxAverage(nums, k) {
  let sum = 0;                                  //@init
  for (let i = 0; i < k; i++) sum += nums[i];   //@first
  let best = sum;                               //@best0
  for (let r = k; r < nums.length; r++) {       //@loop
    sum += nums[r] - nums[r - k];               //@slide
    best = Math.max(best, sum);                 //@best
  }
  return best / k;                              //@ret
}`,
    validate: ({ nums, k }) => sizeCheck(nums, 1, 16) || (k < 1 || k > nums.length ? 'k must be between 1 and the array length.' : null),
    run({ nums: a, k }) {
      const steps = []; let sum = 0;
      for (let i = 0; i < k; i++) { sum += a[i]; steps.push({ line: 'first', l: 0, r: i, sum, best: null, enter: i, note: `Build the first window: add nums[${i}] = ${a[i]} → sum ${sum}.` }); }
      let best = sum;
      steps.push({ line: 'best0', l: 0, r: k - 1, sum, best, note: `First window [0..${k - 1}] has sum ${sum}; best = ${sum}.` });
      for (let r = k; r < a.length; r++) {
        sum += a[r] - a[r - k];
        const nb = sum > best; best = Math.max(best, sum);
        steps.push({ line: ['slide', 'best'], l: r - k + 1, r, sum, best, enter: r, leave: r - k, note: `Slide: + nums[${r}] (${a[r]}) − nums[${r - k}] (${a[r - k]}) → sum ${sum}.${nb ? ' New best.' : ''}`, why: r === k ? 'Two operations per move instead of re-adding k numbers: O(1) per window, O(n) total instead of O(n·k).' : null });
      }
      steps.push({ result: best / k, line: 'ret', l: null, r: null, sum, best, note: `Best sum ${best}, so the answer is ${best} / ${k} = ${+(best / k).toFixed(5)}.` });
      return steps;
    },
    render(st, stage, { nums: a, k }) {
      const states = {};
      if (st.enter != null) states[st.enter] = 'current';
      if (st.leave != null) states[st.leave] = 'error';
      stage.append(R.cells(a, { window: st.l != null ? [st.l, st.r] : null, states, ptrs: st.l != null ? (st.l === st.r ? { [st.l]: ['l', 'r'] } : { [st.l]: 'l', [st.r]: 'r' }) : {}, label: 'nums' }));
      stage.append(R.vars({ k, sum: st.sum, best: st.best ?? '·' }));
    },
  });

  V.define('win-longest', {
    title: 'Variable window: longest substring without repeats',
    inputs: [{ key: 's', label: 's', type: 'string', def: 'abcabcbb', wide: true }],
    presets: [{ label: 'Roadmap trace', input: { s: 'abcabcbb' } }, { label: 'Day 3 trace', input: { s: 'pwwkew' } }, { label: 'Stale entry trap', input: { s: 'abba' } }, { label: 'All the same', input: { s: 'bbbbb' } }, { label: 'Spaces count', input: { s: 'a b c' } }],
    legend: [['window', 'window [l, r]'], ['current', 'r (entering)'], ['error', 'repeat inside the window'], ['compare', 'stale: seen before l']],
    code: `
function lengthOfLongestSubstring(s) {
  const lastSeen = new Map(); // char -> last index        //@init
  let l = 0, best = 0;                                     //@init2
  for (let r = 0; r < s.length; r++) {                     //@loop
    const c = s[r];                                        //@c
    if (lastSeen.has(c) && lastSeen.get(c) >= l) {         //@check
      l = lastSeen.get(c) + 1; // past the old copy        //@jump
    }
    lastSeen.set(c, r);                                    //@set
    best = Math.max(best, r - l + 1);                      //@best
  }
  return best;                                             //@ret
}`,
    validate: ({ s }) => (s.length > 24 ? 'Keep it to 24 characters.' : null),
    run({ s }) {
      const steps = [], last = new Map(); let l = 0, best = 0, bl = 0, br = -1;
      const snap = (o) => Object.assign({ l, best, bl, br, map: [...last.entries()] }, o);
      steps.push(snap({ line: ['init', 'init2'], r: -1, note: 'Empty window, empty map.' }));
      for (let r = 0; r < s.length; r++) {
        const c = s[r];
        if (last.has(c) && last.get(c) >= l) {
          const p = last.get(c);
          steps.push(snap({ line: ['c', 'check'], r, rep: p, note: `"${show(c)}" was last seen at ${p}, inside the window [${l}..${r - 1}]: the window would repeat it.` }));
          l = p + 1;
          steps.push(snap({ line: 'jump', r, note: `Jump l to ${l}, just past the old copy.`, why: 'Any window that still contains index ' + p + ' would contain "' + show(c) + '" twice, so all start positions ≤ ' + p + ' are ruled out at once.' }));
        } else if (last.has(c)) {
          steps.push(snap({ line: ['c', 'check'], r, stale: last.get(c), note: `"${show(c)}" was seen at ${last.get(c)}, but that is before l = ${l}: it is not in the window. l stays.`, why: 'This is what the ">= l" test is for. Without it, l would jump backwards and the window would wrongly re-include a repeat.' }));
        }
        last.set(c, r);
        const len = r - l + 1; const nb = len > best; if (nb) { best = len; bl = l; br = r; }
        steps.push(snap({ line: ['set', 'best'], r, note: `Record "${show(c)}" → ${r}. Window [${l}..${r}] = "${s.slice(l, r + 1)}", length ${len}.${nb ? ' New best.' : ''}` }));
      }
      steps.push(snap({ result: best, line: 'ret', r: null, done: true, note: `Answer ${best}${best ? ': "' + s.slice(bl, br + 1) + '"' : ''}.`, why: 'r moves n times and l only moves forward, so O(n) time; the map holds at most one entry per distinct character.' }));
      return steps;
    },
    render(st, stage, { s }) {
      const states = {};
      if (st.r != null && st.r >= 0) states[st.r] = 'current';
      if (st.rep != null) states[st.rep] = 'error';
      if (st.stale != null) states[st.stale] = 'compare';
      const win = st.done ? (st.best ? [st.bl, st.br] : null) : st.r >= 0 ? [st.l, st.r] : null;
      const ptrs = {}; if (!st.done && st.r >= 0) { if (st.l === st.r) ptrs[st.l] = ['l', 'r']; else { ptrs[st.l] = 'l'; ptrs[st.r] = 'r'; } }
      stage.append(R.cells([...s].map(show), { window: win, states, ptrs, label: st.done ? 's (best window shaded)' : 's' }));
      stage.append(R.kv(st.map.map(([k, v]) => [show(k), v]), { label: 'lastSeen (char → index)', states: st.r != null && st.r >= 0 ? { [show(s[st.r])]: 'current' } : {} }));
      stage.append(R.vars({ l: st.l, r: st.r ?? '·', best: st.best }));
    },
  });

  V.define('win-replace', {
    title: 'Window valid while length − maxCount ≤ k',
    inputs: [{ key: 's', label: 's (A–Z)', type: 'string', def: 'AABABBA', wide: true }, { key: 'k', label: 'k', type: 'int', def: 1 }],
    presets: [{ label: 'LeetCode example 2', input: { s: 'AABABBA', k: 1 } }, { label: 'LeetCode example 1', input: { s: 'ABAB', k: 2 } }, { label: 'k = 0', input: { s: 'AABBBA', k: 0 } }],
    legend: [['window', 'window [l, r]'], ['current', 'r (entering)'], ['error', 'leaving']],
    code: `
function characterReplacement(s, k) {
  const count = new Array(26).fill(0);                 //@init
  let l = 0, maxCount = 0, best = 0;                   //@init2
  for (let r = 0; r < s.length; r++) {                 //@loop
    const i = s.charCodeAt(r) - 65;                    //@idx
    maxCount = Math.max(maxCount, ++count[i]);         //@add
    while (r - l + 1 - maxCount > k) {                 //@while
      count[s.charCodeAt(l) - 65]--;                   //@rem
      l++;                                             //@shrink
    }
    best = Math.max(best, r - l + 1);                  //@best
  }
  return best;                                         //@ret
}`,
    validate: ({ s, k }) => (!/^[A-Z]+$/.test(s) ? 'Use upper-case letters A–Z only.' : s.length > 20 ? 'Keep it to 20 letters.' : k < 0 ? 'k must be 0 or more.' : null),
    run({ s, k }) {
      const steps = [], count = new Array(26).fill(0); let l = 0, mc = 0, best = 0;
      const counts = () => count.map((c, i) => [String.fromCharCode(65 + i), c]).filter(([, c]) => c > 0);
      const snap = (o) => Object.assign({ l, mc, best, counts: counts() }, o);
      for (let r = 0; r < s.length; r++) {
        mc = Math.max(mc, ++count[s.charCodeAt(r) - 65]);
        const len = r - l + 1;
        steps.push(snap({ line: ['idx', 'add'], r, note: `Add "${s[r]}". Window length ${len}, most frequent letter appears ${mc}× → ${len - mc} letter${len - mc === 1 ? '' : 's'} to replace (k = ${k}).` }));
        while (r - l + 1 - mc > k) {
          count[s.charCodeAt(l) - 65]--; const gone = l; l++;
          steps.push(snap({ line: ['while', 'rem', 'shrink'], r, leave: gone, note: `${r - gone + 1 - mc} > k: too many replacements. Remove "${s[gone]}", l → ${l}.`, why: 'maxCount is not decreased here. A stale (too large) maxCount can only keep a window of the best length so far, never report a longer invalid one, so the answer stays correct.' }));
        }
        const nb = r - l + 1 > best; best = Math.max(best, r - l + 1);
        steps.push(snap({ line: 'best', r, note: `Valid window [${l}..${r}] = "${s.slice(l, r + 1)}", length ${r - l + 1}.${nb ? ' New best.' : ''}` }));
      }
      steps.push(snap({ result: best, line: 'ret', r: null, note: `Answer ${best}.`, why: 'Each index enters once and leaves at most once: O(n) time, O(26) space.' }));
      return steps;
    },
    render(st, stage, { s, k }) {
      const states = {}; if (st.r != null) states[st.r] = 'current'; if (st.leave != null) states[st.leave] = 'error';
      stage.append(R.cells([...s], { window: st.r != null ? [st.l, st.r] : null, states, ptrs: st.r != null ? (st.l === st.r ? { [st.l]: ['l', 'r'] } : { [st.l]: 'l', [st.r]: 'r' }) : {}, label: 's' }));
      stage.append(R.kv(st.counts, { label: 'count in window' }));
      stage.append(R.vars({ k, maxCount: st.mc, 'length − maxCount': st.r != null ? st.r - st.l + 1 - st.mc : '·', best: st.best }));
    },
  });

  V.define('win-min', {
    title: 'Minimum-length window: record the answer while shrinking',
    inputs: [{ key: 'nums', label: 'nums (positive)', type: 'numbers', def: [2, 3, 1, 2, 4, 3], wide: true }, { key: 'target', label: 'target', type: 'number', def: 7 }],
    presets: [{ label: 'LeetCode example', input: { nums: [2, 3, 1, 2, 4, 3], target: 7 } }, { label: 'One element enough', input: { nums: [1, 4, 4], target: 4 } }, { label: 'Impossible', input: { nums: [1, 1, 1, 1], target: 11 } }],
    legend: [['window', 'window [l, r]'], ['current', 'entering'], ['error', 'leaving'], ['done', 'best window']],
    code: `
function minSubArrayLen(target, nums) {
  let l = 0, sum = 0, best = Infinity;          //@init
  for (let r = 0; r < nums.length; r++) {       //@loop
    sum += nums[r];                             //@add
    while (sum >= target) {                     //@while
      best = Math.min(best, r - l + 1);         //@best
      sum -= nums[l++];                         //@shrink
    }
  }
  return best === Infinity ? 0 : best;          //@ret
}`,
    validate: ({ nums }) => sizeCheck(nums, 1, 16) || (nums.some((x) => x <= 0) ? 'This window needs positive numbers. With zero or negatives, use prefix sums.' : null),
    run({ nums: a, target }) {
      const steps = []; let l = 0, sum = 0, best = Infinity, bw = null;
      const snap = (o) => Object.assign({ l, sum, best, bw }, o);
      for (let r = 0; r < a.length; r++) {
        sum += a[r];
        steps.push(snap({ line: 'add', r, enter: r, note: `Add nums[${r}] = ${a[r]} → sum ${sum}${sum >= target ? ' ≥ ' + target + ': valid.' : ' < ' + target + ': keep growing.'}` }));
        while (sum >= target) {
          const len = r - l + 1; const nb = len < best; if (nb) { best = len; bw = [l, r]; }
          steps.push(snap({ line: ['while', 'best'], r, note: `Window [${l}..${r}] is valid with length ${len}.${nb ? ' New best.' : ''} Record it now, before shrinking.`, why: 'For a minimum, the answer is recorded inside the loop, while the window is still valid. Recording after the loop would measure an invalid window.' }));
          sum -= a[l]; l++;
          steps.push(snap({ line: 'shrink', r, leave: l - 1, note: `Remove nums[${l - 1}] = ${a[l - 1]} → sum ${sum}. Try a shorter window.`, why: 'Positive numbers make the window monotone: removing from the left can only lower the sum, so once it drops below target, l never needs to move back.' }));
        }
      }
      steps.push(snap({ result: best === Infinity ? 0 : best, line: 'ret', r: null, done: true, note: best === Infinity ? 'No window reaches the target: return 0.' : `Answer ${best}.`, why: 'l and r each move at most n times: O(n) time, O(1) space.' }));
      return steps;
    },
    render(st, stage, { nums: a, target }) {
      const states = {};
      if (st.enter != null) states[st.enter] = 'current';
      if (st.leave != null) states[st.leave] = 'error';
      if (st.done && st.bw) for (let i = st.bw[0]; i <= st.bw[1]; i++) states[i] = 'done';
      const win = !st.done && st.r != null && st.l <= st.r ? [st.l, st.r] : null;
      const ptrs = {}; if (!st.done && st.r != null) { if (st.l <= st.r) { if (st.l === st.r) ptrs[st.l] = ['l', 'r']; else { ptrs[st.l] = 'l'; ptrs[st.r] = 'r'; } } else ptrs[st.r] = 'r'; }
      stage.append(R.cells(a, { window: win, states, ptrs, label: 'nums' }));
      stage.append(R.vars({ target, sum: st.sum, best: st.best, 'best window': st.bw ? '[' + st.bw.join('..') + ']' : '·' }));
    },
  });

  V.define('win-perm', {
    title: 'Fixed window of letter counts (Permutation in String)',
    inputs: [{ key: 's1', label: 's1 (a–z)', type: 'string', def: 'ab' }, { key: 's2', label: 's2 (a–z)', type: 'string', def: 'eidbaooo', wide: true }],
    presets: [{ label: 'LeetCode example 1', input: { s1: 'ab', s2: 'eidbaooo' } }, { label: 'LeetCode example 2', input: { s1: 'ab', s2: 'eidboaoo' } }, { label: 'Repeated letters', input: { s1: 'aab', s2: 'cbaab' } }],
    legend: [['window', 'window of length |s1|'], ['current', 'entering'], ['error', 'leaving'], ['done', 'match']],
    code: `
function checkInclusion(s1, s2) {
  if (s1.length > s2.length) return false;                 //@guard
  const need = new Array(26).fill(0);                      //@need
  const win = new Array(26).fill(0);                       //@win
  for (const c of s1) need[c.charCodeAt(0) - 97]++;        //@count
  const k = s1.length;                                     //@k
  for (let r = 0; r < s2.length; r++) {                    //@loop
    win[s2.charCodeAt(r) - 97]++;                          //@add
    if (r >= k) win[s2.charCodeAt(r - k) - 97]--;          //@rem
    if (r >= k - 1 && same(need, win)) return true;        //@cmp
  }
  return false;                                            //@no
}
const same = (a, b) => a.every((x, i) => x === b[i]);`,
    validate: ({ s1, s2 }) => (!/^[a-z]+$/.test(s1) || !/^[a-z]+$/.test(s2) ? 'Use lower-case letters a–z only.' : s2.length > 20 ? 'Keep s2 to 20 letters.' : null),
    run({ s1, s2 }) {
      const steps = []; const need = {}, win = {};
      for (const c of s1) need[c] = (need[c] || 0) + 1;
      const k = s1.length;
      const snap = (o) => Object.assign({ need: { ...need }, win: { ...win } }, o);
      if (k > s2.length) { steps.push(snap({ result: false, line: 'guard', note: 's1 is longer than s2: no window can hold it. Return false.' })); return steps; }
      steps.push(snap({ line: ['need', 'win', 'count', 'k'], note: `Count s1: ${Object.entries(need).map(([c, n]) => c + '×' + n).join(', ')}. Any window of length ${k} with the same counts is a permutation.` }));
      for (let r = 0; r < s2.length; r++) {
        win[s2[r]] = (win[s2[r]] || 0) + 1;
        let leave = null;
        if (r >= k) { leave = r - k; win[s2[r - k]]--; if (!win[s2[r - k]]) delete win[s2[r - k]]; }
        const ready = r >= k - 1;
        const eq = ready && Object.keys(need).length === Object.keys(win).length && Object.entries(need).every(([c, n]) => win[c] === n);
        steps.push(snap({ result: eq ? true : undefined, line: eq ? ['add', 'rem', 'cmp'] : ['add', 'rem'], r, l: Math.max(0, r - k + 1), leave, enter: r, eq, note: `Add "${s2[r]}"${leave != null ? ', remove "' + s2[leave] + '"' : ''}.` + (ready ? (eq ? ` Window "${s2.slice(r - k + 1, r + 1)}" has the same counts: return true.` : ` Window "${s2.slice(r - k + 1, r + 1)}" counts differ.`) : ' Window not full yet.'), why: r === k ? 'Updating two counts per move is O(1); comparing 26 counts is O(26) = O(1). Total O(26·n), which is O(n).' : null }));
        if (eq) return steps;
      }
      steps.push(snap({ result: false, line: 'no', done: true, note: 'No window matched: return false.' }));
      return steps;
    },
    render(st, stage, { s1, s2 }) {
      const states = {};
      if (st.enter != null) states[st.enter] = st.eq ? 'done' : 'current';
      if (st.leave != null) states[st.leave] = 'error';
      if (st.eq) for (let i = st.l; i <= st.r; i++) states[i] = 'done';
      stage.append(R.cells([...s2], { window: st.r != null ? [st.l, st.r] : null, states, label: 's2' }));
      const letters = [...new Set([...Object.keys(st.need), ...Object.keys(st.win)])].sort();
      stage.append(R.kv(letters.map((c) => [c, (st.win[c] || 0) + ' / ' + (st.need[c] || 0)]), { label: 'letter → count in window / count needed', states: Object.fromEntries(letters.map((c) => [c, (st.win[c] || 0) === (st.need[c] || 0) ? 'done' : 'compare'])) }));
    },
  });

  // ---------- prefix sums ----------
  V.define('prefix-range', {
    title: 'Prefix sums: any range sum in O(1)',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [-2, 0, 3, -5, 2, -1], wide: true }, { key: 'l', label: 'query l', type: 'int', def: 2 }, { key: 'r', label: 'query r', type: 'int', def: 5 }],
    presets: [{ label: 'LeetCode 303 example', input: { nums: [-2, 0, 3, -5, 2, -1], l: 2, r: 5 } }, { label: 'Range starting at 0', input: { nums: [-2, 0, 3, -5, 2, -1], l: 0, r: 2 } }, { label: 'Single element', input: { nums: [4, 7, 1], l: 1, r: 1 } }],
    legend: [['current', 'being built / used'], ['window', 'queried range'], ['compare', 'pre[l] (subtracted)']],
    code: `
class NumArray {
  constructor(nums) {
    this.pre = [0];        // sum of the first 0 elements //@init
    for (const x of nums)                                                    //@loop
      this.pre.push(this.pre[this.pre.length - 1] + x);                      //@push
  }
  sumRange(l, r) {
    return this.pre[r + 1] - this.pre[l];                                    //@query
  }
}`,
    validate: ({ nums, l, r }) => sizeCheck(nums, 1, 14) || (l < 0 || r >= nums.length || l > r ? 'Need 0 ≤ l ≤ r < n.' : null),
    run({ nums: a, l, r }) {
      const steps = [], pre = [0];
      steps.push({ line: 'init', pre: [...pre], cur: 0, note: 'pre[0] = 0: the sum of no elements.', why: 'Without pre[0] = 0, ranges that start at index 0 would have nothing to subtract.' });
      a.forEach((x, i) => { pre.push(pre[i] + x); steps.push({ line: ['loop', 'push'], pre: [...pre], cur: i + 1, from: i, note: `pre[${i + 1}] = pre[${i}] + nums[${i}] = ${pre[i]} + ${x} = ${pre[i + 1]}.`, why: i === 0 ? 'pre[i] is the sum of the first i elements, nums[0..i−1]. Building it is O(n), once.' : null }); });
      steps.push({ result: pre[r + 1] - pre[l], line: 'query', pre, q: true, note: `sumRange(${l}, ${r}) = pre[${r + 1}] − pre[${l}] = ${pre[r + 1]} − ${pre[l]} = ${pre[r + 1] - pre[l]}.`, why: `pre[${r + 1}] covers nums[0..${r}]; pre[${l}] covers nums[0..${l - 1}]. Subtracting leaves exactly nums[${l}..${r}]. One subtraction per query: O(1).` });
      return steps;
    },
    render(st, stage, { nums: a, l, r }) {
      stage.append(R.cells(a, { window: st.q ? [l, r] : null, states: st.from != null ? { [st.from]: 'current' } : {}, label: 'nums' }));
      const states = {}; if (st.cur != null) states[st.cur] = 'current'; if (st.q) { states[r + 1] = 'current'; states[l] = 'compare'; }
      stage.append(R.cells(a.concat([null]).map((_, i) => (i < st.pre.length ? st.pre[i] : '')), { states, label: 'pre (one longer than nums)' }));
    },
  });

  V.define('prefix-map', {
    title: 'Prefix sums + hash map: count subarrays with sum k',
    inputs: [{ key: 'nums', label: 'nums', type: 'numbers', def: [1, -1, 1], wide: true }, { key: 'k', label: 'k', type: 'number', def: 1 }],
    presets: [{ label: 'Roadmap trace', input: { nums: [1, -1, 1], k: 1 } }, { label: 'LeetCode example', input: { nums: [1, 2, 3], k: 3 } }, { label: 'Zeros', input: { nums: [0, 0, 0], k: 0 } }, { label: 'Negatives', input: { nums: [3, 4, 7, 2, -3, 1, 4, 2], k: 7 } }],
    legend: [['current', 'element / prefix just added'], ['done', 'subarrays ending here'], ['compare', 'matching earlier prefix']],
    code: `
function subarraySum(nums, k) {
  const countOfPrefix = new Map([[0, 1]]); // empty prefix //@init
  let cur = 0, count = 0;                                          //@init2
  for (const x of nums) {                                          //@loop
    cur += x;                        // sum of nums[0..i]  //@add
    count += countOfPrefix.get(cur - k) ?? 0;                      //@count
    countOfPrefix.set(cur, (countOfPrefix.get(cur) ?? 0) + 1);     //@record
  }
  return count;                                                    //@ret
}`,
    validate: ({ nums }) => sizeCheck(nums, 1, 12),
    run({ nums: a, k }) {
      const steps = [], map = new Map([[0, 1]]), prefixes = [0]; let cur = 0, count = 0; const found = [];
      steps.push({ line: ['init', 'init2'], map: [...map], prefixes: [...prefixes], cur, count, found: [], note: 'Seed the map with prefix 0 seen once (the empty prefix).', why: 'It stands for "start the subarray at index 0". Without it, a subarray beginning at 0 would never be counted.' });
      a.forEach((x, i) => {
        cur += x;
        const need = cur - k; const hits = []; prefixes.forEach((p, j) => { if (p === need) hits.push(j); });
        const add = map.get(need) ?? 0; count += add;
        hits.forEach((j) => found.push([j, i]));
        steps.push({ line: ['add', 'count'], i, map: [...map], prefixes: [...prefixes], cur, need, hits, count, found: [...found], note: `i = ${i}: cur = ${cur}. Need an earlier prefix equal to cur − k = ${need}: seen ${add}×, so count += ${add} → ${count}.`, why: add ? 'Each earlier prefix p with cur − p = k marks a start: ' + hits.map((j) => '[' + j + '..' + i + ']').join(', ') + '.' : 'No earlier prefix fits, so no subarray ending here sums to k.' });
        map.set(cur, (map.get(cur) ?? 0) + 1); prefixes.push(cur);
        steps.push({ line: 'record', i, map: [...map], prefixes: [...prefixes], cur, count, found: [...found], recorded: cur, note: `Record prefix ${cur} (now seen ${map.get(cur)}×).`, why: 'Count first, then record: recording first would let a prefix match itself, counting an empty subarray when k = 0.' });
      });
      steps.push({ result: count, line: 'ret', map: [...map], prefixes, cur, count, found, done: true, note: `Answer: ${count} subarray${count === 1 ? '' : 's'}${found.length ? ': ' + found.map(([s, e]) => '[' + a.slice(s, e + 1).join(',') + ']').join(', ') : ''}.`, why: 'One pass with O(1) map operations: O(n) time, O(n) space. A sliding window cannot do this: with negative numbers, growing the window can shrink the sum.' });
      return steps;
    },
    render(st, stage, { nums: a, k }) {
      const states = {}; if (st.i != null && !st.done) states[st.i] = 'current';
      const ending = st.hits && st.hits.length ? st.hits : [];
      stage.append(R.cells(a, { states, label: 'nums', ptrs: st.i != null && !st.done ? { [st.i]: 'i' } : {} }));
      const pst = {}; ending.forEach((j) => (pst[j] = 'compare')); if (st.recorded != null) pst[st.prefixes.length - 1] = 'current';
      stage.append(R.cells(st.prefixes, { states: pst, label: 'prefix sums seen (pre[0] = 0, then after each element)' }));
      const mst = {}; if (st.need != null && st.map.some(([kk]) => kk === st.need)) mst[st.need] = 'compare'; if (st.recorded != null) mst[st.recorded] = 'current';
      stage.append(R.kv(st.map, { label: 'countOfPrefix (prefix → times seen)', states: mst }));
      stage.append(R.vars({ k, cur: st.cur, 'cur − k': st.need ?? '·', count: st.count }));
      if (st.found.length) stage.append(el('div.small.ui', el('span.muted', 'Subarrays found: '), st.found.map(([s, e]) => '[' + s + '..' + e + ']').join(' ')));
    },
  });

  V.define('diff-array', {
    title: 'Difference array: many range updates, one prefix pass',
    inputs: [{ key: 'n', label: 'n', type: 'int', def: 6 }, { key: 'updates', label: 'updates [l, r, v] (0-based)', type: 'json', def: [[0, 2, 10], [1, 4, 5], [3, 5, -2]], wide: true }],
    presets: [{ label: 'Day 5 trace', input: { n: 6, updates: [[0, 2, 10], [1, 4, 5], [3, 5, -2]] } }, { label: 'LeetCode 1109 (as 0-based)', input: { n: 5, updates: [[0, 1, 10], [1, 2, 20], [1, 4, 25]] } }],
    legend: [['current', 'changed now'], ['done', 'final value']],
    code: `
function rangeAdd(n, updates) {
  const diff = new Array(n + 1).fill(0);      //@init
  for (const [l, r, v] of updates) {          //@loop
    diff[l] += v;          // start adding v  //@start
    diff[r + 1] -= v;      // stop after r    //@stop
  }
  const out = new Array(n);                   //@out
  let run = 0;                                //@run
  for (let i = 0; i < n; i++) {               //@loop2
    run += diff[i];                           //@acc
    out[i] = run;                             //@set
  }
  return out;                                 //@ret
}`,
    validate: ({ n, updates }) => (n < 1 || n > 14 ? 'n must be 1–14.' : !Array.isArray(updates) || updates.some((u) => !Array.isArray(u) || u.length !== 3 || u[0] < 0 || u[1] >= n || u[0] > u[1]) ? 'Each update is [l, r, v] with 0 ≤ l ≤ r < n.' : updates.length > 8 ? 'Use at most 8 updates.' : null),
    run({ n, updates }) {
      const steps = [], diff = new Array(n + 1).fill(0);
      steps.push({ line: 'init', diff: [...diff], out: [], note: `diff has n + 1 = ${n + 1} slots, so diff[r + 1] exists even when r = n − 1.` });
      updates.forEach(([l, r, v]) => { diff[l] += v; diff[r + 1] -= v; steps.push({ line: ['loop', 'start', 'stop'], diff: [...diff], out: [], ch: [l, r + 1], upd: [l, r, v], note: `Update [${l}, ${r}] += ${v}: diff[${l}] += ${v}, diff[${r + 1}] −= ${v}.`, why: 'Two writes instead of ' + (r - l + 1) + '. A running sum will "switch on" v at l and "switch it off" after r.' }); });
      const out = []; let run = 0;
      for (let i = 0; i < n; i++) { run += diff[i]; out.push(run); steps.push({ line: ['acc', 'set'], diff: [...diff], out: [...out], i, run, note: `run += diff[${i}] (${diff[i]}) → ${run}; out[${i}] = ${run}.` }); }
      steps.push({ result: out, line: 'ret', diff, out, done: true, note: `Result [${out.join(', ')}].`, why: `${updates.length} updates cost O(1) each, plus one O(n) pass: O(k + n) instead of O(k·n).` });
      return steps;
    },
    render(st, stage, { n }) {
      const ds = {}; if (st.ch) st.ch.forEach((i) => (ds[i] = 'current')); if (st.i != null) ds[st.i] = 'current';
      stage.append(R.cells(st.diff, { states: ds, label: 'diff (n + 1 slots)' }));
      const os = {}; st.out.forEach((_, i) => (os[i] = st.done ? 'done' : i === st.i ? 'current' : null));
      stage.append(R.cells(Array.from({ length: n }, (_, i) => (i < st.out.length ? st.out[i] : '')), { states: os, label: 'out (prefix sum of diff)' }));
      if (st.run != null) stage.append(R.vars({ run: st.run }));
    },
  });
})(window);
