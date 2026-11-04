// Which fields of an exercise hold text for the learner. Code, tests and answers are data: the importer never rewrites
// them, and the date check reads only the comments inside code.

const TEXT_KEYS = new Set(['q', 'explain', 'clues', 'title', 'tag', 'fix', 'label', 'prompt', 't', 'why']);
const TEXT_MAPS = new Set(['why', 'fine', 'traps', 'model', 'notes']);
const NESTED_LISTS = new Set(['options', 'rows', 'fields']);

/** Code fields the learner can read. `verify` and `checker` run only in tests and in the runner. */
export const VISIBLE_CODE_FIELDS = ['code', 'starter', 'solution', 'template'];

export type TextVisitor = (text: string, path: string, write: (next: string) => void) => void;

/** Calls `visit` for every text field of an exercise or annotated-code block. */
export function walkTextFields(item: Record<string, unknown>, visit: TextVisitor, prefix = ''): void {
  for (const [key, value] of Object.entries(item)) {
    const p = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      if (TEXT_KEYS.has(key)) visit(value, p, (next) => (item[key] = next));
    } else if (key === 'hints' && Array.isArray(value)) {
      value.forEach((hint: unknown, i) => {
        if (typeof hint === 'string') visit(hint, `${p}[${i}]`, (next) => (value[i] = next));
      });
    } else if (TEXT_MAPS.has(key) && value && typeof value === 'object' && !Array.isArray(value)) {
      const map = value as Record<string, unknown>;
      for (const [k, v] of Object.entries(map)) {
        if (typeof v === 'string') visit(v, `${p}.${k}`, (next) => (map[k] = next));
      }
    } else if (NESTED_LISTS.has(key) && Array.isArray(value)) {
      value.forEach((entry: unknown, i) => {
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
          walkTextFields(entry as Record<string, unknown>, visit, `${p}[${i}]`);
        }
      });
    }
  }
}

/** Sets a field by the path `walkTextFields` reports, or a top-level code field. */
export function setFieldByPath(item: Record<string, unknown>, fieldPath: string, value: string): void {
  let done = false;
  walkTextFields(item, (_text, p, write) => {
    if (p === fieldPath) {
      write(value);
      done = true;
    }
  });
  if (done) return;
  if (typeof item[fieldPath] !== 'string') throw new Error(`no field ${fieldPath}`);
  item[fieldPath] = value;
}

/** The comments in a piece of JavaScript: `// …` tails and `/* … *\/` blocks. */
export function codeComments(code: string): string[] {
  const out: string[] = [];
  for (const line of code.split('\n')) {
    const m = line.match(/(?:^|\s)\/\/(.*)$/);
    if (m?.[1]?.trim()) out.push(m[1].trim());
  }
  for (const m of code.matchAll(/\/\*([\s\S]*?)\*\//g)) {
    if (m[1]?.trim()) out.push(m[1].trim());
  }
  return out;
}
