'use client';

// The primitives drawn in SVG, with the geometry of legacy/src/viz/render.js. Done and error nodes carry a check or a
// cross, and every drawing has a text equivalent for screen readers.
import { useId } from 'react';
import { treeGeometry } from '@/lib/viz/layout';
import { fmt } from '@/lib/viz/nodes';
import type { BarsNode, GraphNode, IntervalsNode, ListNode, LogBarsNode, TreeNode } from '@/lib/viz/types';
import { Labelled, spoken, stateAttr, useStateWords } from './common';

/** A check or a cross beside a node, so done and error do not rely on colour. */
function Badge({ state, x, y }: { state: unknown; x: number; y: number }) {
  if (state !== 'done' && state !== 'best' && state !== 'error') return null;
  return (
    <g aria-hidden="true">
      <circle cx={x} cy={y} r={7} className={state === 'error' ? 'vz-mark-error' : 'vz-mark-done'} />
      <text x={x} y={y + 3.5} textAnchor="middle" className="vz-badge">
        {state === 'error' ? '✕' : state === 'best' ? '★' : '✓'}
      </text>
    </g>
  );
}

/** Marker ids must be unique on a page that shows several visualizers. */
const useMarkerId = () => `vz-arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

export function Tree({ node }: { node: TreeNode }) {
  const words = useStateWords();
  if (!node.nodes.length) {
    return (
      <Labelled label={node.label}>
        <div className="text-sm text-ink-3">(empty tree)</div>
      </Labelled>
    );
  }
  const g = treeGeometry(node.nodes, node);
  const byId = new Map(node.nodes.map((n) => [n.id, n]));
  const shown = node.nodes.filter((n) => !n.ghost && g.at(n.id));
  const said = shown.map((n) => {
    const parent = n.parent != null ? byId.get(n.parent) : undefined;
    const where = parent && !parent.ghost ? `child of ${String(parent.label)}` : 'root';
    return spoken(String(n.label), words(n.state), [where, n.sub != null ? String(n.sub) : '']);
  });
  return (
    <Labelled label={node.label}>
      <div className="vz-scroll">
        <svg
          className="vz-svg"
          viewBox={`0 0 ${g.width} ${g.height}`}
          width={g.width}
          height={g.height}
          aria-hidden="true"
        >
          {node.nodes.map((n) => {
            const parent = n.parent != null ? byId.get(n.parent) : undefined;
            if (n.ghost || !parent || parent.ghost) return null;
            const a = g.at(parent.id);
            const b = g.at(n.id);
            if (!a || !b) return null;
            return (
              <g key={`e${n.id}`}>
                <line
                  className="vz-edge"
                  data-state={stateAttr(n.edge)}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                />
                {n.edgeLabel && (
                  <text
                    className="vz-lbl"
                    x={(a.x + b.x) / 2 + (b.x < a.x ? -6 : 6)}
                    y={(a.y + b.y) / 2}
                    textAnchor={b.x < a.x ? 'end' : 'start'}
                  >
                    {n.edgeLabel}
                  </text>
                )}
              </g>
            );
          })}
          {shown.map((n) => {
            const p = g.at(n.id) as { x: number; y: number };
            const label = String(n.label);
            const wide = label.length > 3;
            const hw = 7 + label.length * 3.5;
            return (
              <g key={`n${n.id}`}>
                {wide ? (
                  <rect
                    className="vz-node"
                    data-state={stateAttr(n.state)}
                    x={p.x - hw}
                    y={p.y - 14}
                    width={2 * hw}
                    height={28}
                    rx={8}
                  />
                ) : (
                  <circle className="vz-node" data-state={stateAttr(n.state)} cx={p.x} cy={p.y} r={g.r} />
                )}
                <text x={p.x} y={p.y + 4.5} textAnchor="middle" fontSize={wide ? 11 : 13} fontWeight={600}>
                  {label}
                </text>
                {n.sub != null && (
                  <text className="vz-lbl" x={p.x} y={p.y + g.r + 13} textAnchor="middle">
                    {String(n.sub)}
                  </text>
                )}
                <Badge
                  state={n.state}
                  x={p.x + (wide ? hw : g.r * 0.75)}
                  y={p.y - (wide ? 14 : g.r * 0.75)}
                />
              </g>
            );
          })}
        </svg>
      </div>
      <p className="sr-only">{said.join('; ')}</p>
    </Labelled>
  );
}

export function Graph({ node }: { node: GraphNode }) {
  const words = useStateWords();
  const marker = useMarkerId();
  const G = node.graph;
  const W = node.w || 420;
  const H = node.h || 260;
  const r = node.r || 17;
  const pad = node.pad || 24;
  const find = (id: string | number) => G.nodes.find((x) => x.id === id);
  const P = (id: string | number) => {
    const n = find(id);
    return n ? { x: pad + n.x * (W - 2 * pad), y: pad + n.y * (H - 2 * pad) } : null;
  };
  const labOf = (id: string | number) => {
    const n = find(id);
    return String(n && n.label != null ? n.label : id);
  };
  const boxW = (id: string | number) => 12 + labOf(id).length * 7.3;
  const said = [
    ...G.nodes.map((n) =>
      spoken(
        `node ${labOf(n.id)}`,
        words(node.states?.[n.id]),
        node.subs?.[n.id] != null ? [fmt(node.subs[n.id])] : [],
      ),
    ),
    ...G.edges.map((e, k) =>
      spoken(
        `edge ${labOf(e.u)} ${G.directed ? 'to' : 'and'} ${labOf(e.v)}${e.w != null ? `, weight ${String(e.w)}` : ''}`,
        words(node.edgeStates?.[k]),
      ),
    ),
  ];
  return (
    <Labelled label={node.label}>
      <div className="vz-scroll">
        <svg className="vz-svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
          {G.directed && (
            <defs>
              <marker
                id={marker}
                viewBox="0 0 10 10"
                refX={9}
                refY={5}
                markerWidth={9}
                markerHeight={9}
                markerUnits="userSpaceOnUse"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" className="vz-arrow" />
              </marker>
            </defs>
          )}
          {G.edges.map((e, k) => {
            const a = P(e.u);
            const b = P(e.v);
            if (!a || !b) return null;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            // Trim the line to the node outline: a circle of radius r, or a label-sized box.
            const cut = (id: string | number) => {
              if (!node.box) return r;
              const hw = boxW(id) / 2 + 2;
              const hh = 15;
              return Math.min(
                Math.abs(dx) > 1e-9 ? (hw * len) / Math.abs(dx) : Infinity,
                Math.abs(dy) > 1e-9 ? (hh * len) / Math.abs(dy) : Infinity,
              );
            };
            const ca = cut(e.u);
            const cb = cut(e.v) + (G.directed ? 3 : 0);
            return (
              <g key={`e${k}`}>
                <line
                  className="vz-edge"
                  data-state={stateAttr(node.edgeStates?.[k])}
                  x1={a.x + (dx / len) * ca}
                  y1={a.y + (dy / len) * ca}
                  x2={b.x - (dx / len) * cb}
                  y2={b.y - (dy / len) * cb}
                  markerEnd={G.directed ? `url(#${marker})` : undefined}
                />
                {e.w != null && (
                  <text
                    className="vz-lbl"
                    x={(a.x + b.x) / 2 - (dy / len) * 9}
                    y={(a.y + b.y) / 2 + (dx / len) * 9 + 4}
                    textAnchor="middle"
                    style={{ fontSize: 12, fontWeight: 600 }}
                  >
                    {String(e.w)}
                  </text>
                )}
              </g>
            );
          })}
          {G.nodes.map((n) => {
            const p = P(n.id) as { x: number; y: number };
            const st = node.states?.[n.id];
            const lab = labOf(n.id);
            const sub = node.subs?.[n.id];
            return (
              <g key={`n${n.id}`}>
                {node.box ? (
                  <rect
                    className="vz-node"
                    data-state={stateAttr(st)}
                    x={p.x - boxW(n.id) / 2}
                    y={p.y - 13}
                    width={boxW(n.id)}
                    height={26}
                    rx={7}
                  />
                ) : (
                  <circle className="vz-node" data-state={stateAttr(st)} cx={p.x} cy={p.y} r={r} />
                )}
                <text
                  x={p.x}
                  y={p.y + 4.5}
                  textAnchor="middle"
                  fontWeight={600}
                  fontSize={node.box ? 12 : lab.length > 2 ? 11 : undefined}
                >
                  {lab}
                </text>
                {sub != null && (
                  <text
                    className="vz-lbl"
                    x={p.x}
                    y={p.y - r - 5}
                    textAnchor="middle"
                    style={{ fontWeight: 600 }}
                  >
                    {fmt(sub)}
                  </text>
                )}
                <Badge
                  state={st}
                  x={p.x + (node.box ? boxW(n.id) / 2 : r * 0.75)}
                  y={p.y + (node.box ? -13 : r * 0.75)}
                />
              </g>
            );
          })}
        </svg>
      </div>
      <p className="sr-only">{said.join('; ')}</p>
    </Labelled>
  );
}

