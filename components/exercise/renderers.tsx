'use client';
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ExerciseFrame, type ExCtx } from './exercise-frame';
import { CodeBlock } from './code-block';
import { CodeEditor } from './editor';
import { BTN, PRIMARY } from './ui';
import { runCode } from '@/lib/client/runner';
import { highlightLines } from '@/lib/highlight';
import {
  KIND_LABEL,
  asMcq,
  asComplexity,
  asBug,
  asPredict,
  asFill,
  asTrace,
  asCode,
  asInterview,
  type McqPublic,
  type ComplexityPublic,
  type BugPublic,
  type PredictPublic,
  type FillPublic,
  type TracePublic,
  type CodePublic,
  type InterviewPublic,
} from '@/lib/exercise/public-shape';
import {
  asMcqKey,
  asComplexityKey,
  asBugKey,
  asPredictKey,
  asFillKey,
  asTraceKey,
  asCodeKey,
  asInterviewKey,
  cachedKey,
  loadKey,
  type ComplexityKey,
  type McqKey,
  type PredictKey,
  type TraceKey,
  type CodeKey,
  type InterviewKey,
  type FillKey,
  type BugKey,
} from '@/lib/client/exercise-key';
import type { ExerciseRecord } from '@/lib/domain/exercises';

// The answer-type renderers, ported from the legacy app: mcq/pattern (warm-up recalls ride the same shape),
// complexity, predict, bug, trace, fill and the two code kinds. Every check fetches this exercise's key alone
// (D-011), then records the attempt; the frame holds the answer back until a hint or two wrong attempts. The
// code kinds run in the runner Worker (D-007) with the tests the page carries plus the hidden ones from the key.

const letter = (i: number) => String.fromCharCode(65 + i);
const KEY_ERROR = 'The answer key could not be loaded. Check the connection and try again.';

// ---- inline markdown for question text: **bold**, *italic*, `code`, and a link-free newline as a break

