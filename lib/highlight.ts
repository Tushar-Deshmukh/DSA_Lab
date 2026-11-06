// Syntax colouring for teaching code, ported from the legacy tokenizer (`hlLine` in legacy/src/shared.js). It returns
// tokens rather than HTML, so code is always shown as text.

export type TokenKind = 'kw' | 'str' | 'num' | 'com' | 'fn' | 'text';

export interface Token {
  kind: TokenKind;
  text: string;
}

const KEYWORDS = new Set(
  (
    'const let var function return if else for while do break continue new class extends this of in ' +
    'typeof instanceof null undefined true false switch case default try catch finally throw yield async await static get set delete void'
  ).split(' '),
);

function tokenizeLine(line: string, state: { inBlock: boolean }): Token[] {
  const out: Token[] = [];
  const push = (kind: TokenKind, text: string) => {
    const last = out.at(-1);
    if (kind === 'text' && last?.kind === 'text') last.text += text;
    else if (text) out.push({ kind, text });
  };
  let i = 0;
  const n = line.length;
  if (state.inBlock) {
    const end = line.indexOf('*/');
    if (end < 0) return [{ kind: 'com', text: line }];
    push('com', line.slice(0, end + 2));
    i = end + 2;
    state.inBlock = false;
  }
  while (i < n) {
    const c = line[i] as string;
    if (c === '/' && line[i + 1] === '/') {
      push('com', line.slice(i));
      break;
    }
    if (c === '/' && line[i + 1] === '*') {
      const end = line.indexOf('*/', i + 2);
      if (end < 0) {
        push('com', line.slice(i));
        state.inBlock = true;
        break;
      }
      push('com', line.slice(i, end + 2));
      i = end + 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && line[j] !== c) {
        if (line[j] === '\\') j++;
        j++;
      }
      push('str', line.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c) && !/[A-Za-z_$]/.test(line[i - 1] ?? '')) {
      let j = i;
      while (j < n && /[0-9._xa-fA-Fe]/.test(line[j] as string)) j++;
      push('num', line.slice(i, j));
      i = j;
      continue;
    }
    if (/[A-Za-z_$#]/.test(c)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_$#]/.test(line[j] as string)) j++;
      const w = line.slice(i, j);
      push(KEYWORDS.has(w) ? 'kw' : line[j] === '(' ? 'fn' : 'text', w);
      i = j;
      continue;
    }
    push('text', c);
    i++;
  }
  return out;
}

/** Tokens for each line of JavaScript. A block comment carries over from one line to the next. A fence without a
 * language is JavaScript here, as in the legacy app; any other language is shown plain, tokens stripped. */
export function highlightLines(code: string, lang?: string | null): Token[][] {
  if (lang && !/^(js|javascript|ts)$/.test(lang)) {
    return code.split('\n').map((line): Token[] => [{ kind: 'text', text: line }]);
  }
  const state = { inBlock: false };
  return code.split('\n').map((line) => tokenizeLine(line, state));
}
