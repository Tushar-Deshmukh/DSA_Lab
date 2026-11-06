import { clientIp, json, problem } from '@/lib/server/http';
import { hitRateLimit } from '@/lib/server/rate-limit';
import { readReserved } from '@/lib/server/runtime-data';

export const dynamic = 'force-dynamic';

const GATE_RULE = { limit: 60, windowSeconds: 60 };

/** What a gate hands over once it opens (D-027): the three gated texts and the public part of every gated
 * exercise. The server cannot check the gate state (guests have no server-side documents), so the device only
 * asks when its own rules say the gate is open — the rule file is public and was written for exactly that. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ gateId: string }> },
): Promise<Response> {
  const { gateId } = await params;
  const gate = readReserved().gates[gateId];
  const limit = await hitRateLimit(`gates:${clientIp(req)}`, GATE_RULE);
  if (!limit.ok) return problem(429, 'too many requests', { 'Retry-After': String(limit.retryAfterSeconds) });
  if (!gate) return problem(404, 'not found');
  return json({ gate: gateId, texts: gate.texts, exercises: gate.exercises });
}
