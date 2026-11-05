'use client';

import { useEffect, useState } from 'react';
import { defaultInput } from '@/lib/viz/engine';
import { explore, GROWTH, type Exploration, type GrowthClass } from '@/lib/viz/explorer';
import { VIZ_LOADERS } from '@/lib/viz/registry';
import type { AnyViz } from '@/lib/viz/types';

const W = 420;
const H = 220;
const PAD = { l: 44, r: 70, t: 12, b: 34 };

/** The complexity explorer (plan 7.4): step counts on random inputs of growing size, against fitted growth curves. */
export function ExplorerPanel({ id }: { id: string }) {
  const [viz, setViz] = useState<AnyViz | null>(null);
  const [result, setResult] = useState<Exploration | null>(null);

  useEffect(() => {
    let live = true;
    void (VIZ_LOADERS[id] as () => Promise<AnyViz>)().then((v) => {
      if (!live) return;
      setViz(v);
      setResult(explore(v, defaultInput(v) as Record<string, unknown>, Math.random));
    });
    return () => {
      live = false;
    };
  }, [id]);

  if (!viz) return <p className="text-sm text-ink-3">Measuring…</p>;
  if (!result) return <p className="text-sm text-ink-2">Too few input sizes run to show a curve.</p>;

  const { points, fits, best } = result;
  const maxN = Math.max(...points.map((p) => p.n));
  const maxSteps = Math.max(...points.map((p) => p.steps));
  const x = (n: number) => PAD.l + (n / maxN) * (W - PAD.l - PAD.r);
  const y = (s: number) => H - PAD.b - (s / (maxSteps * 1.1)) * (H - PAD.t - PAD.b);
  const curve = (g: GrowthClass) => {
    const f = fits.find((t) => t.growth === g);
    if (!f) return '';
    const xs = Array.from({ length: 41 }, (_, i) => 1 + ((maxN - 1) * i) / 40);
    return xs
      .map((n) => [n, Math.max(0, Math.min(maxSteps * 1.1, f.a + f.c * GROWTH[g](n)))] as const)
      .map(([n, s], i) => `${i ? 'L' : 'M'}${x(n).toFixed(1)},${y(s).toFixed(1)}`)
      .join(' ');
  };
  const last = (g: GrowthClass) => {
    const f = fits.find((t) => t.growth === g);
    return f ? Math.max(0, Math.min(maxSteps * 1.1, f.a + f.c * GROWTH[g](maxN))) : 0;
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink">
        Closest growth: <strong>O({best})</strong>. Each point is one run on a random input of size n, counted
        in this visualizer&apos;s steps, up to the largest input it accepts (n = {maxN}).
      </p>
      <div className="vz-scroll">
        <svg className="vz-svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
          <line className="vz-edge" x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} />
          <line className="vz-edge" x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} />
          <text className="vz-lbl" x={(W - PAD.r + PAD.l) / 2} y={H - 6} textAnchor="middle">
            input size n
          </text>
          <text className="vz-lbl" x={PAD.l - 6} y={y(maxSteps)} textAnchor="end">
            {maxSteps}
          </text>
          <text className="vz-lbl" x={PAD.l - 6} y={H - PAD.b} textAnchor="end">
            0
          </text>
          <text className="vz-lbl" x={x(maxN)} y={H - PAD.b + 14} textAnchor="middle">
            {maxN}
          </text>
          {fits.map((f) => (
            <g key={f.growth}>
              <path
                className="vz-edge"
                data-state={f.growth === best ? 'current' : 'dim'}
                d={curve(f.growth)}
              />
              <text className="vz-lbl" x={W - PAD.r + 4} y={y(last(f.growth)) + 4}>
                {f.growth === best ? `O(${f.growth}) ◀` : `O(${f.growth})`}
              </text>
            </g>
          ))}
          {points.map((p) => (
            <circle key={p.n} className="vz-node" cx={x(p.n)} cy={y(p.steps)} r={3.5} />
          ))}
        </svg>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-accent">Step counts as a table</summary>
        <table className="mt-2 tabular">
          <thead>
            <tr>
              <th scope="col" className="pr-4 text-left">
                n
              </th>
              <th scope="col" className="text-left">
                Steps
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.n}>
                <td className="pr-4">{p.n}</td>
                <td>{p.steps}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
