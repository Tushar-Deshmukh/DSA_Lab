# Page diagnostic: Session A

```ex
type: mcq
tag: "A1"
q: "What is the time complexity of `for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {...}`?"
options:
  - t: "O(n²)"
    ok: true
    why: "The inner loop runs n + (n − 1) + … + 1 = n(n + 1)/2 times."
  - t: "O(n log n)"
    why: "The inner loop shrinks by one each time, not by half."
    kind: concept
  - t: "O(n)"
    why: "There are two nested loops over n, and the inner one averages n/2 iterations."
    kind: concept
explain: "n(n + 1)/2 is still Θ(n²): constants and lower terms are dropped."
hints:
  - "Add up how many times the inner loop runs for each i."
```

```ex
type: mcq
tag: "A2"
q: "What is the complexity of `for (let i = 1; i < n; i *= 2) {...}`?"
options:
  - t: "O(log n)"
    ok: true
    why: "i doubles each step, so it reaches n after about log₂ n steps."
  - t: "O(n)"
    why: "i does not increase by 1; it doubles."
    kind: concept
  - t: "O(√n)"
    why: "That would be i * i < n with i++."
    kind: concept
explain: "Doubling (or halving) a counter gives a logarithmic number of iterations."
hints:
  - "How many doublings take 1 to n?"
```

```ex
type: mcq
tag: "A3"
q: "You loop over an array of length n and call `arr.includes(x)` inside the loop. Total complexity?"
options:
  - t: "O(n²)"
    ok: true
    why: "`includes` is a linear scan, done n times."
  - t: "O(n)"
    why: "`includes` is not O(1): arrays have no index by value. A Set's `has` is O(1)."
    kind: concept
  - t: "O(n log n)"
    why: "No sorting or halving happens."
    kind: concept
explain: "Hidden loops inside built-ins count: `includes`, `indexOf`, `slice`, `shift`, spread."
hints:
  - "What does `includes` do internally?"
```

```ex
type: mcq
tag: "A4"
q: "What does `s = s.slice(1)` cost inside a loop that runs n times on a string of length n?"
options:
  - t: "O(n²) total in the standard cost model: each slice can copy up to n characters"
    ok: true
    why: "V8 often shares memory between a string and its slices, so it may run faster in practice, but interviewers expect O(n) per slice. Move an index instead."
  - t: "O(n) total: slicing is O(1)"
    why: "Not in the cost model interviewers use, and array slices always copy."
    kind: concept
  - t: "O(log n) per slice"
    why: "Slicing does not halve anything."
    kind: concept
explain: "Replace repeated slicing with an index that moves."
hints:
  - "How many characters can one slice copy?"
```

```ex
type: mcq
tag: "A5"
q: "Why is calling `queue.shift()` in a BFS loop a problem in JavaScript?"
options:
  - t: "`shift` re-indexes the remaining elements, O(n) per call, so BFS becomes O(V²). Use a head pointer."
    ok: true
  - t: "`shift` returns the last element, not the first."
    why: "It returns the first element; the problem is its cost."
    kind: impl
  - t: "It is not a problem: `shift` is O(1)."
    why: "Arrays are not linked lists; removing the front moves every other element."
    kind: concept
explain: "Section 6.5: an array plus a head index gives O(1) amortised dequeue."
hints:
  - "What has to happen to every other element when the first one is removed?"
```

```ex
type: predict
tag: "A6"
q: "What does this print, and why?"
code: |
  console.log(JSON.stringify([10, 9, 1, 2].sort()));
answer: "[1,10,2,9]"
normalize: exact
traps:
  "[1,2,9,10]": "The default sort compares elements as strings, so \"10\" comes before \"2\". Pass `(a, b) => a - b` for numbers."
  "[10,9,2,1]": "sort() is ascending, and it compares as strings."
explain: "`[1, 10, 2, 9]`: the default comparator converts to strings. Use `(a, b) => a - b`."
hints:
  - "What type does the default comparator compare?"
```

```ex
type: mcq
tag: "A7"
q: "Which are good reasons to prefer `Map` over a plain object for counting frequencies? Select all that apply."
options:
  - t: "Keys can be of any type: numbers stay numbers"
    ok: true
  - t: "No prototype keys such as \"constructor\" or \"__proto__\" to collide with"
    ok: true
  - t: "`size` is O(1) and iteration order is the insertion order"
    ok: true
  - t: "A Map uses less memory than an array for 26 lowercase letters"
    why: "For 26 lowercase letters a fixed array of 26 counts is smaller and faster than either."
    kind: concept
explain: "The roadmap's written key accepts any two of the first three reasons; here the point needs all three selected."
hints:
  - "What can go wrong with `obj[key]` when key is \"constructor\"?"
```

