import { config } from 'zod/mini';

// Schemas shared with the browser use zod/mini, imported directly where they are defined so the bundler keeps
// only what they use; full Zod would add about 90 KB (gzip) to every page. Server-only code (lib/env.ts) may use
// full Zod.
//
// Zod also probes for eval (new Function) to compile faster validators. The page policy forbids eval (D-006), and
// browsers report the blocked probe as a policy violation even though Zod catches it, so validators run without
// that fast path. Shared schema modules import this file first, so the setting is in place before any schema
// is built.
config({ jitless: true });
