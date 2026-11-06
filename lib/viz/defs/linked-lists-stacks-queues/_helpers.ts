// Helpers shared by this module's visualizers, from legacy/src/viz/w04.js.

export const sizeCheck = (a: number[], lo: number, hi: number) =>
  a.length < lo
    ? 'Use at least ' + lo + ' element' + (lo > 1 ? 's.' : '.')
    : a.length > hi
      ? 'Keep it to ' + hi + ' elements so it fits on screen.'
      : null;

export const addPtr = (p: Record<string, string | string[]>, id: number | null | undefined, lab: string) => {
  if (id == null) return;
  p[id] = p[id] ? ([] as string[]).concat(p[id], lab) : lab;
};

export const nodesOf = (vals: number[]) => vals.map((v: number, i: number) => ({ id: i, val: v }));

export const chain = (n: number) =>
  Object.fromEntries(Array.from({ length: n }, (_, i) => [i, i + 1 < n ? i + 1 : null]));

export const readList = (
  next: Record<string, number | null | undefined>,
  head: number | null,
  vals: (number | string)[],
) => {
  const out: number[] = [];
  let c: number | null | undefined = head,
    guard = 0;
  while (c != null && guard++ < 100) {
    out.push(vals[c] as number);
    c = next[c];
  }
  return out;
};
