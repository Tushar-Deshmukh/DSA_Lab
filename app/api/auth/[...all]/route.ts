import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  return toNextJsHandler(await getAuth()).GET(req);
}

export async function POST(req: Request): Promise<Response> {
  return toNextJsHandler(await getAuth()).POST(req);
}
