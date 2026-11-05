// Ported from legacy/src/viz/w08.js (D-013). `run` and `validate` are unchanged; `view` draws what `render` drew.
import { withRandom } from '@/lib/viz/engine';
import { rint } from '@/lib/viz/random';
import { componentsDef } from './_helpers';

export default withRandom(
  componentsDef('graph-dfs', 'Components with iterative DFS (explicit stack)', true),
  (g) => {
    const n = rint(g, 1, 10);
    return { n, edges: Array.from({ length: rint(g, 0, 12) }, () => [rint(g, 0, n - 1), rint(g, 0, n - 1)]) };
  },
);
