import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import nextConfig from '@/next.config';
import { RUNNER_POLICY, pagePolicy } from '@/lib/security/csp';
import { addScriptHashes, scriptHashes } from '@/scripts/csp-hashes.mjs';

const sha = (s: string) => `'sha256-${crypto.createHash('sha256').update(s, 'utf8').digest('base64')}'`;

describe('page policy', () => {
  it('allows eval and WebSockets only in development', () => {
    const prod = pagePolicy({ dev: false });
    expect(prod).not.toContain('unsafe-eval');
    expect(prod).toContain("connect-src 'self';");
    expect(prod).toContain("object-src 'none'");
    expect(prod).toContain("frame-ancestors 'none'");
    expect(prod).toContain("worker-src 'self'");
    expect(pagePolicy({ dev: true })).toContain("'unsafe-eval'");
    expect(pagePolicy({ dev: true })).toContain('ws:');
  });

  it('gives the runner eval but no network', () => {
    expect(RUNNER_POLICY).toContain("'unsafe-eval'");
    expect(RUNNER_POLICY).toContain("connect-src 'none'");
    expect(RUNNER_POLICY).toContain("default-src 'none'");
  });

  it('is wired into next.config: pages, runner and security headers', async () => {
    const rules = await nextConfig.headers!();
    const find = (source: string) => rules.find((r) => r.source === source);
    expect(find('/((?!runner/).*)')?.headers[0]?.key).toBe('Content-Security-Policy');
    expect(find('/runner/:path*')?.headers.find((h) => h.key === 'Content-Security-Policy')?.value).toBe(
      RUNNER_POLICY,
    );
    const all = find('/:path*')?.headers.map((h) => h.key) ?? [];
    expect(all).toEqual(
      expect.arrayContaining(['X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options']),
    );
  });
});

describe('script-hash step', () => {
  const page =
    '<!DOCTYPE html><html><head><meta charSet="utf-8"/><title>t</title><script src="/_next/a.js" async=""></script>' +
    '<script>self.a=1</script></head><body><script>self.b=2</script><script>self.a=1</script></body></html>';

  it('hashes each distinct inline script and ignores external ones', () => {
    expect(scriptHashes(page)).toEqual([sha('self.a=1'), sha('self.b=2')]);
  });

  it('puts one policy right after the charset, before every script', () => {
    const { html, hashes } = addScriptHashes(page);
    expect(hashes).toBe(2);
    expect(html).toContain(
      `<meta charSet="utf-8"/><meta http-equiv="Content-Security-Policy" content="script-src 'self' ${sha('self.a=1')} ${sha('self.b=2')}"/>`,
    );
    expect(html.indexOf('Content-Security-Policy')).toBeLessThan(html.indexOf('<script'));
  });

  it('gives the same result when run twice', () => {
    const once = addScriptHashes(page).html;
    expect(addScriptHashes(once).html).toBe(once);
  });

  it('refuses pages it cannot protect', () => {
    expect(() => addScriptHashes('<html><body></body></html>')).toThrow(/no <head>/);
    expect(() => addScriptHashes('<html><script>x()</script><head></head></html>')).toThrow(/before/);
  });
});