export function LinkedList({ node }: { node: ListNode }) {
  const words = useStateWords();
  const marker = useMarkerId();
  const bw = 46;
  const bh = 34;
  const gap = 34;
  const pad = 16;
  const top = 34;
  const n = node.nodes.length;
  const W = pad * 2 + n * bw + (n - 1) * gap + 50;
  const H = top + bh + 64;
  const X = (i: number) => pad + i * (bw + gap);
  const index = new Map(node.nodes.map((nd, i) => [nd.id, i]));
  const ptrsOf = (id: string | number) => [node.ptrs?.[id] ?? []].flat();
  const said = node.nodes.map((nd) => {
    const nx = node.next[nd.id];
    const target = nx == null ? null : node.nodes.find((x) => x.id === nx);
    const link = nx === null ? 'next is null' : target ? `next is ${fmt(target.val)}` : '';
    const p = ptrsOf(nd.id);
    return spoken(fmt(nd.val), words(node.states?.[nd.id]), [
      link,
      p.length ? `pointer ${p.join(' and ')}` : '',
    ]);
  });
  return (
    <Labelled label={node.label}>
      <div className="vz-scroll">
        <svg className="vz-svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
          <defs>
            <marker
              id={marker}
              viewBox="0 0 10 10"
              refX={9}
              refY={5}
              markerWidth={7}
              markerHeight={7}
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" className="vz-arrow" />
            </marker>
          </defs>
          {node.nodes.map((nd, i) => {
            const st = node.states?.[nd.id];
            const nx = node.next[nd.id];
            const est = stateAttr(node.edgeStates?.[nd.id]);
            const j = nx == null ? undefined : index.get(nx);
            const p = ptrsOf(nd.id);
            let link = null;
            if (nx === null) {
              link = (
                <text className="vz-lbl" x={X(i) + bw / 2} y={top + bh + 16} textAnchor="middle">
                  → null
                </text>
              );
            } else if (j === i + 1) {
              link = (
                <line
                  className="vz-edge"
                  data-state={est}
                  x1={X(i) + bw}
                  y1={top + bh / 2}
                  x2={X(j) - 2}
                  y2={top + bh / 2}
                  markerEnd={`url(#${marker})`}
                />
              );
            } else if (j !== undefined) {
              const x1 = X(i) + bw / 2;
              const x2 = X(j) + bw / 2;
              const y = top + bh;
              const dip = 22 + Math.abs(j - i) * 6;
              link = (
                <path
                  className="vz-edge"
                  data-state={est}
                  d={`M${x1},${y} C${x1},${y + dip} ${x2},${y + dip} ${x2},${y + 3}`}
                  markerEnd={`url(#${marker})`}
                />
              );
            }
            return (
              <g key={String(nd.id)}>
                <rect
                  className="vz-node"
                  data-state={stateAttr(st)}
                  x={X(i)}
                  y={top}
                  width={bw}
                  height={bh}
                  rx={6}
                />
                <text x={X(i) + bw / 2} y={top + bh / 2 + 5} textAnchor="middle" fontWeight={600}>
                  {fmt(nd.val)}
                </text>
                {link}
                {p.length > 0 && (
                  <text className="vz-ptrlbl" x={X(i) + bw / 2} y={top - 10} textAnchor="middle">
                    {p.join(', ')}
                  </text>
                )}
                <Badge state={st} x={X(i) + bw} y={top} />
              </g>
            );
          })}
          {node.nullPtrs && node.nullPtrs.length > 0 && (
            <text className="vz-ptrlbl" x={X(n) - gap + 12} y={top - 10}>
              {node.nullPtrs.join(', ')} = null
            </text>
          )}
        </svg>
      </div>
      <p className="sr-only">
        {said.join('; ')}
        {node.nullPtrs?.length ? `; ${node.nullPtrs.join(' and ')} = null` : ''}
      </p>
    </Labelled>
  );
}

