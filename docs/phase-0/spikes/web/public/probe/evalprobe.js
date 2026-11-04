// Runs as an ordinary page script, so unlike Playwright's evaluate it is subject to the page CSP.
try { new Function('window.__evalRan = true')(); } catch (e) { window.__evalRan = false; }
window.__evalProbeDone = true;
