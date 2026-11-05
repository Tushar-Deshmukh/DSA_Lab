// Ported from legacy/src/viz/w07.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint, rstr } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { fmt } from './_helpers';

interface Input {
  words: string[];
  queries: string[][];
}

interface Step extends VizStep {
  nodes: { id: number; label: string; parent: number | null; end: boolean }[];
  path: number[];
  miss?: number | null;
  results?: boolean[];
  done?: boolean;
  result?: boolean[];
}

// ---------- trie ----------
export default defineViz<Input, Step>('trie', {
  title: 'Trie: insert, search, prefix and wildcard queries',
  inputs: [
    { key: 'words', label: 'insert', type: 'array', def: ['app', 'apple', 'bat'], wide: true },
    {
      key: 'queries',
      label: 'queries ["search"|"prefix"|"wild", text]',
      type: 'json',
      def: [
        ['search', 'app'],
        ['search', 'ap'],
        ['prefix', 'ap'],
        ['wild', 'b.t'],
        ['wild', 'a..'],
      ],
      wide: true,
    },
  ],
  presets: [
    {
      label: 'Lesson 5 drawing',
      input: {
        words: ['app', 'apple', 'bat'],
        queries: [
          ['search', 'app'],
          ['search', 'ap'],
          ['prefix', 'ap'],
          ['wild', 'b.t'],
          ['wild', 'a..'],
        ],
      },
    },
    {
      label: 'LeetCode 211 example',
      input: {
        words: ['bad', 'dad', 'mad'],
        queries: [
          ['wild', 'pad'],
          ['wild', 'bad'],
          ['wild', '.ad'],
          ['wild', 'b..'],
        ],
      },
    },
  ],
  legend: [
    ['current', 'node visited'],
    ['done', 'isEnd = true (a word ends here)'],
    ['error', 'missing child: stop'],
  ],
  code: `
insert(word) {
  let node = this.root;
  for (const ch of word) {
    if (!node.children.has(ch)) node.children.set(ch, newNode());   //@create
    node = node.children.get(ch);
  }
  node.isEnd = true;                       // mark the LAST node      //@end
}
#walk(s) { /* follow s; null if a child is missing */ }              //@walk
search(w) { const n = this.#walk(w); return n !== null && n.isEnd; } //@search
startsWith(p) { return this.#walk(p) !== null; }                     //@prefix
// 211: on '.', try every child (DFS)                                //@wild`,
  validate: ({ words, queries }) =>
    !Array.isArray(words) ||
    words.length > 6 ||
    words.some((w) => typeof w !== 'string' || !/^[a-z]+$/.test(w) || w.length > 6)
      ? 'Insert up to 6 lower-case words of ≤ 6 letters.'
      : !Array.isArray(queries) || queries.length > 8
        ? 'Up to 8 queries.'
        : null,
  run({ words, queries }) {
    const nodes: {
      id: number;
      ch: string;
      parent: number | null;
      end: boolean;
      kids: Map<string, number>;
    }[] = [{ id: 0, ch: '·', parent: null, end: false, kids: new Map() }];
    const steps: Step[] = [];
    const snap = <O extends object>(o: O) => ({
      nodes: nodes.map((n) => ({ id: n.id, label: n.ch, parent: n.parent, end: n.end })),
      ...o,
    });
    for (const w of words) {
      let cur = 0;
      const path = [0];
      const created: string[] = [];
      for (const ch of w) {
        if (!nodes[cur].kids.has(ch)) {
          const id = nodes.length;
          nodes.push({ id, ch, parent: cur, end: false, kids: new Map() });
          nodes[cur].kids.set(ch, id);
          created.push(ch);
        }
        cur = nodes[cur].kids.get(ch)!;
        path.push(cur);
      }
      nodes[cur].end = true;
      steps.push(
        snap({
          path,
          line: created.length ? ['create', 'end'] : 'end',
          note: `insert("${w}"): ${created.length ? 'create ' + created.join(', ') : 'every node already exists'}; mark the last node as a word end.`,
          why:
            created.length < w.length
              ? 'Words with a common prefix share its nodes: "' +
                w.slice(0, w.length - created.length) +
                '" was already there.'
              : null,
        }),
      );
    }
    const results: boolean[] = [];
    for (const [kind, s] of queries) {
      if (kind === 'wild') {
        const visited: number[] = [];
        let found = false;
        const dfs = (id: number, i: number): boolean => {
          visited.push(id);
          if (i === s.length) return nodes[id].end;
          const ch = s[i];
          if (ch === '.') {
            for (const nx of nodes[id].kids.values()) if (dfs(nx, i + 1)) return true;
            return false;
          }
          const nx = nodes[id].kids.get(ch);
          return nx != null && dfs(nx, i + 1);
        };
        found = dfs(0, 0);
        results.push(found);
        steps.push(
          snap({
            path: visited,
            line: 'wild',
            results: [...results],
            note: `search("${s}") with wildcards: visited ${visited.length - 1} node${visited.length === 2 ? '' : 's'} → ${found}.`,
            why: '"." branches to every child, so the worst case is O(26^dots · L); letters still follow a single path.',
          }),
        );
        continue;
      }
      let cur = 0;
      const path = [0];
      let miss: string | null = null;
      for (const ch of s) {
        const nx = nodes[cur].kids.get(ch);
        if (nx == null) {
          miss = ch;
          break;
        }
        cur = nx;
        path.push(cur);
      }
      const ans = miss != null ? false : kind === 'search' ? nodes[cur].end : true;
      results.push(ans);
      steps.push(
        snap({
          path,
          miss: miss != null ? cur : null,
          line: ['walk', kind === 'search' ? 'search' : 'prefix'],
          results: [...results],
          note: `${kind === 'search' ? 'search' : 'startsWith'}("${s}"): ${miss != null ? 'no child "' + miss + '" → false' : kind === 'search' ? (nodes[cur].end ? 'reached a word-end node → true' : 'the path exists but the last node is not a word end → false') : 'the path exists → true'}.`,
          why:
            kind === 'search' && miss == null && !nodes[cur].end
              ? 'This is why isEnd exists: "ap" is a prefix of stored words but not a word itself.'
              : null,
        }),
      );
    }
    steps.push(
      snap({
        path: [],
        done: true,
        line: null,
        results,
        result: results,
        note: `Query results: ${fmt(results)}.`,
        why: 'Each insert and plain query is O(L) for a word of length L, however many words are stored.',
      }),
    );
    return steps;
  },
  view(st, stage) {
    const states: Record<string, string> = {};
    st.nodes.forEach((n) => {
      if (n.end) states[n.id] = 'done';
    });
    (st.path || []).forEach((id) => (states[id] = 'current'));
    if (st.miss != null) states[st.miss] = 'error';
    stage.append(
      R.tree(
        st.nodes.map((n) => ({
          id: n.id,
          label: n.label,
          parent: n.parent,
          state: states[n.id],
          sub: n.end ? 'end' : null,
        })),
        { dx: 40, dy: 50, r: 15, label: 'trie (green = a word ends here)' },
      ),
    );
    if (st.results) stage.append(R.vars({ results: fmt(st.results) }));
  },
  random: (g) => {
    const words = [...new Set(Array.from({ length: rint(g, 1, 6) }, () => rstr(g, rint(g, 1, 4), 'abc')))];
    const queries = Array.from({ length: rint(g, 1, 8) }, () => [
      ['search', 'prefix', 'wild'][rint(g, 0, 2)],
      rstr(g, rint(g, 1, 4), 'abc.'),
    ]).map(([k, t]) => [k, k === 'wild' ? t : t.replace(/\./g, 'a')]);
    return { words, queries };
  },
});
