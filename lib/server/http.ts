import 'server-only';
import { serverEnv } from '@/lib/env';

// Small helpers shared by the route handlers.

export function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function problem(status: number, message: string, headers?: HeadersInit): Response {
  return json({ error: message }, { status, headers });
}

/** State-changing requests must come from our own pages: same origin and a JSON body. */
export function checkWriteRequest(req: Request): Response | null {
  const origin = req.headers.get('origin');
  const expected = new URL(serverEnv().BETTER_AUTH_URL).origin;
  if (origin !== expected) return problem(403, 'cross-origin request refused');
  if (!(req.headers.get('content-type') ?? '').startsWith('application/json'))
    return problem(415, 'expected application/json');
  return null;
}

/** Reads a JSON body of at most `maxBytes`. Returns undefined when it is too large or not JSON. */
export async function readJson(req: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > maxBytes) return undefined;
  const text = await req.text();
  if (Buffer.byteLength(text, 'utf8') > maxBytes) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** The caller's address: the proxy's x-forwarded-for chain in production, 'local' on a dev box. */
export function clientIp(req: Request): string {
  const first = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return first && first.length > 0 && first.length <= 64 ? first : 'local';
}
