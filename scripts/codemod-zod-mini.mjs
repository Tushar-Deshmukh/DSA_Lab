// One-off codemod: convert chained .min/.max/.optional on zod/mini schemas to the .check()/z.optional() idiom.
import fs from 'node:fs';
import path from 'node:path';

const dir = 'lib/domain';
const files = [
  'assess.ts',
  'exercises.ts',
  'journal.ts',
  'lessons.ts',
  'notes.ts',
  'ops.ts',
  'review.ts',
  'study-log.ts',
];

function fixMinMax(t) {
  // combined chain .min(a).max(b) -> .check(z.minLength(a), z.maxLength(b))
  t = t.replace(/(?<=[^A-Za-z$.])\.min\((\d+)\)\.max\((\d+)\)/g, '.check(z.minLength($1), z.maxLength($2))');
  // single numeric .min / .max (string length or array length share the helpers)
  t = t.replace(/(?<=[^A-Za-z$.])\.min\((\d+)\)/g, '.check(z.minLength($1))');
  t = t.replace(/(?<=[^A-Za-z$.])\.max\((\d+)\)/g, '.check(z.maxLength($1))');
  // identifier constants
  t = t.replace(/(?<=[^A-Za-z$.])\.max\(([A-Z][A-Z0-9_.]*)\)/g, '.check(z.maxLength($1))');
  return t;
}

/** Wraps `<expr>.optional()` as `z.optional(<expr>)` using a backwards paren balance to find the expression. */
function fixOptional(t) {
  for (;;) {
    const i = t.indexOf('.optional()');
    if (i === -1) return t;
    // find the identifier chain start: scan backwards balancing parens/brackets
    let depth = 0;
    let end = i; // exclusive end of expression (just before `.optional`)
    let start = end;
    for (let p = end - 1; p >= 0; p--) {
      const c = t[p];
      if (c === ')' || c === ']') depth++;
      else if (c === '(' || c === '[') {
        if (depth === 0) {
          // an unbalanced open paren right before the chain: expression starts after it
          break;
        }
        depth--;
      } else if (depth === 0 && !/[A-Za-z0-9_.$]/.test(c)) {
        break;
      }
      start = p;
    }
    const expr = t.slice(start, end);
    t = t.slice(0, start) + `z.optional(${expr})` + t.slice(i + '.optional()'.length);
  }
}

for (const f of files) {
  const p = path.join(dir, f);
  let t = fs.readFileSync(p, 'utf8');
  t = fixMinMax(t);
  t = fixOptional(t);
  fs.writeFileSync(p, t);
  console.log('rewrote', p);
}