```ex
type: complexity
tag: "A8"
q: "Naive recursive Fibonacci, `fib(n) = fib(n − 1) + fib(n − 2)`:"
fields:
  - label: Time
    answer: O(2ⁿ)
    options: ['O(n)', 'O(n²)', 'O(2ⁿ)', 'O(log n)']
    why:
      O(n): "That is the memoised version; the naive one recomputes the same values exponentially often."
  - label: Space
    answer: O(n)
    options: ['O(1)', 'O(n)', 'O(2ⁿ)']
    why:
      O(2ⁿ): "Only one path of the call tree is on the stack at a time: depth n."
explain: "More precisely O(φⁿ) ≈ O(1.618ⁿ), commonly stated as O(2ⁿ); the call stack is O(n) deep."
hints:
  - "Time: count the calls. Space: how deep does the stack get?"
```

```ex
type: mcq
tag: "A9"
q: "Constraints say n ≤ 10⁵. Which time complexities are acceptable? Select all that apply."
options:
  - t: "O(n)"
    ok: true
  - t: "O(n log n)"
    ok: true
  - t: "O(n √n), at a push"
    ok: true
    why: "About 3·10⁷: borderline but usually fine."
  - t: "O(n²)"
    why: "About 10¹⁰ operations: far too slow."
    kind: concept
explain: "Budget roughly 10⁸ simple operations."
hints:
  - "Plug n = 10⁵ into each."
```

```ex
type: trace
tag: "A10"
q: "A subarray is contiguous; a subsequence keeps order but may skip elements. For an array of length n = 4:"
rows:
  - prompt: "Number of non-empty subarrays"
    answer: '10'
    why: "n(n + 1)/2."
  - prompt: "Number of non-empty subsequences"
    answer: '15'
    why: "2ⁿ − 1."
verify: |
  const n = 4; console.log(n * (n + 1) / 2); console.log(2 ** n - 1);
explain: "In general n(n + 1)/2 subarrays (quadratic) and 2ⁿ − 1 subsequences (exponential)."
hints:
  - "Subarrays: choose a start and an end. Subsequences: each element is in or out."
```

```ex
type: predict
tag: "A11"
q: "What does this print?"
code: |
  console.log(1 << 31);
answer: "-2147483648"
normalize: exact
traps:
  "2147483648": "Bitwise operators produce signed 32-bit integers; bit 31 is the sign bit."
explain: "`1 << 31` sets the sign bit of a signed 32-bit integer."
hints:
  - "What type do bitwise operators return in JavaScript?"
```

```ex
type: mcq
tag: "A12"
q: "In closed-interval binary search on a sorted array, what must be true about `[lo, hi]` at the start of every iteration?"
options:
  - t: "If the target exists, it lies inside [lo, hi]; each step must keep that true while shrinking the range"
    ok: true
  - t: "lo and hi are always both even"
    why: "Parity is irrelevant."
    kind: concept
  - t: "The middle element is always the target"
    why: "Then no search would be needed."
    kind: concept
explain: "This is the loop invariant. Off-by-one bugs come from updates that break it (for example hi = mid when mid was already ruled out)."
hints:
  - "What is the loop promising to preserve?"
```

# Page depmap: Dependency map

@viz depmap

# Page reference: Try the pitfalls

```ex
type: predict
tag: The 2-D array bug (6.3)
q: "What does this print?"
code: |
  const bad = new Array(3).fill([]);
  bad[0].push(1);
  console.log(JSON.stringify(bad));
answer: "[[1],[1],[1]]"
normalize: exact
traps:
  "[[1],[],[]]": "`fill([])` puts the same array object in all three slots, so pushing into one pushes into all. Use `Array.from({ length: 3 }, () => [])`."
explain: "`fill` copies the reference, not the array."
hints:
  - "How many arrays does `fill([])` create?"
```

