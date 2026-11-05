'use client';

// The primitives drawn with HTML boxes, ported from legacy/src/viz/render.js. Each draws for the eye (aria-hidden) and
// says the same thing in a line of text for screen readers.
import { fmt } from '@/lib/viz/nodes';
import { cellState, inWindow } from '@/lib/viz/predict';
import type {
  BitsNode,
  CaptionNode,
  CellsNode,
  ChipRowsNode,
  CodeLinesNode,
  FramesNode,
  GridNode,
  KvNode,
  MarksNode,
  ProblemTextNode,
  QueueNode,
  StackNode,
  TableNode,
  VarsNode,
} from '@/lib/viz/types';
import { Labelled, spoken, stateAttr, useStateWords } from './common';

export function Cells({ node }: { node: CellsNode }) {
  const words = useStateWords();
  const ptrs = node.ptrs ?? {};
  const pointersAt = (i: number) => [ptrs[i] ?? []].flat();
  const rows = Math.max(1, ...node.values.map((_, i) => pointersAt(i).length));
  const base = node.indexBase ?? 0;
  const inside = node.values.map((_, i) => inWindow(node, i));
  const first = inside.indexOf(true);
  const last = inside.lastIndexOf(true);
  const bracket = (i: number) => {
    if (!inside[i]) return undefined;
    if (first === last) return 'only';
    return i === first ? 'start' : i === last ? 'end' : 'mid';
  };
  const said = node.values.map((v, i) => {
    const p = pointersAt(i);
    return spoken(fmt(v), words(cellState(node, i)), p.length ? [`pointer ${p.join(' and ')}`] : []);
  });
  return (
    <Labelled label={node.label}>
      <div className="vz-scroll">
        <div className="vz-cells" data-ptr-rows={rows > 1 ? Math.min(rows, 3) : undefined} aria-hidden="true">
          {node.values.map((v, i) => (
            <div
              key={i}
              className="vz-box vz-cell"
              data-state={stateAttr(cellState(node, i))}
              data-window={bracket(i)}
            >
              {fmt(v)}
              {node.noIndex ? null : <span className="vz-ix">{i + base}</span>}
              {pointersAt(i).map((p, k) => (
                <span
                  key={`${p}-${k}`}
                  className="vz-ptr"
                  data-k={Math.min(k, 2)}
                  style={k > 2 ? { top: -21 - 13 * k } : undefined}
                >
                  {p}
                </span>
              ))}
            </div>
          ))}
          {!node.values.length && <div className="self-center text-sm text-ink-3">(empty)</div>}
        </div>
      </div>
      <p className="sr-only">{node.values.length ? said.join('; ') : 'empty'}</p>
    </Labelled>
  );
}

export function Vars({ node }: { node: VarsNode }) {
  const changed = new Set(node.changed ?? []);
  return (
    <div className="vz-vars">
      {Object.entries(node.values).map(([k, v]) => (
        <span key={k} data-changed={changed.has(k) || undefined}>
          <span className="vz-name">{k} =</span>
          {fmt(v)}
          {changed.has(k) && <span className="sr-only"> (changed)</span>}
        </span>
      ))}
    </div>
  );
}

export function Kv({ node }: { node: KvNode }) {
  const words = useStateWords();
  const text = (k: unknown, v: unknown) => fmt(k) + (v === undefined ? '' : ` → ${fmt(v)}`);
  const stateOf = (k: unknown) => node.states?.[String(k)];
  return (
    <Labelled label={node.label}>
      <div className="vz-chips">
        {!node.entries.length && <span className="text-sm text-ink-3">{node.empty || '{ }'}</span>}
        {node.entries.map(([k, v], i) => (
          <span key={i} className="vz-box vz-chip" data-state={stateAttr(stateOf(k))}>
            {text(k, v)}
            {words(stateOf(k)) && <span className="sr-only"> ({words(stateOf(k))})</span>}
          </span>
        ))}
      </div>
    </Labelled>
  );
}

