// Ported from legacy/src/viz/w01.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { withRandom } from '@/lib/viz/engine';
import { rint } from '@/lib/viz/random';
import { loopDef } from './_helpers';

export default withRandom(
  loopDef(
    'loop-nlogn',
    'Outer loop n, inner loop doubling: O(n log n)',
    `
for (let i = 0; i < n; i++) {                     //@outer
  for (let j = 1; j < n; j *= 2) {                //@inner
    work();                                       //@work
  }
}`,
    (n, hit) => {
      for (let i = 0; i < n; i++) for (let j = 1; j < n; j *= 2) hit({ i, j }, 'work');
    },
    (n) =>
      'n · ⌈log₂ n⌉ = ' +
      n +
      ' · ' +
      Math.ceil(Math.log2(Math.max(1, n))) +
      ' = ' +
      n * Math.ceil(Math.log2(Math.max(1, n))) +
      '.',
    'The inner loop does not depend on i: it always runs about log₂ n times. n outer iterations × log n inner = O(n log n).',
  ),
  (g) => ({ n: rint(g, 1, 32) }),
);
