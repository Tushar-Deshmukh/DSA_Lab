// Spike driver: build a minimal App Router project under several CSP strategies and observe a production server in a real browser.
import fs from 'node:fs'; import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pw = require('playwright');
const BROWSERS = (process.env.BROWSERS || 'chromium').split(',');
const ONLY = process.env.VARIANTS ? process.env.VARIANTS.split(',') : null;

const RUNNER_CSP = "default-src 'none'; script-src 'self' 'unsafe-eval'; connect-src 'none'";
const base = (script) => `default-src 'self'; script-src ${script}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`;
const config = ({ sri, script, nonce }) => `import type { NextConfig } from 'next';
const c: NextConfig = {
  ${sri ? "experimental: { sri: { algorithm: 'sha256' } }," : ''}
  async headers() { return [
    ${nonce ? '' : `{ source: '/((?!runner/).*)', headers: [{ key: 'Content-Security-Policy', value: ${JSON.stringify(base(script))} }] },`}
    { source: '/runner/:path*', headers: [{ key: 'Content-Security-Policy', value: ${JSON.stringify(RUNNER_CSP)} }] },
  ]; },
};
export default c;
`;
const PROXY = `import { NextResponse, type NextRequest } from 'next/server';
export function proxy(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = ${JSON.stringify(base("'self' 'nonce-__N__' 'strict-dynamic'"))}.replace('__N__', nonce);
  const h = new Headers(req.headers); h.set('x-nonce', nonce); h.set('Content-Security-Policy', csp);
  const res = NextResponse.next({ request: { headers: h } }); res.headers.set('Content-Security-Policy', csp); return res;
}
export const config = { matcher: [{ source: '/((?!api|_next/static|_next/image|favicon.ico|runner).*)' }] };
`;
const VARIANTS = [
  { name: 'A-sri-turbopack-strict', sri: true, script: "'self'", build: ['next', 'build'] },
  { name: 'B-sri-webpack-strict', sri: true, script: "'self'", build: ['next', 'build', '--webpack'] },
  { name: 'C-static-unsafe-inline', sri: false, script: "'self' 'unsafe-inline'", build: ['next', 'build'] },
  { name: 'D-nonce-proxy', nonce: true, build: ['next', 'build'] },
  { name: 'F-static-meta-hashes', sri: false, script: "'self' 'unsafe-inline'", hash: true, build: ['next', 'build'] },
  { name: 'E-nonce-force-dynamic', nonce: true, dynamic: true, build: ['next', 'build'] },
].filter((v) => !ONLY || ONLY.includes(v.name.split('-')[0]));