function Items({ node, kind }: { node: StackNode | QueueNode; kind: 'stack' | 'queue' }) {
  const words = useStateWords();
  return (
    <Labelled
      label={node.label || (kind === 'stack' ? 'stack (top at the top)' : 'queue (front on the left)')}
    >
      <div className={kind === 'stack' ? 'vz-stack' : 'vz-queue'}>
        {node.items.map((it, i) => (
          <div key={i} className="vz-box vz-item" data-state={stateAttr(node.states?.[i])}>
            {fmt(it)}
            {words(node.states?.[i]) && <span className="sr-only"> ({words(node.states?.[i])})</span>}
          </div>
        ))}
        {!node.items.length && <div className="text-sm text-ink-3">(empty)</div>}
      </div>
      {kind === 'stack' && node.items.length > 0 && (
        <span className="sr-only">Top of the stack: {fmt(node.items.at(-1))}.</span>
      )}
    </Labelled>
  );
}

export const Stack = ({ node }: { node: StackNode }) => <Items node={node} kind="stack" />;
export const Queue = ({ node }: { node: QueueNode }) => <Items node={node} kind="queue" />;

export function Frames({ node }: { node: FramesNode }) {
  const words = useStateWords();
  // Legacy frames: `top` (the running call) and `ret` (returning) styled like current and done.
  const shown = (state: string | undefined, i: number) => {
    const s = state || (i === node.frames.length - 1 ? 'top' : '');
    return { s, attr: s === 'top' ? 'current' : s === 'ret' ? 'done' : stateAttr(s) };
  };
  return (
    <Labelled label={node.label || 'call stack (newest on top)'}>
      <div className="vz-frames">
        {node.frames.map((f, i) => {
          const { s, attr } = shown(f.state, i);
          return (
            <div key={i} className="vz-box vz-frame" data-state={attr}>
              {f.text}
              {words(s) && <span className="sr-only"> ({words(s)})</span>}
            </div>
          );
        })}
        {!node.frames.length && <div className="text-sm text-ink-3">(empty: all calls returned)</div>}
      </div>
    </Labelled>
  );
}

export function Grid({ node }: { node: GridNode }) {
  const words = useStateWords();
  const cols = node.rows[0]?.length ?? 0;
  const stateOf = (r: number, c: number) => node.states?.[`${r},${c}`];
  return (
    <Labelled label={node.label}>
      <div className="vz-scroll">
        <div
          className="vz-grid"
          data-small={node.small || undefined}
          style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}
          aria-hidden="true"
        >
          {node.rows.map((row, r) =>
            row.map((v, c) => (
              <div key={`${r},${c}`} className="vz-box" data-state={stateAttr(stateOf(r, c))}>
                {fmt(v)}
              </div>
            )),
          )}
        </div>
      </div>
      <p className="sr-only">
        {node.rows
          .map((row, r) => `Row ${r}: ${row.map((v, c) => spoken(fmt(v), words(stateOf(r, c)))).join('; ')}`)
          .join('. ')}
      </p>
    </Labelled>
  );
}

