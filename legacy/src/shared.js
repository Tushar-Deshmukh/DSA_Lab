// Shared by the build (Node) and the browser: syntax highlighting and small utilities.
(function (g) {
  const KW = new Set(('const let var function return if else for while do break continue new class extends this of in ' +
    'typeof instanceof null undefined true false switch case default try catch finally throw yield async await static get set delete void').split(' '));
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Tokenise one line of JS (good enough for teaching code; handles strings, comments, numbers, keywords, calls).
  function hlLine(line, state) {
    let out = '', i = 0;
    const n = line.length;
    if (state.inBlock) {
      const end = line.indexOf('*/');
      if (end < 0) return { html: '<span class="tk-com">' + esc(line) + '</span>', state };
      out += '<span class="tk-com">' + esc(line.slice(0, end + 2)) + '</span>';
      i = end + 2; state.inBlock = false;
    }
    while (i < n) {
      const c = line[i];
      if (c === '/' && line[i + 1] === '/') { out += '<span class="tk-com">' + esc(line.slice(i)) + '</span>'; break; }
      if (c === '/' && line[i + 1] === '*') {
        const end = line.indexOf('*/', i + 2);
        if (end < 0) { out += '<span class="tk-com">' + esc(line.slice(i)) + '</span>'; state.inBlock = true; break; }
        out += '<span class="tk-com">' + esc(line.slice(i, end + 2)) + '</span>'; i = end + 2; continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        let j = i + 1;
        while (j < n && line[j] !== c) { if (line[j] === '\\') j++; j++; }
        out += '<span class="tk-str">' + esc(line.slice(i, j + 1)) + '</span>'; i = j + 1; continue;
      }
      if (/[0-9]/.test(c) && !/[A-Za-z_$]/.test(line[i - 1] || '')) {
        let j = i; while (j < n && /[0-9._xa-fA-Fe]/.test(line[j])) j++;
        out += '<span class="tk-num">' + esc(line.slice(i, j)) + '</span>'; i = j; continue;
      }
      if (/[A-Za-z_$#]/.test(c)) {
        let j = i; while (j < n && /[A-Za-z0-9_$#]/.test(line[j])) j++;
        const w = line.slice(i, j);
        if (KW.has(w)) out += '<span class="tk-kw">' + w + '</span>';
        else if (line[j] === '(') out += '<span class="tk-fn">' + esc(w) + '</span>';
        else out += esc(w);
        i = j; continue;
      }
      out += esc(c); i++;
    }
    return { html: out, state };
  }
  function highlight(code, lang) {
    if (lang && !/^(js|javascript|ts)$/.test(lang)) return code.split('\n').map(esc);
    const st = { inBlock: false };
    return code.split('\n').map((l) => hlLine(l, st).html);
  }
  function codeHTML(code, lang) {
    return '<pre class="code"><code>' + highlight(code.replace(/\n$/, ''), lang).join('\n') + '</code></pre>';
  }
  g.HL = { highlight, codeHTML, esc };
})(typeof window !== 'undefined' ? window : globalThis);
