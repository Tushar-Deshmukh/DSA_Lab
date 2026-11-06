import { clientIp, json, problem } from '@/lib/server/http';
import { hitRateLimit } from '@/lib/server/rate-limit';
import { readReserved } from '@/lib/server/runtime-data';

export const dynamic = 'force-dynamic';

const NOTE_RULE = { limit: 60, windowSeconds: 60 };

/** The pattern note of a Module 12 problem, once the learner has logged a real attempt (D-012). The title,
 * url and difficulty are public on the practice page; only the pattern, prerequisite, reason and hint wait. */
export async function GET(req: Request, { params }: { params: Promise<{ num: string }> }): Promise<Response> {
  const { num } = await params;
  const limit = await hitRateLimit(`note:${clientIp(req)}`, NOTE_RULE);
  if (!limit.ok) return problem(429, 'too many requests', { 'Retry-After': String(limit.retryAfterSeconds) });
  if (!/^\d{1,6}$/.test(num) || (num.length > 1 && num[0] === '0')) return problem(404, 'not found');
  const note = readReserved().problems[num];
  if (!note) return problem(404, 'not found');
  return json({
    num: Number(num),
    pattern: note.pattern,
    prereq: note.prereq,
    why: note.why,
    hint: note.hint,
  });
}
