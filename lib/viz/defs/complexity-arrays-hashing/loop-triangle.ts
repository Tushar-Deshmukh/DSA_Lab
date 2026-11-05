// Ported from legacy/src/viz/w01.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { withRandom } from '@/lib/viz/engine';
import { rint } from '@/lib/viz/random';
import { loopDef } from './_helpers';

export default withRandom(
  loopDef(
    'loop-triangle',
    'Inner loop starts at i + 1: still O(n²)',
    `
for (let i = 0; i < n; i++) {                     //@outer
  for (let j = i + 1; j < n; j++) {               //@inner
    work();                                       //@work
  }
}`,
    (n, hit) => {
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) hit({ i, j }, 'work');
    },
    (n) => 'n(n − 1)/2 = ' + (n * (n - 1)) / 2 + ', about half of n² = ' + n * n + '.',
    'Halving the work is a constant factor. n(n−1)/2 grows like n², so this is still O(n²): this is the pair loop in every brute force.',
  ),
  (g) => ({ n: rint(g, 1, 32) }),
);
