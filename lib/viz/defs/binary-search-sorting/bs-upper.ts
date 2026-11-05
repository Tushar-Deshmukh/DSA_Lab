// Ported from legacy/src/viz/w03.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { withRandom } from '@/lib/viz/engine';
import { rarr, rint, sorted } from '@/lib/viz/random';
import { boundDef } from './_helpers';

export default withRandom(
  boundDef('bs-upper', 'Upper bound: first index with nums[i] > target', '>', '>', (x, t) => x > t),
  (g) => ({ nums: sorted(rarr(g, rint(g, 0, 14), 0, 9)), target: rint(g, -1, 10) }),
);
