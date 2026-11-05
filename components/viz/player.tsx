'use client';

// The visualizer player (plan 7.3, 7.4), after legacy/src/viz/player.js: input fields, presets, random and edge-case
// inputs; controls with play, step, scrubber, speed, next decision and reset; the code with its active line and
// breakpoints; variables; narration with a live region and a log; Watch and Predict; and the state in the URL hash.
import './viz.css';
import { useEffect, useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { edgeCases, type EdgeCase } from '@/lib/viz/edge-cases';
import { parseField, showField } from '@/lib/viz/engine';
import { encodeVizHash } from '@/lib/viz/hash';
import { activeLines, startInput, traceOf, type Trace } from '@/lib/viz/trace';
import type { AnyViz, InputField } from '@/lib/viz/types';
import { markVarChanges, stepVariables } from '@/lib/viz/variables';
import { flatNodes } from '@/lib/viz/walk';
import { CodePanel } from './code-panel';
import { Legend } from './legend';
import { LegendContext } from './primitives/common';
import { VizNodes } from './viz-nodes';

export interface PlayerProps {
  viz: AnyViz;
  /** Values that replace the defaults: an embed's `input` prop, or the input in a shared link. */
  input?: Record<string, unknown>;
  /** 0-based. */
  initialStep?: number;
  title?: string;
  /** Keep the visualizer, its input and the step in the page address (the playground). */
  syncHash?: boolean;
  headingLevel?: 1 | 2 | 3;
}

const BASE_DELAY_MS = 1100;
const SPEEDS = [0.5, 1, 2, 4];

const BTN =
  'rounded-control border border-rule bg-sheet px-2.5 py-1 text-sm text-ink hover:border-ink-3 disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY =
  'rounded-control border border-accent bg-accent px-2.5 py-1 text-sm text-accent-ink disabled:cursor-not-allowed disabled:opacity-50';

/** What the player shows when an input cannot run and there is no earlier run to keep showing. */
const fixInputTrace = (input: Record<string, unknown>): Trace => ({
  input,
  steps: [{ note: 'Fix the input above to start.', line: null }],
  views: [[]],
  questions: [null],
  decisions: [],
});

const textsOf = (fields: InputField[], input: Record<string, unknown>) =>
  Object.fromEntries(fields.map((f) => [f.key, showField(f, input[f.key])]));

interface Pending {
  choice: number | null;
  checked: boolean;
}

export function Player({
  viz,
  input: overrides,
  initialStep = 0,
  title,
  syncHash = false,
  headingLevel = 3,
}: PlayerProps) {
  const uid = useId();
  const fields = useMemo(() => viz.inputs ?? [], [viz]);
  // The first run: the given input, or the defaults with the reason the given input could not run.
  const [first] = useState(() => {
    const start = startInput(viz, overrides);
    try {
      return { input: start, trace: traceOf(viz, start), error: null };
    } catch (e) {
      const message = (e as Error).message;
      const defaults = startInput(viz);
      try {
        return { input: defaults, trace: traceOf(viz, defaults), error: message };
      } catch {
        return { input: start, trace: fixInputTrace(start), error: message };
      }
    }
  });
  const [trace, setTrace] = useState<Trace>(first.trace);
  const [error, setError] = useState<string | null>(first.error);
  const [texts, setTexts] = useState<Record<string, string>>(() => textsOf(fields, first.input));
  const [preset, setPreset] = useState('');
  const [index, setIndex] = useState(() => Math.max(0, Math.min(first.trace.steps.length - 1, initialStep)));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState<'watch' | 'predict'>('watch');
  const [pending, setPending] = useState<Pending | null>(null);
  const [score, setScore] = useState({ right: 0, asked: 0 });
  const [breakpoints, setBreakpoints] = useState<ReadonlySet<number>>(new Set());
  const [status, setStatus] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const edges = useMemo<EdgeCase[]>(() => edgeCases(viz, startInput(viz)), [viz]);
  const legend = useMemo(() => Object.fromEntries(viz.legend ?? []), [viz]);

  const n = trace.steps.length;
  const step = trace.steps[index] ?? trace.steps[0];
  const question = trace.questions[index] ?? null;
  const canPredict = trace.questions.some(Boolean);

  const go = (k: number) => {
    setIndex(Math.max(0, Math.min(n - 1, k)));
    setPending(null);
  };

  /** Runs an input. On failure the previous run stays on screen, as in the legacy player. */
  const apply = (input: Record<string, unknown>, at = 0): boolean => {
    setPlaying(false);
    try {
      const next = traceOf(viz, input);
      setTrace(next);
      setIndex(Math.max(0, Math.min(next.steps.length - 1, at)));
      setPending(null);
      setError(null);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };

  const readFields = (values: Record<string, string>): Record<string, unknown> | null => {
    try {
      return Object.fromEntries(fields.map((f) => [f.key, parseField(f, values[f.key] ?? '')]));
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  };

  const runInput = (input: Record<string, unknown>) => {
    setTexts(textsOf(fields, input));
    apply(input);
  };

  const runFields = (values = texts) => {
    const input = readFields(values);
    if (input) apply(input);
  };

  const choosePreset = (value: string) => {
    setPreset(value);
    const p = viz.presets?.[Number(value)];
    if (value === '' || !p) return;
    const values = { ...texts };
    for (const f of fields) {
      const v = (p.input as Record<string, unknown>)[f.key];
      if (v !== undefined) values[f.key] = showField(f, v);
    }
    setTexts(values);
    runFields(values);
  };

  const next = () => {
    if (index >= n - 1) {
      setPlaying(false);
      return;
    }
    if (mode === 'predict' && question && !pending?.checked) {
      setPlaying(false);
      if (!pending) setPending({ choice: null, checked: false });
      return;
    }
    go(index + 1);
  };

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (index >= n - 1) go(0);
    setPlaying(true);
  };

  const nextDecision = trace.decisions.find((k) => k > index);

  // Play: one step per tick. Stops at the end, on a breakpoint, and before a question in Predict mode.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (index >= n - 1) {
        setPlaying(false);
        return;
      }
      if (mode === 'predict' && trace.questions[index]) {
        setPlaying(false);
        setPending({ choice: null, checked: false });
        return;
      }
      const k = index + 1;
      setIndex(k);
      const s = trace.steps[k];
      if (k >= n - 1 || (s && activeLines(s).some((l) => breakpoints.has(l)))) setPlaying(false);
    }, BASE_DELAY_MS / speed);
    return () => window.clearTimeout(timer);
  }, [playing, index, n, speed, mode, trace, breakpoints]);

  // The address names the input only when it is not the default, so a plain link stays short.
  const defaultsJson = useMemo(() => JSON.stringify(startInput(viz)), [viz]);
  const isDefault = JSON.stringify(trace.input) === defaultsJson;
  const hash = useMemo(
    () => encodeVizHash({ id: viz.id, input: isDefault ? undefined : trace.input, step: index + 1 }),
    [viz.id, trace, index, isDefault],
  );

  // A first visit leaves the address alone until the learner moves or changes the input.
  useEffect(() => {
    if (!syncHash) return;
    if (index === 0 && isDefault && !window.location.hash.startsWith('#viz=')) return;
    window.history.replaceState(window.history.state, '', `#${hash}`);
  }, [syncHash, hash, index, isDefault]);

  const copyLink = async () => {
    const url = new URL(window.location.href);
    url.hash = hash;
    try {
      await navigator.clipboard.writeText(url.href);
      setShareUrl('');
      setStatus('Link to this step copied.');
    } catch {
      setShareUrl(url.href);
      setStatus('Copying was blocked. Copy the link below.');
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, select, textarea') || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') go(index - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(n - 1);
    else if (e.key === ' ' && !target.closest('button, a, summary')) togglePlay();
    else return;
    e.preventDefault();
  };

  const check = () => {
    if (!pending || pending.choice === null || !question) return;
    setPending({ ...pending, checked: true });
    setScore((s) => ({ right: s.right + (pending.choice === question.answer ? 1 : 0), asked: s.asked + 1 }));
  };

  const view = useMemo(
    () => markVarChanges(trace.views[index] ?? [], index > 0 ? trace.views[index - 1] : undefined),
    [trace, index],
  );
  const ownVars = flatNodes(view).some((node) => node.kind === 'vars');
  const variables = ownVars ? [] : stepVariables(step, index > 0 ? trace.steps[index - 1] : undefined);
  const lines = activeLines(step);
  const Heading = (['h1', 'h2', 'h3'] as const)[headingLevel - 1] ?? 'h3';
  const titleId = `${uid}-title`;

  return (
    <LegendContext.Provider value={legend}>
      <section
        className="overflow-hidden rounded-card border border-rule bg-sheet shadow-card"
        aria-labelledby={titleId}
        data-viz={viz.id}
        onKeyDown={onKeyDown}
      >
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-b border-rule-2 px-3.5 py-2.5">
          <Heading id={titleId} className="min-w-40 flex-1 text-[15px] font-semibold text-ink">
            <span className="block text-[11px] font-bold tracking-[0.08em] text-accent uppercase">
              Visualizer
            </span>
            {title ?? viz.title}
          </Heading>
          <Legend items={viz.legend ?? []} />
          <fieldset className="flex items-center gap-2 text-sm text-ink-2">
            <legend className="sr-only">Mode</legend>
            {(['watch', 'predict'] as const).map((m) => (
              <label key={m} className="flex items-center gap-1">
                <input
                  type="radio"
                  name={`${uid}-mode`}
                  value={m}
                  checked={mode === m}
                  disabled={m === 'predict' && !canPredict}
                  onChange={() => {
                    setMode(m);
                    setPending(null);
                    setPlaying(false);
                  }}
                />
                {m === 'watch' ? 'Watch' : 'Predict'}
              </label>
            ))}
          </fieldset>
        </div>

        {fields.length > 0 && (
          <form
            className="flex flex-wrap items-end gap-2 border-b border-rule-2 bg-paper px-3.5 py-2.5 text-[13px]"
            onSubmit={(e) => {
              e.preventDefault();
              runFields();
            }}
          >
            {fields.map((f) => (
              <div
                key={f.key}
                className="flex min-w-0 flex-col gap-0.5 text-ink-2"
                style={{ flex: f.wide ? '2 1 240px' : '1 1 120px' }}
              >
                <label htmlFor={`${uid}-${f.key}`}>{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    id={`${uid}-${f.key}`}
                    className="w-full rounded-control border border-rule bg-sheet px-2 py-1 font-code text-ink"
                    value={texts[f.key] ?? ''}
                    onChange={(e) => {
                      setPreset('');
                      setTexts({ ...texts, [f.key]: e.target.value });
                    }}
                  >
                    {(f.options ?? []).map((o) => {
                      const value = typeof o === 'object' ? String(o.value) : o;
                      return (
                        <option key={value} value={value}>
                          {typeof o === 'object' ? o.label : o}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    id={`${uid}-${f.key}`}
                    className="w-full min-w-0 rounded-control border border-rule bg-sheet px-2 py-1 font-code text-ink"
                    value={texts[f.key] ?? ''}
                    spellCheck={false}
                    autoComplete="off"
                    onChange={(e) => {
                      setPreset('');
                      setTexts({ ...texts, [f.key]: e.target.value });
                    }}
                  />
                )}
              </div>
            ))}
            {viz.presets && viz.presets.length > 0 && (
              <div className="flex min-w-0 flex-col gap-0.5 text-ink-2" style={{ flex: '1 1 160px' }}>
                <label htmlFor={`${uid}-presets`}>Examples</label>
                <select
                  id={`${uid}-presets`}
                  className="w-full rounded-control border border-rule bg-sheet px-2 py-1 text-ink"
                  value={preset}
                  onChange={(e) => choosePreset(e.target.value)}
                >
                  <option value="">Choose…</option>
                  {viz.presets.map((p, i) => (
                    <option key={p.label} value={String(i)}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              <button type="submit" className={BTN}>
                Run with this input
              </button>
              {viz.random && (
                <button
                  type="button"
                  className={BTN}
                  onClick={() => viz.random && runInput(viz.random(Math.random) as Record<string, unknown>)}
                >
                  Random input
                </button>
              )}
            </div>
            {edges.length > 0 && (
              <div
                className="flex basis-full flex-wrap items-center gap-1.5"
                role="group"
                aria-label="Edge cases"
              >
                <span className="text-ink-3">Edge cases:</span>
                {edges.map((c) => (
                  <button key={c.label} type="button" className={BTN} onClick={() => runInput(c.input)}>
                    {c.label}
                  </button>
                ))}
              </div>
            )}
            {error && (
              <p role="alert" className="basis-full text-st-error">
                {error}
              </p>
            )}
          </form>
        )}

        <div className="grid min-[1100px]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div
            className="flex min-w-0 flex-col gap-3.5 overflow-x-auto p-4"
            tabIndex={0}
            role="group"
            aria-label={`Drawing of step ${index + 1}. Use the arrow keys to step, space to play.`}
          >
            <VizNodes nodes={view} />
          </div>
          <div className="flex min-w-0 flex-col border-t border-rule-2 min-[1100px]:border-t-0 min-[1100px]:border-l">
            <CodePanel
              code={viz.code}
              active={lines}
              breakpoints={breakpoints}
              onToggleBreakpoint={(line) => {
                const nextSet = new Set(breakpoints);
                if (nextSet.has(line)) nextSet.delete(line);
                else nextSet.add(line);
                setBreakpoints(nextSet);
              }}
            />
            {variables.length > 0 && (
              <Panel title="Variables">
                <div className="vz-vars">
                  {variables.map((v) => (
                    <span key={v.name} data-changed={v.changed || undefined}>
                      <span className="vz-name">{v.name} =</span>
                      {v.value}
                      {v.changed && <span className="sr-only"> (changed)</span>}
                    </span>
                  ))}
                </div>
              </Panel>
            )}
            <div className="min-h-[84px] border-t border-rule-2 px-3.5 py-3 text-sm leading-normal">
              <span className="mb-0.5 block text-[11px] tracking-[0.08em] text-ink-3 uppercase tabular">
                Step {index + 1} of {n}
              </span>
              {pending && question ? (
                <PredictBox
                  name={`${uid}-predict`}
                  prompt={question.prompt}
                  options={question.options}
                  answer={question.answer}
                  pending={pending}
                  onChoose={(choice) => setPending({ ...pending, choice })}
                  onCheck={check}
                  onContinue={() => go(index + 1)}
                />
              ) : (
                <>
                  <p>{step.note}</p>
                  {step.why && (
                    <p className="mt-1 text-[13px] text-ink-2">
                      <span className="font-semibold">Why: </span>
                      {step.why}
                    </p>
                  )}
                </>
              )}
              {mode === 'predict' && (
                <p className="mt-2 text-xs text-ink-3 tabular">
                  Predictions right: {score.right} of {score.asked}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-rule-2 px-3.5 py-2.5">
          <button
            type="button"
            className={BTN}
            onClick={() => {
              setPlaying(false);
              go(0);
            }}
          >
            Reset
          </button>
          <button type="button" className={BTN} disabled={index === 0} onClick={() => go(index - 1)}>
            <span aria-hidden="true">◀ </span>Back
          </button>
          <button type="button" className={PRIMARY} disabled={index === n - 1} onClick={next}>
            Next<span aria-hidden="true"> ▶</span>
          </button>
          <button type="button" className={BTN} aria-pressed={playing} onClick={togglePlay}>
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            className={BTN}
            disabled={nextDecision === undefined}
            onClick={() => nextDecision !== undefined && go(nextDecision)}
          >
            Next decision
          </button>
          <input
            type="range"
            className="min-w-[120px] flex-1 accent-accent"
            min={0}
            max={n - 1}
            value={index}
            aria-label="Step"
            aria-valuetext={`Step ${index + 1} of ${n}`}
            onChange={(e) => go(Number(e.target.value))}
          />
          <span className="flex items-center gap-1 text-sm text-ink-2">
            <label htmlFor={`${uid}-speed`}>Speed</label>
            <select
              id={`${uid}-speed`}
              className="rounded-control border border-rule bg-sheet px-1 py-0.5 text-ink"
              value={String(speed)}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              {SPEEDS.map((s) => (
                <option key={s} value={String(s)}>
                  {s}×
                </option>
              ))}
            </select>
          </span>
          <span className="min-w-16 text-right text-[12.5px] text-ink-2 tabular" aria-hidden="true">
            {index + 1} / {n}
          </span>
          <button type="button" className={BTN} onClick={() => void copyLink()}>
            Copy link
          </button>
          <p role="status" className="basis-full text-xs text-ink-3 empty:hidden">
            {status}
          </p>
          {shareUrl && (
            <input
              className="basis-full rounded-control border border-rule bg-sheet px-2 py-1 font-code text-xs"
              readOnly
              value={shareUrl}
              aria-label="Link to this step"
              onFocus={(e) => e.target.select()}
            />
          )}
        </div>

        <details className="border-t border-rule-2 px-3.5 py-2 text-sm">
          <summary className="cursor-pointer text-accent">Narration log</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-6 text-ink-2">
            {trace.steps.slice(0, index + 1).map((s, k) => (
              <li key={k}>
                {s.note}
                {s.why ? ` Why: ${s.why}` : ''}
              </li>
            ))}
          </ol>
        </details>

        <div className="sr-only" aria-live="polite" aria-atomic="true">
          Step {index + 1} of {n}. {pending && question ? question.prompt : step.note}
        </div>
      </section>
    </LegendContext.Provider>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-rule-2 px-3.5 py-2.5">
      <div className="vz-label">{title}</div>
      {children}
    </div>
  );
}

interface PredictBoxProps {
  name: string;
  prompt: string;
  options: string[];
  answer: number;
  pending: Pending;
  onChoose: (choice: number) => void;
  onCheck: () => void;
  onContinue: () => void;
}

/** A question before the next step. The answer shows in words, so right and wrong never rely on colour. */
function PredictBox({
  name,
  prompt,
  options,
  answer,
  pending,
  onChoose,
  onCheck,
  onContinue,
}: PredictBoxProps) {
  const right = pending.choice === answer;
  return (
    <fieldset>
      <legend className="font-semibold text-ink">{prompt}</legend>
      <div className="mt-1.5 flex flex-col gap-1">
        {options.map((o, i) => (
          <label key={o} className="flex items-center gap-2">
            <input
              type="radio"
              name={name}
              checked={pending.choice === i}
              disabled={pending.checked}
              onChange={() => onChoose(i)}
            />
            {o}
            {pending.checked && i === answer && (
              <span className="text-xs font-semibold text-st-done"> ✓ answer</span>
            )}
          </label>
        ))}
      </div>
      {pending.checked ? (
        <>
          <p role="status" className="mt-2">
            {right ? 'Right.' : `Not this time. The answer is: ${options[answer] ?? ''}.`}
          </p>
          <button type="button" className={`${PRIMARY} mt-2`} onClick={onContinue}>
            Show the step
          </button>
        </>
      ) : (
        <div className="mt-2 flex gap-1.5">
          <button type="button" className={PRIMARY} disabled={pending.choice === null} onClick={onCheck}>
            Check
          </button>
          <button type="button" className={BTN} onClick={onContinue}>
            Skip
          </button>
        </div>
      )}
    </fieldset>
  );
}
