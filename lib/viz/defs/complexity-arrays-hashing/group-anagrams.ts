// Ported from legacy/src/viz/w01.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { defineViz } from '@/lib/viz/engine';
import { R } from '@/lib/viz/nodes';
import { rint, rstr } from '@/lib/viz/random';
import type { VizStep } from '@/lib/viz/types';
import { sizeCheck } from './_helpers';

interface Input {
  strs: string[];
  keyType: string;
}

interface Step extends VizStep {
  groups: [string, string[]][];
  cur?: string;
  done?: boolean;
  result?: string[][];
}

export default defineViz<Input, Step>('group-anagrams', {
  title: 'Group Anagrams by a canonical key',
  inputs: [
    {
      key: 'strs',
      label: 'strs',
      type: 'array',
      def: ['eat', 'tea', 'tan', 'ate', 'nat', 'bat'],
      wide: true,
    },
    {
      key: 'keyType',
      label: 'key',
      type: 'select',
      def: 'sorted',
      options: [
        { value: 'sorted', label: 'sorted letters' },
        { value: 'counts', label: '26 counts joined with #' },
      ],
    },
  ],
  presets: [
    {
      label: 'LeetCode example',
      input: { strs: ['eat', 'tea', 'tan', 'ate', 'nat', 'bat'], keyType: 'sorted' },
    },
    {
      label: 'Count-signature key',
      input: { strs: ['eat', 'tea', 'tan', 'ate', 'nat', 'bat'], keyType: 'counts' },
    },
    { label: 'Empty string', input: { strs: [''], keyType: 'sorted' } },
  ],
  legend: [['current', 'group receiving the word']],
  code: `
function groupAnagrams(strs) {
  const groups = new Map();                       //@init
  for (const s of strs) {                         //@loop
    const key = [...s].sort().join('');           //@key
    if (!groups.has(key)) groups.set(key, []);    //@new
    groups.get(key).push(s);                      //@push
  }
  return [...groups.values()];                    //@ret
}`,
  validate: ({ strs }) =>
    sizeCheck(strs, 1, 10, 'word list') ||
    (strs.every((x) => typeof x === 'string' && /^[a-z]*$/.test(x))
      ? null
      : 'Use lower-case words in quotes, e.g. "eat", "tea".'),
  run({ strs, keyType }) {
    const steps: Step[] = [],
      groups: Map<string, string[]> = new Map();
    const keyOf = (s: string) =>
      keyType === 'counts'
        ? (() => {
            const c = new Array(26).fill(0);
            for (const ch of s) c[ch.charCodeAt(0) - 97]++;
            return c.join('#');
          })()
        : [...s].sort().join('');
    const shortKey = (k: string) =>
      keyType === 'counts'
        ? k
            .split('#')
            .map((v: string, i: number) => (v !== '0' ? String.fromCharCode(97 + i) + v : ''))
            .join('') || '(all zero)'
        : k || '""';
    for (const s of strs) {
      const k = keyOf(s);
      const isNew = !groups.has(k);
      if (isNew) groups.set(k, []);
      groups.get(k)!.push(s);
      steps.push({
        line: isNew ? ['key', 'new', 'push'] : ['key', 'push'],
        groups: [...groups].map(([kk, v]) => [shortKey(kk), [...v]]),
        cur: shortKey(k),
        note: `"${s}" → key ${keyType === 'counts' ? '(counts) ' : ''}"${shortKey(k)}". ${isNew ? 'New key: start a group.' : 'Key exists: join that group.'}`,
        why:
          s === strs[0]
            ? 'Two words are anagrams exactly when their keys are equal, so grouping by key replaces comparing every pair of words.'
            : null,
      });
    }
    steps.push({
      line: 'ret',
      groups: [...groups].map(([kk, v]) => [shortKey(kk), [...v]]),
      done: true,
      result: [...groups.values()],
      note: `${groups.size} group${groups.size === 1 ? '' : 's'}.`,
      why:
        keyType === 'counts'
          ? 'Count keys cost O(k) per word of length k: O(n·k) total.'
          : 'Sorting each word costs O(k log k): O(n·k log k) total. The count signature avoids the log factor.',
    });
    return steps;
  },
  view(st, stage) {
    const rows = st.groups.map(([k, words]) => ({
      label: '',
      chips: [{ text: k, state: k === st.cur && !st.done ? 'current' : null }],
      trailing: '→ ' + words.join(', '),
    }));
    stage.append(R.panel('groups (key → words)', R.chipRows(rows)));
  },
  random: (g) => ({
    strs: Array.from({ length: rint(g, 1, 10) }, () => rstr(g, rint(g, 0, 3), 'abt')),
    keyType: g() < 0.5 ? 'sorted' : 'counts',
  }),
});
