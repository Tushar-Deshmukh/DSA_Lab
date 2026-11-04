import { expect, test } from '@playwright/test';
import { appReady } from './support';

// Decisions D-006 (page policy with per-page script hashes) and D-007 (runner isolation), in every browser.

const ROUTES = ['/', '/sign-in', '/settings', '/learn', '/no-such-page'];

for (const route of ROUTES) {
  test(`${route}: hydrates with no policy violations and blocks injected scripts`, async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __violations: string[] };
      w.__violations = [];
      document.addEventListener('securitypolicyviolation', (e) =>
        w.__violations.push(`${e.effectiveDirective} ${e.blockedURI}`),
      );
    });
    const response = await page.goto(route);
    expect(response!.headers()['content-security-policy']).toContain("script-src 'self' 'unsafe-inline'");
    expect(await response!.text()).toContain(
      '<meta http-equiv="Content-Security-Policy" content="script-src \'self\' \'sha256-',
    );
    await appReady(page);
    expect(await page.evaluate(() => (window as unknown as { __violations: string[] }).__violations)).toEqual(
      [],
    );

    const ran = await page.evaluate(async () => {
      const w = window as unknown as { __script?: number; __handler?: number };
      const s = document.createElement('script');
      s.textContent = 'window.__script = 1';
      document.head.append(s);
      const d = document.createElement('div');
      d.innerHTML = '<img src="data:," onerror="window.__handler = 1">';
      document.body.append(d);
      await new Promise((r) => setTimeout(r, 400));
      return [w.__script ?? null, w.__handler ?? null];
    });
    expect(ran).toEqual([null, null]);
  });
}

test('pages cannot use eval', async ({ page }) => {
  // A same-origin script served by the test itself, so it runs under the page's policy.
  await page.route('**/__probe/eval.js', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: 'try { new Function("return 1")(); window.__evalWorked = true } catch (e) { window.__evalWorked = false }',
    }),
  );
  await page.goto('/');
  await appReady(page);
  await page.addScriptTag({ url: '/__probe/eval.js' });
  expect(await page.evaluate(() => (window as unknown as { __evalWorked?: boolean }).__evalWorked)).toBe(
    false,
  );
});

test('pages cannot start blob: workers', async ({ page }) => {
  await page.goto('/');
  await appReady(page);
  const outcome = await page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        try {
          const w = new Worker(
            URL.createObjectURL(new Blob(['postMessage(1)'], { type: 'text/javascript' })),
          );
          w.onmessage = () => resolve('ran');
          w.onerror = () => resolve('blocked');
          setTimeout(() => resolve('blocked'), 1500);
        } catch {
          resolve('blocked');
        }
      }),
  );
  expect(outcome).toBe('blocked');
});

test('the runner has its own policy: eval yes, network no', async ({ request }) => {
  const res = await request.get('/runner/worker.js');
  expect(res.headers()['content-security-policy']).toBe(
    "default-src 'none'; script-src 'self' 'unsafe-eval'; connect-src 'none'",
  );
});

test('learner code runs in the runner without network, storage or messaging', async ({ page }) => {
  await page.goto('/');
  await appReady(page);
  const r = await page.evaluate(async () => {
    const run = (code: string, args: unknown[] = []) =>
      new Promise<{ ok: boolean; value?: unknown; error?: string; logs: string[] }>((resolve) => {
        const w = new Worker('/runner/worker.js');
        w.onmessage = (e: MessageEvent<{ type: string; result: never }>) => {
          if (e.data.type === 'result') {
            w.terminate();
            resolve(e.data.result);
          }
        };
        w.postMessage({ code, args });
      });
    const names = [
      'fetch',
      'XMLHttpRequest',
      'WebSocket',
      'EventSource',
      'importScripts',
      'indexedDB',
      'caches',
      'BroadcastChannel',
      'Worker',
      'postMessage',
      'close',
    ];
    return {
      sum: await run('return args[0] + args[1]', [2, 3]),
      globals: await run(`return ${JSON.stringify(names)}.map((n) => n + ':' + typeof self[n])`),
      viaFunctionThis: await run("return typeof new Function('return this')().indexedDB"),
      navigatorStorage: await run('return typeof navigator.storage'),
      logs: await run("console.log('hello', { a: 1 }); return null"),
      thrown: await run("throw new RangeError('too far')"),
    };
  });
  expect(r.sum).toMatchObject({ ok: true, value: 5 });
  expect((r.globals.value as string[]).filter((s) => !s.endsWith(':undefined'))).toEqual([]);
  expect(r.viaFunctionThis.value).toBe('undefined');
  expect(r.navigatorStorage.value).toBe('undefined');
  expect(r.logs.logs).toEqual(['hello {"a":1}']);
  expect(r.thrown).toMatchObject({ ok: false, error: 'RangeError: too far' });
});

test('a runaway run is stopped and never reports back', async ({ page }) => {
  await page.goto('/');
  await appReady(page);
  const messages = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let count = 0;
        const w = new Worker('/runner/worker.js');
        w.onmessage = () => (count += 1);
        // Busy for 1.5 s and would then report; terminated after 300 ms it must never report.
        w.postMessage({ code: 'const end = Date.now() + 1500; while (Date.now() < end) {} return "late"' });
        setTimeout(() => w.terminate(), 300);
        setTimeout(() => resolve(count), 2500);
      }),
  );
  expect(messages).toBe(0);
});