export function Intervals({ node }: { node: IntervalsNode }) {
  const words = useStateWords();
  const all = [...node.list.flat(), ...(node.extra ?? []).flat()];
  if (!all.length) {
    return (
      <Labelled label={node.label}>
        <div className="text-sm text-ink-3">(no intervals)</div>
      </Labelled>
    );
  }
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const W = 440;
  const rowH = 22;
  const pad = 20;
  const span = Math.max(1, hi - lo);
  const rows = node.list.length + (node.merged ? node.merged.length + 1 : 0);
  const H = pad * 2 + rows * rowH + 18;
  const X = (v: number) => pad + ((v - lo) / span) * (W - 2 * pad);
  const ticks: number[] = [];
  for (let t = lo; t <= hi; t += Math.max(1, Math.ceil(span / 10))) ticks.push(t);
  const bar = (iv: number[], y: number, st: unknown, key: string) => {
    const [a = 0, b = 0] = iv;
    const w = Math.max(4, X(b) - X(a));
    return (
      <g key={key}>
        <rect
          className="vz-node"
          data-state={stateAttr(st)}
          x={X(a)}
          y={y}
          width={w}
          height={rowH - 7}
          rx={4}
        />
        <text className="vz-lbl" x={X(b) + 4} y={y + 12}>
          [{a},{b}]
        </text>
        <Badge state={st} x={X(a) + w} y={y} />
      </g>
    );
  };
  const said = [
    ...node.list.map((iv, i) => spoken(`[${iv.join(', ')}]`, words(node.states?.[i]))),
    ...(node.merged ?? []).map((iv) => spoken(`[${iv.join(', ')}]`, node.mergedLabel || 'result')),
  ];
  return (
    <Labelled label={node.label}>
      <div className="vz-scroll">
        <svg className="vz-svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
          {ticks.map((t) => (
            <g key={`t${t}`}>
              <line x1={X(t)} x2={X(t)} y1={pad - 6} y2={H - 18} className="vz-edge" data-state="dim" />
              <text className="vz-lbl" x={X(t)} y={H - 4} textAnchor="middle">
                {t}
              </text>
            </g>
          ))}
          {node.list.map((iv, i) => bar(iv, pad + i * rowH, node.states?.[i], `l${i}`))}
          {node.merged && (
            <text className="vz-lbl" x={pad} y={pad + node.list.length * rowH + 14}>
              {node.mergedLabel || 'result'}
            </text>
          )}
          {node.merged?.map((iv, i) => bar(iv, pad + (node.list.length + 1 + i) * rowH, 'done', `m${i}`))}
        </svg>
      </div>
      <p className="sr-only">{said.join('; ')}</p>
    </Labelled>
  );
}

