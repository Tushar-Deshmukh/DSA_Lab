# 12-Week DSA Roadmap (JavaScript)

Oct 26, 2026 · @rohit

**Corrected edition (26 Oct 2026).** This version fixes the defects found in a full audit of the first edition; every change is listed in Audit and corrections.

## 0. Strategy, assumptions and how to use this document

You will study **144 scheduled hours over 12 weeks (Mon 2 Nov 2026 – Sun 24 Jan 2027)**, plus about 3.5 hours for the Week 0 diagnostic and the final self-assessment. You will attempt **about 150 unique LeetCode problems** (133 are scheduled; the rest are optional Stretch problems done on Sundays, outside the 144 hours) and complete **90 scheduled re-solves**, with six assessments and six mock interviews. The plan optimises for one outcome: solving an unseen medium problem in 35–40 minutes while explaining your reasoning out loud.

### The strategy in five rules

1. **Patterns before problems.** Each week teaches 3–5 reusable patterns. Problems are chosen to teach, reinforce, then test each pattern, not to raise a count.
2. **Brute force first, always.** Every problem starts with the naive solution and its complexity. Optimisation is derived from the bottleneck, never recalled from memory.
3. **Spaced re-solving, not re-reading.** A problem is revisited at roughly +1, +3, +7 and +14 days. Re-solving from a blank editor is the only revision that counts.
4. **Fewer problems on hard days.** New, hard topics (DP, graphs, backtracking) get 2 core problems; lighter days get 3. Stretch problems spill to Sunday, never into sleep; that Sunday time is optional and sits outside the 144-hour budget.
5. **Assess honestly.** A problem is *mastered* only when you can derive, implement, explain and analyse it without help. Reading an editorial and nodding is logged as "needed solution", not "solved".

### Explicit assumptions (change them and the plan still holds)

| Assumption | Value used | If it is different |
| --- | --- | --- |
| Start date | Week 0 diagnostic Tue 27 Oct – Sun 1 Nov; Week 1 starts Mon 2 Nov 2026 | Shift every date; week and day numbers stay the same |
| Study days | Mon–Sat, \~2 h each; Sunday = rest or catch-up | If weekdays are tight, move Day 6 work to Sunday morning |
| Language | JavaScript (Node 20+ / LeetCode JS runtime) | All templates use plain ES2020+ |
| LeetCode access | Free account; no Premium problems are assigned | Premium is not needed for this plan |
| Holidays | 25 Dec (W8 Fri) and 1 Jan (W9 Fri) fall on study days; each week's Day 5 moves to that Sunday, so each week still has one rest day | Swap that day with Sunday of the same week |
| Starting level | Comfortable with JS; DSA fundamentals unknown | The Week 0 diagnostic adjusts Weeks 1–3 (section 1) |
| Problem metadata | All 210 linked problems (number, title, URL slug, difficulty, Premium flag) were checked on 26 Oct 2026 against the doocs/leetcode mirror of LeetCode, and 9 of them (23, 72, 84, 110, 191, 235, 543, 1046 and one assessment problem) on leetcode.com itself; none is Premium | LeetCode sometimes re-rates difficulty; if a link breaks, search the exact title |

### How to use this document each day

1. Open **section 4** (day-by-day). Find today's row: topic, implementation exercise, problems, revision warm-up, completion criteria.
2. Read that week's theory in **section 3** before the first study day of the week (or during the 20–30 minute theory block).
3. Look up each problem's hint and purpose in **section 5** only after 10 minutes of independent thinking.
4. Use the method in **section 7** on every problem. Paste reusable code from **section 6** only after you can write it yourself.
5. Log every attempt in the tracker from **section 8**. On Saturday, fill the weekly scorecard in **section 10**.

### What this plan will not do

It will not guarantee an offer. Twelve weeks at 2 hours a day builds solid medium-level competence and reliable pattern recognition. Consistent success on hard problems, competitive-programming topics and system design need longer and are scoped in section 12.

## 1. Starting-point assessment (Week 0: Tue 27 Oct – Sun 1 Nov)

Spend two sessions this week (about 2.5 hours total) on the diagnostic below; the score decides whether you follow Track A, B or C in Weeks 1–3. Do it without notes, AI help or an IDE's autocomplete. Guessing defeats the purpose.

### What a 3.5-year MERN developer usually looks like on day one

| Area | Typical strength | Typical gap |
| --- | --- | --- |
| JavaScript fluency | Strong: arrays, objects, closures, async | Cost of built-ins (`shift`, `includes`, `slice`, spread) is rarely considered |
| Complexity analysis | Intuitive ("this is slow") | Cannot formally derive O(n log n) vs O(n²), or use constraints to pick an algorithm |
| Hashing | Uses objects as maps daily | Does not reach for a hash map as an optimisation step |
| Pointers and recursion | Recursion in React trees, rarely by hand | Linked-list pointer rewiring and recursion state are unfamiliar |
| Patterns | Little exposure | Sliding window, monotonic stack, DP, graph algorithms are new |
| Interview communication | Good at explaining systems | Not used to talking while solving under time pressure |

The roadmap assumes this profile. The diagnostic checks it.

### Session A: concept check (40 minutes, pen and paper)

Answer each question in one or two lines. Score 1 point per correct answer.

1. What is the time complexity of a loop `for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {...}`?
2. What is the complexity of `for (let i = 1; i < n; i *= 2) {...}`?
3. You loop over an array of length n and call `arr.includes(x)` inside the loop. Total complexity?
4. What does `s = s.slice(1)` cost inside a loop that runs n times on a string of length n?
5. Why is calling `queue.shift()` in a BFS loop a problem in JavaScript?
6. What does `[10, 9, 1, 2].sort()` return, and why?
7. Give two reasons to prefer `Map` over a plain object for counting frequencies.
8. What are the time and space complexities of naive recursive Fibonacci `fib(n) = fib(n-1) + fib(n-2)`?
9. Constraints say `n <= 10^5`. Which time complexities are acceptable, and which are not?
10. What is the difference between a subarray and a subsequence? How many of each does an array of length n have?
11. What does `1 << 31` evaluate to in JavaScript?
12. In binary search on a sorted array, what must be true about the range `[lo, hi]` at the start of every iteration?

### Session B: practical coding (90 minutes, LeetCode editor, timer running)

