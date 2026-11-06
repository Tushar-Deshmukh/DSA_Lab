// The words a learner reads in a visualizer, gathered for the content checks (plan 6.7): the date check and the
// reserved-problem check read them like any other learner-facing text.
import { codeComments } from '@/lib/content/exercise-text';
import { runViz, viewOf } from './engine';
import type { TestInput } from './test-inputs';
import type { AnyViz, VizNode } from './types';

export interface VizText {
  location: string;
  text: string;
  /** Text from a random input, with its numbers blanked (see `vizTexts`). */
  numbersBlanked?: boolean;
}

/** Wording in a view: labels, captions and problem text. What cells, nodes, chips and frames show is data. */
export function viewWording(nodes: VizNode[]): string[] {
  const out: string[] = [];
  const visit = (n: VizNode) => {
    if ('label' in n && typeof n.label === 'string') out.push(n.label);
    if (n.kind === 'panel' || n.kind === 'row') n.children.forEach(visit);
    else if (n.kind === 'caption' || n.kind === 'problem') out.push(n.text);
    else if (n.kind === 'kv' && n.empty) out.push(n.empty);
    else if (n.kind === 'intervals' && n.mergedLabel) out.push(n.mergedLabel);
    else if (n.kind === 'logbars') out.push(n.ariaLabel, ...n.rows.map((r) => r.name));
    else if (n.kind === 'chiprows') for (const r of n.rows) if (r.empty) out.push(r.empty);
  };
  nodes.forEach(visit);
  return out.filter(Boolean);
}

/**
 * Everything one visualizer shows in words: its title, input labels, presets, legend and code comments, and the notes
 * and view wording of every step on the given inputs. Notes from random inputs differ mostly in their numbers, which
 * are data: they are blanked, so that a value such as 2024 is not read as a year and each wording is checked once.
 */
export function vizTexts(viz: AnyViz, inputs: TestInput[]): VizText[] {
  const at = `viz:${viz.id}`;
  const seen = new Set<string>();
  const out: VizText[] = [];
  const push = (location: string, text: string | null | undefined, numbersBlanked = false) => {
    if (!text) return;
    const value = numbersBlanked ? text.replace(/\d+/g, '0') : text;
    const key = `${location}\0${String(numbersBlanked)}\0${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(numbersBlanked ? { location, text: value, numbersBlanked } : { location, text: value });
  };

  push(`${at}#title`, viz.title);
  for (const f of viz.inputs ?? []) {
    push(`${at}#input`, f.label);
    for (const o of f.options ?? []) push(`${at}#input`, typeof o === 'string' ? o : o.label);
  }
  for (const p of viz.presets ?? []) push(`${at}#preset`, p.label);
  for (const [, label] of viz.legend ?? []) push(`${at}#legend`, label);
  for (const c of codeComments(viz.code)) push(`${at}#code`, c);

  for (const { label, input } of inputs) {
    const random = label.startsWith('random');
    // A view reads the input the run saw, and a run may change its input.
    const copy = structuredClone(input);
    let steps;
    try {
      steps = runViz(viz, copy);
    } catch (e) {
      push(`${at}#message`, (e as Error).message, random);
      continue;
    }
    for (const s of steps) {
      push(`${at}#note`, s.note, random);
      push(`${at}#note`, s.why, random);
      for (const w of viewWording(viewOf(viz, s, copy))) push(`${at}#view`, w, random);
    }
  }
  return out;
}