export function Bars({ node }: { node: BarsNode }) {
  const words = useStateWords();
  const values = node.values;
  const bw = 30;
  const gap = 6;
  const pad = 14;
  const maxH = node.maxH || 150;
  const topValue = Math.max(1, ...values, ...(node.levels ?? []));
  const unit = maxH / topValue;
  const W = pad * 2 + values.length * (bw + gap) - gap;
  const H = maxH + 58;
  const base = 22 + maxH;
  const X = (i: number) => pad + i * (bw + gap);
  const ptrsOf = (i: number) => [node.ptrs?.[i] ?? []].flat();
  const said = values.map((v, i) => {
    const p = ptrsOf(i);
    const water = node.water?.[i];
    return spoken(String(v), words(node.states?.[i]), [
      water ? `water ${water}` : '',
      p.length ? `pointer ${p.join(' and ')}` : '',
    ]);
  });
  return (
    <Labelled label={node.label}>
      <div className="vz-scroll">
        <svg className="vz-svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
          {node.rect && (
            <rect
              className="vz-water"
              data-best={node.rect.cls === 'best' || undefined}
              x={X(node.rect.l) + bw / 2}
              y={base - node.rect.h * unit}
              width={X(node.rect.r) - X(node.rect.l)}
              height={node.rect.h * unit}
            />
          )}
          {values.map((v, i) => {
            const st = node.states?.[i];
            const w = node.water?.[i];
            const p = ptrsOf(i);
            return (
              <g key={i}>
                {w ? (
                  <rect
                    className="vz-water"
                    x={X(i)}
                    y={base - (v + w) * unit}
                    width={bw}
                    height={w * unit}
                  />
                ) : null}
                <rect
                  className="vz-node"
                  data-state={stateAttr(st)}
                  x={X(i)}
                  y={base - v * unit}
                  width={bw}
                  height={Math.max(1, v * unit)}
                  rx={3}
                />
                <text className="vz-lbl" x={X(i) + bw / 2} y={base - v * unit - 4} textAnchor="middle">
                  {String(v)}
                </text>
                <text className="vz-lbl" x={X(i) + bw / 2} y={base + 14} textAnchor="middle">
                  {String(i)}
                </text>
                {p.length > 0 && (
                  <text className="vz-ptrlbl" x={X(i) + bw / 2} y={base + 30} textAnchor="middle">
                    {p.join(',')}
                  </text>
                )}
                <Badge state={st} x={X(i) + bw} y={base - v * unit} />
              </g>
            );
          })}
          <line x1={pad - 4} x2={W - pad + 4} y1={base} y2={base} className="vz-edge" />
        </svg>
      </div>
      <p className="sr-only">{said.join('; ')}</p>
    </Labelled>
  );
}

