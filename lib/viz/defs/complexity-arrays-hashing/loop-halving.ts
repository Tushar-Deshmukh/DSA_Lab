// Ported from legacy/src/viz/w01.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { withRandom } from '@/lib/viz/engine';
import { rint } from '@/lib/viz/random';
import { loopDef } from './_helpers';

export default withRandom(
  loopDef(
    'loop-halving',
    'A loop whose index halves: O(log n)',
    `
for (let i = n; i > 1; i = Math.floor(i / 2)) {   //@loop
  work();                                         //@work
}`,
    (n, hit) => {
      for (let i = n; i > 1; i = Math.floor(i / 2)) hit({ i }, 'work');
    },
    (n) => 'log₂(' + n + ') ≈ ' + Math.log2(n).toFixed(2) + '. Doubling n adds only one more iteration.',
    'Each iteration halves the remaining range, so the number of iterations is the number of halvings needed to reach 1: about log₂ n.',
  ),
  (g) => ({ n: rint(g, 1, 32) }),
);
