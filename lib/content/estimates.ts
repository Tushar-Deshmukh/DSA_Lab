// Lesson time estimates: the legacy "Time" cell, and how its minutes spread over a lesson's units (plan 5.3).

export type Estimate = Record<string, number>;

/** `default` in the legacy schedule (roadmap §4). */
export const DEFAULT_ESTIMATE: Estimate = { T: 25, I: 15, P: 60, R: 15, N: 5 };

/** Parses a schedule "Time" cell: `T30 · I25`, `default`, `Mock 60 · P45`, `90 test · R25`, `P60 · drill 20`. */
export function parseTimeCell(cell: string): Estimate {
  const text = cell.trim();
  if (text === 'default') return { ...DEFAULT_ESTIMATE };
  const out: Estimate = {};
  for (const part of text.split('·').map((p) => p.trim())) {
    const letter = part.match(/^([A-Z])(\d+)$/);
    const named = part.match(/^([A-Za-z]+) (\d+)$/);
    const trailing = part.match(/^(\d+) ([a-z]+)$/);
    if (letter) out[letter[1] as string] = Number(letter[2]);
    else if (named) out[named[1] as string] = Number(named[2]);
    else if (trailing) out[trailing[2] as string] = Number(trailing[1]);
    else throw new Error(`unparsed time cell: "${cell}"`);
  }
  return out;
}

export const totalMinutes = (estimate: Estimate): number => Object.values(estimate).reduce((sum, m) => sum + m, 0);