/** The growth chart: one bar per complexity class, on a logarithmic scale. */
export function LogBars({ node }: { node: LogBarsNode }) {
  const words = useStateWords();
  const W = 460;
  const rowH = 30;
  const labW = 86;
  const H = node.rows.length * rowH + 10;
  return (
    <div>
      <div className="vz-scroll">
        <svg className="vz-svg" viewBox={`0 0 ${W + 150} ${H}`} width={W + 150} height={H} aria-hidden="true">
          {node.rows.map((row, k) => {
            const y = 6 + k * rowH;
            const width = row.fraction === null ? 0 : Math.max(3, row.fraction * (W - labW));
            return (
              <g key={row.name}>
                <text x={0} y={y + 17} style={{ fontFamily: 'var(--f-ui)', fontSize: 12.5, fontWeight: 600 }}>
                  {row.name}
                </text>
                {row.fraction !== null && (
                  <>
                    <rect
                      className="vz-node"
                      data-state={stateAttr(row.state)}
                      x={labW}
                      y={y + 2}
                      width={width}
                      height={rowH - 10}
                      rx={3}
                    />
                    <text className="vz-lbl" x={labW + width + 6} y={y + 17}>
                      {row.text}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="sr-only">
        {node.ariaLabel}:{' '}
        {node.rows
          .filter((r) => r.fraction !== null)
          .map((r) => spoken(`${r.name}: ${r.text ?? ''}`, words(r.state)))
          .join('; ')}
      </p>
    </div>
  );
}