export function md(text: string): ReactNode {
  const out: ReactNode[] = [];
  let key = 0;
  for (const chunk of text.split('\n')) {
    const tokens: ReactNode[] = [];
    let rest = chunk;
    while (rest) {
      const m = rest.match(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
      if (!m || m.index === undefined) {
        tokens.push(rest);
        break;
      }
      if (m.index > 0) tokens.push(rest.slice(0, m.index));
      const token = m[0];
      if (token.startsWith('**')) tokens.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
      else if (token.startsWith('`'))
        tokens.push(
          <code key={key++} className="font-code text-[0.9em]">
            {token.slice(1, -1)}
          </code>,
        );
      else tokens.push(<em key={key++}>{token.slice(1, -1)}</em>);
      rest = rest.slice(m.index + token.length);
    }
    out.push(
      <span key={key++} className="block">
        {tokens}
      </span>,
    );
  }
  return out;
}

const parseChoice = (draft: string | undefined): number[] => {
  try {
    const v = draft ? (JSON.parse(draft) as unknown) : [];
    return Array.isArray(v) ? (v as unknown[]).filter((x): x is number => typeof x === 'number') : [];
  } catch {
    return [];
  }
};

const parseList = (draft: string | undefined): string[] => {
  try {
    const v = draft ? (JSON.parse(draft) as unknown) : [];
    return Array.isArray(v) ? (v as unknown[]).map(String) : [];
  } catch {
    return [];
  }
};

export function McqExercise({ slug, public: p }: { slug: string; public: Record<string, unknown> }) {
  const pub = asMcq(p);
  const cached = cachedKey(slug);
  return (
    <ExerciseFrame slug={slug} label={KIND_LABEL[pub.type]} tag={pub.tag} hints={pub.hints}>
      {(ctx) => <McqBody ctx={ctx} p={pub} slug={slug} initialKey={cached ? asMcqKey(cached.key) : null} />}
    </ExerciseFrame>
  );
}

function McqBody({
  ctx,
  p,
  slug,
  initialKey,
}: {
  ctx: ExCtx;
  p: McqPublic;
  slug: string;
  initialKey: McqKey | null;
}) {
  const [key, setKey] = useState<McqKey | null>(initialKey);
  const [picked, setPicked] = useState<Set<number>>(() => new Set(parseChoice(ctx.record?.drafts['choice'])));
  const [marked, setMarked] = useState<Map<number, 'ok' | 'bad'>>(new Map());
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const answeredRef = useRef(false);

  const choose = (i: number) => {
    if (locked) return;
    const next = new Set(picked);
    if (p.multi) {
      if (next.has(i)) next.delete(i);
      else next.add(i);
    } else if (!next.has(i)) {
      next.clear();
      next.add(i);
    }
    setPicked(next);
    ctx.drafted('choice', JSON.stringify([...next]));
  };

  const check = async () => {
    if (busy || locked) return;
    if (!picked.size) {
      ctx.feedback({
        kind: 'info',
        tag: 'Pick an answer',
        content: <p>Choose an option first, then check it.</p>,
      });
      return;
    }
    setBusy(true);
    let k = key;
    if (!k) {
      const loaded = await loadKey(slug);
      setBusy(false);
      if (!loaded) {
        ctx.feedback({ kind: 'info', tag: 'Key missing', content: <p>{KEY_ERROR}</p> });
        return;
      }
      k = asMcqKey(loaded.key);
      setKey(k);
    } else setBusy(false);
    const correct = new Set(k.options.map((o, i) => (o.ok ? i : -1)).filter((i) => i >= 0));
    const ok = picked.size === correct.size && [...picked].every((i) => correct.has(i));
    const marks = new Map<number, 'ok' | 'bad'>();
    for (const i of picked) marks.set(i, correct.has(i) ? 'ok' : 'bad');
    setMarked(marks);
    const parts = [...picked].map((i) => {
      const o = k?.options[i];
      const mine =
        !o || o.ok
          ? ''
          : o.kind === 'impl'
            ? 'Implementation slip. '
            : o.kind === 'concept'
              ? 'Conceptual mistake. '
              : '';
      return (
        <p key={i}>
          <b>{letter(i)}.</b> {mine ? <strong>{mine} </strong> : null}
          {o?.why || (o?.ok ? 'Correct.' : 'Not this one.')}
        </p>
      );
    });
    const mine = [...picked].map((i) => k.options[i]?.kind).find(Boolean);
    ctx.checked(ok, ok ? undefined : mine);
    if (ok) {
      ctx.feedback({
        kind: 'ok',
        tag: 'Correct',
        content: (
          <>
            {parts}
            {k.explain ? <p>{k.explain}</p> : null}
            {k.clues ? (
              <p>
                <b>Clues to notice:</b> {k.clues}
              </p>
            ) : null}
          </>
        ),
      });
      setLocked(true);
      answeredRef.current = true;
    } else {
      const missing =
        p.multi && [...correct].filter((i) => !picked.has(i)).length ? (
          <p>At least one correct option is still unselected.</p>
        ) : null;
      ctx.feedback({
        kind: 'bad',
        tag: 'Not yet',
        content: (
          <>
            {parts}
            {missing}
            <p>Change your choice and check again, or take a hint.</p>
          </>
        ),
      });
    }
  };

  useEffect(() => {
    if (!ctx.revealedNow) return;
    let live = true;
    const showAnswer = (k: McqKey) => {
      if (!live) return;
      const marks = new Map<number, 'ok' | 'bad'>();
      k.options.forEach((o, i) => marks.set(i, o.ok ? 'ok' : 'bad'));
      setMarked(marks);
      setLocked(true);
      const first = k.options.findIndex((o) => o.ok);
      setPicked(first >= 0 ? new Set([first]) : new Set());
      ctx.clearFeedback();
      ctx.addFeedback({
        kind: 'info',
        tag: 'Answer',
        content: (
          <>
            {k.options.map((o, i) =>
              o.ok ? (
                <p key={i}>
                  <b>{letter(i)}.</b> {o.why || ''}
                </p>
              ) : null,
            )}
            {k.explain ? <p>{k.explain}</p> : null}
            {k.clues ? (
              <p>
                <b>Clues to notice:</b> {k.clues}
              </p>
            ) : null}
          </>
        ),
      });
    };
    if (key) showAnswer(key);
    else
      void loadKey(slug).then((loaded) => {
        if (live && loaded) {
          const k = asMcqKey(loaded.key);
          setKey(k);
          showAnswer(k);
        }
      });
    return () => {
      live = false;
    };
    // Per reveal click, once; the record's own flag drives the status line only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.revealedNow]);

  return (
    <div className="space-y-3 text-[15px]">
      {md(p.q)}
      {p.code ? <CodeBlock code={p.code} /> : null}
      <div role={p.multi ? 'group' : 'radiogroup'} aria-label="Answer options" className="space-y-1.5">
        {p.options.map((o, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={picked.has(i)}
            disabled={locked}
            onClick={() => choose(i)}
            className={`flex w-full items-baseline gap-2.5 rounded-control border px-3 py-2 text-left text-sm text-ink ${
              marked.get(i) === 'ok'
                ? 'border-st-done/60 bg-st-done-soft'
                : marked.get(i) === 'bad'
                  ? 'border-st-error/50 bg-st-error-soft'
                  : picked.has(i)
                    ? 'border-accent bg-accent-soft'
                    : 'border-rule-2 bg-sheet hover:border-ink-3'
            }`}
          >
            <span className="font-ui text-[11px] font-bold text-ink-2">{letter(i)}</span>
            <span>{md(o.t)}</span>
          </button>
        ))}
      </div>
      {p.multi ? <p className="font-ui text-xs text-ink-3">Select every option that applies.</p> : null}
      <button type="button" className={PRIMARY} onClick={() => void check()} disabled={busy || locked}>
        Check
      </button>
    </div>
  );
}

// ---- complexity

export function ComplexityExercise({ slug, public: p }: { slug: string; public: Record<string, unknown> }) {
  const pub = asComplexity(p);
  return (
    <ExerciseFrame slug={slug} label={KIND_LABEL.complexity} tag={pub.tag} hints={pub.hints}>
      {(ctx) => <ComplexityBody ctx={ctx} p={pub} slug={slug} />}
    </ExerciseFrame>
  );
}

const COMPLEXITIES = ['O(1)', 'O(log n)', 'O(√n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(n³)', 'O(2ⁿ)', 'O(n!)'];

function ComplexityBody({ ctx, p, slug }: { ctx: ExCtx; p: ComplexityPublic; slug: string }) {
  const [key, setKey] = useState<ComplexityKey | null>(() =>
    cachedKey(slug) ? asComplexityKey(cachedKey(slug)!.key) : null,
  );
  const [values, setValues] = useState<string[]>(() => parseList(ctx.record?.drafts['fields']));
  const [marked, setMarked] = useState<Map<number, boolean>>(new Map());
  const [busy, setBusy] = useState(false);

  const setField = (i: number, value: string) => {
    const next = [...values];
    next[i] = value;
    setValues(next);
    ctx.drafted('fields', JSON.stringify(next));
  };

  const check = async () => {
    if (busy) return;
    const filled = values.filter((v, i) => i < p.fields.length && v).length;
    if (filled < p.fields.length) {
      ctx.feedback({
        kind: 'info',
        tag: 'Pick every field',
        content: <p>Choose a complexity for each field.</p>,
      });
      return;
    }
    setBusy(true);
    let k = key;
    if (!k) {
      const loaded = await loadKey(slug);
      setBusy(false);
      if (!loaded) {
        ctx.feedback({ kind: 'info', tag: 'Key missing', content: <p>{KEY_ERROR}</p> });
        return;
      }
      k = asComplexityKey(loaded.key);
      setKey(k);
    } else setBusy(false);
    const notes: ReactNode[] = [];
    const marks = new Map<number, boolean>();
    let ok = true;
    k.fields.forEach((f, i) => {
      const expected = (Array.isArray(f.answer) ? f.answer : [f.answer]) as string[];
      const good = expected.includes(values[i] ?? '');
      marks.set(i, good);
      if (!good) {
        ok = false;
        notes.push(
          <p key={i}>
            <b>{p.fields[i].label}:</b>{' '}
            {f.why?.[values[i] ?? ''] ??
              `Not ${values[i]}. Count how many times the innermost work runs as n grows.`}
          </p>,
        );
      }
    });
    setMarked(marks);
    ctx.checked(ok, 'concept');
    ctx.feedback({
      kind: ok ? 'ok' : 'bad',
      tag: ok ? 'Correct' : 'Not yet',
      content: ok ? (
        k.explain ? (
          <p>{k.explain}</p>
        ) : null
      ) : (
        <>
          {notes}
          <p>Adjust and check again.</p>
        </>
      ),
    });
  };

  useEffect(() => {
    if (!ctx.revealedNow) return;
    let live = true;
    if (key) show(key);
    else
      void loadKey(slug).then((loaded) => {
        if (live && loaded) {
          const k = asComplexityKey(loaded.key);
          setKey(k);
          show(k);
        }
      });
    function show(k: ComplexityKey) {
      if (!live) return;
      const next = k.fields.map((f) => (Array.isArray(f.answer) ? f.answer[0] : f.answer));
      setValues(next);
      const marks = new Map<number, boolean>();
      k.fields.forEach((_, i) => marks.set(i, true));
      setMarked(marks);
      ctx.clearFeedback();
      ctx.addFeedback({ kind: 'info', tag: 'Answer', content: k.explain ? <p>{k.explain}</p> : null });
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.revealedNow]);

  return (
    <div className="space-y-3 text-[15px]">
      {p.q ? md(p.q) : null}
      {p.code ? <CodeBlock code={p.code} /> : null}
      <div className="flex flex-wrap gap-3">
        {p.fields.map((field, i) => (
          <label key={i} className="flex flex-col gap-1 font-ui text-xs text-ink-2">
            {field.label}
            <select
              value={values[i] ?? ''}
              onChange={(e) => setField(i, e.target.value)}
              aria-label={field.label}
              className={`min-w-32 rounded-control border bg-sheet px-2 py-1 font-ui text-sm text-ink ${
                marked.get(i) === true
                  ? 'border-st-done/60'
                  : marked.get(i) === false
                    ? 'border-st-error/50'
                    : 'border-rule-2'
              }`}
            >
              <option value="">Choose…</option>
              {(field.options ?? COMPLEXITIES).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button type="button" className={PRIMARY} onClick={() => void check()} disabled={busy}>
        Check
      </button>
    </div>
  );
}

// ---- predict the output
// exact: compare line by line, ignoring leading/trailing spaces on each line;
// default: ignore all whitespace and case, treat ' and " alike.
export function normOut(s: string, how?: 'exact'): string {
  const t = String(s).replace(/\r/g, '').trim();
  if (how === 'exact') {
    return t
      .split('\n')
      .map((l) => l.trim())
      .filter((l, i, a) => l || i < a.length - 1)
      .join('\n');
  }
  return t.replace(/\s+/g, '').replace(/'/g, '"').toLowerCase();
}

export function PredictExercise({ slug, public: p }: { slug: string; public: Record<string, unknown> }) {
  const pub = asPredict(p);
  return (
    <ExerciseFrame slug={slug} label={KIND_LABEL.predict} tag={pub.tag} hints={pub.hints}>
      {(ctx) => <PredictBody ctx={ctx} p={pub} slug={slug} />}
    </ExerciseFrame>
  );
}

function PredictBody({ ctx, p, slug }: { ctx: ExCtx; p: PredictPublic; slug: string }) {
  const [key, setKey] = useState<PredictKey | null>(() =>
    cachedKey(slug) ? asPredictKey(cachedKey(slug)!.key) : null,
  );
  const [value, setValue] = useState(() => ctx.record?.drafts['out'] ?? '');
  const [state, setState] = useState<'none' | 'ok' | 'bad'>('none');
  const [busy, setBusy] = useState(false);
  const multi = p.answerLines > 1;

  const check = async () => {
    if (busy) return;
    if (!value.trim()) {
      ctx.feedback({
        kind: 'info',
        tag: 'Type an answer',
        content: <p>Write what the code prints, then check.</p>,
      });
      return;
    }
    setBusy(true);
    let k = key;
    if (!k) {
      const loaded = await loadKey(slug);
      setBusy(false);
      if (!loaded) {
        ctx.feedback({ kind: 'info', tag: 'Key missing', content: <p>{KEY_ERROR}</p> });
        return;
      }
      k = asPredictKey(loaded.key);
      setKey(k);
    } else setBusy(false);
    const accepts = (Array.isArray(k.answer) ? k.answer : [k.answer]).map((a) => normOut(a, p.normalize));
    const v = normOut(value, p.normalize);
    const ok = accepts.includes(v);
    const trap = k.traps && Object.entries(k.traps).find(([t]) => normOut(t, p.normalize) === v);
    setState(ok ? 'ok' : 'bad');
    ctx.checked(ok, trap ? 'concept' : undefined);
    ctx.feedback({
      kind: ok ? 'ok' : 'bad',
      tag: ok ? 'Correct' : 'Not quite',
      content: ok ? (
        k.explain ? (
          <p>{k.explain}</p>
        ) : null
      ) : trap ? (
        <p>{trap[1]}</p>
      ) : (
        <p>That is not what it prints. Trace it line by line, writing down each variable, then try again.</p>
      ),
    });
  };

  useEffect(() => {
    if (!ctx.revealedNow) return;
    let live = true;
    if (key) show(key);
    else
      void loadKey(slug).then((loaded) => {
        if (live && loaded) {
          const k = asPredictKey(loaded.key);
          setKey(k);
          show(k);
        }
      });
    function show(k: PredictKey) {
      if (!live) return;
      const answer = Array.isArray(k.answer) ? k.answer[0] : k.answer;
      setValue(answer);
      ctx.drafted('out', answer);
      setState('ok');
      ctx.clearFeedback();
      ctx.addFeedback({ kind: 'info', tag: 'Answer', content: k.explain ? <p>{k.explain}</p> : null });
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.revealedNow]);

  return (
    <div className="space-y-3 text-[15px]">
      {p.q ? md(p.q) : null}
      <CodeBlock code={p.code} />
      {multi ? (
        <>
          <p className="font-ui text-xs text-ink-3">
            This prints more than one line: write one line per console.log call.
          </p>
          <textarea
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              ctx.drafted('out', e.target.value);
            }}
            rows={p.answerLines + 1}
            placeholder={p.placeholder || 'One line per console.log call'}
            aria-label="Your predicted output"
            className={`w-full rounded-control border bg-sheet px-2 py-1.5 font-code text-sm text-ink ${
              state === 'ok' ? 'border-st-done/60' : state === 'bad' ? 'border-st-error/50' : 'border-rule-2'
            }`}
          />
        </>
      ) : (
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            ctx.drafted('out', e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void check();
          }}
          placeholder={p.placeholder || 'Type the exact output'}
          aria-label="Your predicted output"
          className={`w-full rounded-control border bg-sheet px-2 py-1.5 font-code text-sm text-ink ${
            state === 'ok' ? 'border-st-done/60' : state === 'bad' ? 'border-st-error/50' : 'border-rule-2'
          }`}
        />
      )}
      <button type="button" className={PRIMARY} onClick={() => void check()} disabled={busy}>
        Check
      </button>
    </div>
  );
}

// ---- find the bug

export function BugExercise({ slug, public: p }: { slug: string; public: Record<string, unknown> }) {
  const pub = asBug(p);
  return (
    <ExerciseFrame slug={slug} label={KIND_LABEL.bug} tag={pub.tag} hints={pub.hints}>
      {(ctx) => <BugBody ctx={ctx} p={pub} slug={slug} />}
    </ExerciseFrame>
  );
}

function BugBody({ ctx, p, slug }: { ctx: ExCtx; p: BugPublic; slug: string }) {
  const [key, setKey] = useState<BugKey | null>(() =>
    cachedKey(slug) ? asBugKey(cachedKey(slug)!.key) : null,
  );
  const [choice, setChoice] = useState<number>(() => Number(ctx.record?.drafts['line'] ?? -1));
  const [state, setState] = useState<'none' | 'ok' | 'bad'>('none');
  const [busy, setBusy] = useState(false);
  const lines = p.code.split('\n');

  const check = async () => {
    if (busy) return;
    if (choice < 0) {
      ctx.feedback({ kind: 'info', tag: 'Pick a line', content: <p>Click a line first.</p> });
      return;
    }
    setBusy(true);
    let k = key;
    if (!k) {
      const loaded = await loadKey(slug);
      setBusy(false);
      if (!loaded) {
        ctx.feedback({ kind: 'info', tag: 'Key missing', content: <p>{KEY_ERROR}</p> });
        return;
      }
      k = asBugKey(loaded.key);
      setKey(k);
    } else setBusy(false);
    const ok = k.bug.includes(choice);
    setState(ok ? 'ok' : 'bad');
    ctx.checked(ok, ok ? undefined : (k.kind ?? undefined));
    ctx.feedback({
      kind: ok ? 'ok' : 'bad',
      tag: ok ? 'Found it' : 'That line is fine',
      content: ok ? (
        <>
          {k.explain ? <p>{k.explain}</p> : null}
          {k.fix ? (
            <>
              <p>
                <b>Fixed version:</b>
              </p>
              <CodeBlock code={k.fix} />
            </>
          ) : null}
        </>
      ) : (
        <p>
          {k.fine?.[String(choice)] ?? `Line ${choice + 1} does what it should.`} Run the failing input in
          your head and see where the state first goes wrong.
        </p>
      ),
    });
  };

  useEffect(() => {
    if (!ctx.revealedNow) return;
    let live = true;
    if (key) show(key);
    else
      void loadKey(slug).then((loaded) => {
        if (live && loaded) {
          const k = asBugKey(loaded.key);
          setKey(k);
          show(k);
        }
      });
    function show(k: BugKey) {
      if (!live) return;
      setState('none');
      ctx.clearFeedback();
      ctx.addFeedback({
        kind: 'info',
        tag: 'Answer',
        content: (
          <>
            {k.explain ? <p>{k.explain}</p> : null}
            {k.fix ? <CodeBlock code={k.fix} /> : null}
          </>
        ),
      });
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.revealedNow]);

  return (
    <div className="space-y-3 text-[15px]">
      {md(p.q)}
      <p className="font-ui text-xs text-ink-3">Click the line that contains the bug, then check.</p>
      <div
        role="listbox"
        aria-label="Code lines: pick the buggy line"
        className="overflow-x-auto rounded-control border border-rule-2 bg-code-bg"
      >
        {lines.map((_, i) => (
          <button
            key={i}
            type="button"
            role="option"
            aria-selected={choice === i}
            onClick={() => {
              setChoice(i);
              ctx.drafted('line', String(i));
              setState('none');
            }}
            className={`flex w-full items-baseline gap-3 px-3 py-0.5 text-left font-code text-[13px] leading-6 text-code-ink ${
              state !== 'none' && choice === i
                ? state === 'ok'
                  ? 'bg-st-done-soft'
                  : 'bg-st-error-soft'
                : choice === i
                  ? 'bg-accent-soft'
                  : 'hover:bg-rule-2/50'
            }`}
          >
            <span className="w-7 text-right text-ink-3 tabular">{i + 1}</span>
            <span className="min-w-0">
              <CodeBlock
                code={p.code.split('\n')[i]}
                className="font-code text-[13px] leading-6 text-code-ink"
              />
            </span>
          </button>
        ))}
      </div>
      <button type="button" className={PRIMARY} onClick={() => void check()} disabled={busy}>
        Check
      </button>
    </div>
  );
}
// ---- manual dry run

export function TraceExercise({ slug, public: p }: { slug: string; public: Record<string, unknown> }) {
  const pub = asTrace(p);
  return (
    <ExerciseFrame slug={slug} label={KIND_LABEL.trace} tag={pub.tag} hints={pub.hints}>
      {(ctx) => <TraceBody ctx={ctx} p={pub} slug={slug} />}
    </ExerciseFrame>
  );
}

function TraceBody({ ctx, p, slug }: { ctx: ExCtx; p: TracePublic; slug: string }) {
  const [key, setKey] = useState<TraceKey | null>(() =>
    cachedKey(slug) ? asTraceKey(cachedKey(slug)!.key) : null,
  );
  const [values, setValues] = useState<string[]>(() => parseList(ctx.record?.drafts['rows']));
  const [marked, setMarked] = useState<Map<number, boolean>>(new Map());
  const [busy, setBusy] = useState(false);

  const setRow = (i: number, value: string) => {
    const next = [...values];
    next[i] = value;
    setValues(next);
    ctx.drafted('rows', JSON.stringify(next));
  };

  const check = async () => {
    if (busy) return;
    if (p.rows.some((_, i) => !(values[i] ?? '').trim())) {
      ctx.feedback({
        kind: 'info',
        tag: 'Fill every row',
        content: <p>Predict each value before checking.</p>,
      });
      return;
    }
    setBusy(true);
    let k = key;
    if (!k) {
      const loaded = await loadKey(slug);
      setBusy(false);
      if (!loaded) {
        ctx.feedback({ kind: 'info', tag: 'Key missing', content: <p>{KEY_ERROR}</p> });
        return;
      }
      k = asTraceKey(loaded.key);
      setKey(k);
    } else setBusy(false);
    const marks = new Map<number, boolean>();
    let okAll = true;
    p.rows.forEach((_, i) => {
      const expected = (Array.isArray(k.rows[i].answer) ? k.rows[i].answer : [k.rows[i].answer]) as string[];
      const ok = expected.map((a) => normOut(a)).includes(normOut(values[i] ?? ''));
      marks.set(i, ok);
      if (!ok) okAll = false;
    });
    setMarked(marks);
    ctx.checked(okAll, 'concept');
    if (okAll) {
      ctx.feedback({ kind: 'ok', tag: 'All rows correct', content: k.explain ? <p>{k.explain}</p> : null });
    } else {
      const firstWrong = p.rows.findIndex((_, i) => marks.get(i) === false);
      const correctCount = p.rows.filter((_, i) => marks.get(i) === true).length;
      ctx.feedback({
        kind: 'bad',
        tag: `${correctCount} of ${p.rows.length} rows correct`,
        content: (
          <p>
            The first wrong row is row {firstWrong + 1}.{' '}
            {k.rows[firstWrong].why
              ? `Look again at: ${k.rows[firstWrong].why}`
              : 'Re-trace from the last row you got right.'}
          </p>
        ),
      });
    }
  };

  useEffect(() => {
    if (!ctx.revealedNow) return;
    let live = true;
    if (key) show(key);
    else
      void loadKey(slug).then((loaded) => {
        if (live && loaded) {
          const k = asTraceKey(loaded.key);
          setKey(k);
          show(k);
        }
      });
    function show(k: TraceKey) {
      if (!live) return;
      setValues(k.rows.map((r) => (Array.isArray(r.answer) ? r.answer[0] : r.answer)));
      setMarked(new Map(k.rows.map((_, i) => [i, true])));
      ctx.clearFeedback();
      ctx.addFeedback({
        kind: 'info',
        tag: 'Answer',
        content: (
          <>
            {k.rows.map((r, i) =>
              r.why ? (
                <p key={i}>
                  <b>Row {i + 1}:</b> {r.why}
                </p>
              ) : null,
            )}
            {k.explain ? <p>{k.explain}</p> : null}
          </>
        ),
      });
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.revealedNow]);

  return (
    <div className="space-y-3 text-[15px]">
      {md(p.q)}
      {p.code ? <CodeBlock code={p.code} /> : null}
      <div
        className="grid gap-2 sm:grid-cols-2"
        style={{ gridTemplateColumns: `repeat(auto-fit, minmax(16rem, 1fr))` }}
      >
        {p.rows.map((row, i) => (
          <label key={i} className="flex flex-col gap-1">
            <span
              className="font-ui text-xs text-ink-2"
              dangerouslySetInnerHTML={{ __html: stripTags(row.prompt) }}
            />
            <input
              value={values[i] ?? ''}
              onChange={(e) => setRow(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void check();
              }}
              aria-label={stripTags(row.prompt)}
              size={Math.min(40, row.w ?? 10)}
              autoComplete="off"
              className={`rounded-control border bg-sheet px-2 py-1 font-code text-sm text-ink ${
                marked.get(i) === true
                  ? 'border-st-done/60'
                  : marked.get(i) === false
                    ? 'border-st-error/50'
                    : 'border-rule-2'
              }`}
            />
          </label>
        ))}
      </div>
      <button type="button" className={PRIMARY} onClick={() => void check()} disabled={busy}>
        Check
      </button>
    </div>
  );
}

const stripTags = (s: string) => s.replace(/<[^>]+>/g, '');

// ---- fill in the missing code

/** The legacy `normCode`: whitespace gone and one trailing semicolon dropped. */
const normCode = (s: string) => String(s).replace(/\s+/g, '').replace(/;$/, '');

/** Inline tokens for a piece of code that is only part of a line: colours per token, `\n` preserved as text. */
function inlineCodeText(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  highlightLines(code).forEach((tokens, i) => {
    if (i) out.push('\n');
    tokens.forEach((t, j) => {
      if (t.kind === 'text') out.push(t.text);
      else
        out.push(
          <span key={`${i}:${j}`} className={`tk-${t.kind}`}>
            {t.text}
          </span>,
        );
    });
  });
  return out;
}

export function FillExercise({ slug, public: p }: { slug: string; public: Record<string, unknown> }) {
  const pub = asFill(p);
  return (
    <ExerciseFrame slug={slug} label={KIND_LABEL.fill} tag={pub.tag} hints={pub.hints}>
      {(ctx) => <FillBody ctx={ctx} p={pub} slug={slug} />}
    </ExerciseFrame>
  );
}

function FillBody({ ctx, p, slug }: { ctx: ExCtx; p: FillPublic; slug: string }) {
  // The template alternates: a static part, then the number of the blank that replaces the `[[n]]` marker.
  const parts = useMemo(() => p.template.split(/\[\[(\d+)\]\]/), [p.template]);
  const [key, setKey] = useState<FillKey | null>(() =>
    cachedKey(slug) ? asFillKey(cachedKey(slug)!.key) : null,
  );
  const [values, setValues] = useState<string[]>(() => parseList(ctx.record?.drafts['blanks']));
  const [marks, setMarks] = useState<Record<number, 'ok' | 'bad'>>({});
  const [busy, setBusy] = useState(false);

  const setBlank = (k: number, value: string) => {
    const next = [...values];
    next[k] = value;
    setValues(next);
    ctx.drafted('blanks', JSON.stringify(next));
  };

  const setMark = (k: number, mark: 'ok' | 'bad' | undefined) => {
    setMarks((m) => {
      const next = { ...m };
      if (mark === undefined) delete next[k];
      else next[k] = mark;
      return next;
    });
  };

  const assemble = (k: FillKey | null, filled: string[]): string | null => {
    let code = '';
    let blankCount = 0;
    for (let i = 0; i < parts.length; i += 2) {
      code += parts[i];
      if (i + 1 < parts.length) {
        const blank = Number(parts[i + 1]);
        if (filled[blank] === undefined) return null;
        code += filled[blank];
        blankCount++;
      }
    }
    if (k && blankCount !== (k.blanks?.length ?? blankCount)) return null; // a stale key: refuse to run
    return code;
  };

  const check = async () => {
    if (busy) return;
    if (values.slice(0, p.blanks.length).some((v) => !v || !v.trim())) {
      ctx.feedback({
        kind: 'info',
        tag: 'Fill every blank',
        content: <p>Each dashed box needs an expression.</p>,
      });
      return;
    }
    setBusy(true);
    let k = key;
    if (!k || (k.blanks?.length ?? 0) !== p.blanks.length) {
      const loaded = await loadKey(slug);
      setBusy(false);
      if (!loaded) {
        ctx.feedback({ kind: 'info', tag: 'Key missing', content: <p>{KEY_ERROR}</p> });
        return;
      }
      k = asFillKey(loaded.key);
      setKey(k);
    } else setBusy(false);
    const accept: string[][] = (k.blanks ?? []).map((b) => b.accept ?? []);
    const exact = p.blanks.map((_, i) => (accept[i] ?? []).map(normCode).includes(normCode(values[i] ?? '')));
    const code = assemble(k, values);
    if (!code) {
      setBusy(false);
      ctx.feedback({ kind: 'info', tag: 'Key missing', content: <p>{KEY_ERROR}</p> });
      return;
    }
    if (exact.every(Boolean)) {
      p.blanks.forEach((_, i) => setMark(i, 'ok'));
      ctx.checked(true);
      ctx.feedback({
        kind: 'ok',
        tag: 'Correct',
        content: k.explain ? <p>{k.explain}</p> : null,
      });
      return;
    }
    if (!p.fn || p.tests.length === 0) {
      p.blanks.forEach((_, i) => setMark(i, exact[i] ? 'ok' : 'bad'));
      ctx.checked(false, 'impl');
      ctx.feedback({
        kind: 'bad',
        tag: 'Not yet',
        content: <p>The highlighted blanks are not right yet.</p>,
      });
      return;
    }
    ctx.feedback({ kind: 'info', tag: 'Running', content: <p>Running your version against the tests…</p> });
    const res = await runCode({
      code,
      fn: p.fn,
      tests: [...p.tests, ...(k.tests ?? [])],
      ...(p.compare ? { compare: p.compare } : {}),
      ...(p.adapt ? { adapt: p.adapt } : {}),
      ...(p.checker ? { checker: p.checker } : {}),
    });
    setBusy(false);
    if (res.error || !res.results) {
      p.blanks.forEach((_, i) => setMark(i, exact[i] ? undefined : 'bad'));
      ctx.checked(false, 'impl');
      ctx.feedback({
        kind: 'bad',
        tag: res.error === 'compile' ? 'Syntax error' : 'Did not finish',
        content: <p>{res.message}</p>,
      });
      return;
    }
    const passed = res.results.filter((r) => r.ok).length;
    const ok = passed === res.results.length;
    p.blanks.forEach((_, i) => setMark(i, ok || exact[i] ? 'ok' : 'bad'));
    ctx.checked(ok, 'impl');
    if (ok) {
      ctx.feedback({
        kind: 'ok',
        tag: 'Correct',
        content: (
          <p>
            Your expressions differ from the reference but pass all {passed} tests.
            {k.explain ? ` ${k.explain}` : ''}
          </p>
        ),
      });
    } else {
      const fails = res.results
        .map((r, i) => ({ r, t: [...p.tests, ...(k.tests ?? [])][i] }))
        .filter((x) => !x.r.ok)
        .slice(0, 3)
        .map((x, i) => (
          <p key={i}>
            <code>{JSON.stringify(x.t.args)}</code> → expected <code>{JSON.stringify(x.t.expect)}</code>, got{' '}
            <code>{x.r.error || x.r.got}</code>
          </p>
        ));
      ctx.feedback({
        kind: 'bad',
        tag: `Implementation slip: ${passed} of ${res.results.length} tests pass`,
        content: (
          <>
            {fails}
            <p>Trace the first failing input by hand.</p>
          </>
        ),
      });
    }
  };

  useEffect(() => {
    if (!ctx.revealedNow) return;
    let live = true;
    if (key) show(key);
    else
      void loadKey(slug).then((loaded) => {
        if (live && loaded) {
          const k = asFillKey(loaded.key);
          setKey(k);
          show(k);
        }
      });
    function show(k: FillKey) {
      if (!live) return;
      const answer = (k.blanks ?? []).map((b) => b.accept?.[0] ?? '');
      setValues((prev) => {
        const next = [...prev];
        answer.forEach((a, i) => (next[i] = a));
        return next;
      });
      ctx.drafted('blanks', JSON.stringify(answer));
      setMarks(Object.fromEntries((k.blanks ?? []).map((_, i) => [i, 'ok' as const])));
      ctx.clearFeedback();
      ctx.addFeedback({ kind: 'info', tag: 'Answer', content: k.explain ? <p>{k.explain}</p> : null });
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.revealedNow]);

  return (
    <div className="space-y-3 text-[15px]">
      <p>{md(p.q)}</p>
      <div className="overflow-x-auto rounded-control border border-rule-2 bg-code-bg px-3 py-2.5 font-code text-[13px] leading-7 text-code-ink">
        <div className="whitespace-pre">
          {parts.map((part, i) =>
            i % 2 === 0 ? (
              <Fragment key={i}>{inlineCodeText(part)}</Fragment>
            ) : (
              <BlankInput
                key={i}
                k={Number(part)}
                i={i}
                width={p.blanks[Number(part)]?.w}
                value={values[Number(part)] ?? ''}
                mark={marks[Number(part)]}
                onChange={(v) => setBlank(Number(part), v)}
              />
            ),
          )}
        </div>
      </div>
      <button type="button" className={PRIMARY} onClick={() => void check()} disabled={busy}>
        Check
      </button>
    </div>
  );
}

function BlankInput({
  k,
  i,
  width,
  value,
  mark,
  onChange,
}: {
  k: number;
  i: number;
  width?: number;
  value: string;
  mark?: 'ok' | 'bad';
  onChange: (value: string) => void;
}) {
  // Fully controlled: the fill state holds the text, so a reveal or reset lands here without a mirror copy.
  return (
    <input
      id={`fill-${i}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).form?.requestSubmit?.();
      }}
      aria-label={`Blank ${k + 1}`}
      autoComplete="off"
      spellCheck={false}
      data-blank={k + 1}
      style={{ width: `${Math.min(28, Math.max(6, width ?? 10))}ch` }}
      className={`inline-block rounded-control border bg-sheet px-1.5 py-0 align-baseline font-code text-[13px] text-code-ink ${
        mark === 'ok'
          ? 'border-st-done/60 bg-st-done-soft'
          : mark === 'bad'
            ? 'border-st-error/60 bg-st-error-soft'
            : 'border-rule-2 border-dashed border-b-2 hover:border-ink-3'
      }`}
    />
  );
}

// ---- the code runner the two coding kinds share

interface CustomTest {
  args: unknown[];
  expect?: unknown;
  hidden?: boolean;
  ops?: unknown[][];
}

type RowText = [args: string, expect: string];

const parseCustom = (record: ExerciseRecord | undefined): CustomTest[] =>
  record?.customTests?.filter((t) => Array.isArray(t.args)) ?? [];

const showJson = (v: unknown): string => (v === undefined ? '' : JSON.stringify(v));

/** Parses one row's `expect` text; an empty box means "no expected value" (a checker decides). */
const parseJsonText = (text: string): { value?: unknown; error?: string } => {
  if (!text.trim()) return { value: undefined };
  try {
    return { value: JSON.parse(text) as unknown };
  } catch (err) {
    return { error: (err as Error).message };
  }
};

const testLabel = (
  t: { args?: unknown[]; expect?: unknown; hidden?: boolean; ops?: unknown[][] },
  i: number,
): string => {
  if (t.hidden) return `Hidden test ${i + 1}`;
  if (t.ops) return `ops ${JSON.stringify(t.ops)}`;
  return `input ${JSON.stringify(t.args)}`;
};

interface CodePartProps {
  ctx: ExCtx;
  slug: string;
  starter: string;
  fn: string;
  tests: Array<{ args?: unknown[]; expect?: unknown; hidden?: boolean; ops?: unknown[][] }>;
  compare?: 'unordered' | 'sorted' | 'float';
  adapt?: { args?: (string | null)[]; ret?: string };
  checker?: string;
  /** Decodes this exercise's key part; the same shape serves code and interview. */
  decode: (raw: Record<string, unknown>) => CodeKey;
  revealTag: string;
  revealNote: ReactNode;
}

function CodePart({
  ctx,
  slug,
  starter,
  fn,
  tests,
  compare,
  adapt,
  checker,
  decode,
  revealTag,
  revealNote,
}: CodePartProps) {
  const [key, setKey] = useState<CodeKey | null>(() =>
    cachedKey(slug) ? decode(cachedKey(slug)!.key) : null,
  );
  const [code, setCodeState] = useState(() => ctx.record?.drafts['code'] || starter);
  const [out, setOut] = useState<ReactNode | null>(null);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<RowText[]>(() =>
    parseCustom(ctx.record).map((t) => [showJson(t.args), showJson(t.expect)]),
  );

  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
      if (rowsTimer.current) clearTimeout(rowsTimer.current);
    },
    [],
  );

  /** A learner's edit, with the draft saved a beat later so a burst of typing commits once (D-014). */
  const setCode = (text: string) => {
    setCodeState(text);
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => ctx.drafted('code', text), 700);
  };

  const setRow = (index: number, slot: 0 | 1, value: string) => {
    const next = rows.map((r, i): RowText =>
      i === index ? (slot === 0 ? [value, r[1]] : [r[0], value]) : r,
    );
    setRows(next);
    if (rowsTimer.current) clearTimeout(rowsTimer.current);
    rowsTimer.current = setTimeout(() => {
      const parsed = next.map(decodeRow);
      const good = parsed.filter((t): t is CustomTest => t !== null);
      if (good.length === parsed.length) ctx.setCustomTests(good);
    }, 500);
  };

  const addRow = () => {
    const next = [...rows, ['[]', ''] as RowText];
    setRows(next);
  };

  const removeRow = (index: number) => {
    const next = rows.filter((_, i) => i !== index);
    setRows(next);
    const parsed = next.map(decodeRow);
    if (parsed.every((t) => t !== null))
      ctx.setCustomTests(parsed.filter((t): t is CustomTest => t !== null));
  };

  /** Returns the parsed test, or null when the row's JSON does not read. */
  const decodeRow = (row: RowText): CustomTest | null => {
    const args = parseJsonText(row[0]);
    if (args.error || !Array.isArray(args.value)) return null;
    const expect = parseJsonText(row[1]);
    if (expect.error) return null;
    return { args: args.value as unknown[], ...(expect.value !== undefined ? { expect: expect.value } : {}) };
  };

  const hiddenCount = key?.tests?.length ?? 0;

  const go = async (submit: boolean) => {
    if (busy) return;
    const custom: CustomTest[] = [];
    for (let i = 0; i < rows.length; i++) {
      const parsed = decodeRow(rows[i]);
      if (!parsed) {
        ctx.feedback({
          kind: 'info',
          tag: 'Custom test does not read',
          content: (
            <p>
              Custom test {i + 1} needs a JSON array of arguments (for example <code>[1, 2]</code>) and a JSON
              expected value (for example <code>3</code>), or an empty expected box.
            </p>
          ),
        });
        return;
      }
      custom.push(parsed);
    }
    setBusy(true);
    setOut(
      <p aria-busy="true" className="text-sm text-ink-3">
        Running…
      </p>,
    );
    let k = key;
    if (submit && !k) {
      const loaded = await loadKey(slug);
      setBusy(false);
      if (!loaded) {
        setOut(null);
        ctx.feedback({ kind: 'info', tag: 'Key missing', content: <p>{KEY_ERROR}</p> });
        return;
      }
      k = decode(loaded.key);
      setKey(k);
    } else setBusy(false);
    let runTests = [...tests, ...custom];
    if (submit) runTests = [...runTests, ...(k?.tests ?? [])];
    const res = await runCode({
      code,
      fn,
      tests: runTests,
      ...(compare ? { compare } : {}),
      ...(adapt ? { adapt } : {}),
      ...(checker ? { checker } : {}),
    });
    // The decode above may have finished while the run was in flight; keep the newest key.
    setBusy(false);
    if (res.error || !res.results) {
      setOut(
        <p
          data-run="error"
          className="rounded-control border border-st-error/50 bg-st-error-soft px-3 py-2 text-sm text-ink"
        >
          {(res.error === 'compile' ? 'Syntax error: ' : '') + (res.message ?? 'The code did not finish.')}
        </p>,
      );
      if (submit) {
        ctx.checked(false, 'impl');
        ctx.feedback({
          kind: 'bad',
          tag: res.error === 'compile' ? 'Syntax error' : 'Did not run',
          content: <p>Fix the error shown above and submit again.</p>,
        });
      }
      return;
    }
    setOut(
      <div className="space-y-1.5" data-run="results">
        {res.results.map((r, i) => {
          const t = runTests[i];
          const detail =
            t?.hidden && r.ok
              ? ''
              : ` expected ${JSON.stringify(t?.expect)}${r.ok ? '' : `, got ${r.error ? `error: ${r.error}` : (r.got ?? 'undefined')}`}`;
          return (
            <div key={i} className="space-y-1">
              <p
                className={`rounded-control border px-2.5 py-1.5 text-sm ${
                  r.ok
                    ? 'border-st-done/60 bg-st-done-soft text-ink'
                    : 'border-st-error/50 bg-st-error-soft text-ink'
                }`}
              >
                <span className="font-bold" aria-hidden="true">
                  {r.ok ? '✓' : '✕'}
                </span>{' '}
                <span className="font-code text-[12.5px]">
                  {testLabel(t ?? {}, i)}
                  {detail}
                </span>
                {r.ms !== undefined ? (
                  <span className="ml-2 text-xs text-ink-3 tabular">{r.ms} ms</span>
                ) : null}
              </p>
              {r.log?.length ? (
                <pre
                  aria-label="Captured console output"
                  className="overflow-x-auto rounded-control bg-code-bg px-2.5 py-1.5 font-code text-[12px] leading-5 text-code-ink"
                >
                  {r.log.join('\n')}
                </pre>
              ) : null}
            </div>
          );
        })}
      </div>,
    );
    if (submit) {
      const passed = res.results.filter((r) => r.ok).length;
      const ok = passed === res.results.length;
      ctx.checked(ok, 'impl');
      ctx.feedback(
        ok
          ? {
              kind: 'ok',
              tag: `All ${passed} tests pass`,
              content: k?.explain ? <p>{k.explain}</p> : null,
            }
          : {
              kind: 'bad',
              tag: `${passed} of ${res.results.length} tests pass`,
              content: (
                <p>
                  Read the first failing case, predict what your code does on it by hand, then fix one thing
                  at a time. A wrong answer on an edge case (empty input, one element, duplicates) is an
                  implementation slip; a wrong answer on most cases usually means the approach itself needs
                  rethinking.
                </p>
              ),
            },
      );
    }
  };

  useEffect(() => {
    if (!ctx.revealedNow) return;
    let live = true;
    if (key) show(key);
    else
      void loadKey(slug).then((loaded) => {
        if (live && loaded) {
          const k = decode(loaded.key);
          setKey(k);
          show(k);
        }
      });
    function show(k: CodeKey) {
      if (!live) return;
      // The programmatic setText does not fire onChange, so a viewed solution never becomes a draft (legacy rule).
      setCodeState(k.solution ?? '');
      ctx.clearFeedback();
      ctx.addFeedback({
        kind: 'info',
        tag: revealTag,
        content: (
          <>
            {k.explain ? <p>{k.explain}</p> : null}
            {revealNote}
          </>
        ),
      });
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.revealedNow]);

  const total = tests.length + rows.length + hiddenCount;

  return (
    <div className="space-y-3">
      <CodeEditor value={code} onChange={setCode} ariaLabel="Your JavaScript solution" />
      {out}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BTN} onClick={() => void go(false)} disabled={busy}>
          Run examples
        </button>
        <button type="button" className={PRIMARY} onClick={() => void go(true)} disabled={busy}>
          {hiddenCount ? `Submit (all ${total} tests)` : 'Submit'}
        </button>
      </div>
      <details className="rounded-control border border-rule-2 bg-sheet px-3 py-2" data-panel="custom-tests">
        <summary className="cursor-pointer font-ui text-xs font-bold text-ink-2">
          Custom tests{rows.length ? ` (${rows.length})` : ''}
        </summary>
        <div className="mt-2 space-y-2">
          <p className="text-xs text-ink-3">
            Your own cases run with the visible ones. Arguments are one JSON array (for example{' '}
            <code className="font-code">[1, 2]</code>), the expected value is JSON (
            <code className="font-code">3</code>); an empty expected box is checked by the exercise&apos;s
            checker when it has one. At most 24 are kept.
          </p>
          {rows.map((row, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                value={row[0]}
                onChange={(e) => setRow(i, 0, e.target.value)}
                aria-label={`Custom test ${i + 1} arguments as JSON`}
                placeholder="[1, 2]"
                spellCheck={false}
                className="min-w-40 flex-1 rounded-control border border-rule-2 bg-sheet px-2 py-1 font-code text-[12.5px] text-ink"
              />
              <span aria-hidden="true" className="text-ink-3">
                →
              </span>
              <input
                value={row[1]}
                onChange={(e) => setRow(i, 1, e.target.value)}
                aria-label={`Custom test ${i + 1} expected value as JSON`}
                placeholder="3"
                spellCheck={false}
                className="min-w-20 w-24 rounded-control border border-rule-2 bg-sheet px-2 py-1 font-code text-[12.5px] text-ink"
              />
              <button
                type="button"
                className={BTN}
                onClick={() => removeRow(i)}
                aria-label={`Remove custom test ${i + 1}`}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className={BTN} onClick={addRow} disabled={rows.length >= 24}>
            Add a custom test
          </button>
        </div>
      </details>
    </div>
  );
}

// ---- write the code

export function CodeExercise({ slug, public: p }: { slug: string; public: Record<string, unknown> }) {
  const pub = asCode(p);
  return (
    <ExerciseFrame
      slug={slug}
      label={KIND_LABEL.code}
      tag={pub.tag}
      hints={pub.hints}
      clearDraftsOnReset={false}
    >
      {(ctx) => <CodeBody ctx={ctx} p={pub} slug={slug} />}
    </ExerciseFrame>
  );
}

function CodeBody({ ctx, p, slug }: { ctx: ExCtx; p: CodePublic; slug: string }) {
  return (
    <div className="space-y-3 text-[15px]">
      <p>{md(p.q)}</p>
      <CodePart
        ctx={ctx}
        slug={slug}
        starter={p.starter}
        fn={p.fn}
        tests={p.tests}
        {...(p.compare ? { compare: p.compare } : {})}
        {...(p.adapt ? { adapt: p.adapt } : {})}
        {...(p.checker ? { checker: p.checker } : {})}
        decode={asCodeKey}
        revealTag="Reference solution loaded into the editor"
        revealNote={
          <p>
            Run it, then close it and rewrite it from memory tomorrow: a viewed solution does not count as
            solved.
          </p>
        }
      />
    </div>
  );
}

// ---- interview problem

const IVW_STAGES = [
  [
    'clarify',
    'Clarifying questions',
    'What would you ask the interviewer? Inputs, sizes, edge cases, output format.',
  ],
  ['brute', 'Brute force and its complexity', 'The most direct correct method, with time and space.'],
  ['optimize', 'Optimisation', 'Which repeated work does the brute force do, and what removes it?'],
  ['edges', 'Edge cases to test', 'List the inputs you will test before submitting.'],
  ['complexity', 'Final complexity', 'Time and space of your optimised solution, with the reason.'],
] as const;

export function InterviewExercise({ slug, public: p }: { slug: string; public: Record<string, unknown> }) {
  const pub = asInterview(p);
  return (
    <ExerciseFrame
      slug={slug}
      label={KIND_LABEL.interview}
      tag={pub.tag}
      hints={pub.hints}
      clearDraftsOnReset={false}
    >
      {(ctx) => <InterviewBody ctx={ctx} p={pub} slug={slug} />}
    </ExerciseFrame>
  );
}

function InterviewBody({ ctx, p, slug }: { ctx: ExCtx; p: InterviewPublic; slug: string }) {
  const [key, setKey] = useState<InterviewKey | null>(() =>
    cachedKey(slug) ? asInterviewKey(cachedKey(slug)!.key) : null,
  );
  const [shown, setShown] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const compare = async (stage: string) => {
    if (busy) return;
    const own = (ctx.record?.stageNotes[stage] ?? '').trim();
    if (!own) {
      ctx.feedback({
        kind: 'info',
        tag: 'Write your own answer first',
        content: (
          <p>Write your own answer for this step, then compare it with what a strong candidate says.</p>
        ),
      });
      return;
    }
    setBusy(stage);
    let k = key;
    if (!k) {
      const loaded = await loadKey(slug);
      setBusy(null);
      if (!loaded) {
        ctx.feedback({ kind: 'info', tag: 'Key missing', content: <p>{KEY_ERROR}</p> });
        return;
      }
      k = asInterviewKey(loaded.key);
      setKey(k);
    } else setBusy(null);
    setShown((s) => ({ ...s, [stage]: k?.model?.[stage] ?? '' }));
  };

  useEffect(() => {
    if (!ctx.revealedNow) return;
    if (p.fn) return; // the coding part of this exercise shows the solution itself
    let live = true;
    if (key) show(key);
    else
      void loadKey(slug).then((loaded) => {
        if (live && loaded) {
          const k = asInterviewKey(loaded.key);
          setKey(k);
          show(k);
        }
      });
    function show(k: InterviewKey) {
      if (!live) return;
      ctx.clearFeedback();
      ctx.addFeedback({ kind: 'info', tag: 'Answer', content: k.explain ? <p>{k.explain}</p> : null });
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.revealedNow]);

  return (
    <div className="space-y-3 text-[15px]">
      <p className="font-ui text-[15px] font-semibold text-ink">{p.title}</p>
      <p>{md(p.q)}</p>
      <div className="space-y-2" data-interview-stages="">
        {IVW_STAGES.map(([stage, label, placeholder], i) => (
          <StageNote
            key={stage}
            ctx={ctx}
            stage={stage}
            label={label}
            placeholder={placeholder}
            index={i}
            shown={shown[stage]}
            busy={busy === stage}
            onCompare={() => void compare(stage)}
          />
        ))}
      </div>
      {p.fn ? (
        <>
          <p className="font-ui text-xs font-bold text-ink-3 uppercase" style={{ letterSpacing: '0.08em' }}>
            Code it
          </p>
          <CodePart
            ctx={ctx}
            slug={slug}
            starter={p.starter ?? ''}
            fn={p.fn}
            tests={p.tests ?? []}
            {...(p.compare ? { compare: p.compare } : {})}
            {...(p.adapt ? { adapt: p.adapt } : {})}
            {...(p.checker ? { checker: p.checker } : {})}
            decode={asInterviewKey}
            revealTag="Reference solution loaded"
            revealNote={
              <p>Viewing the solution is logged. Re-solve it cold in two days before you count it.</p>
            }
          />
        </>
      ) : null}
    </div>
  );
}

interface StageNoteProps {
  ctx: ExCtx;
  stage: string;
  label: string;
  placeholder: string;
  index: number;
  shown?: string;
  busy: boolean;
  onCompare: () => void;
}

function StageNote({ ctx, stage, label, placeholder, index, shown, busy, onCompare }: StageNoteProps) {
  const own = ctx.record?.stageNotes[stage] ?? '';
  // The textarea leads while the user types (the write is debounced); it follows the record whenever the record
  // changes for another reason. React accepts this adjustment during render.
  const [draft, setDraft] = useState(own);
  const [draftOf, setDraftOf] = useState(own);
  if (draftOf !== own) {
    setDraftOf(own);
    setDraft(own);
  }
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (noteTimer.current) clearTimeout(noteTimer.current);
    },
    [],
  );

  return (
    <details
      open={index === 0}
      className="rounded-card border border-rule-2 bg-sheet px-3 py-2"
      data-stage={stage}
    >
      <summary className="cursor-pointer font-ui text-sm text-ink">
        <span className="text-ink-3 tabular">{index + 1}. </span>
        {label}
      </summary>
      <div className="mt-2 space-y-2">
        <textarea
          value={draft}
          placeholder={placeholder}
          aria-label={label}
          rows={3}
          className="w-full rounded-control border border-rule-2 bg-sheet px-2 py-1.5 font-body text-sm text-ink"
          onChange={(e) => {
            setDraft(e.target.value);
            if (noteTimer.current) clearTimeout(noteTimer.current);
            noteTimer.current = setTimeout((value) => ctx.stageNoted(stage, value), 700, e.target.value);
          }}
        />
        {shown === undefined ? (
          <button type="button" className={BTN} onClick={onCompare} disabled={busy}>
            Compare with model answer
          </button>
        ) : (
          <div
            className="rounded-card border border-rule bg-paper px-3 py-2.5 text-sm text-ink"
            data-model=""
          >
            <span className="mb-1 block font-ui text-[11px] font-bold tracking-[0.08em] text-ink-2 uppercase">
              What a strong candidate says
            </span>
            {md(shown)}
          </div>
        )}
      </div>
    </details>
  );
}
