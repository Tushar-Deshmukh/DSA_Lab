'use client';

import './viz.css';
import { useEffect, useId, useState } from 'react';
import { finalAnswer, sameAnswer, sideInput, type ComparePair } from '@/lib/viz/compare';
import { parseField, showField } from '@/lib/viz/engine';
import { fmt } from '@/lib/viz/nodes';
import { VIZ_LOADERS } from '@/lib/viz/registry';
import { startInput, traceOf, type Trace } from '@/lib/viz/trace';
import type { AnyViz } from '@/lib/viz/types';
import { LegendContext } from './primitives/common';
import { VizNodes } from './viz-nodes';

const BTN =
  'rounded-control border border-rule bg-sheet px-2.5 py-1 text-sm text-ink hover:border-ink-3 disabled:cursor-not-allowed disabled:opacity-50';

interface Loaded {
  left: AnyViz;
  right: AnyViz;
}

/** Compare mode (plan 7.4): both methods on one input, stepped together, with their step counts and answers. */
export function ComparePanel({ pair }: { pair: ComparePair }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  useEffect(() => {
    let live = true;
    const load = (id: string) => (VIZ_LOADERS[id] as () => Promise<AnyViz>)();
    void Promise.all([load(pair.left.viz), load(pair.right.viz)]).then(([left, right]) => {
      if (live) setLoaded({ left, right });
    });
    return () => {
      live = false;
    };
  }, [pair]);
  if (!loaded) return <p className="text-sm text-ink-3">Loading both visualizers…</p>;
  return <Comparison pair={pair} left={loaded.left} right={loaded.right} />;
}

function Comparison({ pair, left, right }: { pair: ComparePair; left: AnyViz; right: AnyViz }) {
  const uid = useId();
  const fields = (left.inputs ?? []).filter((f) => !(f.key in (pair.left.fixed ?? {})));
  const run = (shared: Record<string, unknown>) => ({
    left: traceOf(left, sideInput(pair.left, shared)),
    right: traceOf(right, sideInput(pair.right, shared)),
  });
  const [state, setState] = useState(() => {
    const shared = startInput(left);
    return { shared, traces: run(shared) };
  });
  const [texts, setTexts] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.key, showField(f, state.shared[f.key])])),
  );
  const [error, setError] = useState<string | null>(null);
  const [k, setK] = useState(0);
  const [playing, setPlaying] = useState(false);
  const longest = Math.max(state.traces.left.steps.length, state.traces.right.steps.length);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (k >= longest - 1) setPlaying(false);
      else setK(k + 1);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [playing, k, longest]);

  const apply = (shared: Record<string, unknown>) => {
    setPlaying(false);
    try {
      setState({ shared, traces: run(shared) });
      setTexts(Object.fromEntries(fields.map((f) => [f.key, showField(f, shared[f.key])])));
      setK(0);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const fromFields = () => {
    try {
      apply({
        ...state.shared,
        ...Object.fromEntries(fields.map((f) => [f.key, parseField(f, texts[f.key] ?? '')])),
      });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const answers = [finalAnswer(state.traces.left.steps), finalAnswer(state.traces.right.steps)] as const;
  const same = sameAnswer(pair, answers[0], answers[1]);

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-wrap items-end gap-2 text-[13px]"
        onSubmit={(e) => {
          e.preventDefault();
          fromFields();
        }}
      >
        {fields.map((f) => (
          <div key={f.key} className="flex min-w-0 flex-col gap-0.5 text-ink-2" style={{ flex: '1 1 140px' }}>
            <label htmlFor={`${uid}-${f.key}`}>{f.label}</label>
            <input
              id={`${uid}-${f.key}`}
              className="w-full min-w-0 rounded-control border border-rule bg-sheet px-2 py-1 font-code text-ink"
              value={texts[f.key] ?? ''}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => setTexts({ ...texts, [f.key]: e.target.value })}
            />
          </div>
        ))}
        <button type="submit" className={BTN}>
          Run both
        </button>
        {left.random && (
          <button
            type="button"
            className={BTN}
            onClick={() => left.random && apply(left.random(Math.random) as Record<string, unknown>)}
          >
            Random input
          </button>
        )}
        {error && (
          <p role="alert" className="basis-full text-st-error">
            {error}
          </p>
        )}
      </form>

      <p className="text-sm text-ink" role="status">
        {pair.left.label}: {state.traces.left.steps.length} steps. {pair.right.label}:{' '}
        {state.traces.right.steps.length} steps.{' '}
        {same === null
          ? `Answers: ${fmt(answers[0])} and ${fmt(answers[1])}; the problem accepts either.`
          : same
            ? `Both answer ${fmt(answers[0])}.`
            : `The answers differ: ${fmt(answers[0])} and ${fmt(answers[1])}.`}
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <Side label={pair.left.label} viz={left} trace={state.traces.left} k={k} />
        <Side label={pair.right.label} viz={right} trace={state.traces.right} k={k} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={BTN}
          onClick={() => {
            setPlaying(false);
            setK(0);
          }}
        >
          Reset
        </button>
        <button type="button" className={BTN} disabled={k === 0} onClick={() => setK(k - 1)}>
          <span aria-hidden="true">◀ </span>Back
        </button>
        <button type="button" className={BTN} disabled={k >= longest - 1} onClick={() => setK(k + 1)}>
          Next<span aria-hidden="true"> ▶</span>
        </button>
        <button
          type="button"
          className={BTN}
          aria-pressed={playing}
          onClick={() => {
            if (!playing && k >= longest - 1) setK(0);
            setPlaying(!playing);
          }}
        >
          {playing ? 'Pause' : 'Play both'}
        </button>
        <input
          type="range"
          className="min-w-[120px] flex-1 accent-accent"
          min={0}
          max={longest - 1}
          value={k}
          aria-label="Step of both"
          aria-valuetext={`Step ${k + 1}`}
          onChange={(e) => setK(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

function Side({ label, viz, trace, k }: { label: string; viz: AnyViz; trace: Trace; k: number }) {
  const n = trace.steps.length;
  const at = Math.min(k, n - 1);
  const done = k >= n - 1;
  return (
    <LegendContext.Provider value={Object.fromEntries(viz.legend ?? [])}>
      <section className="min-w-0 rounded-card border border-rule bg-sheet" aria-label={label}>
        <div className="flex items-baseline justify-between gap-2 border-b border-rule-2 px-3 py-2">
          <h3 className="text-sm font-semibold text-ink">{label}</h3>
          <span className="text-xs text-ink-3 tabular">
            {done ? `Finished in ${n} steps` : `Step ${at + 1} of ${n}`}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-3 overflow-x-auto p-3">
          <VizNodes nodes={trace.views[at] ?? []} />
        </div>
        <p className="border-t border-rule-2 px-3 py-2 text-sm">{trace.steps[at]?.note}</p>
      </section>
    </LegendContext.Provider>
  );
}