export function Table({ node }: { node: TableNode }) {
  const words = useStateWords();
  // A computed cell is drawn plainly (legacy `td.s-done`); only the current, dependency and best cells stand out.
  const stateOf = (i: number, j: number, v: unknown) => {
    const s = node.states?.[`${i},${j}`] || (v === null || v === undefined ? 'empty' : '');
    return s === 'done' ? '' : s;
  };
  return (
    <Labelled label={node.label}>
      <div className="vz-scroll">
        <table className="vz-table">
          {node.colHead && (
            <thead>
              <tr>
                <td aria-hidden="true" />
                {node.colHead.map((h, j) => (
                  <th key={j} scope="col">
                    {fmt(h)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {node.rows.map((row, i) => (
              <tr key={i}>
                <th scope="row">{node.rowHead ? fmt(node.rowHead[i]) : ''}</th>
                {row.map((v, j) => {
                  const s = stateOf(i, j, v);
                  return (
                    <td key={j} className="vz-box" data-state={stateAttr(s)}>
                      {v === null || v === undefined ? '' : fmt(v)}
                      {words(s) && <span className="sr-only"> ({words(s)})</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Labelled>
  );
}

export function Bits({ node }: { node: BitsNode }) {
  const w = node.width || 32;
  const u = (node.value >>> 0)
    .toString(2)
    .padStart(32, '0')
    .slice(32 - w);
  const changed = new Set(node.changed ?? []);
  const decimal =
    `decimal ${node.signed === false ? node.value >>> 0 : node.value | 0}` +
    (w === 32 && (node.value | 0) < 0 ? `  ·  as unsigned ${node.value >>> 0}` : '');
  return (
    <Labelled label={node.label}>
      <div className="vz-bits" aria-hidden="true">
        {[...u].map((b, i) => (
          <span
            key={i}
            data-one={b === '1' || undefined}
            data-changed={changed.has(w - 1 - i) || undefined}
            data-sep={(i > 0 && i % 8 === 0) || undefined}
          >
            {b}
          </span>
        ))}
      </div>
      <p className="sr-only">
        binary {u}
        {changed.size ? `; changed bits: ${[...changed].sort((a, b) => b - a).join(', ')}` : ''}
      </p>
      <div className="mt-1 text-sm text-ink-3">{decimal}</div>
    </Labelled>
  );
}

export function Marks({ node }: { node: MarksNode }) {
  return (
    <div>
      <div className="flex flex-wrap gap-0.5" aria-hidden="true">
        {Array.from({ length: node.count }, (_, k) => (
          <span
            key={k}
            className={`inline-block h-3.5 w-2 rounded-[2px] ${k === node.current ? 'bg-st-current ring-2 ring-st-current ring-offset-1 ring-offset-sheet' : 'bg-st-done'}`}
          />
        ))}
      </div>
      <p className="sr-only">
        {node.count} so far{node.current !== undefined ? ', the last one just now' : ''}.
      </p>
    </div>
  );
}

export function ChipRows({ node }: { node: ChipRowsNode }) {
  const words = useStateWords();
  return (
    <div className="flex flex-col gap-1.5 font-code text-[13px]">
      {node.rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-center gap-1.5">
          {row.label && (
            <span className={`w-[74px] ${row.state ? 'font-bold text-st-current' : 'text-ink-3'}`}>
              {row.label}
              {words(row.state) && <span className="sr-only"> ({words(row.state)})</span>}
            </span>
          )}
          {row.chips.map((c, k) => (
            <span key={k} className="vz-box vz-pill" data-state={stateAttr(c.state)}>
              {c.text}
              {words(c.state) && <span className="sr-only"> ({words(c.state)})</span>}
            </span>
          ))}
          {!row.chips.length && row.empty && <span className="text-sm text-ink-3">{row.empty}</span>}
          {row.trailing && <span>{row.trailing}</span>}
        </div>
      ))}
    </div>
  );
}

export function Caption({ node }: { node: CaptionNode }) {
  const tone = node.tone === 'error' ? 'text-st-error' : node.tone === 'muted' ? 'text-ink-3' : 'text-ink';
  return <p className={`text-sm ${tone} ${node.mono ? 'font-code break-words' : ''}`}>{node.text}</p>;
}

export function Problem({ node }: { node: ProblemTextNode }) {
  return (
    <p className="mb-1 max-w-[60ch] border-l-[3px] border-rule bg-sheet px-3 py-2 text-sm leading-normal">
      {node.text}
    </p>
  );
}

export function CodeLines({ node }: { node: CodeLinesNode }) {
  return (
    <div className="font-code text-sm leading-[1.7]">
      {node.lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}