```ex
type: mcq
tag: Choosing the queue (6.5)
q: "A sliding-window-maximum solution needs to add at the back, and remove from both the front and the back, n times. Which structure from 6.5 keeps every operation O(1) amortised?"
options:
  - t: "The circular-buffer Deque"
    ok: true
  - t: "A plain array with push, pop and shift"
    why: "`shift` is O(n), so the total can become O(n²)."
    kind: concept
  - t: "The head-pointer Queue"
    why: "It cannot remove from the back."
    kind: concept
explain: "Front and back removal → deque."
hints:
  - "Which end does each operation touch?"
```

# Page method: Classification drill (repeat)

Repeat the drill in Weeks 6, 9 and 12, as section 7.3 asks. Your answers here are stored separately from the Week 3 attempt, so you can compare.

```ex
type: pattern
tag: "Drill 1 / 15"
q: "Given a sorted array of distinct integers rotated at an unknown pivot, find a target in O(log n)."
options:
  - t: Boundary binary search on a rotated array
    ok: true
  - t: Two pointers
    kind: concept
    why: "O(log n) rules out anything linear."
  - t: Hash set
    kind: concept
    why: "A set ignores the order the problem gives you, and building it is O(n)."
explain: "Clues: sorted, rotated, O(log n). This was Tuesday's Stretch (33)."
hints:
  - Which complexity is required?
```

```ex
type: pattern
tag: "Drill 2 / 15"
q: "Find the length of the longest substring containing at most two distinct characters."
options:
  - t: Variable sliding window with a count map
    ok: true
  - t: Prefix sums with a hash map
    kind: concept
    why: "There is no sum condition."
  - t: Dynamic programming
    kind: concept
    why: "A contiguous range with a monotone constraint is a window problem."
explain: "Longest + contiguous + \"at most\" = variable window (Week 2)."
hints:
  - Is the constraint monotone as the window grows?
```

```ex
type: pattern
tag: "Drill 3 / 15"
q: "Given meeting times, find the minimum number of rooms required."
options:
  - t: "Intervals: sort by start, then a min-heap of end times (or a sweep)"
    ok: true
  - t: Binary search
    kind: concept
    why: "Nothing here is a monotone predicate over sorted data."
  - t: Backtracking
    kind: concept
    why: "No need to try all assignments: a greedy sweep is exact."
explain: "Week 7: intervals and heaps."
hints:
  - "What do you need to know at the moment a meeting starts?"
```

```ex
type: pattern
tag: "Drill 4 / 15"
q: "Return all ways to place n non-attacking queens on an n × n board."
options:
  - t: Backtracking with pruning sets
    ok: true
  - t: Dynamic programming
    kind: concept
    why: "The output is every arrangement, so you must enumerate them."
  - t: BFS
    kind: concept
    why: "BFS finds shortest paths; here you list all valid placements."
explain: "\"Return all ways\" with small n is the backtracking clue (Week 5)."
hints:
  - "\"All ways\": count or list?"
```

```ex
type: pattern
tag: "Drill 5 / 15"
q: "Given a list of words, find all words sharing a given prefix as the user types."
options:
  - t: Trie
    ok: true
  - t: Sorting each word
    kind: concept
    why: "Sorting letters destroys the prefix."
  - t: Sliding window
    kind: concept
    why: "No contiguous range of an array is involved."
explain: "Prefix queries over many words = trie (Week 7)."
hints:
  - "Which structure is organised by prefix?"
```

```ex
type: pattern
tag: "Drill 6 / 15"
q: "Count the number of contiguous subarrays whose sum is divisible by k (values may be negative)."
options:
  - t: Prefix sums with remainders in a hash map
    ok: true
  - t: Sliding window
    kind: concept
    why: "Negative values break monotonicity."
  - t: Two pointers
    kind: concept
    why: "There is no sorted order to exploit."
explain: "Week 2 Day 5: key the map by `((cur % k) + k) % k`."
hints:
  - "When do two prefix sums enclose a sum divisible by k?"
```

```ex
type: pattern
tag: "Drill 7 / 15"
q: "Given tasks and their prerequisites, return a valid order or report impossibility."
options:
  - t: Topological sort (Kahn's algorithm)
    ok: true
  - t: Sorting with a comparator
    kind: concept
    why: "Prerequisites form a graph, not a total order; a comparator cannot express \"no order between these two\"."
  - t: Union-Find
    kind: concept
    why: "Union-Find tracks connectivity, not direction or order."
explain: "Prerequisites, ordering, dependencies → topological sort (Week 8)."
hints:
  - "What structure do prerequisites form?"
```

