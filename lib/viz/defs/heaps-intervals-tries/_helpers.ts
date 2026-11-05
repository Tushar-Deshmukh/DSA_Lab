// Helpers shared by this module's visualizers, from legacy/src/viz/w07.js.

export const fmt = (a: (number | boolean)[]) => '[' + a.join(', ') + ']';

export // ---------- intervals ----------
const ivCheck = (iv: number[][]) =>
  !Array.isArray(iv) ||
  !iv.length ||
  iv.length > 10 ||
  iv.some((x) => !Array.isArray(x) || x.length !== 2 || x[0] > x[1])
    ? 'Enter 1–10 intervals like [[1,3],[2,6]] with start ≤ end.'
    : null;