| # | Task | Time box | What it reveals |
| --- | --- | --- | --- |
| B1 | [1480. Running Sum of 1d Array](https://leetcode.com/problems/running-sum-of-1d-array/) (Easy) | 10 min | Basic array handling, prefix-sum instinct |
| B2 | [349. Intersection of Two Arrays](https://leetcode.com/problems/intersection-of-two-arrays/) (Easy) | 15 min | Whether you reach for `Set` and state complexity |
| B3 | [14. Longest Common Prefix](https://leetcode.com/problems/longest-common-prefix/) (Easy) | 15 min | String handling and edge cases (empty array, empty string) |
| B4 | [2. Add Two Numbers](https://leetcode.com/problems/add-two-numbers/) (Medium) | 25 min | Pointer manipulation, carry handling, dummy-node instinct |
| B5 | No LeetCode: write binary search from memory, then a recursive `flatten(nestedArray)` | 15 min | Off-by-one discipline and recursive thinking |

For each task, record: solved (yes/no), time taken, whether you stated the complexity before submitting, and the bug that cost the most time.

### Scoring and routing

Score A out of 12 and B out of 5 (one point per task solved within its time box with correct complexity stated; B5 earns its point only if both parts are correct). Apply the three rules below in order and stop at the first one that matches, so every one of the 78 possible score pairs leads to exactly one track.

| Order | Rule (first match wins) | Track | What changes in Weeks 1–3 |
| --- | --- | --- | --- |
| 1 | A ≤ 5 **or** B ≤ 1 | **C: Foundations** | Before Week 1, spend Sun 1 Nov (2 h) on section 6 parts 6.1–6.3 and re-do B1–B3; in Weeks 1–3 do Core only and use Sunday for Stretch |
| 2 | A ≥ 10 **and** B ≥ 4 | **A: Accelerated** | Skim Week 1 theory except the JS cost model; treat every Stretch problem in Weeks 1–3 as Core, using the time saved on theory; add the optional Hard of each week if time remains |
| 3 | Anything else (A 6–12 with B 2–5 that rule 2 did not match) | **B: Standard** | Follow the plan exactly as written |

Targeted fixes, whatever your track:

- **Missed Q1–Q4 or Q8–Q9:** read section 3, Week 1, "Complexity notation" and "Using constraints" parts twice and do the six snippets in its Example 2 before Day 1.
- **Missed Q5–Q7 or Q11:** read section 6.1–6.4 (JS cost model, Map/Set, sorting, bitwise) before Day 1.
- **Failed B4:** linked lists will need extra care; in Week 4, use Sunday for all Stretch problems.
- **Failed B5 binary search:** in Week 3, do Day 1 twice (Mon and Tue) and shift the week's remaining days by one, dropping Day 4's Stretch.

### Answer key (check only after finishing)

1. O(n²): the inner loop runs n + (n−1) + … + 1 = n(n+1)/2 times.
2. O(log n): i doubles each step, so it reaches n after log₂ n steps.
3. O(n²): `includes` is a linear scan.
4. O(n²) total in the standard cost model: each `slice` can copy up to n characters. V8 often shares memory between a string and its slices, so this may run faster in practice, but interviewers expect O(n) per slice, and array slices always copy. Move an index instead.
5. `shift` re-indexes the remaining elements, which is O(n) per call, so BFS becomes O(V²). Use a head pointer (section 6.5).
6. `[1, 10, 2, 9]`: the default sort compares elements as strings. Use `(a, b) => a - b`.
7. Any two of: keys of any type (numbers stay numbers); no prototype keys such as `"constructor"` or `"__proto__"`; `size` is O(1); insertion order is guaranteed and iteration is direct; faster for frequent add/delete.
8. Time O(φⁿ) ≈ O(1.618ⁿ), commonly stated as O(2ⁿ); space O(n) for the call stack.
9. O(n), O(n log n), O(n √n) at a push. O(n²) is about 10¹⁰ operations and too slow.
10. A subarray is contiguous; a subsequence keeps order but may skip elements. There are n(n+1)/2 non-empty subarrays and 2ⁿ − 1 non-empty subsequences.
11. `-2147483648`: bitwise operators work on signed 32-bit integers.
12. The invariant: if the target exists, it lies inside `[lo, hi]` (for the closed-interval version). Each step must keep that true while shrinking the range.

## 2. The 12-week roadmap overview

The plan runs in four three-week phases, each ending with a mixed assessment, and every topic is placed after the topics it depends on. Measurable milestones are set at Weeks 4, 8 and 12 (section 10).

### Phases

| Phase | Weeks | Theme | Why here |
| --- | --- | --- | --- |
| 1. Foundations and linear patterns | 1–3 (2–21 Nov) | Complexity, arrays, hashing, two pointers, sliding window, prefix sums, binary search, sorting | Roughly 40% of interview problems reduce to these. Everything later assumes you can analyse complexity and use a hash map reflexively |
| 2. Pointers and recursion | 4–6 (23 Nov – 12 Dec) | Linked lists, stacks, queues, monotonic stack, recursion, backtracking, trees | Pointer rewiring trains careful state handling; recursion is the engine of trees, backtracking, DFS and DP |
| 3. Structures and graphs | 7–9 (14 Dec – 2 Jan) | Heaps, intervals, tries, graph traversal, topological sort, Dijkstra, Union-Find, greedy | Heaps need tree intuition; Dijkstra needs heaps and BFS; greedy proofs use sorting and intervals |
| 4. DP and interview readiness | 10–12 (4–23 Jan) | Dynamic programming, bit manipulation, mixed timed practice, mocks | DP needs recursion, memoisation and maturity. The final week converts knowledge into timed, unlabeled performance |

### Week-by-week overview

Problem counts are Core / Stretch / Optional. Core is required. Stretch is done the same day if time allows, otherwise on Sunday. Optional problems are Hard or advanced and may be skipped without consequence.

| Week (dates) | Main topic | Subtopics | Core patterns | Difficulty | New problems C/S/O | Revision and assessment | Learning outcome |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 (2–7 Nov) | Complexity, arrays, hashing | Big O/Θ/Ω, amortised cost, constraints → algorithm, in-place edits, Map/Set, frequency counting, bucket idea, matrix traversal | Hash lookup, frequency map, read/write pointers, boundary-shrinking matrix walk | Easy–Medium | 10 / 3 / 1 | Daily warm-up; Saturday review + complexity drill | Analyse any loop/recursion; replace a nested loop with a hash map |
| 2 (9–14 Nov) | Two pointers, sliding window, prefix sums | Opposite/same-direction pointers, fixed and variable windows, prefix sums + hash map, Kadane, difference arrays, palindromes | Two pointers, sliding window, prefix-sum counting, Kadane | Medium | 10 / 4 / 3 | **Assessment 1** (Sat 14 Nov) | Recognise and derive the four linear patterns from brute force |
| 3 (16–21 Nov) | Binary search and sorting | Closed vs half-open intervals, lower/upper bound, rotated arrays, search on answer, merge sort, quicksort, stability, comparators | Boundary binary search, binary search on answer, sort-then-scan | Medium | 11 / 2 / 1 | Saturday review | Write bug-free binary search by reasoning about invariants |
| 4 (23–28 Nov) | Linked lists, stacks, queues | Dummy nodes, reversal, fast/slow pointers, LRU design, stack/queue implementations, monotonic stack | In-place reversal, fast/slow, monotonic stack | Medium | 11 / 4 / 2 | **Assessment 2** (Sat 28 Nov) | Rewire pointers without losing nodes; spot "next greater" problems |
| 5 (30 Nov – 5 Dec) | Recursion and backtracking | Base case, recursion trees, call stack, subsets, permutations, combinations, pruning, duplicates, grid search | Choose/explore/unchoose, include/exclude | Medium–Hard | 10 / 3 / 2 | Saturday review + **Mock 1** | Define recursive state and stopping rules; analyse exponential complexity |
| 6 (7–12 Dec) | Trees and BSTs | Traversals (recursive + iterative), BFS levels, height/diameter, path problems, LCA, BST validation, construction | Bottom-up return values, top-down parameters, level BFS, inorder = sorted | Medium | 11 / 7 / 1 | **Assessment 3** (Sat 12 Dec) | Classify tree problems as children / ancestors / levels and solve them |
| 7 (14–19 Dec) | Heaps, intervals, tries | Heap operations, custom MinHeap, top-K, k-way merge, two heaps, interval merging and scheduling, trie | Heap of size k, k-way merge, sort-by-start sweep, prefix tree | Medium–Hard | 8 / 4 / 3 | Saturday review + **Mock 2** | Choose heap vs sort; implement a heap and trie from scratch |
| 8 (21–26 Dec) | Graphs I | Representations, BFS/DFS, visited state, components, grids, multi-source BFS, cycle detection, topological sort, bipartite | Flood fill, BFS shortest path, Kahn's algorithm, 3-colour DFS | Medium | 10 / 4 / 2 | **Assessment 4** (Sat 26 Dec) | Model a problem as a graph and pick BFS vs DFS vs topo sort |
| 9 (28 Dec – 2 Jan) | Graphs II and greedy | Dijkstra, Union-Find, MST (Kruskal/Prim), greedy choice, exchange arguments, counterexamples | Dijkstra with heap, DSU, greedy with proof | Medium–Hard | 7 / 4 / 1 | Saturday review + **Mock 3** | Run Dijkstra and DSU from memory; prove or break a greedy idea |
| 10 (4–9 Jan) | Dynamic programming I | Overlapping subproblems, memoisation, tabulation, space optimisation, 1-D DP, unbounded knapsack, grid DP | State → transition → base case, take/skip | Hard (conceptually) | 10 / 2 / 2 | **Assessment 5** (Sat 9 Jan) | Turn brute-force recursion into memo, then table, then O(1) space |
| 11 (11–16 Jan) | DP II and bits | 0/1 knapsack, subset sum, LCS, edit distance, LIS, palindromic DP, state machines; bitwise ops and JS 32-bit rules | Two-sequence DP, knapsack, XOR tricks | Hard | 10 / 2 / 2 | Saturday review + **Mock 4** | Define 2-D DP states; recognise when DP is unnecessary |
| 12 (18–23 Jan) | Interview readiness | Unlabeled mixed sets, weak-pattern repair, one hard problem, verbal drills | All patterns, mixed | Medium–Hard | 6 + 1 Hard | **Mocks 5–6**, **Assessment 6** (Sat 23 Jan) | Solve unseen mediums in ≤ 40 min while explaining clearly |

### Dependency chain

- **Complexity → everything.** You cannot judge an optimisation without it.
- **Hashing → two pointers and prefix sums.** 1 Two Sum (hash) and 167 Two Sum II (pointers) teach when sorted input lets you drop the map; 560 needs prefix sums + a map.
- **Sorting → binary search, intervals, greedy.** Sorted order is the precondition for all three.
- **Linked lists → recursion.** Recursive reversal (206) is the bridge from loops to recursive thinking.
- **Stacks and queues → trees and graphs.** Iterative DFS uses a stack; BFS uses a queue.
- **Recursion → backtracking → trees → graphs.** Same "function returns information about a sub-problem" idea, adding visited state as you go.
- **Trees → heaps.** A heap is a complete binary tree stored in an array.
- **Heaps + BFS → Dijkstra.** Dijkstra is BFS with a priority queue.
- **Greedy → DP.** Coin Change (322) is where greedy fails and DP takes over; seeing greedy first makes that lesson concrete.
- **Recursion + memoisation → DP.** DP is taught as "brute-force recursion, then cache, then table".

### Topic prioritisation (Module 14)

| Topic | Category | Placement | Reason |
| --- | --- | --- | --- |
| Intervals | 1. Essential | W7 Day 4 | Merging, scheduling and overlap questions are common at product companies and reuse sorting |
| Monotonic stack | 1. Essential | W4 Day 5 | "Next greater/smaller" appears often and has a non-obvious O(n) solution |
| Union-Find applications | 1. Essential | W9 Day 2 | Connectivity and redundant-edge problems; short to implement |
| Design problems (LRU, Time Map, GetRandom O(1)) | 1. Essential | W4 Day 3, W12 Day 2 | Product companies favour data-structure design that combines a map with a list |
| Tries | 1. Essential (one day) | W7 Day 5 | Autocomplete and word search; the structure is simple and frequently tested |
| Monotonic deque | 2. If time | Worked example in W4 (section 3, Week 4, Example 4); practice via 239 as a W12 Hard option | Less frequent; builds directly on the monotonic stack |
| Advanced DP (tree DP, bitmask DP, interval DP) | 2. If time | After roadmap | High effort for lower frequency; tree DP is the first to add |
| Shortest paths beyond Dijkstra (Bellman-Ford via 787) | 2. If time | W9 optional | Appears occasionally; Dijkstra covers most cases |
| Math (GCD, fast power, sieve, modular arithmetic) | 2. If time | Fast power in W5 (50); rest in section 12 | Rarely the core of a question but useful helpers |
| Advanced graphs (Floyd-Warshall, Tarjan SCC, bridges, max-flow) | 3. Defer | Section 12 | Rare outside specialised roles |
| Segment and Fenwick trees | 3. Defer | Section 12 | Uncommon in product-company rounds; high implementation cost |
| String algorithms (KMP, Rabin-Karp, Z) | 3. Defer | Section 12 | Asked rarely; brute force plus hashing usually suffices |
| Reservoir sampling and randomised algorithms | 3. Defer | Section 12 | Niche; learn the idea in 30 minutes later |

### Problem budget

| Bucket | Count | Notes |
| --- | --- | --- |
| Core curriculum problems | 114 | Required; about 2 per study day |
| Stretch problems | 39 | Optional, done on Sundays outside the 144 hours; aim for at least 15–25 |
| Optional Hard/advanced | 20 | Pick 4–8 that interest you |
| Assessment problems (unseen) | 13 | Simulation conditions |
| Mock interview problems (unseen) | 6 | One per mock; the other 12 pool problems become Sunday practice |
| **Realistic unique total** | **\~150–160** | Scheduled minimum: 133 (Core + assessments + mocks) |
| Scheduled re-solves | 90 | 56 daily warm-ups + 28 on Saturdays (including each assessment's cold re-solve) + 6 in Weeks 11–12 |

Why not 300? Solving 150 problems with spaced re-solves and honest review produces better transfer to unseen problems than rushing through 300 once. Interviews test derivation, not recall.

### Expected outcome at each milestone

- **End of Week 4 (28 Nov):** you analyse complexity correctly every time, solve most array/string/hash/binary-search/linked-list Easies in under 15 minutes, and solve about half of the Mediums in those topics without hints.
- **End of Week 8 (26 Dec):** you write recursion, backtracking, tree and graph traversals from scratch, implement a heap, and correctly name the pattern for about 70% of unseen Mediums.
- **End of Week 12 (23 Jan):** you solve about 60–70% of unseen Mediums in 40 minutes with a clear verbal explanation, handle most DP Mediums with memoisation, and recover from wrong approaches by switching early.

## 3. Weekly theory and learning objectives

Each week below follows the same order: objectives, concepts, worked examples with dry runs, then the patterns with recognition clues. Read the week's theory before Day 1 or during each day's theory block.

### Week 1 (2–7 Nov): Complexity, arrays and hashing

**A. Learning objectives.** By Saturday you can: derive the time and space complexity of loops, nested loops and simple recursion; use input constraints to choose a target complexity; explain why a hash map gives average O(1) lookup and when it does not; replace a nested-loop search with a hash map; modify an array in place with read/write pointers; traverse a matrix in spiral order and rotate it in place.

#### B. Concepts

**Complexity notation.** Big O is an upper bound on growth, Big Ω a lower bound, Big Θ a tight bound (both). Interviewers say "O" but mean the tight worst-case bound, so state it as tightly as you can: binary search is O(log n), not "O(n) because that is also an upper bound".

- **Best, average, worst case** describe different inputs. Quicksort is O(n log n) on average and O(n²) in the worst case. Hash lookup is O(1) on average and O(n) in the worst case. Always say which you mean.
- **Loops:** sequential loops add (O(n) + O(m)); nested loops multiply (O(n·m)). A loop whose index doubles or halves is O(log n). A loop that shrinks the remaining work by half each time is the core of binary search.
- **Recursion:** total work = (number of calls) × (work per call). Draw the recursion tree. Naive Fibonacci has \~2ⁿ calls with O(1) work each, so O(2ⁿ). Merge sort has log n levels with O(n) work per level, so O(n log n).
- **Amortised analysis:** the average cost per operation over a worst-case sequence. `arr.push()` is occasionally O(n) when the array grows its buffer, but each resize doubles capacity, so n pushes cost O(n) total: O(1) amortised.
- **Space:** *auxiliary* space is the extra memory your algorithm allocates; *total* space includes the input. Interviewers usually mean auxiliary. The recursion call stack counts as auxiliary space.

**Using constraints to choose an algorithm.** LeetCode's JavaScript runtime handles roughly 10⁷–10⁸ simple operations per second. Read `n` from the constraints before choosing an approach.

| Constraint on n | Acceptable complexity | Typical techniques |
| --- | --- | --- |
| n ≤ 10–12 | O(n!), O(n·2ⁿ) | Permutations, brute-force backtracking |
| n ≤ 20–25 | O(2ⁿ) | Subsets, bitmasks |
| n ≤ 500 | O(n³) | Triple loops, interval DP |
| n ≤ 5,000 | O(n²) | Pairwise loops, 2-D DP |
| n ≤ 10⁶ | O(n log n) or O(n) | Sorting, hashing, two pointers, heaps, linear DP |
| n up to 10⁹ or more | O(log n) or O(1) | Binary search on the answer, maths |

**Arrays in JavaScript.** A JS array is a dynamic array: index access and `push`/`pop` are O(1) (amortised); `shift`, `unshift`, `splice` in the middle, `indexOf`, `includes`, `slice` and spread (`[...a]`) are O(n). Avoid holes (`arr[1000] = x` on an empty array) and mixing types in hot loops; V8 then falls back to slower representations. Pre-size with `new Array(n).fill(0)` when you know the length.

**Hash tables.** A hash function maps a key to a bucket index. Lookup computes the hash and checks that bucket.

- *Collisions* happen when two keys map to the same bucket. Chaining stores a small list per bucket; open addressing probes for the next free slot. The table resizes when the load factor (entries ÷ buckets) passes a threshold, which keeps buckets short.
- *Why O(1) is an average:* with a good hash function and resizing, each bucket holds O(1) keys on average. Adversarial keys or a poor hash can put many keys in one bucket, giving O(n). In interviews say "O(1) average".
- *When not to use one:* when you need order (use sorting or a balanced tree), range queries, or when the key space is small and dense (a plain array of size 26 for lowercase letters is faster and clearer).
- *Alternatives and trade-offs:* sorting then scanning gives O(n log n) time and little extra space (O(1) with an in-place sort such as heapsort; JavaScript's built-in sort may allocate up to O(n) temporary memory) versus hashing's O(n) time and O(n) space. Choose based on whether memory or time matters and whether the input may be modified.

**`Map`, `Set` and plain objects.** Use `Map` for counting and lookup: keys keep their type (`1` and `"1"` differ), there are no inherited keys like `"constructor"`, `size` is O(1), and insertion order is preserved. Use `Set` for membership. A plain object is acceptable for string keys when you are sure no key collides with `Object.prototype`; prefer `Map` in interviews.

**Matrices.** A matrix is an array of row arrays: `grid[r][c]`, rows `0..m-1`, columns `0..n-1`. Common moves are 4-directional (`[[1,0],[-1,0],[0,1],[0,-1]]`). Always bounds-check before indexing; `grid[-1]` is `undefined`, so `grid[-1][0]` throws.

**Common mistakes this week.** Forgetting that `includes`/`indexOf` inside a loop is O(n²); using `for...in` on arrays (iterates string keys, including inherited ones); calling `Object.keys(obj).length` repeatedly (O(k) each time); mutating an array while iterating it with `forEach`; forgetting empty-array and single-element cases.

#### C. Worked examples

**Example 1: same output, three complexities (Contains Duplicate).**

```js
// O(n^2) time, O(1) space: compare every pair
function hasDupBrute(nums) {
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++)
      if (nums[i] === nums[j]) return true;
  return false;
}

// O(n log n) time; sorts in place, so duplicates become neighbours.
// Extra space: O(1) with an in-place sort such as heapsort, but V8's
// built-in sort (TimSort) may allocate up to O(n) temporary memory.
function hasDupSort(nums) {
  // numeric comparator, never the default sort
  nums.sort((a, b) => a - b);
  for (let i = 1; i < nums.length; i++)
    if (nums[i] === nums[i - 1]) return true;
  return false;
}

// O(n) average time, O(n) space: remember what we have seen
function hasDupSet(nums) {
  const seen = new Set();
  for (const x of nums) {
    // O(1) average lookup replaces the inner loop
    if (seen.has(x)) return true;
    seen.add(x);
  }
  return false;
}
```

The bottleneck in the brute force is the inner loop answering "have I seen this value before?". A `Set` answers that question in O(1), which removes a whole factor of n. This "identify the repeated question, then store the answer" move is the most important optimisation in the course.

**Example 2: complexity snippets (do these on paper on Day 1).**

```js
// (a)
// O(n): 100 is a constant
for (let i = 0; i < n; i++) for (let j = 0; j < 100; j++) work();
// (b)
// O(log n)
for (let i = n; i > 1; i = Math.floor(i / 2)) work();
// (c)
// O(n log n)
for (let i = 0; i < n; i++) for (let j = 1; j < n; j *= 2) work();
// (d)
// O(n^2) in the standard cost model: each slice may copy up to n chars.
// (V8 often shares memory for string slices, so it can run faster, but
// analyse it as O(n) per slice; array slices always copy.)
const s = arr.join(""); for (let i = 0; i < n; i++) s.slice(i);
// (e)
// O(2^n) time, O(n) stack
function f(n) { if (n <= 1) return; f(n - 1); f(n - 1); }
// (f)
// O(log n) time and stack
function g(n) { if (n <= 1) return; g(n / 2); }
```

**Example 3: Two Sum, brute force to hash map, with a dry run.**

```js
function twoSum(nums, target) {
  // value -> index where we saw it
  const indexOf = new Map();
  for (let i = 0; i < nums.length; i++) {
    // the partner that would complete the pair
    const need = target - nums[i];
    if (indexOf.has(need)) return [indexOf.get(need), i];
    // store AFTER checking so we never pair i with itself
    indexOf.set(nums[i], i);
  }
  return [];
}
```

Dry run with `nums = [3, 2, 4]`, `target = 6`:

| i | nums\[i\] | need | map before | action |
| --- | --- | --- | --- | --- |
| 0 | 3 | 3 | {} | not found; store 3→0 |
| 1 | 2 | 4 | {3:0} | not found; store 2→1 |
| 2 | 4 | 2 | {3:0, 2:1} | found 2 at index 1 → return \[1, 2\] |

If you stored before checking, `[3, 3]` with target 6 would still work, but `[3]` alone would wrongly pair index 0 with itself. Order of operations matters.

**Example 4: read/write pointers (Remove Duplicates from Sorted Array).**

```js
function removeDuplicates(nums) {
  if (nums.length === 0) return 0;
  // next position to place a unique value
  let write = 1;
  for (let read = 1; read < nums.length; read++) {
    // new value compared to the last kept value
    if (nums[read] !== nums[write - 1]) {
      nums[write] = nums[read];
      write++;
    }
  }
  // length of the unique prefix
  return write;
}
```

Dry run `[1,1,2,3,3]`: read=1 (1 = kept 1, skip); read=2 (2 ≠ 1, write 2 at index 1, write=2); read=3 (3 ≠ 2, write at 2, write=3); read=4 (3 = 3, skip). Result `[1,2,3,…]`, length 3. Invariant: `nums[0..write-1]` always holds the unique values seen so far, in order.

#### D. Patterns

**Pattern 1.1: Hash lookup ("have I seen the complement?")**

1. *Recognise:* you need pairs, duplicates or membership, and the brute force has an inner loop that searches for a value.
2. *Clues:* "two numbers that add up to", "contains duplicate", "exists", "first unique", unsorted input.
3. *From brute force:* the inner loop asks one question per element; store answers in a `Map`/`Set` as you go.
4. *Why it works:* every pair (i, j) with i < j is checked when j is visited, because i is already in the map.
5. *Template:* one pass; compute what you need; check the map; then insert the current element.
6. *Complexity:* O(n) average time, O(n) space.
7. *Variations:* store index (Two Sum), count (frequency), or first position (longest subarray problems in Week 2).
8. *Inappropriate when:* the input is sorted and O(1) space is required (use two pointers), or you need ordered/range answers.

**Pattern 1.2: Frequency map and grouping**

1. *Recognise:* the answer depends on how many times things occur, or on items sharing a property.
2. *Clues:* "anagram", "most frequent", "group", "majority", "top k".
3. *From brute force:* instead of comparing every pair of strings, compute a canonical key (sorted letters or a 26-count signature) and group by it.
4. *Why it works:* two items belong together exactly when their keys are equal.
5. *Template:* `count.set(k, (count.get(k) ?? 0) + 1)`; for grouping, `map.get(key)?.push(x) ?? map.set(key, [x])` (or the clearer two-line version in section 6.2: create the array if it is missing, then push).
6. *Complexity:* O(n·k) to build keys of length k (O(n·k log k) if you sort each key).
7. *Variations:* bucket by frequency (347: buckets indexed by count give O(n) top-k); fixed array of 26 counts.
8. *Inappropriate when:* you need the relative order of elements, not counts.

**Pattern 1.3: Read/write pointers (in-place compaction)**

1. *Recognise:* "in place", "O(1) extra space", "return the new length", "move all X to the end".
2. *Clues:* sorted input with duplicates; a filter that must not allocate.
3. *From brute force:* building a new array is O(n) extra space; instead overwrite the prefix of the same array.
4. *Why it works:* the write pointer never passes the read pointer, so you never overwrite unread data.
5. *Template:* `write` marks the end of the kept prefix; `read` scans; copy when the element should be kept.
6. *Complexity:* O(n) time, O(1) space.
7. *Variations:* swap instead of copy (283 Move Zeroes keeps non-zero order and moves zeros back).
8. *Inappropriate when:* the original order of discarded elements must be preserved somewhere.

**Pattern 1.4: Matrix layer walking**

1. *Recognise:* spiral order, rotation, "in place" on an n × n grid.
2. *Clues:* "clockwise", "rotate 90 degrees", "spiral".
3. *From brute force:* a visited matrix works for spiral but costs O(m·n) space; four shrinking boundaries (top, bottom, left, right) need O(1).
4. *Why it works:* each pass consumes one outer ring, then moves the boundaries inwards.
5. *Template (rotate):* transpose (swap `m[i][j]` with `m[j][i]` for j > i), then reverse each row.
6. *Complexity:* O(m·n) time, O(1) extra space.
7. *Variations:* counter-clockwise (transpose + reverse columns), set matrix zeroes using the first row/column as markers.
8. *Inappropriate when:* the matrix is not square for in-place rotation (allocate a new one).

### Week 2 (9–14 Nov): Two pointers, sliding window, prefix sums, strings

**A. Learning objectives.** By Saturday you can: distinguish subarray, substring and subsequence; decide between two pointers, sliding window and prefix sums from the problem statement; write a variable-size sliding window with a correct shrink condition; explain why sliding window fails with negative numbers and prefix sums + a hash map do not; derive Kadane's algorithm from brute force.

#### B. Concepts

**Subarray vs substring vs subsequence.** A *subarray* (arrays) and a *substring* (strings) are contiguous; there are O(n²) of them. A *subsequence* keeps relative order but may skip elements; there are O(2ⁿ). Contiguous problems invite windows and prefix sums. Subsequence problems usually need DP (Week 10–11) or greedy.

**Two pointers.** Two indices move through the data according to a rule that discards impossible candidates.

- *Opposite ends* (`l = 0`, `r = n-1`): works when the input is sorted or symmetric (palindromes). Each step eliminates one end because it provably cannot be part of a better answer.
- *Same direction* (slow/fast or read/write): compaction, partitioning, merging two sorted arrays.
- *When not to use:* unsorted input where sorting would destroy needed information (e.g. original indices in Two Sum; use a hash map instead).

**Sliding window.** A window `[l, r]` over a contiguous range, extended by `r` and shrunk by `l`. Each index enters and leaves once, so it is O(n) even with an inner `while`.

- *Fixed size k:* add `a[r]`, remove `a[r-k]` once the window exceeds k.
- *Variable size:* expand `r`; while the window is invalid, shrink `l`; record the answer when valid.
- *Precondition (monotonicity):* shrinking a valid window must keep it valid (for "at most" constraints), or growing an invalid window must keep it invalid. With negative numbers, adding an element can decrease a sum, so "sum ≥ target" windows break. Then use prefix sums.

**Prefix sums.** `pre[i]` = sum of the first i elements, with `pre[0] = 0`. The sum of `a[l..r]` is `pre[r+1] - pre[l]` in O(1) after O(n) preprocessing.

- *Prefix sum + hash map:* "count subarrays with sum k" becomes "count earlier prefixes equal to `cur - k`". Works with negative numbers.
- *Prefix/suffix products:* 238 multiplies the product of everything left of i by everything right of i, avoiding division.
- *Difference array:* to add v to every element in `[l, r]` many times, do `diff[l] += v; diff[r+1] -= v`, then take a prefix sum once at the end. Turns k range updates from O(k·n) into O(k + n).

**Kadane's algorithm.** Maximum subarray sum. At each index the best subarray ending here either extends the previous one or starts fresh: `cur = max(a[i], cur + a[i])`. This is a one-variable DP; you will meet the general form in Week 10.

**Strings in JavaScript.** Strings are immutable: `s[i] = 'x'` silently does nothing, and `s += c` in a loop may copy. Convert to an array (`[...s]` or `s.split('')`) for in-place edits and `join('')` at the end. Use `s.charCodeAt(i) - 97` to index a 26-slot count array for lowercase letters. Compare characters with `===`. For palindromes, two pointers from both ends; skip non-alphanumerics with a small helper rather than a regex inside the loop.

**Common mistakes.** Shrinking with `if` instead of `while`; updating the answer before the window is valid; off-by-one in `r - l + 1`; forgetting `pre[0] = 0` (misses subarrays starting at index 0); initialising the prefix map without `{0: 1}`; Kadane initialised to 0 instead of `a[0]` (fails on all-negative input).

#### C. Worked examples

**Example 1: Two Sum II (sorted), opposite-end pointers.**

```js
function twoSumSorted(numbers, target) {
  let l = 0, r = numbers.length - 1;
  while (l < r) {
    const sum = numbers[l] + numbers[r];
    // problem uses 1-based indices
    if (sum === target) return [l + 1, r + 1];
    // numbers[l] is too small even with the largest partner: discard it
    if (sum < target) l++;
    // numbers[r] is too large even with the smallest partner: discard it
    else r--;
  }
  return [];
}
```

Dry run `[2, 7, 11, 15]`, target 9: (l=0, r=3) 2+15=17 > 9 → r=2; 2+11=13 > 9 → r=1; 2+7=9 → return \[1, 2\]. Each step removes one candidate permanently, so at most n−1 steps: O(n) time, O(1) space, versus O(n) space for the hash map.

**Example 2: variable window (Longest Substring Without Repeating Characters).**

```js
function lengthOfLongestSubstring(s) {
  const lastSeen = new Map();   // char -> last index where it appeared
  let l = 0, best = 0;
  for (let r = 0; r < s.length; r++) {
    const c = s[r];
    if (lastSeen.has(c) && lastSeen.get(c) >= l) {
      // jump past the previous copy; window is valid again
      l = lastSeen.get(c) + 1;
    }
    lastSeen.set(c, r);
    best = Math.max(best, r - l + 1);
  }
  return best;
}
```

Dry run `"abcabcbb"`:

| r | c | l before | repeat inside window? | l after | window | best |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | a | 0 | no | 0 | a | 1 |
| 1 | b | 0 | no | 0 | ab | 2 |
| 2 | c | 0 | no | 0 | abc | 3 |
| 3 | a | 0 | yes (index 0) | 1 | bca | 3 |
| 4 | b | 1 | yes (index 1) | 2 | cab | 3 |
| 5 | c | 2 | yes (index 2) | 3 | abc | 3 |
| 6 | b | 3 | yes (index 4) | 5 | cb | 3 |
| 7 | b | 5 | yes (index 6) | 7 | b | 3 |

The check `lastSeen.get(c) >= l` matters: a character last seen *before* the window must not move `l` backwards.

**Example 3: prefix sums + hash map (Subarray Sum Equals K), and why a window fails.**

```js
function subarraySum(nums, k) {
  // empty prefix: lets subarrays start at index 0
  const countOfPrefix = new Map([[0, 1]]);
  let cur = 0, count = 0;
  for (const x of nums) {
    cur += x;                                // cur = sum of nums[0..i]
    // each earlier prefix p with cur - p = k ends a valid subarray here
    count += countOfPrefix.get(cur - k) ?? 0;
    countOfPrefix.set(cur, (countOfPrefix.get(cur) ?? 0) + 1);
  }
  return count;
}
```

Dry run `[1, -1, 1]`, k = 1: start {0:1}. x=1: cur=1, need 0 → count 1; map {0:1, 1:1}. x=−1: cur=0, need −1 → 0; map {0:2, 1:1}. x=1: cur=1, need 0 → +2 = 3; map {0:2, 1:2}. Answer 3: `[1]`, `[1,-1,1]`, `[1]`. A sliding window cannot find all three because adding −1 shrinks the sum, so "grow until too big, then shrink" has no valid rule.

**Example 4: Kadane from brute force.** Brute force tries every `(i, j)`: O(n²) with a running sum. Observation: the best subarray ending at j is either `a[j]` alone or the best ending at j−1 plus `a[j]`. Keeping only that one number gives:

```js
function maxSubArray(nums) {
  // not 0: all-negative input must return the largest element
  let cur = nums[0], best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    cur = Math.max(nums[i], cur + nums[i]);  // extend or restart
    best = Math.max(best, cur);
  }
  return best;
}
```

#### D. Patterns

**Pattern 2.1: Opposite-end two pointers**

1. *Recognise:* sorted array or a symmetric structure; looking for a pair/triplet or comparing ends.
2. *Clues:* "sorted", "pair with sum", "palindrome", "container", "in place with O(1) space".
3. *From brute force:* the O(n²) pair loop wastes work on pairs that cannot win. Sorted order tells you which end to discard.
4. *Why it works:* moving the pointer at the smaller/limiting side is the only move that can improve the answer (Container With Most Water: width shrinks, so only a taller limiting wall can help).
5. *Template:* `while (l < r) { evaluate; move l or r by the rule }`.
6. *Complexity:* O(n) per scan; 3Sum = sort O(n log n) + n scans = O(n²).
7. *Variations:* 3Sum (fix one, two-pointer the rest, skip duplicates), squares of a sorted array (fill from the back), trapping rain water.
8. *Inappropriate when:* input is unsorted and original indices matter, or you need all pairs (output itself is O(n²)).

**Pattern 2.2: Same-direction partitioning (Dutch national flag)**

1. *Recognise:* group elements into 2–3 classes in place.
2. *Clues:* "sort colors", "move zeros", "partition around a value".
3. *From brute force:* counting then rewriting takes two passes; three pointers (`low`, `mid`, `high`) do it in one.
4. *Why it works:* invariant `[0,low)` = 0s, `[low,mid)` = 1s, `(high,n)` = 2s; `mid` scans the unknown region.
5. *Template:* if 0 swap with low and advance both; if 1 advance mid; if 2 swap with high and decrement high only (the swapped-in value is unchecked).
6. *Complexity:* O(n), O(1).
7. *Variations:* quicksort partition (Week 3).
8. *Inappropriate when:* stability (original relative order) is required.

**Pattern 2.3: Sliding window (fixed and variable)**

1. *Recognise:* contiguous subarray/substring with a constraint; maximise or minimise its length or count.
2. *Clues:* "longest/shortest substring", "at most k", "contains all", "window of size k", non-negative numbers.
3. *From brute force:* checking all O(n²) windows recomputes overlapping work. Keep a running state (sum, counts) and update it as edges move.
4. *Why it works:* monotonicity: if `[l, r]` is invalid, every `[l, r']` with r' > r is also invalid, so `l` never needs to move back.
5. *Template:* `for r: add(a[r]); while (invalid) remove(a[l++]); update answer`. For "minimum length", update inside the while loop while still valid.
6. *Complexity:* O(n) time; O(alphabet) or O(k) space.
7. *Variations:* 424 (window valid while `len - maxCount ≤ k`), 567/438 (fixed window of anagram counts), 76 (minimum window covering all required counts).
8. *Inappropriate when:* negative numbers break monotonicity, or the target is a subsequence.

**Pattern 2.4: Prefix sums (with or without a hash map)**

1. *Recognise:* many range-sum queries, or counting subarrays whose sum meets an exact condition.
2. *Clues:* "sum of range", "subarray sum equals k", "divisible by k", negative numbers allowed.
3. *From brute force:* each subarray sum computed from scratch is O(n) → O(n³) or O(n²). Prefix differences make each O(1); a map finds matching prefixes in O(1).
4. *Why it works:* `sum(l..r) = pre[r+1] - pre[l]`, so "sum = k" ⇔ "earlier prefix = current − k".
5. *Template:* map seeded with `{0: 1}`; for each element: update cur, add `map[cur − k]`, then record cur.
6. *Complexity:* O(n) time and space.
7. *Variations:* key by `cur % k` (normalise negatives with `((cur % k) + k) % k`), transforming each value first so the condition becomes a plain sum condition, 2-D prefix sums, difference arrays for range updates.
8. *Inappropriate when:* you need the maximum-length window under a non-negative constraint (a sliding window is simpler and O(1) space).

**Pattern 2.5: Kadane (best subarray ending here)**

1. *Recognise:* maximum/minimum sum or product of a contiguous subarray.
2. *Clues:* "maximum subarray", "best time to buy and sell once" (121 is Kadane on daily differences).
3. *From brute force:* O(n²) over all subarrays → keep only the best answer ending at the previous index.
4. *Why it works:* any optimal subarray ending at j has an optimal prefix ending at j−1, or none.
5. *Template:* `cur = max(x, cur + x); best = max(best, cur)`.
6. *Complexity:* O(n), O(1).
7. *Variations:* maximum product (track both max and min, because a negative flips them; 152 in Week 10), circular subarray.
8. *Inappropriate when:* the subarray has length constraints (use prefix sums + deque) or must be non-contiguous (DP or greedy).

### Week 3 (16–21 Nov): Binary search and sorting

**A. Learning objectives.** By Saturday you can: write binary search by reasoning from an invariant rather than a memorised template; find the first/last position satisfying a condition (lower and upper bound); search rotated arrays; binary-search an answer space with a feasibility function; implement merge sort and quicksort; explain stability; write correct JavaScript comparators; choose between sorting, hashing and binary search.

#### B. Concepts

**Binary search as "find the boundary".** Most bugs disappear when you stop searching for "the target" and instead search for the *first index where a monotone predicate becomes true*. A predicate is monotone if it looks like `F F F T T T` across the range. Examples: `a[i] >= target` (lower bound), `a[i] > target` (upper bound), `canFinish(speed)` (Koko).

**Two interval conventions. Pick one and keep it.**

| Convention | Loop | Mid | Shrink when predicate true | Shrink when false | Result |
| --- | --- | --- | --- | --- | --- |
| Half-open `[lo, hi)`, used in this course for boundaries | `while (lo < hi)` | `lo + ((hi - lo) >> 1)` | `hi = mid` (mid could be the answer) | `lo = mid + 1` | `lo` = first true index, or `hi`'s start value if none |
| Closed `[lo, hi]`, used for exact-match search | `while (lo <= hi)` | same | return/`hi = mid - 1` | `lo = mid + 1` | not found when loop exits |

*Deriving correctness:* (1) the answer always stays inside the current range (invariant); (2) the range strictly shrinks each iteration (termination). With `[lo, hi)` and `mid < hi`, both `hi = mid` and `lo = mid + 1` shrink the range, so no infinite loop. The classic infinite loop is `lo = mid` with `mid` rounded down.

*Mid in JavaScript:* `(lo + hi) >> 1` is fine for array indices. For answer spaces near 2³¹ or larger, bitwise operators overflow to negative numbers; use `Math.floor((lo + hi) / 2)` (doubles are exact up to 2⁵³).

**Rotated sorted arrays.** After a rotation, at least one half around `mid` is sorted. Compare `nums[mid]` with `nums[hi]`: if `nums[mid] > nums[hi]`, the minimum lies right of mid; otherwise it is at mid or left. For searching a target (33), decide which half is sorted, then check whether the target lies within that sorted half's range.

**Binary search on the answer.** When the question is "what is the minimum X such that something is feasible?" and feasibility is monotone in X, binary-search X over `[low, high]` and write `feasible(X)` as an O(n) greedy check. Total O(n log range). Clues: "minimum capacity", "minimum speed", "minimise the maximum", answers up to 10⁹.

**Sorting algorithms you must be able to explain.**

| Algorithm | Time (avg / worst) | Space | Stable | Notes |
| --- | --- | --- | --- | --- |
| Merge sort | O(n log n) / O(n log n) | O(n) | Yes | Divide, sort halves, merge. Predictable; the merge step is reused for linked lists and k-way merges |
| Quicksort | O(n log n) / O(n²) | O(log n) stack | No | Partition around a pivot. Random pivot makes the worst case unlikely |
| Heap sort | O(n log n) / O(n log n) | O(1) | No | Week 7 |
| Counting / bucket sort | O(n + k) | O(k) | Can be | Only when keys are small integers or bounded |
| `Array.prototype.sort` (V8, TimSort) | O(n log n) | O(n) | Yes (guaranteed since ES2019) | Default compares **strings**; always pass a comparator for numbers |

Comparison sorting cannot beat Ω(n log n) in the worst case, so when you see O(n) required on unbounded values, sorting is not the intended path.

**Stability** means equal keys keep their original relative order. It matters when you sort by one key after another (sort by name, then stable-sort by department keeps names ordered within each department).

**Comparators.** `arr.sort((a, b) => a - b)` ascending; `b - a` descending; tie-breaks: `(a, b) => a[0] - b[0] || a[1] - b[1]`. A comparator must return a negative, zero or positive number, not a boolean. For strings, `a.localeCompare(b)` or `a < b ? -1 : a > b ? 1 : 0`. For 179 Largest Number, compare concatenations: `(a, b) => (b + a).localeCompare(a + b)`, carefully explained on Day 5.

**Sorting vs hashing vs binary search.**

- Hashing: O(n) average, O(n) space, no order. Best for one-off membership/count questions.
- Sorting: O(n log n), O(1)–O(n) space, gives order, neighbours, and enables two pointers and greedy.
- Binary search: O(log n) per query after sorting. Best for many queries on static data or monotone answer spaces.

**Common mistakes.** Mixing conventions (`while (lo <= hi)` with `hi = mid`); returning `mid` from a boundary search instead of `lo`; forgetting the "not found" check after the loop (`lo === n` or `nums[lo] !== target`); an answer-space `hi` that is too small; comparator returning booleans; using the default `sort()` on numbers.

#### C. Worked examples

**Example 1: lower bound, derived.** Goal: first index i with `nums[i] >= target`; if none, return n. Range `[0, n)` because the answer can be n.

```js
function lowerBound(nums, target) {
  // answer is in [lo, hi]; hi itself means "none"
  let lo = 0, hi = nums.length;
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    // mid satisfies the predicate: answer is mid or left of it
    if (nums[mid] >= target) hi = mid;
    // mid fails: answer is strictly right
    else lo = mid + 1;
  }
  return lo;                            // lo === hi: the first true index
}
// upperBound: same code with `nums[mid] > target`.
// First/last position of target (34): first = lowerBound(t); last =
// upperBound(t) - 1; check bounds.
```

Dry run `nums = [1, 2, 2, 2, 5]`, target 2: lo=0, hi=5 → mid=2 (2 ≥ 2) hi=2 → mid=1 (2 ≥ 2) hi=1 → mid=0 (1 < 2) lo=1 → stop, return 1. Upper bound with `> 2`: lo=0,hi=5 → mid=2 (2 > 2? no) lo=3 → mid=4 (5 > 2) hi=4 → mid=3 (no) lo=4 → return 4; last = 3.

**Example 2: minimum in a rotated sorted array (153).**

```js
function findMin(nums) {
  let lo = 0, hi = nums.length - 1;     // the minimum is always in [lo, hi]
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    // the drop is to the right of mid
    if (nums[mid] > nums[hi]) lo = mid + 1;
    // mid..hi is sorted; min is mid or left
    else hi = mid;
  }
  return nums[lo];
}
```

Dry run `[4,5,6,7,0,1,2]`: (0,6) mid=3: 7 > 2 → lo=4; (4,6) mid=5: 1 ≤ 2 → hi=5; (4,5) mid=4: 0 ≤ 1 → hi=4; return 0. Comparing with `nums[hi]` (not `nums[lo]`) avoids the special case of an unrotated array.

**Example 3: binary search on the answer (Koko Eating Bananas, 875).** Brute force: try every speed from 1 to max(piles), O(max · n). Observation: if speed k works, every speed > k works (monotone). So binary-search the smallest working k.

```js
function minEatingSpeed(piles, h) {
  const hoursAt = (k) =>
    piles.reduce((sum, p) => sum + Math.ceil(p / k), 0);
  // spread is fine here: piles.length <= 10^4
  let lo = 1, hi = Math.max(...piles);
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (hoursAt(mid) <= h) hi = mid;    // feasible: try slower
    else lo = mid + 1;                  // too slow: must be faster
  }
  return lo;
}
```

Complexity: O(n log max). Note `Math.max(...arr)` can throw a RangeError for arrays above roughly 10⁵ elements; use a loop when n is large.

**Example 4: merge sort with the merge step explained.**

```js
function mergeSort(a) {
  if (a.length <= 1) return a;
  const mid = a.length >> 1;
  const left = mergeSort(a.slice(0, mid)), right = mergeSort(a.slice(mid));
  const out = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length)
    // <= keeps it stable
    out.push(left[i] <= right[j] ? left[i++] : right[j++]);
  while (i < left.length) out.push(left[i++]);
  while (j < right.length) out.push(right[j++]);
  return out;
}
```

Recursion tree: log₂ n levels; each level merges n elements in total → O(n log n). Quicksort (random pivot, Lomuto partition) is in section 6.8 with a dry run you will do on Day 5.

#### D. Patterns

**Pattern 3.1: Boundary binary search**

1. *Recognise:* sorted data and you need a position: first/last occurrence, insertion point, count of elements below x.
2. *Clues:* "sorted", "O(log n)", "first", "last", "insert position", "closest".
3. *From brute force:* a linear scan for the boundary is O(n); monotonicity lets you discard half each step.
4. *Why it works:* the invariant keeps the boundary inside `[lo, hi]` and the range shrinks every iteration.
5. *Template:* half-open lower bound (Example 1), with the predicate changed per problem.
6. *Complexity:* O(log n), O(1).
7. *Variations:* rotated arrays (153, 33), peak finding (162: compare `nums[mid]` with `nums[mid+1]`), 2-D matrix as a flattened array (74: `row = Math.floor(i / n)`, `col = i % n`).
8. *Inappropriate when:* the data is unsorted and only one query is made (a linear scan is O(n) without the sort).

**Pattern 3.2: Binary search on the answer**

1. *Recognise:* "minimum/maximum value such that a condition holds", with a huge answer range.
2. *Clues:* "minimise the maximum", "at least", "within D days", "minimum speed/capacity".
3. *From brute force:* try every candidate answer with an O(n) check → binary-search the candidates.
4. *Why it works:* feasibility is monotone in the answer.
5. *Template:* `lo` = smallest possible answer, `hi` = a value surely feasible; first feasible via half-open search.
6. *Complexity:* O(n · log(range)).
7. *Variations:* 1011 (lo = max weight, hi = sum), 410 split array (same check, Hard).
8. *Inappropriate when:* feasibility is not monotone, or the check itself is exponential.

**Pattern 3.3: Sort first, then scan**

1. *Recognise:* order or adjacency would make the problem trivial.
2. *Clues:* "merge", "closest pair", "group equal", "intervals", "largest number formed".
3. *From brute force:* comparing all pairs is O(n²); after sorting, only neighbours need comparing.
4. *Why it works:* sorting brings related items together; the scan then makes local decisions.
5. *Template:* `arr.sort(comparator); for (...) compare with previous/next`.
6. *Complexity:* O(n log n) dominated by the sort.
7. *Variations:* custom comparators (179), merge sorted arrays from the back (88), intervals (Week 7), greedy (Week 9).
8. *Inappropriate when:* original indices are required and cannot be carried along, or O(n) is required.

### Week 4 (23–28 Nov): Linked lists, stacks, queues and monotonic stacks

**A. Learning objectives.** By Saturday you can: build and traverse singly and doubly linked lists; reverse a list iteratively and recursively; use a dummy node to remove head special cases; find the middle and detect cycles with fast/slow pointers and explain why they work; design an LRU cache with a hash map and a doubly linked list; implement a stack, an O(1) queue and a min-stack; recognise and solve "next greater/smaller element" problems with a monotonic stack.

#### B. Concepts

**Linked lists.** Each node holds a value and a pointer to the next node (`next`), and in a doubly linked list also `prev`. You only have a reference to the head.

| Operation | Array | Singly linked list |
| --- | --- | --- |
| Access i-th element | O(1) | O(i) |
| Insert/delete at head | O(n) | O(1) |
| Insert/delete after a known node | O(n) | O(1) |
| Delete a known node | O(n) | O(1) doubly; O(n) singly (need the previous node) |
| Memory locality | Contiguous, cache-friendly | Scattered, extra pointer per node |

*Why learn them if JS has arrays:* interviewers use them to test pointer discipline, and they are the backbone of LRU caches, adjacency lists, hash-table chaining and queues.

**Dummy (sentinel) node.** `const dummy = new ListNode(0, head)`. Operations that may change the head (deleting it, merging, inserting before it) become uniform; return `dummy.next`. Use one whenever the head might change.

**Pointer-rewiring rule.** Before changing `node.next`, save anything you still need (`const next = cur.next`). Draw boxes and arrows for every step on paper; most linked-list bugs are lost references or a forgotten `null` at the new tail (creating a cycle).

**Fast and slow pointers (Floyd).** `slow` moves 1 step, `fast` moves 2.

- *Middle:* when `fast` reaches the end, `slow` is at the middle (for even length, the second middle with `while (fast && fast.next)`).
- *Cycle detection:* in a cycle, `fast` gains one node per step on `slow`, so it must land on `slow` within one lap. O(n) time, O(1) space versus a `Set` of visited nodes (O(n) space).
- *Cycle start (142):* after they meet, move one pointer to the head; advance both one step at a time; they meet at the cycle start. Reason: if the head-to-start distance is a and they meet b steps into the cycle of length c, then 2(a + b) = a + b + kc, so a = kc − b: walking a steps from the meeting point lands on the start.
- *k-th from end (19):* move `fast` k steps ahead, then move both until `fast` reaches the end.

**Stacks.** LIFO: `push`/`pop` at the end of a JS array, both O(1). Use for nesting and matching (parentheses), undo, expression evaluation, iterative DFS, and "most recent unresolved item" problems.

**Queues.** FIFO. `Array.prototype.shift()` is O(n) because every remaining element is re-indexed, which turns an O(V + E) BFS into O(V²) on large inputs. Use an array with a moving head index (section 6.5), or two stacks (232: amortised O(1) because each element moves from the in-stack to the out-stack once). A **deque** allows push/pop at both ends; in JS implement it with a circular buffer or a doubly linked list (section 6.5).

**Monotonic stack.** A stack kept increasing or decreasing. When a new element breaks the order, everything it pops has found its "next greater" (or smaller) element: the new one. Each index is pushed and popped once, so O(n) total. Store **indices**, not values, so you can compute distances (739) and widths (84).

**Monotonic queue (preview).** A deque kept decreasing gives the maximum of every sliding window in O(n) (239, optional in Week 12; worked in Example 4 below). Same idea as the stack, plus removal from the front when indices leave the window.

**Common mistakes.** Losing `cur.next` before rewiring; not setting the new tail's `next = null` (143); using `while (fast.next)` when `fast` can be `null`; checking `stack[stack.length - 1]` on an empty stack; storing values instead of indices in a monotonic stack; using `shift()` in loops.

#### C. Worked examples

**Example 1: reverse a linked list, iteratively and recursively.**

```js
// LeetCode's definition
function ListNode(val, next = null) { this.val = val; this.next = next; }

function reverseList(head) {
  let prev = null, cur = head;
  while (cur) {
    const next = cur.next;  // 1. save the rest of the list
    cur.next = prev;        // 2. point this node backwards
    prev = cur;             // 3. advance prev
    cur = next;             // 4. advance cur
  }
  return prev;              // prev is the old tail = new head
}

function reverseListRec(head) {
  // empty or single node is already reversed
  if (!head || !head.next) return head;
  // trust: the rest is reversed, its tail is head.next
  const newHead = reverseListRec(head.next);
  head.next.next = head;   // attach head after that tail
  head.next = null;        // head is the new tail
  return newHead;
}
```

Dry run (iterative) `1 → 2 → 3`:

| Step | prev | cur | List state |
| --- | --- | --- | --- |
| start | null | 1 | 1→2→3 |
| 1 | 1 | 2 | null←1, 2→3 |
| 2 | 2 | 3 | null←1←2, 3 |
| 3 | 3 | null | null←1←2←3 → return 3 |

The recursive version uses O(n) stack space; the iterative version uses O(1). Prefer iterative in interviews unless asked.

**Example 2: next greater element with a monotonic stack (the core of 496 and 739).**

```js
function nextGreater(nums) {
  const ans = new Array(nums.length).fill(-1);
  // indices whose next-greater is not found yet; values decreasing
  const stack = [];
  for (let i = 0; i < nums.length; i++) {
    while (stack.length && nums[stack[stack.length - 1]] < nums[i]) {
      // nums[i] resolves every smaller waiting element
      ans[stack.pop()] = nums[i];
    }
    stack.push(i);
  }
  return ans;
}
```

Dry run `[2, 1, 5, 3, 6]`: i=0 push \[0\]; i=1 (1 < 2) push \[0,1\]; i=2 (5): pop 1 → ans\[1\]=5, pop 0 → ans\[0\]=5, push \[2\]; i=3 push \[2,3\]; i=4 (6): pop 3 → 6, pop 2 → 6, push \[4\]. Result `[5, 5, 6, 6, -1]`. Brute force is O(n²) (scan right for each i); here every index is pushed and popped at most once: O(n).

**Example 3: LRU cache design (146).** Requirements: `get` and `put` in O(1); evict the least recently used key when over capacity.

- Hash map alone: O(1) lookup, but no O(1) way to find the least recent key.
- Array of keys by recency: O(n) to move a key to the front.
- **Map + doubly linked list:** the map gives key → node; the list orders nodes by recency, with O(1) unlink and insert at the head given the node. Two sentinel nodes (`head`, `tail`) remove all null checks.

```js
class LRUCache {
  constructor(capacity) {
    this.cap = capacity;
    this.map = new Map();                        // key -> node
    // most recent side
    this.head = { key: 0, val: 0, prev: null, next: null };
    // least recent side
    this.tail = { key: 0, val: 0, prev: null, next: null };
    this.head.next = this.tail; this.tail.prev = this.head;
  }
  #remove(node) { node.prev.next = node.next; node.next.prev = node.prev; }
  #addFront(node) {
    node.next = this.head.next; node.prev = this.head;
    this.head.next.prev = node; this.head.next = node;
  }
  get(key) {
    const node = this.map.get(key);
    if (!node) return -1;
    // mark as most recently used
    this.#remove(node); this.#addFront(node);
    return node.val;
  }
  put(key, value) {
    if (this.map.has(key)) this.#remove(this.map.get(key));
    const node = { key, val: value, prev: null, next: null };
    this.#addFront(node); this.map.set(key, node);
    if (this.map.size > this.cap) {
      const lru = this.tail.prev;                 // least recently used
      // node stores its key so we can delete it from the map
      this.#remove(lru); this.map.delete(lru.key);
    }
  }
}
```

A JavaScript shortcut exists (a `Map` keeps insertion order, so delete-and-reinsert moves a key to the end, and `map.keys().next().value` is the oldest). Mention it as a trade-off, but implement the linked list: it is what the interviewer is testing.

**Example 4: monotonic deque for the sliding-window maximum (the idea behind 239).** Brute force takes the maximum of every window: O(n·k). Instead keep a deque of indices whose values decrease from front to back. The front is always the maximum of the current window; an index leaves from the front when it falls out of the window and from the back when a larger value arrives.

```js
function maxSlidingWindow(nums, k) {
  const dq = [];     // indices; their values decrease from front to back
  let head = 0;      // dq[head] is the front (a head pointer, not shift())
  const res = [];
  for (let i = 0; i < nums.length; i++) {
    // 1. drop the front index if it has left the window [i - k + 1, i]
    if (head < dq.length && dq[head] <= i - k) head++;
    // 2. smaller (or equal) values at the back can never be a maximum again
    while (dq.length > head && nums[dq[dq.length - 1]] <= nums[i]) dq.pop();
    dq.push(i);
    // 3. once the first full window exists, the front is its maximum
    if (i >= k - 1) res.push(nums[dq[head]]);
  }
  return res;
}
```

Dry run `nums = [1, 3, -1, -3, 5, 3, 6, 7]`, `k = 3` (deque shown as values, front first):

| i | nums\[i\] | deque after step | window max |
| --- | --- | --- | --- |
| 0 | 1 | \[1\] | — |
| 1 | 3 | \[3\] (1 popped) | — |
| 2 | −1 | \[3, −1\] | 3 |
| 3 | −3 | \[3, −1, −3\] | 3 |
| 4 | 5 | \[5\] (3 left the window; −3, −1 popped) | 5 |
| 5 | 3 | \[5, 3\] | 5 |
| 6 | 6 | \[6\] | 6 |
| 7 | 7 | \[7\] | 7 |

Each index is pushed once and removed at most once, so the loop is O(n). This array-with-head version uses O(n) memory; the circular `Deque` in section 6.5 keeps it at O(k).

#### D. Patterns

**Pattern 4.1: Pointer rewiring with a dummy node**

1. *Recognise:* modify list structure: reverse, remove, insert, merge, reorder.
2. *Clues:* "in place", "return the head", "remove all nodes with", "merge two sorted lists".
3. *From brute force:* copying values into an array and rebuilding is O(n) space and usually forbidden; rewire pointers instead.
4. *Why it works:* each node's `next` is changed exactly once after its successor is saved.
5. *Template:* `dummy → head`; `prev` trails `cur`; save `next`, rewire, advance; return `dummy.next`.
6. *Complexity:* O(n), O(1).
7. *Variations:* reverse a sub-range (92), merge (21), reorder = find middle + reverse second half + merge alternately (143).
8. *Inappropriate when:* random access is needed repeatedly (convert to an array if allowed).

**Pattern 4.2: Fast and slow pointers**

1. *Recognise:* find the middle, detect a cycle, find k-th from end, without knowing the length.
2. *Clues:* "cycle", "middle", "n-th from the end", "O(1) memory", also "find the duplicate" in an array treated as a linked list (287).
3. *From brute force:* a visited `Set` or counting the length first; fast/slow does it in one pass with O(1) space.
4. *Why it works:* relative speed of 1 node/step guarantees a meeting inside a cycle; a 2:1 speed ratio puts slow at the middle.
5. *Template:* `while (fast && fast.next) { slow = slow.next; fast = fast.next.next; if (slow === fast) ... }`.
6. *Complexity:* O(n), O(1).
7. *Variations:* gap of k (19), cycle start (142), palindrome list (middle + reverse).
8. *Inappropriate when:* you need more than position information (e.g. counts per value).

**Pattern 4.3: Stack for matching and evaluation**

1. *Recognise:* nested structure, "most recent unmatched", postfix evaluation, undo.
2. *Clues:* "valid parentheses", "decode", "evaluate", "simplify path", "backspace".
3. *From brute force:* repeatedly removing matched pairs is O(n²); a stack resolves each item once.
4. *Why it works:* the most recently opened item must close first (LIFO matches nesting).
5. *Template:* push openers; on a closer, check the top matches and pop; valid if the stack ends empty.
6. *Complexity:* O(n), O(n).
7. *Variations:* min-stack (155: store `[val, minSoFar]` pairs), RPN (150: pop two operands, mind operand order and `Math.trunc` for division).
8. *Inappropriate when:* only counts matter (a single counter suffices for one bracket type).

**Pattern 4.4: Monotonic stack**

1. *Recognise:* for each element, the nearest greater/smaller element to the left or right, or spans bounded by such elements.
2. *Clues:* "next greater", "days until warmer", "previous smaller", "stock span", "largest rectangle", "visible".
3. *From brute force:* O(n²) scanning outwards from each element; the stack keeps only candidates that can still be an answer.
4. *Why it works:* an element smaller than a newer, larger element can never be the next greater for anything later, so it is popped forever.
5. *Template:* Example 2; flip `<` to `>` for next smaller; iterate right-to-left for "previous" variants.
6. *Complexity:* O(n) amortised, O(n) space.
7. *Variations:* 739 (store index, answer = distance), previous greater/smaller variants (read the stack top before pushing), 84 histogram (each bar's width = distance between its previous and next smaller bars).
8. *Inappropriate when:* you need the k-th greater or arbitrary range queries (use sorting, heaps or segment trees).

### Week 5 (30 Nov – 5 Dec): Recursion and backtracking

**A. Learning objectives.** By Saturday you can: define a recursive function by its contract ("what does f(state) return?"), base case and transition; draw a recursion tree and derive time and space complexity from it; generate subsets, permutations and combinations without memorised templates; handle duplicates by sorting and skipping; prune impossible branches; backtrack on a grid by marking and restoring cells.

#### B. Concepts

**Recursive thinking: the contract.** Write one sentence before coding: "`f(i, remaining)` returns / produces …". Then:

1. *Base case(s):* the smallest inputs you can answer directly (empty list, index past the end, target reached or exceeded).
2. *Transition:* express f in terms of f on smaller inputs, assuming those calls are correct ("leap of faith").
3. *Progress:* every call must move strictly toward a base case, or recursion never stops.

**Call stack.** Each call stores its local variables in a stack frame until it returns. Recursion depth = maximum stack height = auxiliary space. Node's default stack holds roughly 7,000–12,000 frames (measured on Node 22: about 12,500 for a function with no arguments, about 7,000 with four; LeetCode does not publish its limit); deeper recursion (a 10⁵-node skewed tree, a linked list of 10⁵ nodes) throws `RangeError: Maximum call stack size exceeded`. Then convert to iteration with an explicit stack.

**Recursion trees and complexity.** Time = (number of nodes in the recursion tree) × (work per node). Common shapes:

| Shape | Calls | Example |
| --- | --- | --- |
| One branch, size − 1 | n | Factorial, linked-list recursion |
| One branch, size ÷ 2 | log n | Binary search, fast power |
| Two branches, size ÷ 2 + O(n) merge | n log n total work | Merge sort |
| Two branches, size − 1 | 2ⁿ | Subsets, naive Fibonacci |
| n, n−1, n−2 … branches | n! | Permutations |

For generation problems also multiply by the cost of copying each output (`[...path]` is O(n)): subsets are O(n · 2ⁿ), permutations O(n · n!).

**Recursion vs iteration.** Recursion is clearer for trees, divide-and-conquer and backtracking. Iteration avoids stack limits and function-call overhead. Every recursion can become iteration with an explicit stack; tail recursion is **not** optimised in Node, so do not rely on it.

**Backtracking.** A depth-first search over a tree of partial decisions. At each node: if the partial solution is complete, record it; otherwise, for each valid choice: *choose* (mutate state), *explore* (recurse), *unchoose* (undo the mutation). Undoing is what lets one shared `path` array serve the whole search.

**Deriving the state (do this instead of memorising templates).** Ask three questions:

1. *What decision am I making at each level?* (include element i or not; which unused element goes in position k; which character goes next)
2. *What do I need to know to make the remaining decisions?* That becomes the parameters: start index, remaining target, used flags, current path.
3. *When is a branch complete or dead?* That gives the base cases and pruning conditions.

**Duplicates.** If the input has duplicates and the output must not, sort first, then at the same recursion level skip a value equal to the previous one: `if (i > start && nums[i] === nums[i - 1]) continue;`. The condition `i > start` allows the duplicate to be used deeper in the same branch, but not as an alternative choice at the same level.

**Pruning.** Stop exploring a branch as soon as it cannot lead to a valid answer: remaining target < 0; sorted candidates where `candidates[i] > remaining` (break, not continue); too few elements left to reach size k (`n - i + 1 < k - path.length`). Pruning does not change worst-case big-O in most interview problems, but it matters in practice.

**Common mistakes.** Pushing `path` instead of a copy (`res.push([...path])`); forgetting to undo; using `i + 1` where reuse is allowed (39) or `i` where it is not (40); deduplicating with a `Set` of joined strings (works, but is slow and signals you missed the sort-and-skip idea); mutating the grid without restoring it (79).

#### C. Worked examples

**Example 1: fast power (50), recursion that halves the problem.**

```js
function myPow(x, n) {
  if (n < 0) return 1 / myPow(x, -n);   // handle negative exponent once
  if (n === 0) return 1;                // base case
  // compute once and reuse: this is the whole trick
  const half = myPow(x, Math.floor(n / 2));
  return n % 2 === 0 ? half * half : half * half * x;
}
```

Calling `myPow(x, n/2)` twice instead of storing `half` turns O(log n) into O(n). Recursion tree with storing: one branch per level, log₂ n levels.

**Example 2: subsets (78) two ways, with the recursion tree.**

```js
// Way A: include/exclude each element. Decision per level = "take nums[i]
// or not".
function subsetsA(nums) {
  const res = [], path = [];
  function dfs(i) {
    // all decisions made
    if (i === nums.length) { res.push([...path]); return; }
    path.push(nums[i]); dfs(i + 1); path.pop();                // take
    dfs(i + 1);                                                // skip
  }
  dfs(0);
  return res;
}

// Way B: every node is a subset; choose the next element from index `start`
// onward.
function subsetsB(nums) {
  const res = [], path = [];
  function dfs(start) {
    res.push([...path]);                    // record the current subset
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]); dfs(i + 1); path.pop();
    }
  }
  dfs(0);
  return res;
}
```

Recursion tree for Way A with `[1, 2]`:

```
                dfs(0) path=[]
          take 1 /          \ skip 1
     dfs(1) [1]               dfs(1) []
   take 2 /   \ skip        take 2 /  \ skip
  [1,2]        [1]           [2]       []
```

Four leaves = 2² subsets. Way B is the form that extends naturally to combinations and duplicate skipping.

**Example 3: Subsets II (90), dry run of duplicate skipping.** Input `[1, 2, 2]` (already sorted). Using Way B with the skip rule:

| Call | start | loop i | nums\[i\] | skip? | path after push |
| --- | --- | --- | --- | --- | --- |
| dfs(0) | 0 | 0 | 1 | no | \[1\] |
| dfs(1) | 1 | 1 | 2 | no (i = start) | \[1,2\] |
| dfs(2) | 2 | 2 | 2 | no (i = start) | \[1,2,2\] |
| back in dfs(1) | 1 | 2 | 2 | **yes** (i > start, equals previous) | — |
| back in dfs(0) | 0 | 1 | 2 | no | \[2\] |
| dfs(2) | 2 | 2 | 2 | no | \[2,2\] |
| back in dfs(0) | 0 | 2 | 2 | **yes** | — |

Output: `[] [1] [1,2] [1,2,2] [2] [2,2]`, six subsets, no duplicates.

**Example 4: permutations (46) with a `used` array.** Decision per level: which unused number goes in the next position.

```js
function permute(nums) {
  const res = [], path = [], used = new Array(nums.length).fill(false);
  function dfs() {
    if (path.length === nums.length) { res.push([...path]); return; }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true; path.push(nums[i]);   // choose
      dfs();                                 // explore
      path.pop(); used[i] = false;           // unchoose
    }
  }
  dfs();
  return res;
}
```

Permutations II (47) adds: sort, then skip `i` if `nums[i] === nums[i-1] && !used[i-1]` (use equal values only in left-to-right order).

#### D. Patterns

**Pattern 5.1: Include/exclude (subset-style) search**

1. *Recognise:* every element is either in or out; output is all valid selections.
2. *Clues:* "all subsets", "power set", "choose any number of", n ≤ 20.
3. *From brute force:* iterate bitmasks 0…2ⁿ−1 (valid, and good to mention); recursion makes pruning and duplicate handling easier.
4. *Why it works:* each root-to-leaf path is exactly one combination of decisions.
5. *Template:* Example 2.
6. *Complexity:* O(n · 2ⁿ) time, O(n) recursion depth.
7. *Variations:* duplicates (90), target sums (later: 416 with DP).
8. *Inappropriate when:* you need only a count or an optimum and states repeat (use DP).

**Pattern 5.2: Choose-from-remaining (combinations)**

1. *Recognise:* select k items or reach a target; order does not matter.
2. *Clues:* "combinations", "combination sum", "unique combinations", "each number may be used once/unlimited".
3. *From brute force:* generating all permutations and deduplicating wastes n! work; a `start` index enforces increasing order, so each combination appears once.
4. *Why it works:* choosing only from `start` onwards gives a canonical order for each set.
5. *Template:* `dfs(start, remaining)`: record when complete; loop `i` from `start`; recurse with `i` (reuse allowed, 39) or `i + 1` (no reuse, 40, 77).
6. *Complexity:* bounded by O(n · 2ⁿ); combinations of size k: O(k · C(n, k)).
7. *Variations:* phone letters (17: one level per digit, branch over its letters), generate parentheses (22: state = open and close counts; add `(` if open < n, `)` if close < open).
8. *Inappropriate when:* only the number of combinations is asked (DP, Week 10).

**Pattern 5.3: Permutation search with a used set**

1. *Recognise:* order matters; arrange all elements.
2. *Clues:* "all permutations", "arrangements", "orderings", n ≤ 8–10.
3. *From brute force:* this *is* the brute force; the skill is generating each arrangement once and pruning invalid prefixes early.
4. *Why it works:* each level fills one position with one unused element.
5. *Template:* Example 4.
6. *Complexity:* O(n · n!).
7. *Variations:* duplicates (47), N-Queens (51: one row per level; prune with column and diagonal sets `r - c`, `r + c`).
8. *Inappropriate when:* n > 10 or only a count is needed.

**Pattern 5.4: Grid and string backtracking**

1. *Recognise:* find a path or partition in a grid/string that satisfies constraints; answer is yes/no or all partitions.
2. *Clues:* "word exists in the grid", "partition so that every part is a palindrome", "adjacent cells", "each cell used once".
3. *From brute force:* try every start and every path; prune as soon as a character mismatches.
4. *Why it works:* DFS explores every valid path; marking a cell visited prevents reuse within one path, and restoring it allows reuse in other paths.
5. *Template:* `dfs(r, c, k)`: if `k === word.length` return true; bounds/mismatch → false; `const tmp = board[r][c]; board[r][c] = '#'`; try 4 directions; restore `board[r][c] = tmp`.
6. *Complexity:* 79 is O(m · n · 3^L) (after the first step, at most 3 directions are new); 131 is O(n · 2ⁿ).
7. *Variations:* palindrome partitioning (131: choose the end of the next palindromic piece), N-Queens, Word Search II with a trie (212).
8. *Inappropriate when:* you need the shortest path (BFS, Week 8) or overlapping subproblems dominate (DP).

### Week 6 (7–12 Dec): Binary trees and binary search trees

**A. Learning objectives.** By Saturday you can: classify any tree problem as *information from children*, *information from ancestors* or *level-based*; write preorder, inorder and postorder recursively and inorder iteratively; write level-order BFS; compute height, diameter and balance in one pass; find the lowest common ancestor; validate a BST with bounds; build a tree from preorder and inorder traversals.

#### B. Concepts

**Terminology.** Root (no parent), leaf (no children), depth of a node (edges from the root), height of a node (edges on the longest path down to a leaf; LeetCode often counts nodes instead, so read the definition), subtree, ancestor/descendant. A *binary tree* has at most two children per node. A *full* tree: every node has 0 or 2 children. A *complete* tree: all levels full except possibly the last, filled left to right (heaps, Week 7). A *balanced* tree: heights of left and right subtrees differ by at most 1 at every node, so height is O(log n). A *skewed* tree degenerates into a linked list, height O(n): recursion depth then equals n.

**LeetCode tree input.** Trees are given as level-order arrays with `null` for missing children: `[3,9,20,null,null,15,7]`. The function receives a `TreeNode` root (`val`, `left`, `right`). Sketch the tree from the array before coding.

**Depth-first traversals.**

| Order | Visit sequence | Typical use |
| --- | --- | --- |
| Preorder | node, left, right | Copy/serialize a tree; pass information down |
| Inorder | left, node, right | BST → sorted order |
| Postorder | left, right, node | Combine children's results (height, diameter, delete) |

Recursive DFS uses O(h) stack space, h = height. Iterative DFS replaces the call stack with an explicit array: preorder is a plain stack (push right then left); inorder pushes all left children, pops, visits, then moves right (Example 3).

**Breadth-first (level-order) traversal.** Use a queue; process the tree level by level by reading `const size = queue.length - head` before the inner loop. Use BFS when the answer is about levels, the first/last node per level, or the minimum depth (BFS can stop at the first leaf).

**The three question types (decide this first).**

1. *Information from children (bottom-up, postorder):* the answer at a node depends on answers from its subtrees. The recursive function **returns** a value. Examples: height, balanced, diameter, max path sum, LCA.
2. *Information from ancestors (top-down, preorder):* the answer depends on the path from the root. The recursive function **receives** extra parameters (running sum, max so far, allowed range). Examples: path sum, count good nodes, validate BST, max difference between node and ancestor.
3. *Level-based:* the answer depends on depth or left-to-right order within a level. Use BFS (or DFS with a `depth` parameter). Examples: level order, right side view, zigzag, minimum depth.

Many problems combine 1 and a global answer: the function returns one thing (height) while updating another (diameter) in an outer variable.

**Binary search trees.** For every node, all values in the left subtree are smaller and all in the right subtree are larger (LeetCode: strictly, unless stated). Consequences: inorder traversal is sorted; search, insert and delete take O(h): O(log n) if balanced, O(n) if skewed. Self-balancing trees (AVL, red-black) keep h = O(log n); know they exist and why, but you will not implement them in interviews. JavaScript has no built-in sorted map; when a problem needs one, look for a heap, sorting or binary search over an array instead.

**Lowest common ancestor.** In a general binary tree (236): if the current node is p or q, return it; recurse left and right; if both sides return non-null, the current node is the LCA; otherwise return whichever side is non-null. In a BST (235): walk from the root; if both values are smaller go left, if both larger go right, otherwise the current node is the split point and the LCA.

**Constructing a tree from traversals (105).** The first preorder element is the root. Its index in inorder splits the inorder array into left and right subtrees; their sizes tell you how many preorder elements belong to each side. Store inorder positions in a `Map` for O(1) lookups and pass index bounds rather than slicing arrays: O(n) overall instead of O(n²).

**Common mistakes.** Validating a BST by only comparing a node with its direct children (fails for `[5,4,6,null,null,3,7]`: 3 is in the right subtree of 5); confusing depth and height or nodes vs edges; minimum depth counting a null child as a leaf (111); using `shift()` in BFS on large trees; returning from inside a traversal without propagating the result upwards.

#### C. Worked examples

**Example 1: diameter (543), children's information plus a global answer.** Diameter = the longest path between any two nodes (in edges); it passes through some node as `leftHeight + rightHeight`.

```js
function diameterOfBinaryTree(root) {
  let best = 0;
  // contract: number of nodes on the longest downward path
  function height(node) {
    if (!node) return 0;
    const L = height(node.left), R = height(node.right);
    // path through this node, measured in edges
    best = Math.max(best, L + R);
    return 1 + Math.max(L, R);          // what the parent needs: my height
  }
  height(root);
  return best;
}
```

Dry run on `[1,2,3,4,5]` (1 has children 2 and 3; 2 has children 4 and 5): height(4)=1, height(5)=1 → at node 2, best = 1 + 1 = 2, return 2; height(3)=1; at node 1, best = max(2, 2 + 1) = 3, return 3. Answer 3 (path 4–2–1–3). Brute force calls `height` separately from every node: O(n²) on a skewed tree; computing both in one postorder pass is O(n).

**Example 2: validate a BST (98), information from ancestors.**

```js
function isValidBST(root) {
  // every value in this subtree must be in (low, high)
  function ok(node, low, high) {
    if (!node) return true;
    if (node.val <= low || node.val >= high) return false;
    return ok(node.left, low, node.val) && ok(node.right, node.val, high);
  }
  return ok(root, -Infinity, Infinity);
}
```

Dry run on `[5,4,6,null,null,3,7]`: ok(5, −∞, ∞) ✓ → ok(4, −∞, 5) ✓ (leaf) → ok(6, 5, ∞) ✓ → ok(3, 5, 6): 3 ≤ 5 → **false**. The bounds carry the ancestors' constraints down; a children-only check would have accepted this tree. Alternative: inorder traversal must be strictly increasing; track the previous value.

**Example 3: iterative inorder traversal (94).**

```js
function inorderTraversal(root) {
  const res = [], stack = [];
  let cur = root;
  while (cur || stack.length) {
    // go as far left as possible
    while (cur) { stack.push(cur); cur = cur.left; }
    // leftmost unvisited node
    cur = stack.pop();
    res.push(cur.val);                                 // visit
    // then its right subtree
    cur = cur.right;
  }
  return res;
}
```

This is also the engine of 230 (Kth smallest in a BST: stop after k pops).

**Example 4: level-order BFS (102) with a head-pointer queue.**

```js
function levelOrder(root) {
  if (!root) return [];
  const res = [], queue = [root];
  let head = 0;
  while (head < queue.length) {
    // nodes currently queued = one full level
    const levelSize = queue.length - head, level = [];
    for (let i = 0; i < levelSize; i++) {
      const node = queue[head++];
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    res.push(level);
  }
  return res;
}
```

Right side view (199) is the same loop recording only the last node of each level.

#### D. Patterns

**Pattern 6.1: Bottom-up recursion (return values from children)**

1. *Recognise:* the answer for a node is a combination of its subtrees' answers.
2. *Clues:* "height", "balanced", "diameter", "maximum path sum", "subtree", "LCA".
3. *From brute force:* recomputing subtree values from each node is O(n²); one postorder pass that returns them is O(n).
4. *Why it works:* by the time a node is processed, both children's results are final.
5. *Template:* `function f(node) { if (!node) return BASE; const L = f(node.left), R = f(node.right); update global; return combine(L, R, node); }`.
6. *Complexity:* O(n) time, O(h) space.
7. *Variations:* balanced (return −1 for unbalanced to short-circuit), max path sum (124: return the best single downward branch, clamped at 0; update the global with left + node + right), subtree check (572).
8. *Inappropriate when:* the answer depends on the path above the node (use 6.2).

**Pattern 6.2: Top-down recursion (pass information to children)**

1. *Recognise:* a node's answer depends on its ancestors: path sums, ranges, maxima along the path.
2. *Clues:* "root-to-leaf", "path from root", "good node", "ancestor", "valid range".
3. *From brute force:* storing every root-to-node path costs O(n·h); passing a running value costs O(1) per call.
4. *Why it works:* each call receives exactly the summary of its ancestors it needs.
5. *Template:* `function f(node, state) { if (!node) return; check(node, state); f(node.left, next(state, node)); f(node.right, next(state, node)); }`.
6. *Complexity:* O(n) time, O(h) space (plus output for path lists).
7. *Variations:* collect paths with backtracking (113: push, recurse, pop), count good nodes (1448: pass max so far), validate BST (98).
8. *Inappropriate when:* the answer needs subtree aggregates (use 6.1).

**Pattern 6.3: Level-order BFS**

1. *Recognise:* levels, rows, width, left/right views, or shortest distance from the root.
2. *Clues:* "level", "row", "depth" with "minimum", "right side", "zigzag", "average of levels".
3. *From brute force:* DFS with a depth parameter works too, but BFS processes levels naturally and can stop early.
4. *Why it works:* the queue holds exactly one level when each outer iteration begins.
5. *Template:* Example 4.
6. *Complexity:* O(n) time, O(width) space (up to n/2).
7. *Variations:* minimum depth (111: return at the first leaf), zigzag (reverse alternate levels), maximum width (index nodes as 2i, 2i + 1).
8. *Inappropriate when:* the problem is about subtree aggregates (DFS is simpler).

**Pattern 6.4: BST ordering**

1. *Recognise:* the tree is a BST, or the answer depends on sorted order.
2. *Clues:* "BST", "kth smallest", "validate", "closest value", "range sum".
3. *From brute force:* collecting all values and sorting is O(n log n); the BST property allows O(h) searches and O(n) sorted traversal.
4. *Why it works:* every comparison eliminates one whole subtree.
5. *Template:* walk with `node = val < node.val ? node.left : node.right`, or iterative inorder.
6. *Complexity:* O(h) search; O(n) full traversal.
7. *Variations:* LCA in a BST (235), kth smallest (230), construct from traversals (105).
8. *Inappropriate when:* the tree is a general binary tree (BST shortcuts give wrong answers).

### Week 7 (14–19 Dec): Heaps, intervals and tries

**A. Learning objectives.** By Saturday you can: implement a binary min-heap with a comparator from scratch in under 15 minutes; explain sift-up, sift-down and O(n) heapify; solve top-K and k-way merge problems and justify heap vs sort vs quickselect; maintain a running median with two heaps; merge, insert and schedule intervals; implement a trie with insert, search, prefix search and wildcard search.

#### B. Concepts

**Heap property and storage.** A binary heap is a *complete* binary tree in which every parent is ≤ its children (min-heap) or ≥ (max-heap). The minimum is always at the root. Because the tree is complete it is stored in an array with no pointers: for index i, parent = `(i - 1) >> 1`, left = `2i + 1`, right = `2i + 2`.

| Operation | How | Time |
| --- | --- | --- |
| peek | `heap[0]` | O(1) |
| push | append at the end, *sift up* (swap with parent while smaller) | O(log n) |
| pop | move last element to the root, *sift down* (swap with the smaller child while larger) | O(log n) |
| heapify an array | sift down every non-leaf from `(n >> 1) - 1` down to 0 | O(n) |
| search for an arbitrary value | scan | O(n) |

*Why heapify is O(n), not O(n log n):* half the nodes are leaves (no work), a quarter sift down at most 1 level, an eighth at most 2, … The sum n/4·1 + n/8·2 + … is bounded by n.

**JavaScript has no built-in priority queue.** LeetCode's JS runtime has been reported to bundle (not verified for this edition) `@datastructures-js/priority-queue`, but its API has changed across versions and many interviewers will ask you to write your own. Learn the \~35-line `MinHeap` with a comparator in section 6.13; a max-heap is the same class with `(a, b) => b - a`. Store tuples such as `[dist, node]` and compare `a[0] - b[0]`.

**Heap vs sorting vs quickselect for top-K.**

| Approach | Time | Space | When to choose |
| --- | --- | --- | --- |
| Sort everything | O(n log n) | O(1)–O(n) | Simple, n small, or you need all elements ordered |
| Min-heap of size k (for k largest) | O(n log k) | O(k) | k ≪ n, streaming data (703), memory-bound |
| Quickselect | O(n) average, O(n²) worst | O(1) | One-off k-th element, can modify the array (215) |
| Bucket by frequency | O(n) | O(n) | Frequencies bounded by n (347) |

**K-way merge.** To merge k sorted lists, push each list's head into a min-heap; repeatedly pop the smallest, append it, and push its successor. O(N log k) for N total elements. The alternative of merging lists pairwise in rounds (divide and conquer) has the same complexity and no heap.

**Two heaps (running median).** A max-heap holds the smaller half and a min-heap the larger half; keep sizes equal or the max-heap one larger. The median is the max-heap top, or the average of both tops. Each insertion is O(log n), each median query O(1).

**Intervals.** Represent as `[start, end]`. Check whether endpoints are inclusive: `[1,2]` and `[2,3]` overlap in 56 (merge them) but meetings ending at 2 and starting at 2 do not conflict.

- *Merge (56):* sort by start; extend the last merged interval while `cur.start <= last.end`.
- *Insert (57):* add intervals ending before the new one, merge all overlapping, add the rest. O(n), no sort needed.
- *Maximum non-overlapping set (435, 452):* sort by **end**, greedily keep the interval that finishes first (activity selection; proven in Week 9).
- *Maximum simultaneous overlap (meeting rooms):* either sort starts and ends separately and sweep, or sort by start and keep a min-heap of end times; the heap size is the number of rooms in use. The classic "Meeting Rooms II" is Premium, so you practise the same sweep with 1094 Car Pooling.

**Tries (prefix trees).** Each node maps a character to a child node and has an `isEnd` flag. Insert and search cost O(L) for a word of length L, independent of how many words are stored. Space is O(total characters). Use when many queries share prefixes: autocomplete, prefix counts, word search over a dictionary. A `Set` of words answers "is this word present" in O(L) too, but cannot answer "does any word start with this prefix" efficiently.

**Common mistakes.** Forgetting to sift down after replacing the root; off-by-one in child indices; using a max-heap of all n elements for "k largest" (O(n log n), no better than sorting); comparator subtraction overflow is not an issue in JS but comparing strings with `-` is (`"a" - "b"` is `NaN`); sorting intervals without a comparator; mutating input intervals that the caller reuses; marking `isEnd` on the wrong node in a trie.

#### C. Worked examples

**Example 1: heap operations dry run.** Push 5, 3, 8, 1 into an empty min-heap:

| Action | Array after | Notes |
| --- | --- | --- |
| push 5 | \[5\] | root |
| push 3 | \[3, 5\] | 3 < parent 5 → swap |
| push 8 | \[3, 5, 8\] | 8 > parent 3, stays |
| push 1 | \[1, 3, 8, 5\] | 1 at index 3; parent idx 1 (5) → swap; parent idx 0 (3) → swap |
| pop → 1 | \[3, 5, 8\] | move 5 to root: \[5, 3, 8\]; smaller child 3 → swap |

**Example 2: Kth largest element (215) with a size-k min-heap.**

```js
function findKthLargest(nums, k) {
  const heap = new MinHeap((a, b) => a - b);   // section 6.13
  for (const x of nums) {
    heap.push(x);
    // drop the smallest; the heap keeps the k largest seen
    if (heap.size() > k) heap.pop();
  }
  // smallest of the k largest = k-th largest
  return heap.peek();
}
```

Dry run `[3,2,1,5,6,4]`, k = 2: push 3 → \[3\]; push 2 → \[2,3\]; push 1 → size 3, pop 1 → \[2,3\]; push 5 → pop 2 → \[3,5\]; push 6 → pop 3 → \[5,6\]; push 4 → pop 4 → \[5,6\]. Answer 5. O(n log k) time, O(k) space.

**Example 3: merge intervals (56).**

```js
function merge(intervals) {
  intervals.sort((a, b) => a[0] - b[0]);       // sort by start
  // copy so we do not mutate the input
  const res = [intervals[0].slice()];
  for (let i = 1; i < intervals.length; i++) {
    const last = res[res.length - 1], [s, e] = intervals[i];
    // overlap: extend (max handles containment)
    if (s <= last[1]) last[1] = Math.max(last[1], e);
    else res.push([s, e]);
  }
  return res;
}
```

Dry run `[[1,3],[8,10],[2,6],[15,18]]` → sorted `[[1,3],[2,6],[8,10],[15,18]]`: \[1,3\]; \[2,6\] overlaps → \[1,6\]; \[8,10\] new; \[15,18\] new. Without `Math.max`, `[[1,10],[2,3]]` would wrongly shrink to \[1,3\].

**Example 4: trie insert and prefix search (208).**

```js
class Trie {
  constructor() { this.root = { children: new Map(), isEnd: false }; }
  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) {
        node.children.set(ch, { children: new Map(), isEnd: false });
      }
      node = node.children.get(ch);
    }
    // mark the node of the LAST character
    node.isEnd = true;
  }
  // returns the node for prefix s, or null
  #walk(s) {
    let node = this.root;
    for (const ch of s) {
      node = node.children.get(ch);
      if (!node) return null;
    }
    return node;
  }
  search(word) { const n = this.#walk(word); return n !== null && n.isEnd; }
  startsWith(prefix) { return this.#walk(prefix) !== null; }
}
```

For lowercase-only input, an array of 26 children (`new Array(26).fill(null)`, index `ch.charCodeAt(0) - 97`) is faster than a `Map`.

#### D. Patterns

**Pattern 7.1: Heap of size k (top-K)**

1. *Recognise:* k largest/smallest/closest/most frequent; streaming input.
2. *Clues:* "k-th largest", "top k", "k closest", "in a stream".
3. *From brute force:* sort all, take k: O(n log n). Keep only k candidates: O(n log k).
4. *Why it works:* for k largest, a min-heap's root is the weakest current candidate, so each new element only needs comparing with it.
5. *Template:* Example 2; for k smallest use a max-heap.
6. *Complexity:* O(n log k), O(k).
7. *Variations:* 973 (key = squared distance; no `Math.sqrt` needed), 347 (heap over frequency map entries), 703 (persistent heap across calls).
8. *Inappropriate when:* k ≈ n (sort), or one-off k-th with O(1) space allowed (quickselect).

**Pattern 7.2: K-way merge**

1. *Recognise:* several sorted sequences must be combined or scanned in global order.
2. *Clues:* "merge k sorted", "smallest range covering k lists", "k-th smallest in a sorted matrix".
3. *From brute force:* concatenate and sort: O(N log N). The heap exploits existing order: O(N log k).
4. *Why it works:* the next global minimum is always one of the k current heads.
5. *Template:* push all heads `[val, listIndex]`; pop min; push that list's next element.
6. *Complexity:* O(N log k), O(k).
7. *Variations:* pairwise divide-and-conquer merge (no heap), merging sorted arrays with index pointers.
8. *Inappropriate when:* k = 2 (two pointers are simpler).

**Pattern 7.3: Two heaps or a heap-driven simulation**

1. *Recognise:* you repeatedly need the current min/max while the set changes, or a median.
2. *Clues:* "median", "data stream", "schedule tasks", "process in order of priority", "cooldown".
3. *From brute force:* re-sorting after every change is O(n log n) per operation.
4. *Why it works:* a heap answers min/max in O(1) and updates in O(log n).
5. *Template:* median: push into the max-heap, move its top to the min-heap, rebalance if the min-heap is larger.
6. *Complexity:* O(log n) per update.
7. *Variations:* 621 Task Scheduler (a counting formula `max(tasks.length, (maxFreq - 1) * (n + 1) + countOfMax)` where n is the cooldown, or a heap simulation; derive both).
8. *Inappropriate when:* all data is known upfront and queried once (sort).

**Pattern 7.4: Interval sort and sweep**

1. *Recognise:* ranges with start/end; overlaps, merges, gaps, counts in use.
2. *Clues:* "intervals", "meetings", "booking", "overlapping", "rooms", "arrows", "trips".
3. *From brute force:* compare every pair: O(n²). After sorting, overlaps are only between neighbours (merge) or tracked by a sweep.
4. *Why it works:* in start order, an interval can only overlap the current merged block or start a new one.
5. *Template:* sort by start (merge/insert) or by end (maximise kept intervals); or sweep events `+1` at start, `-1` at end.
6. *Complexity:* O(n log n).
7. *Variations:* 57 insert (no sort), 435/452 (sort by end), 1094 car pooling (difference array over stops or sorted events), 986 interval intersections.
8. *Inappropriate when:* intervals are dynamic with many queries (interval trees, beyond scope).

**Pattern 7.5: Trie for prefix queries**

1. *Recognise:* many words share prefixes; queries by prefix or with wildcards.
2. *Clues:* "prefix", "autocomplete", "starts with", "dictionary of words", "word search with a list of words".
3. *From brute force:* checking every word for each prefix query is O(N·L); the trie makes it O(L).
4. *Why it works:* words sharing a prefix share the path for that prefix.
5. *Template:* Example 4. Wildcard `.` (211): DFS over all children at that position.
6. *Complexity:* O(L) per operation; O(total characters) space.
7. *Variations:* 212 word search II (DFS on the grid guided by the trie).
8. *Inappropriate when:* only exact membership is needed (a `Set` is simpler).

### Week 8 (21–26 Dec): Graphs I: traversal, components, BFS shortest paths, topological sort

**A. Learning objectives.** By Saturday you can: turn an edge list or grid into an adjacency structure; write BFS and DFS (recursive and iterative) with correct visited handling; count connected components; run multi-source BFS for shortest distances in unweighted graphs; detect cycles in undirected and directed graphs; produce a topological order with Kahn's algorithm and with DFS; check bipartiteness by 2-colouring.

#### B. Concepts

**Terminology.** A graph G = (V, E) has vertices and edges. *Directed* edges have a direction (u → v); *undirected* edges go both ways. *Weighted* edges carry a cost. A *path* is a sequence of edges; a *cycle* returns to its start. A graph is *connected* if every vertex reaches every other (undirected); its maximal connected pieces are *components*. A *DAG* is a directed acyclic graph (dependencies, build orders). A *tree* is a connected undirected graph with V − 1 edges and no cycles.

**Representations.**

| Representation | Space | Edge check | Iterate neighbours | Use when |
| --- | --- | --- | --- | --- |
| Adjacency list (`Array.from({length: n}, () => [])`) | O(V + E) | O(degree) | O(degree) | Default for interviews; sparse graphs |
| Adjacency matrix (`n × n`) | O(V²) | O(1) | O(V) | Dense graphs, small n (≤ \~1,000), input already a matrix (547) |
| Edge list | O(E) | O(E) | O(E) | Kruskal's MST, input format |
| Implicit grid | none extra | O(1) | 4 or 8 neighbours | Islands, mazes, oranges |

Build an undirected adjacency list from `edges` by pushing both directions. For string-labelled nodes, use a `Map` from label to array of neighbours.

**BFS and DFS.** Both visit every reachable vertex once and every edge once or twice: O(V + E) time, O(V) space.

- *BFS* explores in layers of increasing distance using a queue. In an unweighted graph, the first time BFS reaches a node is along a shortest path. Mark nodes visited **when you enqueue them**, not when you dequeue them, or the same node can be enqueued many times.
- *DFS* goes deep first using recursion or a stack. Use it for components, reachability, cycle detection, topological sort and path enumeration. Recursive DFS on a 10⁵-cell grid can overflow the stack in JavaScript; switch to an explicit stack or BFS when the grid can be that large.

**Visited state.** For undirected traversal, a boolean `visited` array (or mutating the grid, e.g. setting `'1'` to `'0'`, if allowed) suffices. For directed cycle detection you need **three states**: 0 = unvisited, 1 = on the current DFS path, 2 = fully processed. Meeting a state-1 node means a back edge, which means a cycle.

**Multi-source BFS.** When distances are measured from the nearest of many sources (all rotten oranges, all 0s, all land cells), enqueue every source at distance 0 at the start. One BFS then computes all nearest distances in O(V + E), instead of one BFS per source.

**Cycle detection.** Undirected: during DFS, an edge to a visited node other than your parent indicates a cycle (or use Union-Find, Week 9). Directed: three-state DFS, or Kahn's algorithm fails to output all nodes.

**Topological sort.** A linear order of a DAG where every edge u → v puts u before v.

- *Kahn's algorithm (BFS):* compute in-degrees; queue all nodes with in-degree 0; pop, append to the order, decrement neighbours' in-degrees, enqueue any that reach 0. If the order has fewer than V nodes, there is a cycle.
- *DFS postorder:* after visiting all descendants of a node, push it; the reversed list is a topological order. Combine with three-state colouring to detect cycles.

**Bipartite graphs.** Vertices can be split into two sets with every edge crossing between them ⇔ the graph has no odd cycle. Check by BFS/DFS 2-colouring: colour a start node 0, neighbours 1, their neighbours 0; a conflict means not bipartite. Run it from every uncoloured node because the graph may be disconnected.

**Common mistakes.** Marking visited on dequeue (exponential blow-up on dense graphs); forgetting disconnected components (loop over all nodes); building a directed list when edges are undirected; reversing prerequisite edge direction in course schedule (`[a, b]` means b → a); recursion depth overflow on large grids; checking bounds after indexing.

#### C. Worked examples

**Example 1: number of islands (200), DFS with an explicit stack.**

```js
function numIslands(grid) {
  const m = grid.length, n = grid[0].length;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let count = 0;
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] !== '1') continue;
      // found an unvisited island
      count++;
      // mark visited when pushing
      grid[r][c] = '0';
      const stack = [[r, c]];
      while (stack.length) {
        const [cr, cc] = stack.pop();
        for (const [dr, dc] of dirs) {
          const nr = cr + dr, nc = cc + dc;
          if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
          if (grid[nr][nc] !== '1') continue;
          grid[nr][nc] = '0';
          stack.push([nr, nc]);
        }
      }
    }
  }
  return count;
}
```

Each cell is pushed at most once: O(m·n) time and space. Mention to the interviewer that this mutates the input; copy the grid or use a `visited` array if that is not allowed.

**Example 2: rotting oranges (994), multi-source BFS dry run.** Grid:

```
2 1 1
1 1 0
0 1 1
```

Enqueue the single rotten orange (0,0) at minute 0; fresh = 6.

| Minute | Cells that rot this minute | Fresh left |
| --- | --- | --- |
| 1 | (0,1), (1,0) | 4 |
| 2 | (0,2), (1,1) | 2 |
| 3 | (2,1) | 1 |
| 4 | (2,2) | 0 |

Answer 4. Process one full level (minute) at a time, exactly as in level-order tree BFS. If fresh > 0 when the queue empties, return −1.

**Example 3: course schedule (207/210) with Kahn's algorithm.**

```js
function findOrder(numCourses, prerequisites) {
  const adj = Array.from({ length: numCourses }, () => []);
  const indeg = new Array(numCourses).fill(0);
  // [a, b] means b must come before a
  for (const [course, pre] of prerequisites) {
    adj[pre].push(course);
    indeg[course]++;
  }
  const queue = [];
  for (let i = 0; i < numCourses; i++) if (indeg[i] === 0) queue.push(i);
  const order = [];
  // queue array doubles as head-pointer queue
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    order.push(u);
    for (const v of adj[u]) if (--indeg[v] === 0) queue.push(v);
  }
  // fewer nodes = a cycle blocked some courses
  return order.length === numCourses ? order : [];
}
```

Dry run: 4 courses, prerequisites `[[1,0],[2,0],[3,1],[3,2]]` → edges 0→1, 0→2, 1→3, 2→3; indegrees \[0,1,1,2\]. Queue \[0\] → order \[0\], indeg \[0,0,0,2\], enqueue 1, 2 → pop 1: indeg\[3\]=1 → pop 2: indeg\[3\]=0, enqueue 3 → pop 3. Order \[0,1,2,3\]. 207 is the same code returning `order.length === numCourses`.

**Example 4: three-state DFS cycle detection (directed).**

```js
function hasCycle(n, adj) {
  // 0 unvisited, 1 on current path, 2 done
  const state = new Array(n).fill(0);
  function dfs(u) {
    state[u] = 1;
    for (const v of adj[u]) {
      if (state[v] === 1) return true;    // back edge to the current path
      if (state[v] === 0 && dfs(v)) return true;
    }
    state[u] = 2;                         // all descendants processed: safe
    return false;
  }
  for (let i = 0; i < n; i++) if (state[i] === 0 && dfs(i)) return true;
  return false;
}
```

A two-state version (just visited) wrongly reports a cycle for the diamond 0→1, 0→2, 1→3, 2→3, because 3 is visited twice via different paths. 802 Find Eventual Safe States is exactly "which nodes end in state 2 without reaching a cycle".

#### D. Patterns

**Pattern 8.1: Flood fill and connected components**

1. *Recognise:* count or measure groups of connected cells/nodes.
2. *Clues:* "islands", "provinces", "connected", "regions", "flood", "area".
3. *From brute force:* for each cell, re-explore its group: O((mn)²). Marking visited makes each cell processed once.
4. *Why it works:* one traversal from an unvisited node visits exactly its component.
5. *Template:* outer loop over all nodes; when unvisited, increment count and traverse (Example 1).
6. *Complexity:* O(V + E) (grid: O(m·n)).
7. *Variations:* max area (695: return size from the traversal), provinces from an adjacency matrix (547), clone graph (133: a `Map` from old node to its copy doubles as visited).
8. *Inappropriate when:* edges are added over time and connectivity is queried in between (Union-Find, Week 9).

**Pattern 8.2: BFS shortest path (single or multi-source)**

1. *Recognise:* minimum number of steps/moves/minutes in an unweighted graph or grid.
2. *Clues:* "minimum steps", "shortest path" with equal costs, "nearest", "minutes until", "distance to the nearest 0".
3. *From brute force:* DFS over all paths is exponential; BFS reaches each node first along a shortest path.
4. *Why it works:* BFS processes nodes in non-decreasing distance order.
5. *Template:* queue with all sources at distance 0; mark on enqueue; process level by level or store `dist`.
6. *Complexity:* O(V + E).
7. *Variations:* 1091 (8 directions, start/end blocked checks), 542 (multi-source from all 0s), 127 word ladder (neighbours = one-letter changes; use wildcard buckets like `h*t`).
8. *Inappropriate when:* edges have different weights (Dijkstra, Week 9).

**Pattern 8.3: Topological sort and directed cycle detection**

1. *Recognise:* dependencies, prerequisites, ordering constraints.
2. *Clues:* "prerequisites", "must be done before", "order of tasks", "build order", "is it possible to finish".
3. *From brute force:* trying permutations of tasks is O(n!); a topological order exists iff there is no cycle.
4. *Why it works:* a node with in-degree 0 has no unmet dependencies, so it can always go next.
5. *Template:* Kahn (Example 3) or three-state DFS (Example 4).
6. *Complexity:* O(V + E).
7. *Variations:* return any valid order (210), detect cycle only (207), safe states (802), alien dictionary (Premium; know the idea).
8. *Inappropriate when:* the graph is undirected (use components or DSU).

**Pattern 8.4: Two-colouring (bipartite check)**

1. *Recognise:* split into two groups such that connected things are in different groups.
2. *Clues:* "bipartite", "two teams", "dislike", "possible to divide".
3. *From brute force:* trying all 2ⁿ splits; colouring propagates forced choices in O(V + E).
4. *Why it works:* once one node's side is fixed, each neighbour's side is forced; a conflict proves an odd cycle.
5. *Template:* `color` array of −1; BFS from each uncoloured node; neighbour gets `1 - color[u]`; conflict → false.
6. *Complexity:* O(V + E).
7. *Variations:* 785, possible bipartition (886).
8. *Inappropriate when:* more than two groups are needed (graph colouring is NP-hard in general).

**Pattern 8.5: Reverse the search direction (start from the targets)**

1. *Recognise:* "which cells can reach X" for many starting cells.
2. *Clues:* "can flow to the ocean", "surrounded regions", "connected to the border".
3. *From brute force:* a DFS from every cell is O((mn)²). Start from the targets (border cells, oceans) and walk backwards once.
4. *Why it works:* reachability is symmetric with reversed edge conditions (flow downhill ⇔ climb uphill from the ocean).
5. *Template:* push all target cells; traverse with the reversed condition; the marked cells are the answer (or its complement).
6. *Complexity:* O(m·n).
7. *Variations:* 417 Pacific Atlantic (two marked sets, intersect), 130 surrounded regions (mark border-connected `O`s safe, flip the rest).
8. *Inappropriate when:* there is a single source and single target (just search forward).

### Week 9 (28 Dec – 2 Jan): Graphs II (Dijkstra, Union-Find, MST) and greedy algorithms

**A. Learning objectives.** By Saturday you can: implement Dijkstra with a min-heap and explain why it needs non-negative weights; implement Union-Find with path compression and union by size; build a minimum spanning tree with Kruskal or Prim; state what makes a greedy algorithm correct, prove simple greedy choices with an exchange argument, and break wrong greedy ideas with counterexamples.

#### B. Concepts

**Dijkstra's algorithm.** Shortest paths from one source in a graph with **non-negative** weights. Keep `dist[]` (∞ except the source = 0) and a min-heap of `[distance, node]`. Repeatedly pop the closest unfinalised node and *relax* its edges: if `dist[u] + w < dist[v]`, update `dist[v]` and push `[dist[v], v]`.

- *Why it works:* when a node is popped with the smallest tentative distance, no other route can be shorter, because every other route would go through a node at least as far away and add non-negative weights.
- *Lazy deletion:* JS heaps have no decrease-key, so push duplicates and skip a popped entry if `d > dist[u]` (stale).
- *Complexity:* O((V + E) log V) with a binary heap.
- *When not to use:* negative edges (use Bellman-Ford, O(V·E)); unweighted graphs (plain BFS is simpler and O(V + E)); weights of only 0 and 1 (0-1 BFS with a deque).
- *Variants:* "minimise the maximum edge on the path" (1631 Path With Minimum Effort) uses the same algorithm with `max(dist[u], w)` instead of `dist[u] + w`. "At most k stops" (787) breaks Dijkstra's assumption because a longer-cost path with fewer stops may be needed; use Bellman-Ford limited to k + 1 rounds or BFS by stops.

**Union-Find (Disjoint Set Union).** Maintains a partition of elements into sets with two operations: `find(x)` returns the set's representative; `union(a, b)` merges two sets. With *path compression* (point nodes directly at the root during find) and *union by size/rank* (attach the smaller tree under the larger), each operation is O(α(n)), effectively constant.

- *Use for:* dynamic connectivity, counting components as edges arrive, detecting the edge that creates a cycle in an undirected graph (684), grouping by shared attributes (721 accounts by email), Kruskal's MST.
- *DSU vs BFS/DFS:* for a static graph and a single question, BFS/DFS is equally good. DSU shines when edges arrive incrementally or you need many "are these connected?" queries.

**Minimum spanning tree (MST).** In a connected, weighted, undirected graph, the cheapest set of V − 1 edges connecting all vertices.

- *Kruskal:* sort edges by weight; add each edge if it joins two different DSU sets. O(E log E).
- *Prim:* grow a tree from any vertex, always adding the cheapest edge leaving it (min-heap). O(E log V). For dense/complete graphs (1584: every pair of points is an edge), the O(V²) array version of Prim (no heap) is fastest.
- Priority: know one (Kruskal is shorter with DSU) and the idea of the other.

**Greedy algorithms.** Build a solution by making the locally best choice at each step and never revisiting it. Greedy is correct only when:

1. *Greedy-choice property:* some optimal solution starts with the greedy choice.
2. *Optimal substructure:* after that choice, the remaining problem is a smaller instance of the same problem.

**How to validate a greedy idea in an interview.**

1. Try to break it: test small, adversarial inputs (2–4 elements) for 3–5 minutes. One counterexample kills it.
2. *Exchange argument:* take any optimal solution that differs from greedy at the first decision; show you can swap in the greedy choice without making it worse.
3. *Greedy stays ahead:* show that after every step greedy's partial solution is at least as good as any other's.
4. If you cannot do 2 or 3 and the input is small, fall back to DP or search, and say so.

**Greedy ideas that fail (know these counterexamples).**

| Problem | Tempting greedy | Counterexample | Correct approach |
| --- | --- | --- | --- |
| Coin change, coins \[1, 3, 4\], amount 6 | Always take the largest coin | 4 + 1 + 1 = 3 coins; optimal 3 + 3 = 2 coins | DP (322, Week 10) |
| Max non-overlapping intervals | Pick the shortest interval first | \[1,5\], \[4,7\], \[6,10\]: shortest \[4,7\] blocks both others → 1; optimal \[1,5\], \[6,10\] → 2 | Sort by end time |
| Max non-overlapping intervals | Pick the earliest start | \[1,10\], \[2,3\], \[4,5\]: picks \[1,10\] only | Sort by end time |
| 0/1 knapsack | Highest value-to-weight ratio first | Capacity 50; items (w10,v60), (w20,v100), (w30,v120): ratio picks 60 + 100 = 160; optimal 100 + 120 = 220 | DP (Week 11) |
| House robber | Take every other house starting with the larger first house | \[2, 1, 1, 2\]: alternating gives 3; optimal 2 + 2 = 4 | DP (198) |

**Activity selection proof (why "earliest end" is right).** Let G be greedy's first choice (earliest end). Take any optimal set O; its first interval ends no earlier than G. Replacing it with G keeps O valid (G ends earlier, so it cannot clash with the rest) and the same size. Repeat on the remaining intervals. So greedy is optimal.

**Common mistakes.** Dijkstra without the stale-entry check (still correct but slower; with a bad check it can be wrong); marking nodes visited when pushed in Dijkstra (wrong: a shorter path may arrive later); DSU without path compression on large inputs; union returning nothing when you need to know whether a merge happened; assuming greedy works because it passes the sample tests.

#### C. Worked examples

**Example 1: Dijkstra (743 Network Delay Time).**

```js
function networkDelayTime(times, n, k) {
  const adj = Array.from({ length: n + 1 }, () => []);   // nodes are 1..n
  for (const [u, v, w] of times) adj[u].push([v, w]);
  const dist = new Array(n + 1).fill(Infinity);
  dist[k] = 0;
  const heap = new MinHeap((a, b) => a[0] - b[0]);      // [distance, node]
  heap.push([0, k]);
  while (heap.size()) {
    const [d, u] = heap.pop();
    // stale entry: a shorter path was already found
    if (d > dist[u]) continue;
    for (const [v, w] of adj[u]) {
      if (d + w < dist[v]) { dist[v] = d + w; heap.push([dist[v], v]); }
    }
  }
  let ans = 0;
  for (let i = 1; i <= n; i++) ans = Math.max(ans, dist[i]);
  return ans === Infinity ? -1 : ans;
}
```

Dry run: n = 4, k = 2, edges 2→1 (1), 2→3 (1), 3→4 (1). Pop \[0,2\]: dist1 = 1, dist3 = 1. Pop \[1,1\]: no edges. Pop \[1,3\]: dist4 = 2. Pop \[2,4\]. Max = 2.

**Example 2: Union-Find with path compression and union by size.**

```js
class DSU {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.size = new Array(n).fill(1);
    this.components = n;
  }
  find(x) {
    while (this.parent[x] !== x) {
      // path halving: a simple, iterative compression
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  // returns false if already connected
  union(a, b) {
    let ra = this.find(a), rb = this.find(b);
    if (ra === rb) return false;
    if (this.size[ra] < this.size[rb]) [ra, rb] = [rb, ra];
    // attach smaller under larger
    this.parent[rb] = ra;
    this.size[ra] += this.size[rb];
    this.components--;
    return true;
  }
}
// 684 Redundant Connection: the first edge for which union(u, v)
// returns false.
```

**Example 3: Jump Game (55) from brute force to greedy.** Brute force: DFS from index 0 trying every jump length: exponential. DP: `canReach[i]` for all i: O(n²). Greedy observation: if you can reach index i, you can reach every index up to `i + nums[i]`. So track the farthest reachable index in one pass:

```js
function canJump(nums) {
  let farthest = 0;
  for (let i = 0; i < nums.length; i++) {
    // i is unreachable, so is everything after it
    if (i > farthest) return false;
    farthest = Math.max(farthest, i + nums[i]);
  }
  return true;
}
```

Dry run `[3,2,1,0,4]`: i=0 → 3; i=1 → 3; i=2 → 3; i=3 → 3; i=4 > 3 → false. Jump Game II (45) extends this to BFS-like "levels": the number of jumps increases each time `i` passes the end of the current level's reach.

#### D. Patterns

**Pattern 9.1: Dijkstra (weighted shortest path)**

1. *Recognise:* minimum total cost path with non-negative, varying edge costs.
2. *Clues:* "minimum time/cost", "weighted", "network delay", "cheapest", "effort".
3. *From brute force:* enumerating paths is exponential; BFS fails with weights; Dijkstra finalises nodes in cost order.
4. *Why it works:* non-negative weights guarantee the popped node's distance is final.
5. *Template:* Example 1.
6. *Complexity:* O((V + E) log V).
7. *Variations:* grids with cell costs (1631: minimax path), state-expanded nodes `[node, stopsUsed]`.
8. *Inappropriate when:* negative weights, or a hop limit changes optimality (787).

**Pattern 9.2: Union-Find**

1. *Recognise:* group items that become connected; ask whether two items share a group.
2. *Clues:* "redundant connection", "number of connected components", "merge accounts", "operations to connect network", "equivalence".
3. *From brute force:* re-running BFS after each new edge is O(E·(V + E)); DSU is near O(1) per edge.
4. *Why it works:* each set is a tree; roots identify sets; compression keeps trees flat.
5. *Template:* Example 2.
6. *Complexity:* O(α(n)) per operation.
7. *Variations:* map non-integer keys (emails) to indices with a `Map`; Kruskal.
8. *Inappropriate when:* edges are deleted (DSU cannot split sets) or you need paths, not just connectivity.

**Pattern 9.3: Greedy by sorting (exchange argument)**

1. *Recognise:* choose a maximum/minimum number of items under a compatibility rule; ordering items makes decisions local.
2. *Clues:* "maximum number of", "minimum number of arrows/rooms/boats", "assign", "schedule".
3. *From brute force:* try all subsets (2ⁿ) or DP; check whether sorting by one key makes the first choice always safe.
4. *Why it works:* the exchange argument shows the greedy choice can be part of an optimal solution.
5. *Template:* sort by the key the proof needs (end time, size); scan once, taking items that fit.
6. *Complexity:* O(n log n).
7. *Variations:* 455 assign cookies (two sorted pointers), 435/452 intervals, 846 hand of straights (always start a group at the smallest remaining card).
8. *Inappropriate when:* a counterexample exists; items have two competing weights (knapsack → DP).

**Pattern 9.4: Greedy reachability and running balance**

1. *Recognise:* single pass where a running quantity (reach, fuel, last occurrence) decides feasibility.
2. *Clues:* "can you reach the end", "minimum jumps", "gas station", "partition into as many parts as possible".
3. *From brute force:* simulate from every start (O(n²)); one variable summarises everything needed.
4. *Why it works:* problem-specific invariant: e.g. in 134, if the tank goes negative between start s and i, no station in \[s, i\] can be a valid start, so jump to i + 1.
5. *Template:* one loop updating the running quantity; reset or fail when it crosses a threshold.
6. *Complexity:* O(n), O(1).
7. *Variations:* 763 partition labels (extend the current part to the last occurrence of every letter in it), 45 (levels of reach), 678 in Week 12 (range of possible open counts).
8. *Inappropriate when:* choices interact non-locally (DP).

### Week 10 (4–9 Jan): Dynamic programming I

**A. Learning objectives.** By Saturday you can: recognise overlapping subproblems and optimal substructure; turn a brute-force recursion into memoisation, then into a bottom-up table, then into O(1) or O(n) space; define a DP state in one sentence, write its transition and base cases, and choose the iteration order; solve 1-D, unbounded-knapsack and grid DP problems; explain when a greedy or direct formula makes DP unnecessary.

#### B. Concepts

**What DP is.** Dynamic programming is recursion over subproblems where (1) the same subproblems recur many times (*overlapping subproblems*) and (2) the best answer for a problem is built from best answers to its subproblems (*optimal substructure*). Caching each subproblem's answer turns exponential recursion into polynomial time.

**The four-step progression used all week.**

1. *Brute-force recursion:* write `f(state)` in plain words and code it, ignoring efficiency. Draw two levels of its recursion tree and circle repeated states. Repetition = DP opportunity.
2. *Memoisation (top-down):* store each `f(state)` result in a `Map` or array the first time it is computed. Time = (number of distinct states) × (work per state).
3. *Tabulation (bottom-up):* fill a table in an order where every state's dependencies are already filled. No recursion, no stack limits.
4. *Space optimisation:* if row i only depends on rows i−1 (and i−2), keep only those rows or a few variables.

**Defining the state (the hard part).** Write the sentence "`dp[i]` = the answer to the problem restricted to …". Typical restrictions: the first i elements, the suffix starting at i, ending exactly at i, amount j, cell (r, c). If you cannot write the transition from that sentence, the state is missing information; add a dimension (e.g. "and whether I hold a stock").

**Transition.** List the choices available at the state (take/skip, which coin last, come from top or left) and combine the subproblem answers: `max`, `min`, sum (counting), or `||` (feasibility).

**Base cases and answer location.** Base cases are the smallest states that need no choices (`dp[0]`, empty string, first row/column). Say explicitly where the final answer lives: `dp[n]`, `dp[0]`, `max(dp)`, `dp[m-1][n-1]`.

**Top-down vs bottom-up.**

|  | Top-down (memo) | Bottom-up (table) |
| --- | --- | --- |
| Derivation | Direct from the recursion; easiest to get right first | Requires choosing an iteration order |
| States computed | Only reachable ones | All of them |
| Stack risk in JS | Depth up to n; can overflow near 10⁴–10⁵ | None |
| Space optimisation | Hard | Natural |
| Interview advice | Write this first if unsure, then convert | Final answer when time permits |

**When DP is unnecessary.** If a greedy choice is provably safe (Jump Game, activity selection), a direct formula exists, or no subproblem repeats (plain DFS on a tree visits each node once), DP adds nothing. If the problem asks for *all* solutions (not a count or optimum), you usually need backtracking, not DP.

**Common mistakes.** State that is not fully defined ("dp\[i\] = the best": best what, ending where?); wrong iteration order (reading a cell before it is filled); base case off by one (`dp` of length n vs n + 1); using `0` as "unreachable" in min problems (use `Infinity`); counting permutations when combinations were asked (loop order in coin change II); memo keys built with string concatenation in hot loops (use arrays indexed by number when possible).

#### C. Worked examples

**Example 1: Climbing Stairs (70) through all four steps.** Ways to reach step n taking 1 or 2 steps.

```js
// 1. Brute force: O(2^n). The last move was 1 step or 2 steps.
const f = (n) => (n <= 1 ? 1 : f(n - 1) + f(n - 2));

// 2. Memoisation: O(n) time and space. Only n distinct states.
function climbMemo(n, memo = new Map()) {
  if (n <= 1) return 1;
  if (memo.has(n)) return memo.get(n);
  const v = climbMemo(n - 1, memo) + climbMemo(n - 2, memo);
  memo.set(n, v);
  return v;
}

// 3. Tabulation: dp[i] = ways to reach step i. dp[i] depends on dp[i-1],
// dp[i-2], so go left to right.
function climbTab(n) {
  const dp = new Array(n + 1).fill(0);
  dp[0] = 1; dp[1] = 1;
  for (let i = 2; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2];
  return dp[n];
}

// 4. Space optimisation: only the last two values are needed.
function climbStairs(n) {
  let prev2 = 1, prev1 = 1;          // ways(i-2), ways(i-1)
  for (let i = 2; i <= n; i++) [prev2, prev1] = [prev1, prev1 + prev2];
  return prev1;
}
```

The recursion tree of `f(5)` contains `f(3)` twice and `f(2)` three times; that repetition is what memoisation removes.

**Example 2: House Robber (198), deriving the state.**

- *Choice at house i:* rob it (then you cannot rob i−1) or skip it.
- *State:* `dp[i]` = maximum money from houses `0..i`.
- *Transition:* `dp[i] = max(dp[i-1], dp[i-2] + nums[i])`.
- *Base:* `dp[0] = nums[0]`, `dp[1] = max(nums[0], nums[1])`. *Answer:* `dp[n-1]`.

Dry run `[2, 7, 9, 3, 1]`:

| i | nums\[i\] | skip = dp\[i−1\] | rob = dp\[i−2\] + nums\[i\] | dp\[i\] |
| --- | --- | --- | --- | --- |
| 0 | 2 | — | — | 2 |
| 1 | 7 | 2 | 7 | 7 |
| 2 | 9 | 7 | 2 + 9 = 11 | 11 |
| 3 | 3 | 11 | 7 + 3 = 10 | 11 |
| 4 | 1 | 11 | 11 + 1 = 12 | 12 |

Answer 12 (houses 0, 2, 4). House Robber II (213): houses form a circle, so run the same function on `nums[0..n-2]` and `nums[1..n-1]` and take the max.

**Example 3: Coin Change (322), where greedy fails and DP does not.** Coins \[1, 3, 4\], amount 6. State: `dp[a]` = fewest coins to make amount a. Transition: `dp[a] = 1 + min(dp[a - c])` over coins c ≤ a. Base `dp[0] = 0`; unreachable = `Infinity`.

| a | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| dp\[a\] | 0 | 1 | 2 | 1 | 1 | 2 | 2 |

`dp[6] = 1 + min(dp[5], dp[3], dp[2]) = 1 + min(2, 1, 2) = 2` (3 + 3), where greedy gave 3 coins.

```js
function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++)
    for (const c of coins)
      if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1;
  return dp[amount] === Infinity ? -1 : dp[amount];
}
```

O(amount × coins) time, O(amount) space.

**Example 4: why loop order matters (518 Coin Change II).** Counting *combinations* (1+2 and 2+1 are the same): put coins in the **outer** loop so each combination is built in a fixed coin order: `for (const c of coins) for (let a = c; a <= amount; a++) dp[a] += dp[a - c];`. Swapping the loops counts *ordered sequences* (that is a different problem, 377). Dry run coins \[1, 2\], amount 3: after coin 1: dp = \[1,1,1,1\]; after coin 2: dp\[2\] += dp\[0\] → 2, dp\[3\] += dp\[1\] → 2. Answer 2 ({1,1,1}, {1,2}).

**Example 5: grid DP (62 Unique Paths).** `dp[r][c]` = paths to cell (r, c) = `dp[r-1][c] + dp[r][c-1]`; first row and column are 1. Space-optimised to one row: `row[c] += row[c - 1]` for each new row. With obstacles (63), set a blocked cell to 0, including in the first row/column (cells after an obstacle there are unreachable).

#### D. Patterns

**Pattern 10.1: Linear DP (take or skip / extend the previous)**

1. *Recognise:* a sequence; decisions at each element depend on a few previous decisions; asks for max/min/count.
2. *Clues:* "maximum amount", "number of ways", "cannot pick adjacent", "minimum cost to reach the end".
3. *From brute force:* recursion over each index's choices repeats the same suffixes/prefixes; cache by index.
4. *Why it works:* the best answer up to i only depends on the best answers up to i−1 and i−2.
5. *Template:* `dp[i] = combine(dp[i-1], dp[i-2] + value[i])`; compress to two variables.
6. *Complexity:* O(n) time, O(1) space after compression.
7. *Variations:* 746 min cost stairs, 213 circular (two runs), 740 delete-and-earn (reduce to house robber over values), 152 max product (keep both `curMax` and `curMin` because a negative swaps them).
8. *Inappropriate when:* a single greedy pass is provably optimal (121 needs only the running minimum).

**Pattern 10.2: Unbounded knapsack (coins, squares, ways to make a sum)**

1. *Recognise:* reach a target sum using items that can be reused; min count or number of ways.
2. *Clues:* "fewest coins", "number of combinations that make up", "perfect squares", "infinite supply".
3. *From brute force:* recursion `f(remaining)` tries every item; remaining amounts repeat.
4. *Why it works:* the optimal solution for amount a ends with some item c, leaving an optimal solution for a − c.
5. *Template:* Examples 3 and 4.
6. *Complexity:* O(target × items).
7. *Variations:* 279 perfect squares (items = squares ≤ n), 518 (combinations, coins outer), 377 (permutations, amount outer).
8. *Inappropriate when:* each item may be used once (0/1 knapsack, Week 11: iterate amounts downwards).

**Pattern 10.3: Grid DP**

1. *Recognise:* move through a grid in restricted directions (right/down); count paths or minimise cost.
2. *Clues:* "only move down or right", "minimum path sum", "number of unique paths", "obstacles".
3. *From brute force:* DFS over all paths is exponential (C(m+n, m) paths); each cell's answer depends only on two neighbours.
4. *Why it works:* every path into (r, c) comes from (r−1, c) or (r, c−1).
5. *Template:* fill row by row; first row/column handled as base cases.
6. *Complexity:* O(m·n) time, O(n) space with one row.
7. *Variations:* 63 obstacles, 64 min path sum.
8. *Inappropriate when:* movement is in all four directions (cycles: use BFS/Dijkstra).

**Pattern 10.4: String partition DP (prefix feasibility or count)**

1. *Recognise:* split a string into valid pieces; is it possible, or how many ways?
2. *Clues:* "segmented into dictionary words", "number of ways to decode", "partition".
3. *From brute force:* recursion trying every split point re-solves the same suffixes; cache by start or end index.
4. *Why it works:* the prefix `s[0..i)` is valid iff some valid prefix `s[0..j)` is followed by a valid piece `s[j..i)`.
5. *Template:* `dp[0] = true` (or 1); `for i in 1..n: for each valid last piece s[j..i): dp[i] ||= dp[j]` (or `+=`).
6. *Complexity:* 139: O(n² · L) with substring creation, or O(n · maxWordLength) if you bound j; 91: O(n).
7. *Variations:* 91 (one- and two-digit pieces; `'0'` is invalid alone), 131 (palindromic pieces, backtracking for all partitions).
8. *Inappropriate when:* you must list all partitions (backtracking, possibly with memo).

### Week 11 (11–16 Jan): Dynamic programming II and bit manipulation

**A. Learning objectives.** By Saturday you can: solve 0/1 knapsack and subset-sum problems with a 1-D table iterated in the correct direction; define and fill two-sequence tables (LCS, edit distance); solve LIS in O(n²) and explain the O(n log n) method; choose between expand-around-centre and interval DP for palindromes; model "holding/not holding/cooldown" as a state machine; use bitwise operators correctly within JavaScript's 32-bit rules and solve the common XOR and bit-counting problems.

#### B. Concepts: dynamic programming II

**0/1 knapsack and subset sum.** Each item can be used at most once. State `dp[j]` = whether (or how many ways, or the best value with which) capacity/sum j is achievable using the items processed so far. For each item, update `dp[j]` from `dp[j - w]` **iterating j from high to low**, so the value read for `dp[j - w]` still reflects the previous items and the current item is not reused. Iterating upwards turns it into the unbounded knapsack from Week 10.

- *Subset sum (416):* total must be even; target = total / 2; `dp[0] = true`.
- *Target sum (494):* assigning + and − splits nums into P and N with P − N = target and P + N = total, so P = (total + target) / 2. Count subsets summing to P. Return 0 if `(total + target)` is odd or `|target| > total`.
- *Complexity:* O(n × target) time, O(target) space. This is *pseudo-polynomial*: fine for target ≤ \~10⁴–10⁵.

**Two-sequence DP (LCS, edit distance).** State `dp[i][j]` = answer for prefixes `a[0..i)` and `b[0..j)`. Table size (m+1) × (n+1); row 0 and column 0 are the empty-prefix base cases.

- *LCS (1143):* if `a[i-1] === b[j-1]`, `dp[i][j] = dp[i-1][j-1] + 1`; else `max(dp[i-1][j], dp[i][j-1])`.
- *Edit distance (72):* if characters match, `dp[i-1][j-1]`; else `1 + min(dp[i-1][j] (delete), dp[i][j-1] (insert), dp[i-1][j-1] (replace))`. Base: `dp[i][0] = i`, `dp[0][j] = j`.
- *Complexity:* O(m·n) time; O(min(m, n)) space with two rows.

**Longest increasing subsequence (300).** `dp[i]` = length of the LIS ending at i = 1 + max `dp[j]` for j < i with `nums[j] < nums[i]`. O(n²): essential. The O(n log n) method keeps `tails[k]` = the smallest possible tail of an increasing subsequence of length k + 1 and replaces the lower-bound position for each number (binary search from Week 3). Know it and explain why `tails` stays sorted; implement it if time allows.

**Palindromic substrings (5, 647).** Two approaches:

- *Expand around centre:* for each of the 2n − 1 centres, expand while the ends match. O(n²) time, O(1) space. Simplest in interviews.
- *Interval DP:* `pal[i][j] = s[i] === s[j] && (j - i < 2 || pal[i+1][j-1])`, filled by increasing length. O(n²) time and space. Useful when later steps need the table (palindrome partitioning with minimum cuts).

**State-machine DP (309).** When the rules depend on a mode (holding a stock, in cooldown, free), make one variable per mode per day and write transitions between modes: `hold = max(hold, rest - price)`, `sold = hold + price`, `rest = max(rest, prevSold)`. Draw the mode diagram before coding.

**Recognising DP vs not.** DP: optimum/count over choices with repeated subproblems. Not DP: listing all solutions (backtracking), a provably safe greedy choice, or graph shortest paths (BFS/Dijkstra). A quick test: can you name the subproblem in one sentence, and does the brute-force recursion visit it more than once?

#### B2. Concepts: bit manipulation

**Binary and two's complement.** Integers are stored in binary; negative numbers use two's complement (`-x` = `~x + 1`). In JavaScript, numbers are 64-bit floats, but **every bitwise operator converts its operands to signed 32-bit integers** and returns a signed 32-bit result. Values above 2³¹ − 1 wrap around; `1 << 31` is −2147483648.

| Operator | Meaning | Use |
| --- | --- | --- |
| `a & b` | AND | test/clear bits, `n & 1` = odd? |
| `a \| b` | OR | set bits |
| `a ^ b` | XOR | toggle bits; `x ^ x = 0`, `x ^ 0 = x` |
| `~a` | NOT | flips all 32 bits (`~x = -x - 1`) |
| `a << k` | left shift | multiply by 2ᵏ (until bit 31) |
| `a >> k` | arithmetic right shift | divide by 2ᵏ, keeps sign |
| `a >>> k` | logical right shift | unsigned; `x >>> 0` converts to an unsigned 32-bit value |

**Bit recipes (i = bit position, 0 = least significant).** Check: `(x >> i) & 1`. Set: `x | (1 << i)`. Clear: `x & ~(1 << i)`. Toggle: `x ^ (1 << i)`. Remove the lowest set bit: `x & (x - 1)`. Isolate the lowest set bit: `x & -x`. Power of two: `x > 0 && (x & (x - 1)) === 0`.

**XOR reasoning.** XOR is associative and commutative, and every value cancels itself. XOR of all numbers where every value appears twice except one leaves that one (136). XOR of indices 0..n with all values leaves the missing number (268).

**Counting bits.** Brian Kernighan's loop removes one set bit per iteration (`while (x) { x &= x - 1; count++ }`), so it runs once per set bit. For all numbers 0..n (338), DP: `bits[i] = bits[i >> 1] + (i & 1)`.

**Bitmasks.** An integer with n bits can represent a subset of n ≤ 30 items: bit i set ⇔ item i included. Iterate subsets with `for (let mask = 0; mask < (1 << n); mask++)`. Useful for n ≤ 20; deeper bitmask DP is deferred.

**JavaScript pitfalls.** Results of `<<`, `|`, `&`, `^` are signed: use `>>> 0` when the problem expects an unsigned 32-bit answer (for example the classic unsigned form of 190 Reverse Bits). Do not use bitwise operators on values outside the 32-bit range (e.g. 64-bit IDs, sums near 10¹⁰); use arithmetic or `BigInt`. `Math.floor(x / 2)` and `x >> 1` agree for every 32-bit integer, negatives included (both round toward −∞), but differ for values ≥ 2³¹; it is Math.trunc(x / 2) that differs from x >> 1 for negative odd numbers.

#### C. Worked examples

**Example 1: Partition Equal Subset Sum (416) and why j goes downwards.**

```js
function canPartition(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  // odd total cannot split evenly
  if (total % 2) return false;
  const target = total / 2;
  const dp = new Array(target + 1).fill(false);
  dp[0] = true;                                 // empty subset makes 0
  for (const x of nums) {
    // downwards: dp[j - x] is from BEFORE this item
    for (let j = target; j >= x; j--) {
      if (dp[j - x]) dp[j] = true;
    }
  }
  return dp[target];
}
```

Why downwards: take a single item of weight 2 and a target of 4. Iterating j upwards sets `dp[2] = true` from `dp[0]`, then `dp[4] = true` from the just-updated `dp[2]`, which uses the same item twice. Iterating downwards reads `dp[2]` before it is updated for this item, so each item is used at most once.

**Example 2: LCS table dry run (1143), a = "abcde", b = "ace".**

|  | "" | a | c | e |
| --- | --- | --- | --- | --- |
| "" | 0 | 0 | 0 | 0 |
| a | 0 | 1 | 1 | 1 |
| b | 0 | 1 | 1 | 1 |
| c | 0 | 1 | 2 | 2 |
| d | 0 | 1 | 2 | 2 |
| e | 0 | 1 | 2 | 3 |

Each diagonal +1 is a matching character (a, c, e). Answer 3. Edit distance uses the same table shape with different base cases and transitions.

**Example 3: LIS in O(n²), then the O(n log n) idea.**

```js
function lengthOfLIS(nums) {
  // every element alone is an LIS of length 1
  const dp = new Array(nums.length).fill(1);
  let best = 1;
  for (let i = 1; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
    }
    best = Math.max(best, dp[i]);
  }
  return best;
}
```

Faster version, tails dry run on `[10, 9, 2, 5, 3, 7, 101, 18]`: 10 → \[10\]; 9 replaces 10 → \[9\]; 2 → \[2\]; 5 appends → \[2,5\]; 3 replaces 5 → \[2,3\]; 7 → \[2,3,7\]; 101 → \[2,3,7,101\]; 18 replaces 101 → \[2,3,7,18\]. Length 4. `tails` is not an actual subsequence; only its length is meaningful.

**Example 4: bit tricks and the unsigned pitfall.**

```js
// pairs cancel
const singleNumber = (nums) => nums.reduce((acc, x) => acc ^ x, 0);

function hammingWeight(n) {          // 191: count set bits
  let count = 0;
  // each step clears the lowest set bit
  while (n !== 0) { n &= n - 1; count++; }
  return count;
}

function reverseBits(n) {            // 190
  let res = 0;
  for (let i = 0; i < 32; i++) {
    res = (res << 1) | (n & 1);
    n >>>= 1;                        // logical shift: no sign extension
  }
  // >>> 0 reinterprets the bits as unsigned. Today's LeetCode 190 gives
  // even n <= 2^31 - 2, so bit 31 of the result is never set there; the
  // general unsigned version (e.g. n = 4294967293) needs this line.
  return res >>> 0;
}
```

#### D. Patterns

**Pattern 11.1: 0/1 knapsack and subset sum**

1. *Recognise:* choose a subset of items (each once) to hit or approach a target.
2. *Clues:* "partition into two subsets", "assign + or −", "each element used once", "target sum", small total (≤ \~2·10⁴).
3. *From brute force:* 2ⁿ subsets; states (item index, current sum) repeat → O(n × target).
4. *Why it works:* after processing items 0..i, `dp[j]` is exactly whether those items can make j.
5. *Template:* Example 1 (`||` for feasibility, `+=` for counts, `max` for values).
6. *Complexity:* O(n × target) time, O(target) space.
7. *Variations:* 494 (transform to a count of subsets).
8. *Inappropriate when:* the target is huge (10⁹) with small n (meet-in-the-middle or search instead).

**Pattern 11.2: Two-sequence DP**

1. *Recognise:* compare, align or transform two strings/arrays.
2. *Clues:* "common subsequence", "minimum operations to convert", "interleaving", "distinct subsequences".
3. *From brute force:* recursion on `(i, j)` comparing last characters branches 2–3 ways; there are only m·n distinct pairs.
4. *Why it works:* any alignment of the prefixes ends by matching, deleting or inserting the last character.
5. *Template:* (m+1) × (n+1) table; base row/column; fill row by row.
6. *Complexity:* O(m·n).
7. *Variations:* 72 edit distance, 583 delete operation, 115 distinct subsequences (Hard, optional).
8. *Inappropriate when:* the question is about contiguous substrings only (often a sliding window or expand-around-centre).

**Pattern 11.3: Longest increasing subsequence family**

1. *Recognise:* longest chain where each element must exceed (or relate to) the previous one, keeping order.
2. *Clues:* "increasing subsequence", "longest chain", "stack boxes/envelopes".
3. *From brute force:* 2ⁿ subsequences → `dp[i]` = best chain ending at i.
4. *Why it works:* an optimal chain ending at i extends an optimal chain ending at some earlier j.
5. *Template:* Example 3.
6. *Complexity:* O(n²); O(n log n) with tails.
7. *Variations:* Russian doll envelopes (Hard, deferred).
8. *Inappropriate when:* the chain must be contiguous (a simple scan).

**Pattern 11.4: State-machine DP**

1. *Recognise:* a fixed set of modes with rules for moving between them each step.
2. *Clues:* "cooldown", "transaction fee", "at most k transactions", "hold/sell".
3. *From brute force:* recursion with (day, mode) as state; only 2–3 modes, so O(n) states.
4. *Why it works:* the best value for each mode on day i depends only on the modes on day i − 1.
5. *Template:* one variable per mode; compute the new values from the old ones simultaneously (store old values before overwriting).
6. *Complexity:* O(n · modes), O(modes).
7. *Variations:* 309 cooldown, stock with fee (714).
8. *Inappropriate when:* modes are not finite or small.

**Pattern 11.5: XOR and bit tricks**

1. *Recognise:* pairs cancelling, missing/duplicate numbers in a range, powers of two, set-bit counts.
2. *Clues:* "appears twice except", "missing number", "number of 1 bits", "without using + or −", "O(1) extra space".
3. *From brute force:* a hash map uses O(n) space; XOR cancels pairs with O(1).
4. *Why it works:* `x ^ x = 0` and XOR is order-independent.
5. *Template:* fold XOR over the data (and over indices when a range is involved).
6. *Complexity:* O(n), O(1).
7. *Variations:* 268 missing number (also solvable with the sum formula), 338 (bits DP), 371 sum without + (carry = `(a & b) << 1`, sum = `a ^ b`; mind 32-bit wrap in JS).
8. *Inappropriate when:* a clearer arithmetic or hashing solution exists and readability matters more than O(1) space.

### Week 12 (18–23 Jan): Mixed practice and interview readiness

**A. Learning objectives.** By Saturday you can: identify the pattern of an unlabeled problem within 5–8 minutes; run a 45-minute interview with a predictable structure; notice and abandon a failing approach early; explain trade-offs and assumptions clearly; finish one Hard problem with structured hints; know your remaining weak areas and the plan for them.

No new data structures this week. The skill being trained is *retrieval under pressure*: choosing the right tool from 40+ patterns without a topic label.

#### B. Concepts

**What interviewers at product companies score.** Most rubrics have four or five dimensions, weighted roughly equally:

| Dimension | Strong signal | Weak signal |
| --- | --- | --- |
| Problem understanding | Restates, asks about input size, duplicates, empty input, output format | Starts coding immediately |
| Approach and optimisation | States brute force + complexity, identifies the bottleneck, improves it with a reason | Jumps to a remembered solution without justification |
| Coding | Clean names, small helpers, correct edge handling, no long silent pauses | Index soup, repeated code, fixing by trial and error |
| Verification | Walks through an example by hand, tests edge cases before running | Relies on the run button |
| Communication | Thinks aloud, explains trade-offs, takes hints gracefully | Silent, or talks without direction |

**The 45-minute structure.**

| Minutes | Activity | Output |
| --- | --- | --- |
| 0–5 | Clarify: restate, constraints, examples, edge cases | Agreed problem statement and 2–3 test cases |
| 5–15 | Brute force → bottleneck → optimised approach, with complexity | Interviewer agrees with the approach |
| 15–35 | Code, narrating each block | Working code |
| 35–42 | Dry run on an example, then edge cases; fix bugs | Verified code |
| 42–45 | Final complexity, possible improvements, questions | Clean finish |

**Pattern identification without labels.** Run the recognition checklist in section 7 in this order: (1) constraints → target complexity; (2) input shape (sorted? array/string/tree/graph/grid/intervals?); (3) what is asked (count, optimum, all solutions, yes/no, k-th, order); (4) keyword clues; (5) solve a tiny example by hand and watch what *you* do, because your manual method often is the algorithm.

**Recognising when to abandon an approach.** Set mental time boxes. Switch when:

- You have spent 10 minutes on an approach without being able to state its complexity or why it is correct.
- You need more and more special cases to make examples pass (a sign the core idea is wrong).
- A counterexample breaks a greedy idea: do not patch it; move to DP or search.
- The interviewer asks "are you sure this handles X?" twice about the same idea.

Say it out loud: "This greedy fails on \[3, 1, 3\]. I'll fall back to a DP over prefixes, which is O(n²); then see if we can do better." Interviewers reward the switch more than the struggle.

**Communicating trade-offs and assumptions.** Use this shape: "Option A is O(n log n) time and O(1) extra space but modifies the input. Option B is O(n) time and O(n) space with a hash map. Since n is up to 10⁵ and memory is not mentioned, I'll go with B unless you prefer not to allocate." State assumptions explicitly ("I'm assuming the input fits in memory and values fit in 32-bit integers").

**Taking hints.** Hints are normal and only cost a little if you use them well. Repeat the hint in your own words, connect it to the bottleneck, and say what changes in your approach. Never ignore a hint to continue your own idea.

**When you are stuck (the 3-step unstick).** (1) Solve a smaller example fully by hand, writing down each decision. (2) Ask: "What would make this easy?" (sorted input, known answer for a prefix, a lookup table) and try to create that condition. (3) Go back to brute force and ask which repeated work can be stored or skipped.

**Verbal explanation drill.** For every problem this week, record or say a 90-second explanation: problem in one sentence; brute force and its complexity; the key observation; the algorithm; final complexity; one edge case. If you cannot do it in 90 seconds, you do not yet own the solution.

**Complexity drill.** Daily 5-minute drill: for three problems from the tracker, state time and space without looking, including the recursion stack, sort cost and output size. Check against your notes.

#### C. Practice structure for the week

- **Mixed sets without labels.** Section 4 lists the problems by number only; do not open section 5's pattern column until after attempting them.
- **Weak-pattern repair.** Use your scorecards: the two patterns with the lowest independent-solve rate get Day 2's remediation block.
- **One Hard problem.** Choose one you have not solved from 42, 76, 84, 124, 239, 295, 297; work on it with the time-boxed hint ladder from section 8.
- **Two mock interviews and the final assessment.** Conditions in section 9.

#### D. Realistic outcome after 12 weeks

You should be able to solve most Easy problems quickly, about 60–70% of unseen Mediums within 40 minutes, and a minority of Hards with hints. That is a credible level for many product-company coding rounds, though the most selective loops often expect stronger Medium consistency and some Hard performance. Section 12 explains how to keep improving without burning out.

## 4. Day-by-day study schedule

Every study day is about 2 hours, Monday to Saturday; Saturday is always review, assessment or mock; Sunday is rest or catch-up. Problems are listed by LeetCode number; open section 5 for links, hints and purpose.

**How to read each row.**

- **Problems:** **C** = Core (required), **S** = Stretch (same day if time, else Sunday), **O** = Optional (Hard/advanced; skip freely).
- **Time:** minutes for **T**heory · **I**mplementation/dry run · **P**ractice (includes the 10-minute warm-up) · **R**eview of solutions and complexity · **N**otes. The default day is T25 · I15 · P60 · R15 · N5.
- **Warm-up:** the first 10 minutes of Practice. Re-solve the named problem from a blank editor (spaced repetition: +1, +3, +7, +14 days). If it is not done within those 10 minutes, stop, log it as "not retained" and schedule it again in 2 days.
- **Done when:** the completion criteria. Reading theory does not complete a day.

Per-problem time boxes on study days: Easy 15 minutes, Medium 25 minutes, Hard 40 minutes before using the hint ladder in section 8 (assessments, mocks and Week 12 use the longer limits given there). Two Core Mediums at 25 minutes each fill the 50-minute Practice block, which is why the plan puts at most two unfamiliar Mediums on one day. If a Core problem is still unfinished when the block ends, it becomes the first item of that week's Saturday review, replacing one re-solve; log it as "spilled".

### Week 1 (2–7 Nov): Complexity, arrays, hashing

| Day | Topic and theory | Implement / dry run | Problems | Time | Warm-up | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| Mon 2 Nov | Big O/Θ/Ω, cases, loops, recursion trees, amortised cost, auxiliary space, constraints table; JS cost model (6.1) | Six complexity snippets on paper; three versions of Contains Duplicate | C: 1, 217 | T30 · I25 · P45 · R15 · N5 | Diagnostic B2 (349) | All six snippets analysed with reasons; for both problems you stated brute force and its complexity before the optimal solution |
| Tue 3 Nov | Arrays: dynamic arrays, in-place edits, read/write pointers, invariants | Dry run Remove Duplicates on `[0,0,1,1,1,2,2,3,3,4]` with a state table | C: 26, 283 · S: 121 | T20 · I15 · P65 · R15 · N5 | 1 | You can state the loop invariant for 26 and 283 in one sentence each |
| Wed 4 Nov | Hash tables: hashing, collisions, load factor, average vs worst case; Map vs object; Set (6.2) | Frequency counter twice: with `Map` and with a 26-slot array | C: 242, 49 · S: 128 | default | 26 | You can explain why lookup is O(1) average and give the grouping key for 49 two ways (sorted string, count signature) |
| Thu 5 Nov | Frequency counting, bucket-by-count, majority element (Boyer-Moore as an alternative) | Bucket sort by frequency on `[1,1,1,2,2,3]` | C: 169, 347 · S: 36 | default | 49 | 347 solved in O(n) with buckets; heap version noted for Week 7 |
| Fri 6 Nov | Matrix traversal: indices, directions array, boundaries, transpose + reverse | Rotate a 3×3 matrix by hand, writing every swap | C: 54, 48 · O: 73 | T20 · I20 · P60 · R15 · N5 | 347 | Spiral handles 1×n, n×1 and non-square inputs |
| Sat 7 Nov | **Weekly review** | Complexity drill: 10 snippets from your notes | Re-solve: 54 (+1), 242 (+3), 1 (+5), 128 or 217 | P80 · R30 · N10 | — | Scorecard (section 10) and tracker filled; each re-solve under 15 min |
| Sun 8 Nov | Rest or Stretch catch-up |  |  |  |  |  |

**If you fall behind in Week 1:** drop all Stretch and Optional problems; keep Core. If two days behind, merge Thursday into Friday by doing only 347 and 54, and move 169 and 48 to Sunday. Never skip the Saturday review; shorten it to three re-solves.

### Week 2 (9–14 Nov): Two pointers, sliding window, prefix sums

| Day | Topic and theory | Implement / dry run | Problems | Time | Warm-up | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| Mon 9 Nov | Subarray vs substring vs subsequence; opposite-end two pointers; JS strings (6.4) | Palindrome checker that skips non-alphanumerics; dry run 167 | C: 125, 167 · S: 15 | default | 48 | You can explain why moving the smaller-sum pointer never skips the answer |
| Tue 10 Nov | Same-direction partitioning (Dutch flag); Kadane derived from brute force | Dutch flag trace on `[2,0,2,1,1,0]`; Kadane trace on `[-2,1,-3,4,-1,2,1,-5,4]` | C: 11, 53 · S: 75 · O: 42 | T20 · I20 · P60 · R15 · N5 | 167 | Kadane written from the "best ending here" sentence, not from memory |
| Wed 11 Nov | Sliding window: fixed and variable, monotonicity precondition | Fixed window max-sum of size k; trace table for 3 on `"pwwkew"` | C: 643, 3 · S: 424 | default | 11 | You can state the window-valid condition for 3 and 424 before coding |
| Thu 12 Nov | Sliding window with count arrays; minimum-length windows | Compare two 26-count arrays incrementally (for 567) | C: 567, 209 · S: 424 (if not done) · O: 76 | default | 3 | 209 updates the answer inside the shrink loop; you can explain why |
| Fri 13 Nov | Prefix sums, prefix + hash map, prefix/suffix products, difference arrays | Build prefix array; dry run 560 on `[1,-1,1]`, k = 1; 3 range updates with a difference array | C: 303, 560 · S: 238 · O: 1109 | T30 · I20 · P50 · R15 · N5 | 209 | You can explain why sliding window fails on 560 and why the map starts with `{0: 1}` |
| Sat 14 Nov | **Assessment 1** (section 9) | — | A1 set: 1 cold re-solve + 1456 + 974 | 90 test · R25 · N5 | — | Score logged; remediation booked if below pass mark |
| Sun 15 Nov | Rest or Stretch catch-up |  |  |  |  |  |

**If you fall behind in Week 2:** skip 643 and 303 (the easiest Core) and Stretch; keep 3, 567, 560 and 53, which carry the week's patterns. Take Assessment 1 on schedule even if behind; it tells you what to repair.

### Week 3 (16–21 Nov): Binary search and sorting

| Day | Topic and theory | Implement / dry run | Problems | Time | Warm-up | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| Mon 16 Nov | Binary search as "first true"; half-open vs closed intervals; invariants and termination; lower/upper bound | Write lowerBound and upperBound from scratch; test on empty, single, all-equal, absent-target arrays; then submit your lowerBound as 35 and a closed-interval version as 704 before starting 34 | C: 704, 35, 34 | T30 · I25 · P45 · R15 · N5 | 560 | 34 solved with two bound calls, no special-case branches |
| Tue 17 Nov | Boundary search on predicates; rotated arrays: which half is sorted | Dry run 153 on `[4,5,6,7,0,1,2]`, `[1,2,3]`, `[2,1]` | C: 278, 153 · S: 33 | default | 34 | You can justify comparing `nums[mid]` with `nums[hi]` |
| Wed 18 Nov | Binary search on the answer: monotone feasibility, choosing lo/hi | Write `hoursAt(k)` for Koko and trace the search for `piles=[3,6,7,11], h=8` | C: 875, 1011 · O: 410 | default | 153 | For both problems you wrote the feasibility function and the bounds before the loop |
| Thu 19 Nov | 2-D matrix as a flattened array; peak finding (compare with neighbour) | Map index i ↔ (i / n, i % n) on a 3×4 matrix | C: 74, 162 · S: 33 (if not done) | default | 875 | 162 explained: why moving towards the larger neighbour always finds a peak |
| Fri 20 Nov | Merge sort, quicksort (random pivot, partition), stability, comparators, sort vs hash vs binary search (6.3, 6.8) | Implement merge sort and quicksort from memory; sort `[{name, age}]` by age then name | C: 88, 912 · S: 179 | T30 · I30 · P45 · R10 · N5 | 1011 | 912 passes with your own merge sort; comparator returns numbers, not booleans |
| Sat 21 Nov | **Weekly review** | Pattern quiz: classify the 15 statements in section 7.3 | Re-solve: 33 or 153 (+4), 34 (+5), 3 (+10), 49 (+17), 560 (+8) | P85 · R25 · N10 | — | Scorecard filled; any re-solve over 20 min booked again for Tuesday |
| Sun 22 Nov | Rest or Stretch catch-up |  |  |  |  |  |

**If you fall behind in Week 3:** binary search is non-negotiable; sorting theory can shrink. Drop 704 and 35 (do them as 5-minute warm-ups instead), skip 179, and if needed implement only merge sort on Friday (quicksort can wait until the Week 4 Sunday).

### Week 4 (23–28 Nov): Linked lists, stacks, queues, monotonic stack

| Day | Topic and theory | Implement / dry run | Problems | Time | Warm-up | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| Mon 23 Nov | Linked-list nodes, dummy nodes, pointer-rewiring rule, reversal (iterative + recursive) | Write `fromArray`/`toArray` helpers (6.6); reverse `1→2→3→4` on paper both ways | C: 206, 21 · S: 203 | T25 · I20 · P55 · R15 · N5 | 912 | 206 written both ways; you can state the space difference |
| Tue 24 Nov | Fast/slow pointers: middle, cycle detection, k-th from end, cycle-start proof | Draw Floyd's pointers on a 6-node list with a cycle of length 4 | C: 876, 141, 19 · O: 142 | default | 206 (recursive) | You can explain why fast meets slow inside a cycle |
| Wed 25 Nov | Combining list techniques; LRU design: Map + doubly linked list with sentinels | On paper, run 6 LRU operations (capacity 2) and draw the list after each | C: 143, 146 · O: 92 | T20 · I20 · P65 · R10 · N5 | 19 | 146 passes with your own doubly linked list; 143 sets the new tail's `next` to null |
| Thu 26 Nov | Stacks; queues with a head pointer or two stacks; deque; min-stack (6.5) | Implement `Queue` with a head pointer and a `Deque` (circular buffer) | C: 20, 155 · S: 150, 232 | default | 21 | You can explain why `shift()` breaks BFS complexity and why 232 is amortised O(1) |
| Fri 27 Nov | Monotonic stack: next greater/smaller, previous variants, widths; monotonic queue preview | Dry run `nextGreater([2,1,5,3,6])`; adapt it for previous-smaller | C: 496, 739 · S: 84 | T30 · I20 · P50 · R15 · N5 | 146 | 739 stores indices; you can state why each index is pushed and popped once |
| Sat 28 Nov | **Assessment 2** (section 9) | — | A2 set: 1 cold re-solve + 82 + 901 | 90 test · R25 · N5 | — | Score logged; Week 4 milestone check (section 10) |
| Sun 29 Nov | Rest or Stretch catch-up |  |  |  |  |  |

**If you fall behind in Week 4:** keep 206, 21, 19, 143, 146, 20, 155, 739. Drop 876 (143 already uses the middle-finding step), 203, 232 and 84. If LRU takes the whole of Wednesday, move 143 to Sunday.

### Week 5 (30 Nov – 5 Dec): Recursion and backtracking

| Day | Topic and theory | Implement / dry run | Problems | Time | Warm-up | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| Mon 30 Nov | Recursive contract, base cases, call stack and depth limits, recursion trees, recursion vs iteration | Draw the recursion tree of `fib(5)` and count calls; rewrite `flatten` (diagnostic B5) | C: 509, 50 · S: 24 | T30 · I20 · P50 · R15 · N5 | 739 | You can derive the complexity of 50 from its recursion tree |
| Tue 1 Dec | Backtracking: choose/explore/unchoose; subsets two ways; duplicate skipping | Draw the subset tree for `[1,2,3]`; fill the 90 dry-run table yourself for `[1,2,2]` | C: 78, 90 | T30 · I20 · P50 · R15 · N5 | 50 | Both subset methods written; you can explain `i > start` in the skip rule |
| Wed 2 Dec | Permutations with a `used` array; combinations with a start index and pruning | Draw the permutation tree for `[1,2,3]` with `used` flags at each node | C: 46, 77 · O: 47 | default | 90 | 77 includes the pruning bound; complexity of 46 stated as O(n · n!) |
| Thu 3 Dec | Combination Sum: reuse vs no reuse, sort + break pruning; letter combinations | State table for 39 with `[2,3,6,7]`, target 7 | C: 39, 17 · S: 40 | default | 77 | You can explain why 39 recurses with `i` and 40 with `i + 1` plus duplicate skipping |
| Fri 4 Dec | Grid and string backtracking; mark and restore; counting-state generation | Run Word Search for "ABC" on a 3×3 board, showing marks and restores | C: 22, 79 · S: 131 · O: 51 | default | 39 | 79 restores every cell it marks; 22's state is (open, close) |
| Sat 5 Dec | **Weekly review + Mock 1** (section 9) | — | Mock 1 (45 min + 15 min feedback); re-solve 90 (+4), 146 (+10), 34 (+19) | Mock 60 · P45 · N15 | — | Mock scored with the rubric; scorecard filled |
| Sun 6 Dec | Rest or Stretch catch-up |  |  |  |  |  |

**If you fall behind in Week 5:** the four patterns live in 78, 46, 39 and 79; keep those. Drop 509, 24, 131 and 17, and do 77 as a later warm-up. Do not skip Mock 1; it is the first realistic signal of interview readiness.

### Week 6 (7–12 Dec): Trees and BSTs

| Day | Topic and theory | Implement / dry run | Problems | Time | Warm-up | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| Mon 7 Dec | Tree terms, LeetCode array format, recursive DFS orders, iterative inorder; the three question types | Draw `[3,9,20,null,null,15,7]`; trace iterative preorder and inorder | C: 104, 226, 94 · S: 100 | T30 · I20 · P50 · R15 · N5 | 79 | 94 written iteratively; each problem labelled children / ancestors / levels |
| Tue 8 Dec | BFS level order with a head pointer; level size snapshot; early exit for minimum depth | Trace level order on the same tree, showing the queue after each level | C: 102, 199 · S: 111 | default | 94 | 199 derived from 102 by changing one line |
| Wed 9 Dec | Bottom-up recursion + global answer: height, diameter, balance | Dry run diameter on `[1,2,3,4,5]` | C: 543, 110 · S: 572 · O: 124 | default | 102 | You can explain why 543 is O(n) and the naive version O(n²) |
| Thu 10 Dec | Top-down parameters; path collection with backtracking; LCA in a binary tree | Trace 236's return values on `[3,5,1,6,2,0,8]` for p = 6, q = 2 | C: 112, 236 · S: 113, 1448 | default | 543 | You can state 236's contract: what the function returns in each of the 3 cases |
| Fri 11 Dec | BST property, inorder = sorted, validation by bounds, kth smallest, LCA in a BST, construction from traversals | Validate `[5,4,6,null,null,3,7]` with bounds; build the tree for preorder `[3,9,20,15,7]`, inorder `[9,3,15,20,7]` by hand | C: 98, 230 · S: 235, 105 | T25 · I20 · P55 · R15 · N5 | 236 | 98 uses bounds (or inorder), not child comparisons |
| Sat 12 Dec | **Assessment 3** (section 9) | — | A3 set: 1 cold re-solve + 216 + 1026 | 90 test · R25 · N5 | — | Score logged; Phase 2 review in the scorecard |
| Sun 13 Dec | Rest or Stretch catch-up |  |  |  |  |  |

**If you fall behind in Week 6:** keep one problem per question type: 104, 102, 543, 236, 98, plus 94 for iteration. Drop 100, 111, 572, 1448 and 235. Construction (105) can move to the Week 7 Sunday.

### Week 7 (14–19 Dec): Heaps, intervals, tries

| Day | Topic and theory | Implement / dry run | Problems | Time | Warm-up | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| Mon 14 Dec | Heap property, array layout, sift up/down, O(n) heapify; no native PQ in JS | Write `MinHeap` with a comparator from scratch (6.13); push 5, 3, 8, 1 and pop twice, checking the array | C: 1046, 215 · S: 703 | T25 · I30 · P45 · R15 · N5 | 98 | Your heap passes both problems without copying from notes |
| Tue 15 Dec | Top-K decision table (sort / heap / quickselect / bucket); k-way merge | Merge 3 short sorted arrays with a heap of `[value, listIndex, position]` | C: 23 · S: 973 | default | 347 rewritten with a heap | You can justify heap size k (not n) and state O(N log k) for 23 |
| Wed 16 Dec | Two heaps for a running median; heap-driven simulation; 621's counting formula | Trace a running median for the stream 5, 15, 1, 3 with both heaps | C: 621 · S: 295 | T25 · I25 · P50 · R15 · N5 | 215 | 621 explained both by formula and by simulation |
| Thu 17 Dec | Intervals: endpoint rules, merge, insert, sort by end, sweep for maximum overlap | Merge dry run; sweep on `[[0,30],[5,10],[15,20]]` to get 2 rooms | C: 56, 435 · S: 57 · O: 452, 1094 | default | 23 | You can explain why 435 sorts by end, using the activity-selection proof |
| Fri 18 Dec | Tries: insert, search, startsWith; Map vs 26-array children; wildcard search by DFS | Insert "app", "apple", "bat" and draw the trie with `isEnd` flags | C: 208, 211 · O: 212 | default | 56 | 211 handles `.` at any position, including the last |
| Sat 19 Dec | **Weekly review + Mock 2** (section 9) | — | Mock 2; re-solve 23 (+4), 236 (+9), 39 (+16) | Mock 60 · P45 · N15 | — | Mock scored; scorecard filled |
| Sun 20 Dec | Rest or Stretch catch-up |  |  |  |  |  |

**If you fall behind in Week 7:** keep 215, 23, 56, 435 and 208. Move 621 to Sunday, use 1046 and 973 as later warm-ups, and skip all Optional problems.

### Week 8 (21–26 Dec): Graphs I

Holiday note: Fri 25 Dec is Christmas. Day 5 is scheduled on **Sun 27 Dec** instead; Assessment 4 stays on Sat 26 Dec (it does not depend on Day 5 topics).

| Day | Topic and theory | Implement / dry run | Problems | Time | Warm-up | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| Mon 21 Dec | Graph terms, representations, building adjacency lists; grids as implicit graphs; visited rules (6.15) | Build an adjacency list from `[[0,1],[1,2],[3,4]]` (undirected) and run iterative DFS on it | C: 733, 200 · S: 695 | T30 · I20 · P50 · R15 · N5 | 208 | 200 solved with both DFS and BFS; you can explain marking on push/enqueue |
| Tue 22 Dec | Components on lists and matrices; cloning with a node map | Count components of Monday's graph by BFS and by DFS | C: 1971, 547 · S: 133 | default | 200 (BFS) | You can say which representation each problem gives you and why it matters |
| Wed 23 Dec | BFS shortest paths; multi-source BFS; 8-direction moves | Rebuild the rotting-oranges table from section 3 yourself | C: 994, 1091 · S: 542 · O: 127 | default | 547 | 994 processes one minute per BFS level and returns −1 correctly |
| Thu 24 Dec | Directed graphs: three-state cycle detection; topological sort (Kahn and DFS) | Kahn dry run on the 4-course example; three-state DFS on a diamond and on a 3-cycle | C: 207, 210 · O: 802 | T30 · I25 · P45 · R15 · N5 | 994 | You can explain why two states are not enough for directed cycles |
| Fri 25 Dec | Holiday (Day 5 moves to Sunday) |  |  |  |  |  |
| Sat 26 Dec | **Assessment 4** (section 9) | — | A4 set: 1 cold re-solve + 1642 + 1376 | 90 test · R25 · N5 | — | Score logged; Week 8 milestone check (section 10) |
| Sun 27 Dec | Bipartite check by 2-colouring; reverse search from targets (borders, oceans) | 2-colour a 4-cycle and a triangle by hand | C: 785, 417 · S: 130 | default | 210 | 785 handles disconnected graphs; 417 runs two searches from the oceans |

**If you fall behind in Week 8:** keep 200, 547, 994, 207, 210 and 785. Drop 733, 1971, 1091 and 130. Graphs are a high-frequency topic; protect at least 90 minutes on each of Mon–Thu.

### Week 9 (28 Dec – 2 Jan): Graphs II and greedy

Holiday note: Fri 1 Jan is New Year's Day. Day 5 moves to **Sun 3 Jan**; the Saturday review and Mock 3 stay on Sat 2 Jan.

| Day | Topic and theory | Implement / dry run | Problems | Time | Warm-up | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| Mon 28 Dec | Dijkstra: relaxation, non-negative weights, lazy deletion; when to use BFS or Bellman-Ford instead | Dijkstra by hand on a 5-node weighted graph: table of `dist` and heap contents per step | C: 743 · S: 1631 | T30 · I25 · P45 · R15 · N5 | 207 | You can explain the stale-entry check and why visited-on-push is wrong here |
| Tue 29 Dec | Union-Find: path compression, union by size; DSU vs BFS/DFS | Write `DSU` from memory (6.16) | C: 684 · S: 721 | default | 547 rewritten with DSU | 684 solved with `union` returning a boolean |
| Wed 30 Dec | MST: Kruskal with DSU, Prim with heap or O(V²) array | Kruskal by hand on 5 weighted edges | C: 1584 · O: 787 | default | 743 | You can say why Prim's array version suits 1584's complete graph |
| Thu 31 Dec | Greedy: choice property, exchange argument, counterexamples; reachability | Break three greedy ideas from the section 3 table by hand; write the earliest-end proof | C: 55, 45 · S: 455 | T25 · I15 · P65 · R10 · N5 | 684 | You can give a counterexample for "largest coin first" |
| Fri 1 Jan | Holiday (Day 5 moves to Sunday) |  |  |  |  |  |
| Sat 2 Jan | **Weekly review + Mock 3** (section 9) | — | Mock 3; re-solve 743 (+5), 210 (+9), 215 (+19) | Mock 60 · P45 · N15 | — | Mock scored; scorecard filled |
| Sun 3 Jan | Greedy with a running quantity: gas station, partition labels, hand of straights | Trace 134's reset rule on `gas=[1,2,3,4,5], cost=[3,4,5,1,2]` | C: 763, 134 · S: 846 | default | 55 | You can prove 134's "skip to i + 1" rule in two sentences |

**If you fall behind in Week 9:** keep 743, 684, 55, 45 and 763. 1584 becomes optional; 455 can be skipped. Do not start DP (Week 10) with graphs unfinished: use the Week 10 Sunday to finish 134 and 1584 if needed.

### Week 10 (4–9 Jan): Dynamic programming I

| Day | Topic and theory | Implement / dry run | Problems | Time | Warm-up | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| Mon 4 Jan | What DP is; the four-step progression; state, transition, base case, answer location; top-down vs bottom-up | Write all four versions of 70; draw `f(5)`'s recursion tree and circle repeated states | C: 70, 746 | T35 · I20 · P45 · R15 · N5 | 509 rewritten as memo, then table | 746 written in all four steps, ending in O(1) space |
| Tue 5 Jan | Linear take/skip DP; writing the state sentence; circular variant | Fill the House Robber table for `[2,7,9,3,1]` yourself | C: 198, 213 · O: 740 | default | 746 | 213 reuses your 198 function on two ranges |
| Wed 6 Jan | Unbounded knapsack: minimum count and number of ways; loop order | Coin Change table for `[1,3,4]`, amount 6; Coin Change II on `[1,2]`, amount 3, with both loop orders | C: 322, 518 · O: 279 | T30 · I25 · P45 · R15 · N5 | 198 | You can explain why swapping 518's loops counts ordered sequences |
| Thu 7 Jan | Grid DP; compressing to one row | Unique Paths 3×3 table, then the one-row version | C: 62, 64 · S: 63 | default | 322 | 64 solved in O(n) extra space |
| Fri 8 Jan | String partition DP; tracking both max and min | Word Break table for `"leetcode"` with `["leet","code"]`; decode ways for `"226"` and `"06"` | C: 139, 91 · S: 152 | default | 213 | 91 handles `'0'` correctly; 152 explained with a negative example |
| Sat 9 Jan | **Assessment 5** (section 9) | — | A5 set: 1 cold re-solve + 1319 + 343 | 90 test · R25 · N5 | — | Score logged |
| Sun 10 Jan | Rest or Stretch catch-up |  |  |  |  |  |

**If you fall behind in Week 10:** keep 70, 198, 322, 62 and 139, one per DP shape. Use 746 and 213 as later warm-ups; move 518 and 91 to Sunday. If DP feels opaque, spend Sunday redoing Monday's four-step exercise on 198 before moving on.

### Week 11 (11–16 Jan): Dynamic programming II and bit manipulation

| Day | Topic and theory | Implement / dry run | Problems | Time | Warm-up | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| Mon 11 Jan | 0/1 knapsack and subset sum; downward iteration; transforming Target Sum | 416 table for `[1,5,11,5]`; reproduce the reuse bug with an upward loop | C: 416 · S: 494 | T30 · I25 · P45 · R15 · N5 | 139 | You can derive P = (total + target) / 2 for 494 |
| Tue 12 Jan | Two-sequence DP: LCS and edit distance; two-row space optimisation | Fill the LCS table for "abcde"/"ace" and the edit-distance table for "horse"/"ros" | C: 1143, 72 | T25 · I25 · P50 · R15 · N5 | 416 | You can name the operation behind each of the three edit-distance transitions |
| Wed 13 Jan | LIS: O(n²) DP and the tails method; palindromes: expand-around-centre vs interval DP | Tails trace for `[10,9,2,5,3,7,101,18]`; expand all centres of `"babad"` | C: 300, 5 · S: 647 | default | 1143 | 300 solved in O(n²); tails method explained aloud |
| Thu 14 Jan | State-machine DP; DP recognition drill (DP, greedy, backtracking or graph?) | Draw the hold / sold / rest diagram for 309 | C: 309 + cold re-solves 322 (+8), 62 (+7) | default | 72 | 309 written from the diagram; both re-solves under 20 minutes |
| Fri 15 Jan | Bits: two's complement, operators, recipes, XOR, JS 32-bit rules (6.18) | Print `(5).toString(2)`, `(-5 >>> 0).toString(2)`, `1 << 31`, `(1 << 31) >>> 0`; write `isPowerOfTwo` | C: 136, 191, 338, 268 · O: 190, 371 | T25 · I15 · P65 · R10 · N5 | 300 | You can explain when `>>> 0` is needed (an unsigned 32-bit result with bit 31 set) and why today's 190, which takes even n ≤ 2³¹ − 2, never produces one |
| Sat 16 Jan | **Weekly review + Mock 4** (section 9) | — | Mock 4; re-solve 416 (+5), 139 (+8), 743 (+19), 200 (+26) | Mock 60 · P50 · N10 | — | Mock scored; scorecard filled |
| Sun 17 Jan | Rest or Stretch catch-up |  |  |  |  |  |

**If you fall behind in Week 11:** keep 416, 1143, 72, 300, 136 and 191. Move 309 to Sunday, use 338 and 268 as Week 12 warm-ups, and do 5 during Week 12's repair block.

### Week 12 (18–23 Jan): Mixed practice and interview readiness

Problems this week are unlabeled on purpose: do not look up their pattern in section 5 until after your attempt.

| Day | Topic and theory | Implement / dry run | Problems | Time | Warm-up | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| Mon 18 Jan | Re-read section 3, Week 12 (rubric, 45-minute structure, recognition checklist) | — | Mixed set A, timed 25 min each: 438, 287, 853 | T15 · P80 · R20 · N5 | 309 | For each problem: pattern named within 8 minutes (or logged as missed) and a 90-second explanation recorded |
| Tue 19 Jan | Weak-pattern repair: pick the two weakest patterns from your scorecards | Re-solve two tracker problems from each weak pattern, cold | Mixed set B: 981, 380 | Repair 45 · P50 · R20 · N5 | — | Both weak patterns re-solved without hints |
| Wed 20 Jan | **Mock 5** (section 9) | — | Mock 5; then 678 timed (30 min) | Mock 60 · P35 · R20 · N5 | — | Mock scored; 678 explained with the open-count range idea |
| Thu 21 Jan | One Hard problem with the hint ladder; complexity drill | — | One of 42, 76, 84, 124, 239, 295, 297 not yet solved | P60 · drill 20 · R30 · N10 | — | Hard solved (hints allowed) and re-explained without notes; drill: 10 tracker problems, time and space stated correctly |
| Fri 22 Jan | **Mock 6** (section 9) + verbal drill | 90-second explanations for 5 tracker problems | Mock 6 | Mock 60 · verbal 30 · R20 · N10 | — | Mock scored; explanations under 90 seconds each |
| Sat 23 Jan | **Final Assessment 6** (section 9) | — | A6 set: 1 cold re-solve + 909 + 1049 + 1268 | 100 test · R20 | — | Final scorecard and Week 12 milestone check |
| Sun 24 Jan | Final self-assessment (section 11) and next-month plan (section 12), 60 minutes |  |  |  |  | Checklist completed honestly; maintenance plan scheduled |

**If you fall behind in Week 12:** skip Thursday's Hard problem first, then mixed set B. Never skip the mocks or the final assessment: they produce the evidence for section 11.

## 5. Curated LeetCode problem bank

The bank holds the 173 curriculum problems (114 Core, 39 Stretch, 20 Optional), in the order you meet them. Assessment and mock problems are listed separately in section 9 so they stay unseen. No problem requires LeetCode Premium. Every number, title, URL and difficulty in this bank and in sections 1 and 9 was checked on 26 Oct 2026 against the doocs/leetcode mirror of LeetCode (current to Weekly Contest 525), and nine were also checked on leetcode.com. LeetCode occasionally re-rates or rewrites problems (190 changed recently), so if a live page differs, trust the live page.

**Columns.** *When* = week and day (W3D2 = Week 3, Day 2). *Tier* = C/S/O as in section 4. *Role* = position in the pattern ladder: **Intro** (teaches the pattern), **Core** (the canonical problem), **Transfer** (same idea in a new setting), **Challenge** (harder, optional value). Every problem is a first-time attempt on its scheduled day; it then becomes a revision problem in the tracker (section 8). Read the hint only after 10 minutes of independent thinking.

### Phase 1: Weeks 1–3

| # | Problem | Diff | When | Tier · Role | Pattern | Prerequisite | Why it is worth solving | Hint (key observation) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | [Two Sum](https://leetcode.com/problems/two-sum/) | Easy | W1D1 | C · Intro | Hash lookup | Map | The canonical brute force → hash map optimisation | Store value → index; check for the complement before inserting |
| 217 | [Contains Duplicate](https://leetcode.com/problems/contains-duplicate/) | Easy | W1D1 | C · Intro | Hash set | Set | Same output with O(n²), O(n log n), O(n) solutions | Compare the sort and Set trade-offs aloud |
| 26 | [Remove Duplicates from Sorted Array](https://leetcode.com/problems/remove-duplicates-from-sorted-array/) | Easy | W1D2 | C · Intro | Read/write pointers | Arrays | Teaches an in-place invariant | Compare with the last *kept* value |
| 283 | [Move Zeroes](https://leetcode.com/problems/move-zeroes/) | Easy | W1D2 | C · Core | Read/write pointers | 26 | Stable in-place partition | Write non-zeros forward, then fill zeros (or swap) |
| 121 | [Best Time to Buy and Sell Stock](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/) | Easy | W1D2 | S · Transfer | Running minimum | Arrays | One pass with a running state | Track the cheapest price so far; profit if sold today |
| 242 | [Valid Anagram](https://leetcode.com/problems/valid-anagram/) | Easy | W1D3 | C · Intro | Frequency count | Map / 26-array | Counting beats sorting | Increment for s, decrement for t; all counts end at zero |
| 49 | [Group Anagrams](https://leetcode.com/problems/group-anagrams/) | Medium | W1D3 | C · Core | Group by canonical key | 242 | Choosing a key that identifies a group | Sorted letters, or 26 counts joined with `#` |
| 128 | [Longest Consecutive Sequence](https://leetcode.com/problems/longest-consecutive-sequence/) | Medium | W1D3 | S · Challenge | Hash set, sequence starts | Set | O(n) by expanding only from sequence starts | Start counting only at x where x − 1 is absent |
| 169 | [Majority Element](https://leetcode.com/problems/majority-element/) | Easy | W1D4 | C · Intro | Frequency / Boyer-Moore | Map | Count-based reasoning plus an O(1)-space idea | Count with a Map first; then votes that cancel |
| 347 | [Top K Frequent Elements](https://leetcode.com/problems/top-k-frequent-elements/) | Medium | W1D4 | C · Core | Bucket by frequency | Frequency map | O(n) top-K; redone with a heap in W7 | Bucket index = count; read buckets from high to low |
| 36 | [Valid Sudoku](https://leetcode.com/problems/valid-sudoku/) | Medium | W1D4 | S · Transfer | Keyed hash sets | Set | Several sets keyed by row, column, box | Box index = `Math.floor(r/3)*3 + Math.floor(c/3)` |
| 54 | [Spiral Matrix](https://leetcode.com/problems/spiral-matrix/) | Medium | W1D5 | C · Core | Boundary walk | Matrix | Shrinking boundaries in O(1) space | Check top ≤ bottom and left ≤ right before the return passes |
| 48 | [Rotate Image](https://leetcode.com/problems/rotate-image/) | Medium | W1D5 | C · Core | Transpose + reverse | Matrix | In-place matrix transform | Transpose, then reverse each row |
| 73 | [Set Matrix Zeroes](https://leetcode.com/problems/set-matrix-zeroes/) | Medium | W1D5 | O · Challenge | In-place markers | Matrix | Using the input as storage | First row/column as flags; handle them last |
| 125 | [Valid Palindrome](https://leetcode.com/problems/valid-palindrome/) | Easy | W2D1 | C · Intro | Two pointers (ends) | Strings | Skip rules inside a two-pointer loop | Advance past non-alphanumerics; compare lower-case |
| 167 | [Two Sum II - Input Array Is Sorted](https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/) | Medium | W2D1 | C · Core | Two pointers (sorted) | 1 | Sorted input removes the need for a map | Sum too small → l++; too large → r−− |
| 15 | [3Sum](https://leetcode.com/problems/3sum/) | Medium | W2D1 | S · Transfer | Sort + two pointers | 167 | Reduce k-sum to 2-sum; deduplicate | Fix i; two-pointer the rest; skip equal values |
| 11 | [Container With Most Water](https://leetcode.com/problems/container-with-most-water/) | Medium | W2D2 | C · Core | Two pointers with proof | 167 | Proving which pointer to move | Move the shorter wall; the taller one cannot help |
| 53 | [Maximum Subarray](https://leetcode.com/problems/maximum-subarray/) | Medium | W2D2 | C · Core | Kadane | Prefix idea | First one-variable DP | Extend or restart at each index |
| 75 | [Sort Colors](https://leetcode.com/problems/sort-colors/) | Medium | W2D2 | S · Transfer | Dutch national flag | 283 | Three-way in-place partition | Do not advance `mid` after swapping with `high` |
| 42 | [Trapping Rain Water](https://leetcode.com/problems/trapping-rain-water/) | Hard | W2D2 | O · Challenge | Two pointers / prefix max | 11 | Water = min(maxLeft, maxRight) − height | Move the side with the smaller max |
| 643 | [Maximum Average Subarray I](https://leetcode.com/problems/maximum-average-subarray-i/) | Easy | W2D3 | C · Intro | Fixed window | Prefix sums | Rolling sum | Add `a[r]`, subtract `a[r − k]` |
| 3 | [Longest Substring Without Repeating Characters](https://leetcode.com/problems/longest-substring-without-repeating-characters/) | Medium | W2D3 | C · Core | Variable window | Map | The canonical variable window | Jump `l` past the last copy only if it is inside the window |
| 424 | [Longest Repeating Character Replacement](https://leetcode.com/problems/longest-repeating-character-replacement/) | Medium | W2D3 | S · Transfer | Window + counts | 3 | Validity as an inequality | Valid while `len − maxCount ≤ k` |
| 567 | [Permutation in String](https://leetcode.com/problems/permutation-in-string/) | Medium | W2D4 | C · Core | Fixed window of counts | 242 | Sliding count comparison | Track how many letters match instead of comparing 26 counts |
| 209 | [Minimum Size Subarray Sum](https://leetcode.com/problems/minimum-size-subarray-sum/) | Medium | W2D4 | C · Core | Variable window (minimum) | 3 | Update the answer inside the shrink loop | Positive numbers keep the window monotone |
| 76 | [Minimum Window Substring](https://leetcode.com/problems/minimum-window-substring/) | Hard | W2D4 | O · Challenge | Window + need counts | 567, 209 | The hardest standard window | Track a `missing` count; shrink while it is 0 |
| 303 | [Range Sum Query - Immutable](https://leetcode.com/problems/range-sum-query-immutable/) | Easy | W2D5 | C · Intro | Prefix sums | Arrays | `pre[r+1] − pre[l]` | Build once in the constructor |
| 560 | [Subarray Sum Equals K](https://leetcode.com/problems/subarray-sum-equals-k/) | Medium | W2D5 | C · Core | Prefix sum + map | 303, 1 | Works with negative numbers | Count earlier prefixes equal to cur − k; seed `{0: 1}` |
| 238 | [Product of Array Except Self](https://leetcode.com/problems/product-of-array-except-self/) | Medium | W2D5 | S · Transfer | Prefix/suffix products | 303 | Two passes, no division | Left products in the output; multiply by a running right product |
| 1109 | [Corporate Flight Bookings](https://leetcode.com/problems/corporate-flight-bookings/) | Medium | W2D5 | O · Transfer | Difference array | 303 | O(1) per range update | `diff[first−1] += seats; diff[last] −= seats` |
| 704 | [Binary Search](https://leetcode.com/problems/binary-search/) | Easy | W3D1 | C · Intro | Closed-interval search | Sorted arrays | A template derived from the invariant | `while (lo <= hi)`; return mid on a match |
| 35 | [Search Insert Position](https://leetcode.com/problems/search-insert-position/) | Easy | W3D1 | C · Intro | Lower bound | 704 | Lower bound = insertion point | First index with `nums[i] >= target` |
| 34 | [Find First and Last Position of Element in Sorted Array](https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/) | Medium | W3D1 | C · Core | Lower/upper bound | 35 | Two boundary searches | first = lb(t); last = ub(t) − 1; check existence |
| 278 | [First Bad Version](https://leetcode.com/problems/first-bad-version/) | Easy | W3D2 | C · Intro | First true predicate | 35 | Predicate-based search | Search \[1, n\]; `isBadVersion` is the predicate |
| 153 | [Find Minimum in Rotated Sorted Array](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/) | Medium | W3D2 | C · Core | Rotated boundary | 278 | Which half is sorted | Compare `nums[mid]` with `nums[hi]` |
| 33 | [Search in Rotated Sorted Array](https://leetcode.com/problems/search-in-rotated-sorted-array/) | Medium | W3D2 | S · Transfer | Rotated search | 153 | Sortedness check plus a target-range check | Find the sorted half; is the target inside it? |
| 875 | [Koko Eating Bananas](https://leetcode.com/problems/koko-eating-bananas/) | Medium | W3D3 | C · Core | Binary search on the answer | 278 | Monotone feasibility | Hours = Σ ceil(p / k); smallest k with hours ≤ h |
| 1011 | [Capacity To Ship Packages Within D Days](https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/) | Medium | W3D3 | C · Core | Binary search on the answer | 875 | A greedy check inside a search | lo = max weight, hi = sum; count days greedily |
| 410 | [Split Array Largest Sum](https://leetcode.com/problems/split-array-largest-sum/) | Hard | W3D3 | O · Challenge | Binary search on the answer | 1011 | 1011 in disguise | Minimise the largest piece with ≤ k pieces |
| 74 | [Search a 2D Matrix](https://leetcode.com/problems/search-a-2d-matrix/) | Medium | W3D4 | C · Core | Flattened binary search | 704 | Index mapping | i → (floor(i / n), i % n) |
| 162 | [Find Peak Element](https://leetcode.com/problems/find-peak-element/) | Medium | W3D4 | C · Core | Binary search on slope | 153 | Binary search without sorted data | If `nums[mid] < nums[mid+1]`, a peak lies right |
| 88 | [Merge Sorted Array](https://leetcode.com/problems/merge-sorted-array/) | Easy | W3D5 | C · Intro | Merge from the back | Two pointers | The merge step of merge sort | Fill `nums1` from the end |
| 912 | [Sort an Array](https://leetcode.com/problems/sort-an-array/) | Medium | W3D5 | C · Core | Merge sort / quicksort | Recursion | Implement an O(n log n) sort | Merge sort is safe; naive quicksort can time out on duplicates |
| 179 | [Largest Number](https://leetcode.com/problems/largest-number/) | Medium | W3D5 | S · Transfer | Custom comparator | Sorting | Comparator correctness | a before b if a + b > b + a; all zeros → "0" |

### Phase 2: Weeks 4–6

| # | Problem | Diff | When | Tier · Role | Pattern | Prerequisite | Why it is worth solving | Hint (key observation) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 206 | [Reverse Linked List](https://leetcode.com/problems/reverse-linked-list/) | Easy | W4D1 | C · Intro | Pointer rewiring | 6.6 | Base of all list manipulation | Save next, point back, advance |
| 21 | [Merge Two Sorted Lists](https://leetcode.com/problems/merge-two-sorted-lists/) | Easy | W4D1 | C · Intro | Dummy-node merge | 206 | A dummy node removes head special cases | Attach the smaller head; append the leftover list |
| 203 | [Remove Linked List Elements](https://leetcode.com/problems/remove-linked-list-elements/) | Easy | W4D1 | S · Transfer | Dummy node | 21 | Deleting nodes that may include the head | Do not advance after a deletion |
| 876 | [Middle of the Linked List](https://leetcode.com/problems/middle-of-the-linked-list/) | Easy | W4D2 | C · Intro | Fast/slow | 206 | Middle in one pass | `while (fast && fast.next)` |
| 141 | [Linked List Cycle](https://leetcode.com/problems/linked-list-cycle/) | Easy | W4D2 | C · Core | Floyd cycle detection | 876 | O(1)-space cycle detection | Fast meets slow iff there is a cycle |
| 19 | [Remove Nth Node From End of List](https://leetcode.com/problems/remove-nth-node-from-end-of-list/) | Medium | W4D2 | C · Core | Gap pointers + dummy | 141 | One-pass k-th from the end | Advance `fast` n + 1 steps from the dummy |
| 142 | [Linked List Cycle II](https://leetcode.com/problems/linked-list-cycle-ii/) | Medium | W4D2 | O · Challenge | Floyd cycle start | 141 | The maths behind Floyd | After meeting, restart one pointer at the head; step both by 1 |
| 143 | [Reorder List](https://leetcode.com/problems/reorder-list/) | Medium | W4D3 | C · Core | Middle + reverse + merge | 876, 206, 21 | Composing three techniques | Cut at the middle, reverse the second half, interleave; null the tail |
| 146 | [LRU Cache](https://leetcode.com/problems/lru-cache/) | Medium | W4D3 | C · Core | Map + doubly linked list | 21, Map | Classic product-company design question | Map key → node; sentinels; move to front on every access |
| 92 | [Reverse Linked List II](https://leetcode.com/problems/reverse-linked-list-ii/) | Medium | W4D3 | O · Transfer | Sub-range reversal | 206 | Reconnecting a reversed segment | Dummy; walk to the node before `left`; head-insert the segment |
| 20 | [Valid Parentheses](https://leetcode.com/problems/valid-parentheses/) | Easy | W4D4 | C · Intro | Stack matching | Stacks | LIFO matches nesting | Map closer → opener; stack must end empty |
| 155 | [Min Stack](https://leetcode.com/problems/min-stack/) | Medium | W4D4 | C · Core | Augmented stack | 20 | Storing extra state per element | Push `[val, minSoFar]` |
| 150 | [Evaluate Reverse Polish Notation](https://leetcode.com/problems/evaluate-reverse-polish-notation/) | Medium | W4D4 | S · Transfer | Stack evaluation | 20 | Operand order; integer division | `b = pop(), a = pop()`; `Math.trunc(a / b)` |
| 232 | [Implement Queue using Stacks](https://leetcode.com/problems/implement-queue-using-stacks/) | Easy | W4D4 | S · Transfer | Two stacks, amortised | Queues | Amortised analysis in practice | Move in → out only when out is empty |
| 496 | [Next Greater Element I](https://leetcode.com/problems/next-greater-element-i/) | Easy | W4D5 | C · Intro | Monotonic stack | 20 | Your first monotonic stack | Build value → next greater over nums2 |
| 739 | [Daily Temperatures](https://leetcode.com/problems/daily-temperatures/) | Medium | W4D5 | C · Core | Monotonic stack of indices | 496 | Distances from stored indices | When index j is popped at i, `ans[j] = i − j` |
| 84 | [Largest Rectangle in Histogram](https://leetcode.com/problems/largest-rectangle-in-histogram/) | Hard | W4D5 | S · Challenge | Monotonic stack for widths | 739 | Previous and next smaller in one pass | Append a height-0 sentinel to flush the stack |
| 509 | [Fibonacci Number](https://leetcode.com/problems/fibonacci-number/) | Easy | W5D1 | C · Intro | Recursion → memo | Recursion | Seeing repeated work in a recursion tree | Draw calls for n = 5, then cache |
| 50 | [Pow(x, n)](https://leetcode.com/problems/powx-n/) | Medium | W5D1 | C · Core | Divide and conquer | 509 | Halving recursion; negative exponents | Compute the half once; n < 0 → 1 / x^(−n) |
| 24 | [Swap Nodes in Pairs](https://leetcode.com/problems/swap-nodes-in-pairs/) | Medium | W5D1 | S · Transfer | Recursion on lists | 206 | Recursive pointer reasoning | Swap the first two; their tail = swapPairs(rest) |
| 78 | [Subsets](https://leetcode.com/problems/subsets/) | Medium | W5D2 | C · Core | Include/exclude | Recursion | The base of backtracking | Record at every node (way B) or at leaves (way A) |
| 90 | [Subsets II](https://leetcode.com/problems/subsets-ii/) | Medium | W5D2 | C · Core | Subsets + dedupe | 78 | Same-level duplicate skipping | Sort; skip when `i > start` and equal to previous |
| 46 | [Permutations](https://leetcode.com/problems/permutations/) | Medium | W5D3 | C · Core | Used-array backtracking | 78 | Order matters | `used[]` flags; undo after recursing |
| 77 | [Combinations](https://leetcode.com/problems/combinations/) | Medium | W5D3 | C · Core | Start index + pruning | 78 | Size-k selections | Stop when too few elements remain |
| 47 | [Permutations II](https://leetcode.com/problems/permutations-ii/) | Medium | W5D3 | O · Transfer | Permutations + dedupe | 46, 90 | Duplicate rule with `used[]` | Skip if equal to previous and previous is unused |
| 39 | [Combination Sum](https://leetcode.com/problems/combination-sum/) | Medium | W5D4 | C · Core | Reuse allowed | 77 | Recurse with `i` to allow reuse | Sort; break when candidate > remaining |
| 17 | [Letter Combinations of a Phone Number](https://leetcode.com/problems/letter-combinations-of-a-phone-number/) | Medium | W5D4 | C · Core | One level per position | 78 | Branching varies per level | Recurse once per digit over its letters |
| 40 | [Combination Sum II](https://leetcode.com/problems/combination-sum-ii/) | Medium | W5D4 | S · Transfer | No reuse + dedupe | 39, 90 | Combining two rules | Recurse with `i + 1`; skip duplicates at the same level |
| 22 | [Generate Parentheses](https://leetcode.com/problems/generate-parentheses/) | Medium | W5D5 | C · Core | Constrained generation | 17 | State = counts, not path content | Add `(` if open < n; `)` if close < open |
| 79 | [Word Search](https://leetcode.com/problems/word-search/) | Medium | W5D5 | C · Core | Grid backtracking | 22 | Mark and restore on a grid | Overwrite the cell temporarily; restore after 4 directions |
| 131 | [Palindrome Partitioning](https://leetcode.com/problems/palindrome-partitioning/) | Medium | W5D5 | S · Transfer | String backtracking | 79 | Choosing where each piece ends | Try every end where `s[start..end]` is a palindrome |
| 51 | [N-Queens](https://leetcode.com/problems/n-queens/) | Hard | W5D5 | O · Challenge | Constraint backtracking | 46 | Pruning with sets | Track columns, r − c and r + c diagonals |
| 104 | [Maximum Depth of Binary Tree](https://leetcode.com/problems/maximum-depth-of-binary-tree/) | Easy | W6D1 | C · Intro | Bottom-up | Recursion | The simplest return-value recursion | 1 + max(left, right) |
| 226 | [Invert Binary Tree](https://leetcode.com/problems/invert-binary-tree/) | Easy | W6D1 | C · Intro | DFS | 104 | Structural recursion | Swap children, recurse |
| 94 | [Binary Tree Inorder Traversal](https://leetcode.com/problems/binary-tree-inorder-traversal/) | Easy | W6D1 | C · Core | Iterative DFS | Stacks | Explicit-stack traversal | Push lefts, pop, visit, go right |
| 100 | [Same Tree](https://leetcode.com/problems/same-tree/) | Easy | W6D1 | S · Transfer | Paired recursion | 104 | Recursing on two trees at once | Both null → true; one null or values differ → false |
| 102 | [Binary Tree Level Order Traversal](https://leetcode.com/problems/binary-tree-level-order-traversal/) | Medium | W6D2 | C · Core | Level BFS | Queues | The level-size snapshot | Record the queue length before the inner loop |
| 199 | [Binary Tree Right Side View](https://leetcode.com/problems/binary-tree-right-side-view/) | Medium | W6D2 | C · Core | Level BFS | 102 | Last node per level | Keep the last value of each level |
| 111 | [Minimum Depth of Binary Tree](https://leetcode.com/problems/minimum-depth-of-binary-tree/) | Easy | W6D2 | S · Transfer | BFS with early exit | 102 | The definition of a leaf matters | Return at the first leaf BFS reaches |
| 543 | [Diameter of Binary Tree](https://leetcode.com/problems/diameter-of-binary-tree/) | Easy | W6D3 | C · Core | Bottom-up + global | 104 | Return one value, track another | `best = max(best, L + R)` |
| 110 | [Balanced Binary Tree](https://leetcode.com/problems/balanced-binary-tree/) | Easy | W6D3 | C · Core | Bottom-up with sentinel | 543 | Short-circuiting with −1 | Return −1 as soon as any subtree is unbalanced |
| 572 | [Subtree of Another Tree](https://leetcode.com/problems/subtree-of-another-tree/) | Easy | W6D3 | S · Transfer | Recursion reusing 100 | 100 | A helper called at every node | Run isSame at each node; O(m · n) |
| 124 | [Binary Tree Maximum Path Sum](https://leetcode.com/problems/binary-tree-maximum-path-sum/) | Hard | W6D3 | O · Challenge | Bottom-up + global | 543 | Clamping negative branches | Return node + max(0, best branch) |
| 112 | [Path Sum](https://leetcode.com/problems/path-sum/) | Easy | W6D4 | C · Intro | Top-down | Recursion | Passing the remaining sum down | Check only at leaves |
| 236 | [Lowest Common Ancestor of a Binary Tree](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/) | Medium | W6D4 | C · Core | Bottom-up search | 543 | A contract with three cases | Both sides non-null → current node is the LCA |
| 113 | [Path Sum II](https://leetcode.com/problems/path-sum-ii/) | Medium | W6D4 | S · Transfer | Top-down + backtracking | 112, 78 | Collecting paths | Push, recurse, pop; copy at leaves |
| 1448 | [Count Good Nodes in Binary Tree](https://leetcode.com/problems/count-good-nodes-in-binary-tree/) | Medium | W6D4 | S · Transfer | Top-down maximum | 112 | Carrying a running max | Good if `val >= max on the path` |
| 98 | [Validate Binary Search Tree](https://leetcode.com/problems/validate-binary-search-tree/) | Medium | W6D5 | C · Core | Bounds passed down | 1448 | The classic BST trap | Pass (low, high); strict inequalities |
| 230 | [Kth Smallest Element in a BST](https://leetcode.com/problems/kth-smallest-element-in-a-bst/) | Medium | W6D5 | C · Core | Inorder traversal | 94 | Sorted traversal with an early stop | Stop after k pops |
| 235 | [Lowest Common Ancestor of a Binary Search Tree](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/) | Medium | W6D5 | S · Transfer | BST walk | 236 | The BST ordering shortcut | Go left if both are smaller, right if both are larger |
| 105 | [Construct Binary Tree from Preorder and Inorder Traversal](https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/) | Medium | W6D5 | S · Challenge | Divide by root index | 94 | Index bounds instead of slicing | Map inorder value → index; a pointer walks preorder |

### Phase 3: Weeks 7–9

| # | Problem | Diff | When | Tier · Role | Pattern | Prerequisite | Why it is worth solving | Hint (key observation) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1046 | [Last Stone Weight](https://leetcode.com/problems/last-stone-weight/) | Easy | W7D1 | C · Intro | Max-heap simulation | 6.13 | First use of your own heap | Max-heap via comparator `(a, b) => b - a` |
| 215 | [Kth Largest Element in an Array](https://leetcode.com/problems/kth-largest-element-in-an-array/) | Medium | W7D1 | C · Core | Size-k heap / quickselect | Heap | Heap vs quickselect trade-off | Min-heap of size k; its top is the answer |
| 703 | [Kth Largest Element in a Stream](https://leetcode.com/problems/kth-largest-element-in-a-stream/) | Easy | W7D1 | S · Transfer | Persistent size-k heap | 215 | Streaming top-K | Keep the heap across `add()` calls |
| 973 | [K Closest Points to Origin](https://leetcode.com/problems/k-closest-points-to-origin/) | Medium | W7D2 | S · Transfer | Size-k max-heap | 215 | Custom keys | Compare x² + y²; no square root needed |
| 23 | [Merge k Sorted Lists](https://leetcode.com/problems/merge-k-sorted-lists/) | Hard | W7D2 | C · Core | K-way merge | 21, heap | Hard but canonical | Heap of list heads; push `node.next` after each pop |
| 621 | [Task Scheduler](https://leetcode.com/problems/task-scheduler/) | Medium | W7D3 | C · Core | Counting greedy / heap simulation | Heap | Formula vs simulation | max(tasks.length, (maxFreq − 1)(n + 1) + countOfMax) |
| 295 | [Find Median from Data Stream](https://leetcode.com/problems/find-median-from-data-stream/) | Hard | W7D3 | S · Challenge | Two heaps | Heap | A balancing invariant | Max-heap for the low half, min-heap for the high half; sizes differ by ≤ 1 |
| 56 | [Merge Intervals](https://leetcode.com/problems/merge-intervals/) | Medium | W7D4 | C · Core | Sort by start + merge | Sorting | Interval basics | Extend the last end with `max` |
| 435 | [Non-overlapping Intervals](https://leetcode.com/problems/non-overlapping-intervals/) | Medium | W7D4 | C · Core | Sort by end (greedy) | 56 | Activity selection | Count kept intervals by earliest end; answer = n − kept |
| 57 | [Insert Interval](https://leetcode.com/problems/insert-interval/) | Medium | W7D4 | S · Transfer | Linear three-phase merge | 56 | No sort needed | Before, overlapping (merge), after |
| 452 | [Minimum Number of Arrows to Burst Balloons](https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/) | Medium | W7D4 | O · Transfer | Sort by end (greedy) | 435 | Closed-endpoint variant | New arrow when start > current arrow position |
| 1094 | [Car Pooling](https://leetcode.com/problems/car-pooling/) | Medium | W7D4 | O · Transfer | Sweep / difference array | 1109, 56 | Meeting-rooms-style overlap without Premium | +passengers at `from`, − at `to`; running sum ≤ capacity |
| 208 | [Implement Trie (Prefix Tree)](https://leetcode.com/problems/implement-trie-prefix-tree/) | Medium | W7D5 | C · Core | Trie | Map | Building the structure | One shared walk helper for search and startsWith |
| 211 | [Design Add and Search Words Data Structure](https://leetcode.com/problems/design-add-and-search-words-data-structure/) | Medium | W7D5 | C · Core | Trie + DFS | 208 | Wildcards via DFS | On `.`, try every child |
| 212 | [Word Search II](https://leetcode.com/problems/word-search-ii/) | Hard | W7D5 | O · Challenge | Trie + grid backtracking | 79, 208 | Combining two patterns | Walk the trie while running DFS; remove found words |
| 733 | [Flood Fill](https://leetcode.com/problems/flood-fill/) | Easy | W8D1 | C · Intro | Grid DFS | Graphs | The simplest traversal | Return early if the new colour equals the old |
| 200 | [Number of Islands](https://leetcode.com/problems/number-of-islands/) | Medium | W8D1 | C · Core | Components on a grid | 733 | The canonical graph question | Sink each island as you visit it |
| 695 | [Max Area of Island](https://leetcode.com/problems/max-area-of-island/) | Medium | W8D1 | S · Transfer | Components with size | 200 | Returning values from a traversal | Count cells during the traversal |
| 1971 | [Find if Path Exists in Graph](https://leetcode.com/problems/find-if-path-exists-in-graph/) | Easy | W8D2 | C · Intro | Adjacency-list BFS/DFS | 6.15 | Building a graph from edges | Undirected: add both directions |
| 547 | [Number of Provinces](https://leetcode.com/problems/number-of-provinces/) | Medium | W8D2 | C · Core | Components (matrix input) | 200 | Adjacency-matrix input | DFS over `isConnected` rows |
| 133 | [Clone Graph](https://leetcode.com/problems/clone-graph/) | Medium | W8D2 | S · Transfer | Traversal + node map | 547 | A map as both visited set and copy table | Create the copy when first seen, then wire neighbours |
| 994 | [Rotting Oranges](https://leetcode.com/problems/rotting-oranges/) | Medium | W8D3 | C · Core | Multi-source BFS | 102 | BFS levels as time steps | Count fresh oranges; −1 if any remain |
| 1091 | [Shortest Path in Binary Matrix](https://leetcode.com/problems/shortest-path-in-binary-matrix/) | Medium | W8D3 | C · Core | BFS shortest path | 994 | 8 directions; blocked endpoints | Path length counts cells, so the start is 1 |
| 542 | [01 Matrix](https://leetcode.com/problems/01-matrix/) | Medium | W8D3 | S · Transfer | Multi-source BFS | 994 | Start from all targets | Enqueue every 0; distances spread outward |
| 127 | [Word Ladder](https://leetcode.com/problems/word-ladder/) | Hard | W8D3 | O · Challenge | BFS on an implicit graph | 994 | Generating neighbours efficiently | Wildcard buckets: `h*t` → \[hot, hit\] |
| 207 | [Course Schedule](https://leetcode.com/problems/course-schedule/) | Medium | W8D4 | C · Core | Cycle detection / Kahn | Graphs | Dependency graphs | Edge pre → course; were all nodes processed? |
| 210 | [Course Schedule II](https://leetcode.com/problems/course-schedule-ii/) | Medium | W8D4 | C · Core | Topological order | 207 | Returning the order | Kahn's output, or \[\] when a cycle exists |
| 802 | [Find Eventual Safe States](https://leetcode.com/problems/find-eventual-safe-states/) | Medium | W8D4 | O · Transfer | Three-state DFS | 207 | Directed cycle states | Safe = finished (state 2) without reaching a cycle |
| 785 | [Is Graph Bipartite?](https://leetcode.com/problems/is-graph-bipartite/) | Medium | W8D5 | C · Core | 2-colouring | BFS | Odd-cycle detection | Start a BFS from every uncoloured node |
| 417 | [Pacific Atlantic Water Flow](https://leetcode.com/problems/pacific-atlantic-water-flow/) | Medium | W8D5 | C · Core | Reverse multi-source search | 200 | Search from the targets | Two uphill searches from each ocean; intersect |
| 130 | [Surrounded Regions](https://leetcode.com/problems/surrounded-regions/) | Medium | W8D5 | S · Transfer | Border-connected marking | 417 | Complement reasoning | Mark border-connected `O`s safe; flip the rest |
| 743 | [Network Delay Time](https://leetcode.com/problems/network-delay-time/) | Medium | W9D1 | C · Core | Dijkstra | Heap, BFS | The canonical Dijkstra | Answer = max distance, −1 if any node unreachable |
| 1631 | [Path With Minimum Effort](https://leetcode.com/problems/path-with-minimum-effort/) | Medium | W9D1 | S · Transfer | Dijkstra (minimax) | 743 | Changing the path cost function | Cost = max edge so far, not the sum |
| 684 | [Redundant Connection](https://leetcode.com/problems/redundant-connection/) | Medium | W9D2 | C · Core | Union-Find | 6.16 | The cycle-closing edge | First edge whose `union` returns false |
| 721 | [Accounts Merge](https://leetcode.com/problems/accounts-merge/) | Medium | W9D2 | S · Transfer | Union-Find with string keys | 684 | Mapping strings to DSU indices | Union accounts sharing an email; group by root; sort emails |
| 1584 | [Min Cost to Connect All Points](https://leetcode.com/problems/min-cost-to-connect-all-points/) | Medium | W9D3 | C · Core | MST (Prim or Kruskal) | 684 | MST on a complete graph | Manhattan distance; O(n²) array-based Prim |
| 787 | [Cheapest Flights Within K Stops](https://leetcode.com/problems/cheapest-flights-within-k-stops/) | Medium | W9D3 | O · Challenge | Bellman-Ford / BFS by stops | 743 | When Dijkstra's assumption breaks | k + 1 rounds of relaxation using a copy of `dist` |
| 455 | [Assign Cookies](https://leetcode.com/problems/assign-cookies/) | Easy | W9D4 | S · Intro | Greedy with two sorted pointers | Sorting | The simplest exchange argument | Smallest cookie that satisfies the least greedy child |
| 55 | [Jump Game](https://leetcode.com/problems/jump-game/) | Medium | W9D4 | C · Core | Greedy reach | Arrays | A running reach | Fail when i > farthest |
| 45 | [Jump Game II](https://leetcode.com/problems/jump-game-ii/) | Medium | W9D4 | C · Core | Greedy levels | 55 | BFS-like layers in one pass | Count a jump when i reaches the current level's end |
| 763 | [Partition Labels](https://leetcode.com/problems/partition-labels/) | Medium | W9D5 | C · Core | Greedy last occurrence | Map | Extending a part to cover its letters | Record each character's last index first |
| 134 | [Gas Station](https://leetcode.com/problems/gas-station/) | Medium | W9D5 | C · Core | Greedy running balance | 55 | The reset argument | If total ≥ 0 a start exists; reset the start when the tank goes negative |
| 846 | [Hand of Straights](https://leetcode.com/problems/hand-of-straights/) | Medium | W9D5 | S · Transfer | Greedy smallest-first | Map, sorting | Forced choices | The smallest remaining card must start a group |

### Phase 4: Weeks 10–12

Week 12 rows are for after your attempt: do not read their Pattern or Hint columns beforehand.

| # | Problem | Diff | When | Tier · Role | Pattern | Prerequisite | Why it is worth solving | Hint (key observation) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 70 | [Climbing Stairs](https://leetcode.com/problems/climbing-stairs/) | Easy | W10D1 | C · Intro | 1-D DP | Recursion | The four-step progression | ways(n) = ways(n − 1) + ways(n − 2) |
| 746 | [Min Cost Climbing Stairs](https://leetcode.com/problems/min-cost-climbing-stairs/) | Easy | W10D1 | C · Intro | 1-D DP (min) | 70 | Minimum instead of count | The top is index n; you may start at 0 or 1 |
| 198 | [House Robber](https://leetcode.com/problems/house-robber/) | Medium | W10D2 | C · Core | Take/skip DP | 70 | Writing the state sentence | `dp[i] = max(dp[i−1], dp[i−2] + nums[i])` |
| 213 | [House Robber II](https://leetcode.com/problems/house-robber-ii/) | Medium | W10D2 | C · Core | Take/skip, circular | 198 | Reducing to a solved problem | Max of two linear runs (without first / without last) |
| 740 | [Delete and Earn](https://leetcode.com/problems/delete-and-earn/) | Medium | W10D2 | O · Transfer | Reduction to 198 | 198 | Transforming the input | Sum points per value; rob over values |
| 322 | [Coin Change](https://leetcode.com/problems/coin-change/) | Medium | W10D3 | C · Core | Unbounded knapsack (min) | 198 | Where greedy fails and DP works | `dp[a] = 1 + min dp[a − c]`; Infinity = impossible |
| 518 | [Coin Change II](https://leetcode.com/problems/coin-change-ii/) | Medium | W10D3 | C · Core | Unbounded knapsack (count) | 322 | Loop order decides combinations vs sequences | Coins in the outer loop, amounts inner |
| 279 | [Perfect Squares](https://leetcode.com/problems/perfect-squares/) | Medium | W10D3 | O · Transfer | Unbounded knapsack | 322 | Items generated from n | Coins = squares ≤ n |
| 62 | [Unique Paths](https://leetcode.com/problems/unique-paths/) | Medium | W10D4 | C · Core | Grid DP | 70 | 2-D table → one row | First row and column are 1 |
| 64 | [Minimum Path Sum](https://leetcode.com/problems/minimum-path-sum/) | Medium | W10D4 | C · Core | Grid DP (min) | 62 | One-row DP | Min of top and left plus the cell |
| 63 | [Unique Paths II](https://leetcode.com/problems/unique-paths-ii/) | Medium | W10D4 | S · Transfer | Grid DP with obstacles | 62 | Base cases with blocked cells | Obstacle → 0; cells after an obstacle on the edges are 0 |
| 139 | [Word Break](https://leetcode.com/problems/word-break/) | Medium | W10D5 | C · Core | String partition DP | 70 | Prefix feasibility | `dp[i]` true if some `dp[j]` is true and `s[j..i)` is in the Set |
| 91 | [Decode Ways](https://leetcode.com/problems/decode-ways/) | Medium | W10D5 | C · Core | String partition DP (count) | 139 | Validity rules per piece | One digit 1–9; two digits 10–26 |
| 152 | [Maximum Product Subarray](https://leetcode.com/problems/maximum-product-subarray/) | Medium | W10D5 | S · Transfer | Kadane with min and max | 53 | Negatives swap the extremes | Track `curMax` and `curMin` together |
| 416 | [Partition Equal Subset Sum](https://leetcode.com/problems/partition-equal-subset-sum/) | Medium | W11D1 | C · Core | 0/1 knapsack | 322 | Downward iteration | Odd total → false; target = total / 2 |
| 494 | [Target Sum](https://leetcode.com/problems/target-sum/) | Medium | W11D1 | S · Transfer | 0/1 knapsack (count) | 416 | An algebraic transformation | P = (total + target) / 2; count subsets summing to P |
| 1143 | [Longest Common Subsequence](https://leetcode.com/problems/longest-common-subsequence/) | Medium | W11D2 | C · Core | Two-sequence DP | 62 | The (m+1) × (n+1) table | Match → diagonal + 1; else max(top, left) |
| 72 | [Edit Distance](https://leetcode.com/problems/edit-distance/) | Medium | W11D2 | C · Core | Two-sequence DP | 1143 | Three operations as three transitions | `dp[i][0] = i`, `dp[0][j] = j` |
| 300 | [Longest Increasing Subsequence](https://leetcode.com/problems/longest-increasing-subsequence/) | Medium | W11D3 | C · Core | LIS DP | 198 | dp "ending at i" | O(n²) first; tails + binary search after |
| 5 | [Longest Palindromic Substring](https://leetcode.com/problems/longest-palindromic-substring/) | Medium | W11D3 | C · Core | Expand around centre | 125 | 2n − 1 centres | Expand odd and even centres; track the best bounds |
| 647 | [Palindromic Substrings](https://leetcode.com/problems/palindromic-substrings/) | Medium | W11D3 | S · Transfer | Expand around centre (count) | 5 | Counting instead of maximising | Count every successful expansion |
| 309 | [Best Time to Buy and Sell Stock with Cooldown](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-cooldown/) | Medium | W11D4 | C · Core | State-machine DP | 198 | Modes as states | hold, sold, rest; update from the previous day's values |
| 136 | [Single Number](https://leetcode.com/problems/single-number/) | Easy | W11D5 | C · Intro | XOR | Bits | Pairs cancel | Fold XOR over the array |
| 191 | [Number of 1 Bits](https://leetcode.com/problems/number-of-1-bits/) | Easy | W11D5 | C · Intro | Bit counting | Bits | `x & (x − 1)` | Loop until 0 |
| 338 | [Counting Bits](https://leetcode.com/problems/counting-bits/) | Easy | W11D5 | C · Core | Bits DP | 191 | DP over bit structure | `bits[i] = bits[i >> 1] + (i & 1)` |
| 268 | [Missing Number](https://leetcode.com/problems/missing-number/) | Easy | W11D5 | C · Core | XOR / sum | 136 | Indices as data | XOR all indices and values (or n(n+1)/2 − sum) |
| 190 | [Reverse Bits](https://leetcode.com/problems/reverse-bits/) | Easy | W11D5 | O · Transfer | Bit shifting | 191 | Logical vs arithmetic shifts in JS | Shift `n` with `>>>`; the statement now takes even n ≤ 2³¹ − 2, so the result fits a signed int, but end with `>>> 0` for the general unsigned version |
| 371 | [Sum of Two Integers](https://leetcode.com/problems/sum-of-two-integers/) | Medium | W11D5 | O · Challenge | Bitwise addition | 136 | Carry with AND and shift | Loop while carry ≠ 0; JS operates on 32 bits |
| 438 | [Find All Anagrams in a String](https://leetcode.com/problems/find-all-anagrams-in-a-string/) | Medium | W12D1 | C · Transfer | Fixed window of counts | 567 | Pattern transfer without a label | Same as 567, collecting start indices |
| 287 | [Find the Duplicate Number](https://leetcode.com/problems/find-the-duplicate-number/) | Medium | W12D1 | C · Transfer | Floyd on indices (or binary search on counts) | 142 | Seeing an array as a linked list | i → nums\[i\] forms a cycle whose entry is the duplicate |
| 853 | [Car Fleet](https://leetcode.com/problems/car-fleet/) | Medium | W12D1 | C · Transfer | Sort + monotonic stack | 739 | Combining sorting with a stack | From closest to the target, a slower car ahead absorbs those behind |
| 981 | [Time Based Key-Value Store](https://leetcode.com/problems/time-based-key-value-store/) | Medium | W12D2 | C · Transfer | Hash map + binary search | 34 | Design plus upper bound | Timestamps are increasing; find the last ≤ t |
| 380 | [Insert Delete GetRandom O(1)](https://leetcode.com/problems/insert-delete-getrandom-o1/) | Medium | W12D2 | C · Transfer | Map + array swap-remove | 146 | O(1) deletion by swapping with the last element | Map value → index; swap with last, then pop |
| 678 | [Valid Parenthesis String](https://leetcode.com/problems/valid-parenthesis-string/) | Medium | W12D3 | C · Transfer | Greedy range | 20 | A range of possible states | Track the min and max possible open count; `*` widens it |

**Bank totals check.** Phase 1: 45 problems; Phase 2: 51; Phase 3: 43; Phase 4: 34. Total 173 = 114 Core + 39 Stretch + 20 Optional. In this edition 150, 973 and 455 moved from Core to Stretch so that no study day needs more than about 50 minutes of new-problem practice. Week 12's Thursday Hard is chosen from problems already listed here (42, 76, 84, 124, 239, 295, 297); 239 ([Sliding Window Maximum](https://leetcode.com/problems/sliding-window-maximum/), Hard, monotonic deque) and 297 ([Serialize and Deserialize Binary Tree](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/), Hard, preorder with null markers) appear only as those Hard options.

## 6. JavaScript DSA reference and code templates

These templates are plain, interview-readable ES2020+ code; adapt them rather than paste them, and be able to write each one from memory by the week it is first used. Each template says when to change it.

### 6.1 Cost model of built-ins

| Operation | Cost | Note |
| --- | --- | --- |
| `arr[i]`, `arr.length`, `push`, `pop` | O(1) (push amortised) |  |
| `shift`, `unshift`, `splice` in the middle | O(n) | Never in a loop over large data; use a head pointer (6.5) |
| `indexOf`, `includes`, `find`, `some`, `every` | O(n) | Inside a loop → O(n²); use a `Set`/`Map` |
| `slice`, `concat`, spread `[...a]`, `Array.from`, `map`, `filter`, `reduce`, `join`, `reverse` | O(n) or O(k) | Each allocates (except `reverse`, which is in place) |
| `sort` | O(n log n), stable | Default compares strings |
| `Math.max(...arr)` | O(n) | Throws RangeError for very large arrays (\~10⁵+); use a loop |
| `str[i]`, `str.length` | O(1) |  |
| `slice`, `substring`, `split`, `indexOf`, `includes`, `===` on strings | O(n) | String comparison is O(length); V8 often makes string slices cheap by sharing memory, but analyse them as O(n) |
| `Map`/`Set` `get`, `set`, `has`, `delete`, `size` | O(1) average |  |
| `Object.keys/values/entries`, `[...map.keys()]` | O(n) | Do not call in a loop |
| `JSON.stringify(key)` | O(size of key) | Slow as a hash key; prefer numeric encodings |

**Avoiding unnecessary allocations.** Pass indices instead of slicing (`dfs(i)` not `dfs(arr.slice(i))`); reuse one `path` array in backtracking and copy only on output; pre-size arrays with `new Array(n).fill(0)`; encode grid cells as `r * n + c` instead of the string `` `${r},${c}` ``; build strings in an array and `join('')` once.

### 6.2 `Map`, `Set` and objects

```js
// Frequency count
const count = new Map();
for (const x of arr) count.set(x, (count.get(x) ?? 0) + 1);

// Grouping
const groups = new Map();
for (const word of words) {
  const key = [...word].sort().join('');
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(word);
}
const result = [...groups.values()];

// Iterating (insertion order is guaranteed)
for (const [key, value] of count) { /* ... */ }

// Set operations
const seen = new Set(arr);
const inter = [...setA].filter((x) => setB.has(x));

// 26-letter counts are faster than a Map for lowercase strings
const freq = new Array(26).fill(0);
for (const ch of s) freq[ch.charCodeAt(0) - 97]++;
```

**Object vs `Map`.** Objects convert keys to strings (`obj[1]` and `obj['1']` collide), inherit keys such as `constructor` (`'constructor' in {}` is `true`), and need `Object.keys(obj).length` (O(n)) for their size. Use `Map` for algorithmic work. Arrays and objects as `Map` keys compare by reference: `map.get([1, 2])` never finds a previously set `[1, 2]`; encode as a string or number.

### 6.3 Arrays: copying, 2-D arrays, sorting and comparators

```js
const copy = arr.slice();                  // shallow copy (also [...arr])
const deep = structuredClone(nested);      // deep copy (Node 17+)

// 2-D arrays: the classic bug
const bad = new Array(3).fill([]);         // all 3 rows are the SAME array
// correct
const grid = Array.from({ length: m }, () => new Array(n).fill(0));

// Sorting
nums.sort((a, b) => a - b);                // ascending numbers
nums.sort((a, b) => b - a);                // descending
pairs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);  // by first, then second
// strings: default is fine (UTF-16 order)
words.sort();
people.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

// 179 Largest Number: put a before b when a + b is the larger concatenation
const strs = nums.map(String)
  .sort((a, b) => (a + b > b + a ? -1 : a + b < b + a ? 1 : 0));
```

A comparator must return a negative number, zero or a positive number; returning `a > b` (a boolean) gives inconsistent results. `sort` mutates in place and returns the same array; copy first if the caller needs the original.

### 6.4 Strings, numbers and integer pitfalls

- Strings are immutable: `s[0] = 'x'` silently does nothing. Convert with `const chars = [...s]`, edit, then `chars.join('')`.
- Character codes: `'a'.charCodeAt(0)` is 97; `String.fromCharCode(97 + i)`.
- Integer division: `Math.trunc(a / b)` truncates toward zero (C/Java behaviour, required by 150); `Math.floor` rounds down, which differs for negatives.
- Modulo of negatives: `-7 % 3` is `-1`; normalise with `((a % m) + m) % m`.
- Safe integers: exact up to 2⁵³ − 1 (`Number.MAX_SAFE_INTEGER` ≈ 9·10¹⁵). Products of two values near 10⁹ exceed it; use `BigInt` (`10n ** 18n`) or apply the modulus as you go (`(a * b) % MOD` can lose precision when a·b > 2⁵³; use BigInt or split the multiplication).
- Bitwise operators coerce to signed 32-bit integers (6.18). Never use `x | 0` or `~~x` as a floor: they truncate toward zero (so \~\~-2.5 is -2, not -3) and wrap beyond ±2³¹. Use Math.floor or Math.trunc.
- `Infinity` and `-Infinity` are convenient sentinels for min/max DP; `0 * Infinity` is `NaN`, so guard arithmetic on unreachable states.

### 6.5 Stack, queue and deque

```js
// Stack: a plain array
const stack = [];
stack.push(x); const top = stack[stack.length - 1]; stack.pop();

// Queue: array + head pointer, O(1) amortised dequeue
class Queue {
  constructor() { this.items = []; this.head = 0; }
  push(x) { this.items.push(x); }
  shift() {
    const x = this.items[this.head++];
    // occasionally drop the consumed prefix
    if (this.head > 1024 && this.head * 2 > this.items.length) {
      this.items = this.items.slice(this.head); this.head = 0;
    }
    return x;
  }
  peek() { return this.items[this.head]; }
  get size() { return this.items.length - this.head; }
}
// For a one-off BFS, the simplest form is enough:
//   for (let h = 0; h < q.length; h++) { const u = q[h]; ...; q.push(v); }

// Deque: circular buffer, O(1) amortised at both ends
class Deque {
  constructor(cap = 16) {
    this.buf = new Array(cap);
    this.head = 0;   // index of the front element
    this.len = 0;    // number of stored elements
  }
  #idx(i) { return (this.head + i) % this.buf.length; }   // i-th from front
  #grow() {
    const nb = new Array(this.buf.length * 2);
    for (let i = 0; i < this.len; i++) nb[i] = this.buf[this.#idx(i)];
    this.buf = nb;
    this.head = 0;
  }
  pushBack(x) {
    if (this.len === this.buf.length) this.#grow();
    this.buf[this.#idx(this.len)] = x;
    this.len++;
  }
  pushFront(x) {
    if (this.len === this.buf.length) this.#grow();
    this.head = (this.head - 1 + this.buf.length) % this.buf.length;
    this.buf[this.head] = x;
    this.len++;
  }
  popFront() {
    if (this.len === 0) return undefined;
    const x = this.buf[this.head];
    this.head = this.#idx(1);
    this.len--;
    return x;
  }
  popBack() {
    if (this.len === 0) return undefined;
    this.len--;
    return this.buf[this.#idx(this.len)];
  }
  front() { return this.len ? this.buf[this.head] : undefined; }
  back() { return this.len ? this.buf[this.#idx(this.len - 1)] : undefined; }
  get size() { return this.len; }
}
```

For a monotonic deque (239) you only push at the back and pop at both ends, so an array with a head index plus `pop()` at the back is enough.

### 6.6 Linked-list helpers

```js
// LeetCode defines ListNode for you; this matches it for local testing.
function ListNode(val = 0, next = null) {
  this.val = val;
  this.next = next;
}

function fromArray(arr) {
  const dummy = new ListNode();
  let tail = dummy;
  for (const v of arr) { tail.next = new ListNode(v); tail = tail.next; }
  return dummy.next;
}
function toArray(head) {
  const out = [];
  for (let n = head; n; n = n.next) out.push(n.val);
  return out;
}
```

Adapt: use a dummy node whenever the head can change; when a list is cut, set the new tail's `next = null` immediately.

### 6.7 Recursive function design

```js
function solve(input) {
  const memo = new Map();             // only if states repeat
  // contract: dfs(i) returns <answer for the suffix starting at i>
  function dfs(i) {
    if (i === input.length) return BASE;        // base case first
    if (memo.has(i)) return memo.get(i);
    const result = combine(/* dfs(i + 1), dfs(i + 2), ... */);
    memo.set(i, result);
    return result;
  }
  return dfs(0);
}
```

Rules: write the contract as a comment; define helpers inside the main function so they share inputs without globals; never rely on tail-call optimisation (Node does not do it); if depth can exceed \~10⁴, rewrite with an explicit stack or bottom-up DP.

### 6.8 Sorting implementations

Merge sort is in section 3, Week 3, Example 4. Quicksort with a random pivot and three-way partitioning (handles many duplicates, which a two-way partition does badly):

```js
function swap(a, i, j) { const t = a[i]; a[i] = a[j]; a[j] = t; }

function quickSort(a, lo = 0, hi = a.length - 1) {
  if (lo >= hi) return a;
  const pivot = a[lo + Math.floor(Math.random() * (hi - lo + 1))];
  let lt = lo, i = lo, gt = hi;
  // invariant: a[lo..lt-1] < pivot, a[lt..i-1] === pivot,
  //            a[gt+1..hi] > pivot
  while (i <= gt) {
    if (a[i] < pivot) swap(a, lt++, i++);
    // do not advance i: the swapped-in value is unchecked
    else if (a[i] > pivot) swap(a, i, gt--);
    else i++;
  }
  quickSort(a, lo, lt - 1);
  quickSort(a, gt + 1, hi);
  return a;
}
```

Dry run on Day 5 (W3): `[3, 1, 3, 2, 3]` with pivot 3 ends as `[1, 2, 3, 3, 3]` after one partition, with lt = 2 and gt = 4.

### 6.9 Binary search templates

```js
// First index in [lo, hi) where pred is true; returns hi if none.
// pred must look like F...F T...T over the range.
function firstTrue(lo, hi, pred) {
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);   // safe for large answer ranges
    if (pred(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
// lower bound:  firstTrue(0, n, (i) => nums[i] >= target)
// upper bound:  firstTrue(0, n, (i) => nums[i] > target)
// on answers:   firstTrue(minAns, maxAns + 1, (k) => feasible(k))
```

Adapt: for "last index where pred is true", search for the first index where it becomes false and subtract 1.

### 6.10 Two pointers, sliding window and prefix sums

```js
// Variable window: longest window satisfying a condition
function longestWindow(arr) {
  let l = 0, best = 0;
  // whatever describes the window
  const state = new Map();
  for (let r = 0; r < arr.length; r++) {
    // 1. add arr[r] to state
    while (/* window [l, r] is invalid */ false) {
      // 2. remove arr[l] from state
      l++;
    }
    best = Math.max(best, r - l + 1);           // 3. window is valid here
  }
  return best;
}
// Shortest valid window: update the answer INSIDE the while loop,
// while the window is still valid.

// Prefix sum + hash map: count subarrays with sum k
function countSubarrays(nums, k) {
  const seen = new Map([[0, 1]]);
  let cur = 0, count = 0;
  for (const x of nums) {
    cur += x;
    count += seen.get(cur - k) ?? 0;
    seen.set(cur, (seen.get(cur) ?? 0) + 1);
  }
  return count;
}
```

### 6.11 Backtracking

```js
function backtrack(items) {
  const res = [], path = [];
  // sort only if duplicates must be skipped or you prune with break
  items.sort((a, b) => a - b);
  function dfs(start /*, remaining, used ... */) {
    if (/* complete */ true) {
      res.push([...path]);
      // add `return;` here if only leaves are answers
    }
    for (let i = start; i < items.length; i++) {
      // skip same-level duplicates
      if (i > start && items[i] === items[i - 1]) continue;
      // pruning (sorted input)
      if (/* cannot lead to a solution */ false) break;
      path.push(items[i]);                      // choose
      dfs(i + 1);           // explore (pass i instead to allow reuse)
      path.pop();                               // unchoose
    }
  }
  dfs(0);
  return res;
}
```

### 6.12 Trees

```js
// Bottom-up: return information from children
function height(node) {
  if (!node) return 0;
  return 1 + Math.max(height(node.left), height(node.right));
}

// Top-down: pass information to children
function walk(node, state) {
  if (!node) return;
  // use node and state here
  walk(node.left, /* next state */ state);
  walk(node.right, state);
}

// Iterative preorder
function preorder(root) {
  const out = [], stack = root ? [root] : [];
  while (stack.length) {
    const node = stack.pop();
    out.push(node.val);
    // right first so left is processed first
    if (node.right) stack.push(node.right);
    if (node.left) stack.push(node.left);
  }
  return out;
}
// Iterative inorder: section 3, Week 6, Example 3.
// Level-order BFS: section 3, Week 6, Example 4.
```

### 6.13 Binary heap (priority queue)

```js
class MinHeap {
  constructor(compare = (a, b) => a - b) {
    this.data = [];
    this.compare = compare;
  }
  size() { return this.data.length; }
  peek() { return this.data[0]; }
  push(x) {
    const d = this.data;
    d.push(x);
    let i = d.length - 1;
    while (i > 0) {                                     // sift up
      const p = (i - 1) >> 1;
      if (this.compare(d[i], d[p]) >= 0) break;
      [d[i], d[p]] = [d[p], d[i]];
      i = p;
    }
  }
  pop() {
    const d = this.data;
    if (d.length === 0) return undefined;
    const top = d[0], last = d.pop();
    if (d.length > 0) {
      d[0] = last;
      let i = 0;
      while (true) {                                    // sift down
        const l = 2 * i + 1, r = l + 1;
        let s = i;
        if (l < d.length && this.compare(d[l], d[s]) < 0) s = l;
        if (r < d.length && this.compare(d[r], d[s]) < 0) s = r;
        if (s === i) break;
        [d[i], d[s]] = [d[s], d[i]];
        i = s;
      }
    }
    return top;
  }
}
// Max-heap: new MinHeap((a, b) => b - a)
// Tuples:   new MinHeap((a, b) => a[0] - b[0])   e.g. [distance, node]
```

### 6.14 Trie

The `Map`-based version is in section 3, Week 7, Example 4. For lowercase-only words, use fixed arrays:

```js
class TrieNode {
  constructor() {
    this.next = new Array(26).fill(null);
    this.isEnd = false;
  }
}
// index = ch.charCodeAt(0) - 97
```

### 6.15 Graphs

```js
// Undirected adjacency list from an edge list
const adj = Array.from({ length: n }, () => []);
for (const [u, v] of edges) { adj[u].push(v); adj[v].push(u); }

// BFS distances from a source (unweighted)
function bfs(adj, src) {
  const dist = new Array(adj.length).fill(-1);
  dist[src] = 0;
  const q = [src];
  for (let h = 0; h < q.length; h++) {
    const u = q[h];
    for (const v of adj[u]) {
      if (dist[v] !== -1) continue;
      dist[v] = dist[u] + 1;                    // mark when enqueuing
      q.push(v);
    }
  }
  return dist;
}

// Grid neighbours
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
for (const [dr, dc] of DIRS) {
  const nr = r + dr, nc = c + dc;
  if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
  // ...
}
```

Kahn's topological sort: Week 8, Example 3. Three-state DFS: Week 8, Example 4. Dijkstra: Week 9, Example 1.

### 6.16 Union-Find

The full class is in section 3, Week 9, Example 2. To use it with string keys (721), map each key to an index first: `if (!id.has(email)) id.set(email, id.size);`.

### 6.17 Dynamic programming

```js
// Top-down with a numeric memo for two indices (faster than string keys)
function lcsMemo(a, b) {
  const m = a.length, n = b.length;
  const memo = new Array((m + 1) * (n + 1)).fill(-1);
  function f(i, j) {                            // LCS of a[i..] and b[j..]
    if (i === m || j === n) return 0;
    const key = i * (n + 1) + j;
    if (memo[key] !== -1) return memo[key];
    const res = a[i] === b[j]
      ? 1 + f(i + 1, j + 1)
      : Math.max(f(i + 1, j), f(i, j + 1));
    memo[key] = res;
    return res;
  }
  return f(0, 0);
}

// Bottom-up with two rolling rows
function lcs(a, b) {
  let prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      cur[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1] + 1
        : Math.max(prev[j], cur[j - 1]);
    }
    prev = cur;
  }
  return prev[b.length];
}
```

### 6.18 Bit manipulation helpers

```js
const isBitSet = (x, i) => ((x >> i) & 1) === 1;
const setBit = (x, i) => x | (1 << i);
const clearBit = (x, i) => x & ~(1 << i);
const toggleBit = (x, i) => x ^ (1 << i);
const isPowerOfTwo = (x) => x > 0 && (x & (x - 1)) === 0;
const toUnsigned = (x) => x >>> 0;
// 32-bit binary string; works for negatives too
const toBinary = (x) => (x >>> 0).toString(2).padStart(32, '0');
```

All of these are valid only for 0 ≤ i ≤ 31 and values within signed 32-bit range.

### 6.19 Monotonic stack

```js
// For each i, index of the next element strictly greater (or -1)
function nextGreaterIndex(a) {
  // st holds indices, values decreasing
  const res = new Array(a.length).fill(-1), st = [];
  for (let i = 0; i < a.length; i++) {
    while (st.length && a[st[st.length - 1]] < a[i]) res[st.pop()] = i;
    st.push(i);
  }
  return res;
}
// Next smaller: flip < to >.
// Previous greater: iterate from the right, or read the stack top
// before pushing.
```

## 7. Problem-solving method and pattern recognition guide

Use the same 14-step method on every problem from Day 1, so that by Week 12 it runs automatically under interview pressure. Steps 1–9 happen before you type any code.

### 7.1 The 14-step method

| # | Step | What you write or say | Typical time (Medium) |
| --- | --- | --- | --- |
| 1 | Restate the problem | One sentence in your own words | 1 min |
| 2 | Inputs, output, constraints, edge cases | n range, value range, sorted?, duplicates?, empty?, negative? | 2 min |
| 3 | Work a small example by hand | 4–6 elements; watch what *you* do | 3 min |
| 4 | Brute force | The most direct correct method | 2 min |
| 5 | Its complexity | Time and space; compare with the constraints table (section 3, Week 1) | 1 min |
| 6 | Identify the bottleneck | "The inner loop searches for X" / "we recompute the same sum" | 2 min |
| 7 | Choose a structure or pattern | Map, set, two pointers, window, heap, BFS, DP… (7.2) | 2–5 min |
| 8 | Why it works | Invariant, monotonicity, exchange argument or recurrence | 2 min |
| 9 | Pseudocode | 5–10 lines of comments | 3 min |
| 10 | Implement in JavaScript | Small helpers, clear names | 10–15 min |
| 11 | Test | Normal, boundary (empty, one element, all equal), adversarial (max n, negatives) | 3–5 min |
| 12 | Re-analyse complexity | Including sort cost, recursion stack and output size | 1 min |
| 13 | Explain correctness | The invariant or recurrence in two sentences | 1 min |
| 14 | Log the lesson | Key observation and why it was hard (section 8 tracker) | 2 min |

Paste this skeleton at the top of the LeetCode editor for the first four weeks:

```js
/*
1 Restate:
2 In/Out/Constraints/Edges:
3 Example by hand:
4 Brute force:            5 Complexity:
6 Bottleneck:
7 Pattern / structure:    8 Why it works:
9 Pseudocode:
12 Final complexity:     13 Invariant:
14 Lesson:
*/
```

### 7.2 Pattern recognition table

Scan the constraints first, then the input shape, then the question type, then keywords.

| Clue in the problem | Likely pattern | Typical complexity | Where taught |
| --- | --- | --- | --- |
| n ≤ 20, "all combinations/subsets/permutations" | Backtracking | O(2ⁿ), O(n!) | W5 |
| n ≤ 10³–5·10³, pairs or 2-D state | O(n²) DP or nested loops | O(n²) | W10–11 |
| n up to 10⁵–10⁶ | Hashing, sorting, two pointers, window, heap, linear DP | O(n) or O(n log n) | W1–3, W7 |
| Answer range up to 10⁹, "minimum X such that" | Binary search on the answer | O(n log range) | W3 |
| "Pair/complement", "seen before", unsorted | Hash map / set | O(n) | W1 |
| Sorted array, pair or triplet | Two pointers | O(n), O(n²) for 3Sum | W2 |
| Contiguous subarray/substring, "longest/shortest with constraint", non-negative values | Sliding window | O(n) | W2 |
| Subarray sum equals/divisible by k, negatives allowed | Prefix sum + hash map | O(n) | W2 |
| Maximum subarray sum/product | Kadane | O(n) | W2, W10 |
| Sorted data, "first/last position", O(log n) required | Boundary binary search | O(log n) | W3 |
| Linked list: middle, cycle, k-th from end | Fast/slow pointers | O(n), O(1) | W4 |
| Nesting, matching brackets, evaluate expression | Stack | O(n) | W4 |
| "Next greater/smaller", spans, histogram | Monotonic stack | O(n) | W4 |
| O(1) get/put with eviction or random access | Map + linked list / array | O(1) | W4, W12 |
| Tree: height, diameter, subtree property | Bottom-up DFS | O(n) | W6 |
| Tree: root-to-node path, range constraint | Top-down DFS | O(n) | W6 |
| Tree: levels, views, minimum depth | BFS by level | O(n) | W6 |
| "k largest/smallest/closest", streaming | Heap of size k | O(n log k) | W7 |
| Merge k sorted sequences | K-way merge with heap | O(N log k) | W7 |
| Running median, repeatedly take min/max | Two heaps / heap simulation | O(log n) per op | W7 |
| Intervals, meetings, overlaps | Sort + sweep/merge | O(n log n) | W7 |
| Prefix queries over many words | Trie | O(L) per op | W7 |
| Grid of cells, islands, regions | DFS/BFS flood fill | O(m·n) | W8 |
| Minimum steps, equal edge costs | BFS (multi-source if many starts) | O(V + E) | W8 |
| Prerequisites, ordering, dependencies | Topological sort | O(V + E) | W8 |
| Weighted shortest path, non-negative | Dijkstra | O((V + E) log V) | W9 |
| Connectivity as edges arrive, redundant edge | Union-Find | \~O(1) per op | W9 |
| Maximise number of compatible choices; sorting makes choice local | Greedy (prove it) | O(n log n) | W9 |
| Count ways / min cost / max value with overlapping choices | Dynamic programming | Depends on states | W10–11 |
| Two strings: align, convert, common subsequence | Two-sequence DP | O(m·n) | W11 |
| "Appears twice except one", powers of two, bits | XOR / bit tricks | O(n), O(1) | W11 |

### 7.3 Classification drill (Week 3 Saturday, then repeat in Weeks 6, 9 and 12)

Name the pattern for each statement in under 60 seconds, then check the answers below.

1. Given a sorted array of distinct integers rotated at an unknown pivot, find a target in O(log n).
2. Find the length of the longest substring containing at most two distinct characters.
3. Given meeting times, find the minimum number of rooms required.
4. Return all ways to place n non-attacking queens on an n × n board.
5. Given a list of words, find all words sharing a given prefix as the user types.
6. Count the number of contiguous subarrays whose sum is divisible by k (values may be negative).
7. Given tasks and their prerequisites, return a valid order or report impossibility.
8. Find the minimum number of coins to make an amount with given denominations.
9. Each day, find how many days until a strictly higher price.
10. A grid has walls and open cells; find the fewest steps from the top-left to the bottom-right.
11. Given flight costs between cities (all positive), find the cheapest route from A to B.
12. Given a list of points on a plane, return the k points closest to the origin.
13. Determine if a linked list has a cycle using O(1) memory.
14. Given a binary tree, return the values visible from the right side.
15. Given a stream of numbers, report the median after each insertion.

*Answers:* 1 boundary binary search on a rotated array; 2 variable sliding window with a count map; 3 intervals: sort + min-heap of end times (or sweep); 4 backtracking with pruning sets; 5 trie; 6 prefix sums with remainders in a hash map; 7 topological sort (Kahn); 8 unbounded-knapsack DP; 9 monotonic stack; 10 BFS on a grid; 11 Dijkstra; 12 max-heap of size k keyed by squared distance (or quickselect); 13 fast/slow pointers; 14 level-order BFS (last node per level); 15 two heaps.

### 7.4 When you cannot identify the pattern

1. **Shrink the problem.** Solve n = 1, 2, 3 by hand and write down each decision. Your manual procedure is often the algorithm.
2. **Ask "what would make this easy?"** If the input were sorted, if I knew the answer for the prefix, if I could look up any value in O(1). Then try to create that condition (sort, DP, hash map).
3. **Start from brute force and attack its bottleneck.** Repeated search → hash map. Repeated sums → prefix sums. Repeated subproblems → memo. Repeated min/max → heap or monotonic structure.
4. **Change the viewpoint.** Iterate from the right instead of the left; search from the targets instead of the sources; binary-search the answer instead of computing it; complement the question (count bad instead of good).
5. **Look at the constraints again.** They almost always reveal the target complexity, which narrows the candidates to two or three patterns.
6. **In an interview, say all of this aloud.** "I don't see the trick yet, so let me start with brute force and look for repeated work." Interviewers often give a hint when your reasoning is visible.

### 7.5 The method in action: brute force → bottleneck → optimisation

| Pattern | Problem | Brute force | Bottleneck | Optimisation | Result |
| --- | --- | --- | --- | --- | --- |
| Hash lookup | 1 Two Sum | Check all pairs, O(n²) | Inner loop searches for `target − x` | Map of seen values | O(n) time, O(n) space |
| Two pointers | 167 Two Sum II | All pairs, O(n²) | Ignores sorted order | Discard one end per step | O(n), O(1) |
| Sliding window | 3 Longest Substring | All substrings with a set check, O(n³) | Rebuilding overlapping windows | Keep a window and last-seen map | O(n) |
| Prefix sums | 560 Subarray Sum = K | All subarrays, O(n²) with running sums | Matching sums one by one | Count earlier prefixes in a map | O(n) |
| Binary search on answer | 875 Koko | Try every speed, O(max · n) | Linear scan over a monotone range | Binary search the speed | O(n log max) |
| Monotonic stack | 739 Daily Temperatures | Scan right from each day, O(n²) | Rescanning colder days | Stack of unresolved days | O(n) |
| Backtracking | 39 Combination Sum | All multisets, then filter | Exploring sums already over target | Sorted candidates + break | Exponential, O(N^(T/M + 1)) worst case (T = target, M = smallest candidate); pruning cuts the constant, not the bound |
| Bottom-up tree DFS | 543 Diameter | Height from every node, O(n²) | Recomputing heights | Return height, update global | O(n) |
| Heap | 215 Kth Largest | Sort, O(n log n) | Ordering elements we never need | Size-k min-heap | O(n log k) |
| BFS | 994 Rotting Oranges | Simulate minute by minute rescanning the grid, O((mn)²) | Rescanning unchanged cells | Multi-source BFS queue | O(mn) |
| Dijkstra | 743 Network Delay | Enumerate all paths, exponential | Revisiting nodes via longer routes | Heap by distance, finalise once | O((V + E) log V) |
| DP | 322 Coin Change | Recursion over coins, exponential | Same remaining amount solved repeatedly | Memo/table over amounts | O(amount × coins) |

**Full walk-through: 739 Daily Temperatures.**

1. *Restate:* for each day, how many days until a warmer day (0 if none).
2. *Constraints:* n ≤ 10⁵, temperatures 30–100. Edge cases: one day, strictly decreasing, all equal.
3. *Example:* `[73,74,75,71,69,72,76,73]` → `[1,1,4,2,1,1,0,0]`. By hand, I keep a mental list of days still waiting for a warmer day.
4. *Brute force:* for each i, scan j > i until warmer.
5. *Complexity:* O(n²) worst case (decreasing input) = 10¹⁰: too slow.
6. *Bottleneck:* colder days are rescanned for every earlier day.
7. *Pattern:* "next greater element" → monotonic stack of waiting indices.
8. *Why it works:* the stack's temperatures are decreasing; a warmer day resolves every colder waiting day on top; each index is pushed and popped once.
9. *Pseudocode:* for each i: while stack top is colder than t\[i\], pop j and set ans\[j\] = i − j; push i.
10. *Implement:* section 6.19 with `res[j] = i - j`.
11. *Test:* `[30]` → `[0]`; `[90,80,70]` → `[0,0,0]`; `[50,50]` → `[0,0]` (strictly warmer only).
12. *Complexity:* O(n) time, O(n) space.
13. *Correctness:* invariant: the stack holds exactly the unresolved indices, in decreasing temperature order.
14. *Lesson:* "days until" + "next warmer" = monotonic stack of indices; I first stored values and could not compute distances.

## 8. Revision and mistake-tracking system

Every attempted problem enters the tracker the same day. The calendar has 90 re-solve slots for about 150 problems, so not every problem can get every interval: the slots go to the problems that need them most (rules below). The target intervals are roughly +1, +3, +7 and +14 days, and a problem leaves active revision after three clean re-solves at least a week apart.

### 8.1 Spaced repetition on this calendar

| Interval | Where it happens | Which problems |
| --- | --- | --- |
| +1 day | Next day's 10-minute warm-up (named in section 4) | The hardest Core problem of the previous day |
| +3 days | A later warm-up or the Saturday review | Problems from Monday–Wednesday reviewed on Saturday |
| +7 days | Saturday review of the following week | 1–2 problems from the previous week |
| +14 days | Saturday review two weeks later | 1 problem per review |
| +30 days | Week 12 repair block and the post-roadmap plan | Anything solved independently three times |

**Adaptive rules.**

- Re-solved cleanly (no hints, within the time box) → double the next interval (3 → 7 → 14 → 30).
- Re-solved with a hint or over time → keep the same interval.
- Failed → next revision in 2 days, and change your study action by mistake type (8.3).
- **Mastered** = derived, implemented, explained and analysed without help on three occasions at least 7 days apart. Mastered problems leave active revision; sample one per week in Weeks 10–12.
- When more problems are due than slots available, fill the slots in this order: failed or "needed solution" problems, then Core problems solved with a hint, then Core problems not yet re-solved, then the most overdue of the rest. A problem that never reaches a slot gets one cold re-solve in the Week 12 repair block or in the post-roadmap plan (section 12).

### 8.2 Hint ladder (how much help you used)

Time-box first (on study days Easy 15, Medium 25, Hard 40 minutes; in assessments and mocks, the limits in section 9). Then climb one rung at a time, spending at least 5 minutes on each before the next:

| Level | Help used | Logged as |
| --- | --- | --- |
| 0 | None | Solved independently |
| 1 | Re-read constraints; check the pattern table (7.2) | Solved independently |
| 2 | Read this document's hint for the problem (section 5) | Solved with hint |
| 3 | Read the editorial's *approach* only, close it, then implement | Needed solution |
| 4 | Read the code; close it; re-implement from memory 30 minutes later | Needed solution |

A problem solved at level 3 or 4 is not "solved": it is scheduled for a cold re-solve in 2 days.

### 8.3 Mistake categories and what to change

| Code | Mistake | Example | What to change in revision |
| --- | --- | --- | --- |
| P | Did not recognise the pattern | Did not see 560 as prefix sums | Add the clue to your own pattern table; do the 7.3 drill; next time, write "clues" before anything else |
| A | Could not derive the algorithm | Knew it was DP, could not find the state | Re-derive brute force → bottleneck on paper; redo the theory example for that pattern; re-solve a simpler sibling first |
| D | Wrong data structure | Used an array where a heap was needed | Review the cost table (6.1) and the "when not to use" lines in section 3; state each operation's cost before choosing |
| L | Logic or implementation bug | Off-by-one in the window, lost list pointer | Write pseudocode first; dry-run on paper before running; re-type the template from memory 3 times |
| E | Edge case missed | Empty input, all negatives, single node | Add the case to your personal edge-case checklist; always test boundary inputs at step 11 |
| C | Complexity analysis error | Forgot the sort or recursion stack | Redo the Week 1 snippet drill; analyse three tracker problems aloud |
| R | Understood the solution but could not reproduce it | Read 146's solution, blank at re-solve | Shorten the interval to 1 day; explain it aloud without code; then re-implement in two separate sessions |

If the same code appears three times in a week, spend Sunday on that category (e.g. three **L** mistakes → re-implement five templates from section 6 from memory).

### 8.4 Tracker template

Keep one row per problem attempt (add rows below; or copy this table to a spreadsheet). Use the codes above in *Main mistake*.

| Problem | Pattern | Date first solved | Time taken (min) | Solved independently? | Hint required? | Main mistake | Next revision date | Re-solved without help? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 Two Sum | Hash lookup | 2 Nov | 14 | Yes | No | — | 3 Nov | 3 Nov: yes (6 min) |
| 49 Group Anagrams | Group by key | 4 Nov | 32 | No | Level 2 | P | 5 Nov | 5 Nov: yes (12 min) |
| 3 Longest Substring… | Variable window | 11 Nov | 40 | No | Level 3 | L | 13 Nov |  |
|  |  |  |  |  |  |  |  |  |

### 8.5 Notes format (5 minutes at the end of each day)

For each problem write four lines: **Clue** (what in the statement pointed to the pattern), **Key observation**, **Mistake** (code + one sentence), **Complexity**. These notes, not the code, are what you review before mocks.

## 9. Assessments and mock interviews

Six timed assessments (Weeks 2, 4, 6, 8, 10, 12) measure what you can do alone; six mock interviews (Weeks 5, 7, 9, 11 and twice in Week 12) measure what you can do while explaining. All new problems here are kept out of the bank so they stay unseen: do not open these links before the session.

### 9.1 Assessment rules (all six)

- **Conditions:** timer running, no notes, no hints, no AI, no editorial. LeetCode's "Run" is allowed; count each failed "Submit" as a bug.
- **Structure:** one cold re-solve (a problem from the bank chosen at random from the listed set, e.g. by rolling a die) plus two or three unseen problems.
- **Before coding each problem:** write steps 1–9 of the method (section 7.1) as comments.
- **Scoring (10 points per problem):**

| Criterion | Points | Full marks when |
| --- | --- | --- |
| Correct, accepted solution | 4 | Accepted within the time limit (2 if accepted late, 1 if correct approach but buggy) |
| Optimal or acceptable complexity | 2 | Meets the complexity the constraints require |
| Complexity stated correctly | 1 | Time and space written before submitting |
| Edge cases | 2 | Listed at step 2 and tested at step 11 |
| Brute force articulated | 1 | Written with its complexity before the optimisation |

- **Review (25 minutes):** for each lost point, write the mistake code (section 8.3) and the fix; add all problems to the tracker.
- **Pass:** at least 70% of total points **and** at least one unseen problem fully accepted.
- **If you fail:** use the following Sunday for remediation: re-solve the two tracker problems closest to each failed problem's pattern, then retry the failed problem cold. If you fail two assessments in a row, insert a catch-up week: repeat the weakest week's Core problems and push the calendar by one week (section 10 explains how).

### 9.2 The six assessments

| # | Date | Topics tested | Cold re-solve (pick 1 at random) | Unseen problems and time limits | Total time | Pass mark |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | Sat 14 Nov | Complexity, arrays, hashing, two pointers, sliding window, prefix sums | 49, 3, 560, 11 (20 min) | [1456. Maximum Number of Vowels in a Substring of Given Length](https://leetcode.com/problems/maximum-number-of-vowels-in-a-substring-of-given-length/) (Medium, 25 min); [974. Subarray Sums Divisible by K](https://leetcode.com/problems/subarray-sums-divisible-by-k/) (Medium, 35 min) | 80 min + 10 buffer | 21 / 30 |
| A2 | Sat 28 Nov | + binary search, sorting, linked lists, stacks, monotonic stack | 34, 153, 146, 143 (20 min) | [82. Remove Duplicates from Sorted List II](https://leetcode.com/problems/remove-duplicates-from-sorted-list-ii/) (Medium, 30 min); [901. Online Stock Span](https://leetcode.com/problems/online-stock-span/) (Medium, 30 min) | 80 min + 10 buffer | 21 / 30 |
| A3 | Sat 12 Dec | Recursion, backtracking, trees, BSTs (+ earlier topics in the re-solve) | 739, 39, 79, 236 (20 min) | [216. Combination Sum III](https://leetcode.com/problems/combination-sum-iii/) (Medium, 25 min); [1026. Maximum Difference Between Node and Ancestor](https://leetcode.com/problems/maximum-difference-between-node-and-ancestor/) (Medium, 30 min) | 75 min + 15 buffer | 21 / 30 |
| A4 | Sat 26 Dec | Heaps, intervals, tries, graph traversal, topological sort | 23, 56, 200, 207 (20 min) | [1642. Furthest Building You Can Reach](https://leetcode.com/problems/furthest-building-you-can-reach/) (Medium, 35 min); [1376. Time Needed to Inform All Employees](https://leetcode.com/problems/time-needed-to-inform-all-employees/) (Medium, 30 min) | 85 min + 5 buffer | 21 / 30 |
| A5 | Sat 9 Jan | Dijkstra, Union-Find, greedy, DP I | 743, 684, 55, 198 (20 min) | [1319. Number of Operations to Make Network Connected](https://leetcode.com/problems/number-of-operations-to-make-network-connected/) (Medium, 30 min); [343. Integer Break](https://leetcode.com/problems/integer-break/) (Medium, 30 min) | 80 min + 10 buffer | 21 / 30 |
| A6 | Sat 23 Jan | Everything; final readiness | One problem from your weakest pattern (10 min) | [909. Snakes and Ladders](https://leetcode.com/problems/snakes-and-ladders/) (Medium, 35 min); [1049. Last Stone Weight II](https://leetcode.com/problems/last-stone-weight-ii/) (Medium, 30 min); [1268. Search Suggestions System](https://leetcode.com/problems/search-suggestions-system/) (Medium, 25 min) | 100 min | 28 / 40 |

### 9.3 Mock interview format

- **Who interviews:** ideally a peer or colleague preparing for the same interviews (trade roles). If no one is available, Claude can act as the interviewer using the prompt below, in a new chat.
- **Length:** 45 minutes of interview + 15 minutes of feedback, following the structure in section 3, Week 12.
- **Rules:** shared editor or plain text pad without autocomplete; you speak continuously; the interviewer answers clarifying questions, gives at most two hints, and asks one follow-up (complexity improvement, a variant, or a new edge case).
- **Problem choice:** the interviewer picks one problem from the pool for that mock. If you recognise the problem, say so and take another.

**Interviewer prompt for Claude (copy into a new chat):**

```text
Act as a senior software engineer interviewing me for a product-company coding round.
Pick ONE problem from these LeetCode numbers and present it in your own words without naming it: <paste the pool numbers>.
Run a 45-minute interview: let me ask clarifying questions; ask me for a brute-force approach and its complexity;
push me to optimise; let me code in JavaScript in the chat; ask me to dry-run and test edge cases.
Give at most two hints, only when I am stuck for several minutes. Ask one follow-up question at the end.
Then score me 1–4 on: problem understanding, approach and optimisation, coding, verification, communication.
Give a hiring signal (strong no / no / lean yes / yes / strong yes) and three concrete improvements.
```

### 9.4 Mock scoring rubric

| Dimension | 1 | 2 | 3 | 4 |
| --- | --- | --- | --- | --- |
| Problem understanding | Started coding without clarifying | Asked some questions, missed key constraints | Clarified constraints and edge cases | Also proposed test cases and confirmed the output format |
| Approach and optimisation | No working approach | Brute force only | Optimal with a hint | Optimal independently, with justification |
| Coding | Did not finish | Finished with major bugs | Minor bugs fixed when found | Clean, correct, well-structured |
| Verification | No testing | Ran examples only | Dry-ran and tested edge cases | Found and fixed own bug before running |
| Communication | Mostly silent | Explained only when asked | Narrated reasoning clearly | Clear, structured, discussed trade-offs |

**Pass:** 14 / 20 or more with no dimension at 1. Week 12 target: 15 / 20.

**Interviewer-style feedback format:** "Strengths: … Concerns: … Signal: lean yes. To improve: 1) … 2) … 3) …". Copy each mock's feedback into your notes and pick one improvement to practise in every problem the following week.

**If a mock goes badly:** re-solve the mock problem cold two days later while speaking aloud and recording yourself; listen back for long silences and unexplained jumps. If communication scored 1–2, do the 90-second explanation drill (section 3, Week 12) daily for the next week.

### 9.5 Mock problem pools (interviewer copy)

Each pool has three Medium problems not used anywhere else in this plan.

| Mock | Date | Topics in scope | Pool |
| --- | --- | --- | --- |
| 1 | Sat 5 Dec | Arrays, hashing, prefix sums, two pointers, stacks | [525. Contiguous Array](https://leetcode.com/problems/contiguous-array/) · [1679. Max Number of K-Sum Pairs](https://leetcode.com/problems/max-number-of-k-sum-pairs/) · [735. Asteroid Collision](https://leetcode.com/problems/asteroid-collision/) |
| 2 | Sat 19 Dec | Trees, heaps, prefix sums on paths | [1161. Maximum Level Sum of a Binary Tree](https://leetcode.com/problems/maximum-level-sum-of-a-binary-tree/) · [437. Path Sum III](https://leetcode.com/problems/path-sum-iii/) · [692. Top K Frequent Words](https://leetcode.com/problems/top-k-frequent-words/) |
| 3 | Sat 2 Jan | Graphs (BFS/DFS), greedy reachability | [1926. Nearest Exit from Entrance in Maze](https://leetcode.com/problems/nearest-exit-from-entrance-in-maze/) · [1466. Reorder Routes to Make All Paths Lead to the City Zero](https://leetcode.com/problems/reorder-routes-to-make-all-paths-lead-to-the-city-zero/) · [1306. Jump Game III](https://leetcode.com/problems/jump-game-iii/) |
| 4 | Sat 16 Jan | Dynamic programming | [931. Minimum Falling Path Sum](https://leetcode.com/problems/minimum-falling-path-sum/) · [1048. Longest String Chain](https://leetcode.com/problems/longest-string-chain/) · [120. Triangle](https://leetcode.com/problems/triangle/) |
| 5 | Wed 20 Jan | Mixed: heaps, graphs, design | [1834. Single-Threaded CPU](https://leetcode.com/problems/single-threaded-cpu/) · [2101. Detonate the Maximum Bombs](https://leetcode.com/problems/detonate-the-maximum-bombs/) · [1352. Product of the Last K Numbers](https://leetcode.com/problems/product-of-the-last-k-numbers/) |
| 6 | Fri 22 Jan | Mixed: trees as graphs, multi-source BFS, sliding window | [863. All Nodes Distance K in Binary Tree](https://leetcode.com/problems/all-nodes-distance-k-in-binary-tree/) · [1162. As Far from Land as Possible](https://leetcode.com/problems/as-far-from-land-as-possible/) · [2024. Maximize the Confusion of an Exam](https://leetcode.com/problems/maximize-the-confusion-of-an-exam/) |

After each mock, the two unused pool problems become extra practice for the next Sunday.

## 10. Progress scorecards and milestones

Fill one scorecard row every Saturday (10 minutes) from your tracker; the milestone checks at Weeks 4, 8 and 12 decide whether you continue as planned or slow down.

### 10.1 Metric definitions

| Metric | How to measure |
| --- | --- |
| Unique problems attempted | New problems first tried this week (bank, assessments, mocks) |
| Solved independently | Hint levels 0–1, within the time box |
| Solved with hints | Hint level 2 |
| Needed solution | Hint levels 3–4 |
| Re-solves passed / scheduled | Clean cold re-solves ÷ re-solves due this week |
| Patterns recognised | Problems where you named the right pattern within 8 minutes ÷ problems attempted |
| Avg time to approach | Minutes from reading to an agreed optimal approach (steps 1–8), averaged over Mediums |
| Complexity accuracy | Problems where your stated time and space matched the correct ones ÷ problems attempted |
| Confidence (1–5) | 1 = cannot start without help; 3 = can solve with effort; 5 = can teach it |

### 10.2 Weekly scorecard

| Week | Topics completed | Unique attempted | Independent | With hints | Needed solution | Re-solves passed / due | Patterns recognised | Avg time to approach (min) | Complexity accuracy | Confidence | Needs more practice |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 |  |  |  |  |  |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |  |  |  |  |  |
| 5 |  |  |  |  |  |  |  |  |  |  |  |
| 6 |  |  |  |  |  |  |  |  |  |  |  |
| 7 |  |  |  |  |  |  |  |  |  |  |  |
| 8 |  |  |  |  |  |  |  |  |  |  |  |
| 9 |  |  |  |  |  |  |  |  |  |  |  |
| 10 |  |  |  |  |  |  |  |  |  |  |  |
| 11 |  |  |  |  |  |  |  |  |  |  |  |
| 12 |  |  |  |  |  |  |  |  |  |  |  |

### 10.3 Milestones

| Measure | Week 4 (Sat 28 Nov) | Week 8 (Sat 26 Dec) | Week 12 (Sat 23 Jan) |
| --- | --- | --- | --- |
| Cumulative unique problems attempted | ≥ 50 (46 scheduled + at least 4 Stretch) | ≥ 100 (91 scheduled + at least 9 Stretch) | ≥ 145 (133 scheduled + at least 12 Stretch) |
| Easy solved independently within 15 min | ≥ 80% | ≥ 90% | ≥ 95% |
| Medium solved independently (last 2 weeks) | ≥ 40% | ≥ 55% | ≥ 65% |
| Unseen Mediums in assessments/mocks solved (cumulative) | ≥ 1 of 4 (A1–A2) | ≥ 5 of 10 (A1–A4, Mocks 1–2) | ≥ 12 of 19 (about 60%) |
| Patterns recognised within 8 min | ≥ 60% | ≥ 70% | ≥ 80% |
| Avg time to approach (Medium) | ≤ 20 min | ≤ 15 min | ≤ 10 min |
| Complexity accuracy | ≥ 85% | ≥ 90% | ≥ 95% |
| Re-solve pass rate | ≥ 65% | ≥ 75% | ≥ 80% |
| Assessment / mock results | A1 and A2 passed (or A2 passed after remediation) | A3, A4 passed; Mocks 1–2 ≥ 12 / 20 (a progress target; the pass mark stays 14 / 20) | A6 passed; Mocks 5–6 ≥ 15 / 20 |
| Written from memory in ≤ 10 min each | Binary search (lower bound), linked-list reversal, head-pointer queue | + backtracking skeleton, BFS by level, MinHeap, Kahn | + Dijkstra, DSU, memo → table DP conversion |

### 10.4 If you miss a milestone

- **Missed by one or two measures:** continue the schedule; spend the next two Sundays on the weakest measure (e.g. low re-solve rate → only re-solves on Sunday).
- **Missed by three or more measures at Week 4 or 8:** insert one *consolidation week* before continuing. Re-do the Core problems of the two weakest weeks as cold re-solves (Mon–Fri), then a re-take of the most recent assessment with the unused problems from the matching mock pool (Saturday). Every later date shifts by one week, and the plan ends on 31 Jan instead of 24 Jan.
- **Missed at Week 12:** this is common and fine. Use section 12's plan for 4–6 more weeks before scheduling demanding interview loops, and focus on the measures you missed.

Why these targets: they are set for about 2 hours a day with a full-time job. A 60–70% unseen-Medium solve rate with clear communication is a realistic 12-week outcome; consistent Hard performance is not, and the plan does not pretend otherwise.

## 11. Final interview-readiness checklist (Sun 24 Jan)

Tick only what you have *demonstrated* in the last two weeks (assessment, mock or cold re-solve), not what you have read. Then read your verdict at the bottom.

### Fundamentals

- [ ] I state time and space complexity correctly, including sort cost, recursion stack and output size, for any problem in my tracker.
- [ ] I use constraints to name a target complexity before choosing an approach.
- [ ] I know the cost of every JavaScript built-in I use (section 6.1) and never use `shift()` or `includes()` inside hot loops.
- [ ] I write numeric sorts, multi-key comparators and 2-D arrays without the classic bugs.

### Patterns (can recognise and solve an unseen Medium)

- [ ] Hashing, two pointers, sliding window, prefix sums, Kadane
- [ ] Boundary binary search and binary search on the answer
- [ ] Linked-list rewiring, fast/slow pointers, LRU-style design
- [ ] Stack matching and monotonic stack
- [ ] Backtracking with duplicates and pruning
- [ ] Trees: bottom-up, top-down, level-order; BST properties
- [ ] Heaps (top-K, k-way merge, two heaps) and intervals
- [ ] Graphs: flood fill, BFS shortest path, topological sort, Dijkstra, Union-Find
- [ ] Greedy with a justification or counterexample
- [ ] DP: 1-D, knapsack, grid, two-sequence, LIS

### Implementation from memory (≤ 10 minutes each)

- [ ] Lower bound, MinHeap, head-pointer queue, linked-list reversal
- [ ] Backtracking skeleton, level-order BFS, Kahn's algorithm, Dijkstra, DSU, trie
- [ ] Memoised recursion converted to a bottom-up table

### Communication and process

- [ ] I follow the 45-minute structure without being prompted.
- [ ] I always state a brute force and its complexity before optimising.
- [ ] I dry-run my code on an example and test edge cases before pressing Run.
- [ ] I explained my last five solutions in under 90 seconds each.
- [ ] I switched away from a failing approach at least once in a mock and said why.
- [ ] I take hints by restating them and connecting them to the bottleneck.

### Evidence

- [ ] Assessment 6 passed (≥ 28 / 40).
- [ ] Mocks 5 and 6 each ≥ 15 / 20, with no dimension at 1.
- [ ] Re-solve pass rate ≥ 80% over Weeks 11–12.

### Verdict

| Result (check the rows in order; first match wins) | Verdict | Next step |
| --- | --- | --- |
| All 3 Evidence items ticked **and** at least 23 of 26 in total | Ready for most product-company coding rounds | Start applying; use section 12's interview-season mode |
| At least 2 Evidence items ticked **and** at least 18 of 26 in total | Nearly ready | 3–4 more weeks of section 12's plan focused on unticked items, then apply |
| Anything else (for example Assessment 6 failed and Mocks 5–6 below 15 / 20) | Not yet | 6–8 more weeks; repeat the weakest phase's Core problems as cold re-solves and add two mocks per week |

The coding round is one part of a product-company loop; system design (for 3.5 years of experience, usually expected) and behavioural interviews need separate preparation.

## 12. Post-roadmap practice strategy

After 24 Jan, drop to about 6 hours a week: enough to keep and extend the skill without the daily load. Switch to the more intensive interview-season mode 3–4 weeks before real interviews.

### 12.1 Maintenance plan (from Mon 25 Jan 2027, \~6 hours/week)

| Day | Duration | Activity |
| --- | --- | --- |
| Tue | 60 min | One unseen Medium (timed, 35 min) + one tracker re-solve |
| Thu | 60 min | One unseen Medium from your weakest pattern + one re-solve |
| Sat | 2 h | Alternate weeks: a mock interview (45 + 15 min) or a timed set of 2 Mediums + 1 Hard attempt; then scorecard update |
| Sun | 60–90 min (optional) | LeetCode weekly contest (check its current schedule on LeetCode) or one deferred topic from 12.2 |

Keep the tracker and spaced repetition running: about 8–10 new problems and 8 re-solves a week. Every four weeks, take one Assessment-style set using problems you have not seen, and compare your scores with Week 12.

### 12.2 Deferred topics, in priority order (months 4–6)

1. **Tree DP** (e.g. House Robber III, binary tree cameras): a natural extension of Week 6 + Week 10.
2. **Interval and bitmask DP** (burst balloons, travelling-salesman-style states with n ≤ 16).
3. **Monotonic deque** (239 if not done) and **sliding window + prefix combinations**.
4. **Advanced graphs:** Bellman-Ford and Floyd-Warshall properly, strongly connected components, bridges and articulation points.
5. **Range structures:** Fenwick tree, then segment tree (only if targeting companies known for them).
6. **String algorithms:** KMP and rolling hash (Rabin-Karp).
7. **Maths:** GCD, sieve of Eratosthenes, modular inverse, combinatorics with mod 10⁹ + 7.

Add one topic every two weeks: one theory session, three problems, then into the tracker like everything else.

### 12.3 Interview-season mode (3–4 weeks before interviews)

- Go back to \~2 hours a day, 5 days a week.
- 70% mixed unseen Mediums under a 35-minute timer, 20% re-solves of your mistake list, 10% Hards.
- Two mocks a week with different people; vary the interviewer style.
- Practise in the environment you will use (plain editor, no autocomplete, or a shared doc) and speak throughout.
- Keep system design and behavioural preparation in parallel; for a 3.5-year engineer they usually carry significant weight in product-company loops.

### 12.4 If interviews arrive before Week 12

Prioritise by frequency, in this order, using the Core problems only: Weeks 1–2 (arrays, hashing, windows), Week 6 (trees), Week 8 (graphs), Week 3 (binary search), Week 4 (lists and stacks), Week 10 (DP I), Week 7 (heaps and intervals), Week 5 (backtracking). Do at least two mocks before the first interview, even if that costs a topic.