```ex
type: pattern
tag: "Drill 8 / 15"
q: "Find the minimum number of coins to make an amount with given denominations."
options:
  - t: "Dynamic programming (unbounded knapsack)"
    ok: true
  - t: "Greedy: always take the largest coin"
    kind: concept
    why: "Fails for coins [1, 3, 4], amount 6: greedy gives 4+1+1, optimal is 3+3."
  - t: Binary search on the answer
    kind: concept
    why: "Feasibility of \"k coins\" is not checkable greedily."
explain: "Min cost with overlapping choices → DP (Week 10)."
hints:
  - "Does greedy always work? Try coins [1, 3, 4], amount 6."
```

```ex
type: pattern
tag: "Drill 9 / 15"
q: "Each day, find how many days until a strictly higher price."
options:
  - t: Monotonic stack
    ok: true
  - t: Binary search
    kind: concept
    why: "The prices are not sorted."
  - t: Two nested loops
    kind: concept
    why: "Correct but O(n²)."
explain: "\"Next greater\" → monotonic stack (Week 4)."
hints:
  - "This is the \"next greater element\" question."
```

```ex
type: pattern
tag: "Drill 10 / 15"
q: "A grid has walls and open cells; find the fewest steps from the top-left to the bottom-right."
options:
  - t: BFS on the grid
    ok: true
  - t: DFS on the grid
    kind: concept
    why: "DFS finds *a* path, not the shortest one."
  - t: Dijkstra
    kind: concept
    why: "Works, but every step costs 1, so plain BFS is simpler and faster."
explain: "Minimum steps with equal costs → BFS (Week 8)."
hints:
  - Are all moves equally expensive?
```

```ex
type: pattern
tag: "Drill 11 / 15"
q: "Given flight costs between cities (all positive), find the cheapest route from A to B."
options:
  - t: Dijkstra
    ok: true
  - t: BFS
    kind: concept
    why: "BFS minimises the number of edges, not their total cost."
  - t: Topological sort
    kind: concept
    why: "Flights can form cycles."
explain: "Weighted shortest path with non-negative weights → Dijkstra (Week 9)."
hints:
  - "Weighted or unweighted?"
```

```ex
type: pattern
tag: "Drill 12 / 15"
q: "Given a list of points on a plane, return the k points closest to the origin."
options:
  - t: Max-heap of size k keyed by squared distance (or quickselect)
    ok: true
  - t: Sort all points by distance
    why: "Correct and simple at O(n log n); the heap is O(n log k). Acceptable, but name the better option."
    kind: concept
  - t: Binary search
    kind: concept
    why: "There is no sorted structure to search."
explain: "\"k closest/largest/smallest\" → heap of size k (Week 7)."
hints:
  - "You need only k of n items."
```

```ex
type: pattern
tag: "Drill 13 / 15"
q: "Determine if a linked list has a cycle using O(1) memory."
options:
  - t: Fast and slow pointers
    ok: true
  - t: A Set of visited nodes
    kind: concept
    why: "Works but uses O(n) memory, which the problem forbids."
  - t: Recursion
    kind: concept
    why: "Recursion uses O(n) stack and would not terminate on a cycle without a visited set."
explain: "Week 4: Floyd's cycle detection."
hints:
  - "O(1) memory rules out remembering nodes."
```

```ex
type: pattern
tag: "Drill 14 / 15"
q: "Given a binary tree, return the values visible from the right side."
options:
  - t: "Level-order BFS (last node per level)"
    ok: true
  - t: Inorder traversal
    kind: concept
    why: "Inorder does not group nodes by level."
  - t: Always follow right children
    kind: concept
    why: "A left subtree can be deeper and visible from the right."
explain: "Views and levels → BFS by level (Week 6)."
hints:
  - "What do the visible nodes have in common?"
```

```ex
type: pattern
tag: "Drill 15 / 15"
q: "Given a stream of numbers, report the median after each insertion."
options:
  - t: Two heaps (max-heap of the lower half, min-heap of the upper half)
    ok: true
  - t: Sort after every insertion
    kind: concept
    why: "O(n log n) per insertion."
  - t: A hash map
    kind: concept
    why: "Hash maps keep no order."
explain: "Running median → two heaps (Week 7)."
hints:
  - "You need fast access to the middle, not to everything."
```
