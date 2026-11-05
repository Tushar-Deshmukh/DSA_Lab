// Geometry the drawn primitives share, ported from legacy/src/viz/render.js. Kept out of the components so it can be
// tested in Node.
import type { TreeNodeItem } from './types';

type Id = string | number;

export interface TreeLayout {
  /** Leaf order across, depth down. A parent sits midway over its first and last child. */
  pos: Map<Id, { x: number; d: number }>;
  leaves: number;
  depth: number;
}

/** The legacy `layoutTree`: the root is the last node without a parent. */
export function layoutTree(nodes: readonly TreeNodeItem[]): TreeLayout {
  const kids = new Map<Id, Id[]>();
  let root: Id | null = null;
  for (const n of nodes) kids.set(n.id, []);
  for (const n of nodes) {
    if (n.parent == null) root = n.id;
    else kids.get(n.parent)?.push(n.id);
  }
  const pos = new Map<Id, { x: number; d: number }>();
  let leaf = 0;
  let depth = 0;
  const walk = (id: Id, d: number) => {
    depth = Math.max(depth, d);
    const ch = kids.get(id) ?? [];
    if (!ch.length) {
      pos.set(id, { x: leaf++, d });
      return;
    }
    ch.forEach((c) => walk(c, d + 1));
    const xs = ch.map((c) => (pos.get(c) as { x: number }).x);
    pos.set(id, { x: (Math.min(...xs) + Math.max(...xs)) / 2, d });
  };
  if (root != null) walk(root, 0);
  return { pos, leaves: leaf, depth };
}

/** Points where a tree is drawn, and the size of its drawing. A ghost root (a forest) gives up its row. */
export function treeGeometry(
  nodes: readonly TreeNodeItem[],
  o: { dx?: number; dy?: number; r?: number } = {},
): {
  at: (id: Id) => { x: number; y: number } | null;
  width: number;
  height: number;
  r: number;
} {
  const { pos, leaves, depth } = layoutTree(nodes);
  const rootNode = nodes.find((n) => n.parent == null);
  const off = rootNode?.ghost ? 1 : 0;
  const dx = o.dx || 56;
  const dy = o.dy || 64;
  const r = o.r || 18;
  const pad = 26;
  return {
    at: (id) => {
      const p = pos.get(id);
      return p ? { x: pad + p.x * dx + dx / 2, y: pad + (p.d - off) * dy } : null;
    },
    width: Math.max(1, leaves) * dx + pad * 2,
    height: (depth + 1 - off) * dy + pad * 2 - dy / 2,
    r,
  };
}
