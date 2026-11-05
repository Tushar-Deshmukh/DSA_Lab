// Helpers shared by this module's visualizers, from legacy/src/viz/w09.js.

export const circle = (n: number, base = 0) =>
  Array.from({ length: n }, (_, i) => ({
    id: i + base,
    x: n === 1 ? 0.5 : 0.5 + 0.45 * Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / n),
    y: n === 1 ? 0.5 : 0.5 + 0.45 * Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / n),
  }));

export const inf = (x: number) => (x === Infinity ? '∞' : x);

export const wCheck = (n: number, edges: number[][], base: number) =>
  !Number.isInteger(n) || n < 1 || n > 9
    ? 'Use 1–9 nodes.'
    : !Array.isArray(edges) ||
        edges.length > 18 ||
        edges.some(
          (e) =>
            !Array.isArray(e) ||
            e.length !== 3 ||
            e[0] < base ||
            e[1] < base ||
            e[0] >= n + base ||
            e[1] >= n + base ||
            e[2] < 0,
        )
      ? `Edges look like [u, v, w] with nodes ${base}..${n - 1 + base} and w ≥ 0 (at most 18).`
      : null;