const run = (args, opts = {}) => execSync(`npx ${args.join(' ')}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, timeout: 300000, ...opts });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function probe(browserName, port) {
  const browser = await pw[browserName].launch();
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  const consoleCsp = [];
  page.on('console', (m) => { if (/Content.Security.Policy|Refused to|CSP/i.test(m.text())) consoleCsp.push(m.text().slice(0, 150)); });
  await page.addInitScript(() => { window.__v = []; document.addEventListener('securitypolicyviolation', (e) => window.__v.push(e.effectiveDirective + ' ' + (e.blockedURI || 'inline'))); });
  const resp = await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
  await sleep(600);
  const html = await resp.text();
  const r = {
    x_nextjs_cache: resp.headers()['x-nextjs-cache'] || null,
    inlineScripts: (html.match(/<script(?![^>]*\bsrc=)[^>]*>/g) || []).length,
    externalScripts: (html.match(/<script[^>]*\bsrc=/g) || []).length,
    integrityAttrs: (html.match(/integrity="/g) || []).length,
    hydrated: await page.textContent('#state'),
    violations: await page.evaluate(() => window.__v.length),
    sampleViolation: await page.evaluate(() => window.__v[0] || null),
  };
  await page.evaluate(() => { window.__marker = 1; });
  await page.click('#nav').catch(() => {}); await page.waitForSelector('#about', { timeout: 4000 }).catch(() => {});
  r.clientNavWorked = (await page.evaluate(() => window.__marker === 1)) && (await page.locator('#about').count()) === 1;
  r.injectedInlineExecuted = await page.evaluate(async () => { const s = document.createElement('script'); s.textContent = 'window.__inj=1'; document.head.append(s); await new Promise((r) => setTimeout(r, 100)); return window.__inj === 1; });
  r.injectedHandlerExecuted = await page.evaluate(async () => { const d = document.createElement('div'); d.innerHTML = '<img src=x onerror="window.__xss=1">'; document.body.append(d); await new Promise((res) => setTimeout(res, 400)); return window.__xss === 1; });
  r.pageEvalAllowed = await page.evaluate(() => new Promise((res) => { const el = document.createElement('script'); el.src = '/probe/evalprobe.js'; el.onload = () => res(window.__evalRan); el.onerror = () => res('probe blocked'); document.head.append(el); setTimeout(() => res('probe timeout'), 2000); }));
  r.blobWorkerAllowed = await page.evaluate(() => new Promise((res) => { try { const w = new Worker(URL.createObjectURL(new Blob(['postMessage(1)']))); w.onmessage = () => res(true); w.onerror = () => res(false); setTimeout(() => res(false), 1500); } catch { res(false); } }));
  r.runner = await page.evaluate(() => new Promise((res) => { const w = new Worker('/runner/worker.js'); w.onmessage = (e) => res(e.data); w.onerror = (e) => res({ error: e.message || 'worker error' }); w.postMessage({ code: 'return a + b', url: '/api/ping' }); setTimeout(() => res({ error: 'timeout' }), 6000); }));
  r.infiniteLoopTerminated = await page.evaluate(() => new Promise((res) => { const w = new Worker('/runner/worker.js'); w.postMessage({ code: 'while (true) {}', url: '/api/ping' }); const t0 = performance.now(); setTimeout(() => { w.terminate(); res(Math.round(performance.now() - t0) < 1500); }, 300); }));
  r.metaTagServed = /http-equiv="Content-Security-Policy"/.test(html);
  const bigPage = await ctx.newPage(); await bigPage.addInitScript(() => { window.__v = []; document.addEventListener('securitypolicyviolation', (e) => window.__v.push(e.effectiveDirective)); }); await bigPage.goto(`http://localhost:${port}/big`, { waitUntil: 'networkidle' }); r.bigPageViolations = await bigPage.evaluate(() => window.__v.length); await bigPage.close();
  const big = await ctx.request.get(`http://localhost:${port}/big`); const bigHtml = await big.text(); r.bigPage = { htmlBytes: bigHtml.length, inlineScripts: (bigHtml.match(/<script(?![^>]*src=)[^>]*>/g) || []).length };
  r.csp = (resp.headers()['content-security-policy'] || '').slice(0, 60);
  r.consoleCspSample = consoleCsp[0] || null;
  await browser.close();
  return r;
}

const results = {};
let port = 3101;
for (const v of VARIANTS) {
  fs.writeFileSync('next.config.ts', config(v));
  fs.rmSync('proxy.ts', { force: true }); if (v.nonce) fs.writeFileSync('proxy.ts', PROXY);
  fs.copyFileSync(v.dynamic ? 'layouts/dynamic.txt' : 'layouts/static.txt', 'app/layout.tsx');
  fs.rmSync('.next', { recursive: true, force: true });
  let out = '';
  try { out = run(v.build); } catch (e) { results[v.name] = { buildFailed: String(e.stdout || e.message).slice(-900) + String(e.stderr || '').slice(-400) }; continue; }
  if (v.hash) { console.error('hash-html', execSync('node hash-html.mjs', { encoding: 'utf8' }).trim()); }
  const routeLines = out.split('\n').filter((l) => /^[┌├└]\s/.test(l) || /○|ƒ|●/.test(l)).slice(0, 8).map((l) => l.trim().slice(0, 50));
  const srv = spawn('npx', ['next', 'start', '-p', String(port)], { shell: true, stdio: 'ignore', env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } });
  let up = false; for (let i = 0; i < 60 && !up; i++) { await sleep(500); try { up = (await fetch(`http://localhost:${port}/api/ping`)).ok; } catch {} }
  results[v.name] = { routes: routeLines };
  for (const b of BROWSERS) { try { results[v.name][b] = up ? await probe(b, port) : 'server did not start'; } catch (e) { results[v.name][b] = 'probe failed: ' + String(e.message).slice(0, 200); } }
  try { execSync(`taskkill /pid ${srv.pid} /T /F`, { stdio: 'ignore' }); } catch {}
  port++;
}
fs.rmSync('proxy.ts', { force: true });
console.log(JSON.stringify(results, null, 1));
