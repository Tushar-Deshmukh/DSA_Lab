import { z } from 'zod';

// Server environment, validated on first use (not at import, so `next build` works without secrets).
// Empty strings count as unset, so a copied .env.example with blank values behaves like a missing variable.

const AppEnv = z.enum(['development', 'test', 'production']);
const EmailTransport = z.enum(['smtp', 'file', 'console', 'none']);

const EnvSchema = z
  .object({
    APP_ENV: AppEnv,
    MONGODB_URI: z.string().min(1),
    MONGODB_MAX_POOL: z.coerce.number().int().min(1).max(100).default(10),
    BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
    BETTER_AUTH_URL: z.url(),
    GITHUB_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
    EMAIL_TRANSPORT: EmailTransport,
    SMTP_URL: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(3).default('DSA Pattern Lab <no-reply@localhost>'),
    EMAIL_DIR: z.string().min(1).optional(),
    // Per-IP limits on sign-in endpoints. The end-to-end server turns them off: every test browser shares one IP.
    AUTH_RATE_LIMIT: z.enum(['on', 'off']).default('on'),
  })
  .superRefine((env, ctx) => {
    if (env.EMAIL_TRANSPORT === 'smtp' && !env.SMTP_URL)
      ctx.addIssue({ code: 'custom', path: ['SMTP_URL'], message: 'required when EMAIL_TRANSPORT=smtp' });
    if (env.EMAIL_TRANSPORT === 'file' && !env.EMAIL_DIR)
      ctx.addIssue({ code: 'custom', path: ['EMAIL_DIR'], message: 'required when EMAIL_TRANSPORT=file' });
    // Printing or saving sign-in links outside a mailbox would leak credentials in production.
    if (env.APP_ENV === 'production' && (env.EMAIL_TRANSPORT === 'console' || env.EMAIL_TRANSPORT === 'file'))
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_TRANSPORT'],
        message: 'console and file are for development and tests only',
      });
    if (env.APP_ENV === 'production' && env.AUTH_RATE_LIMIT === 'off')
      ctx.addIssue({ code: 'custom', path: ['AUTH_RATE_LIMIT'], message: 'must stay on in production' });
    if (Boolean(env.GITHUB_CLIENT_ID) !== Boolean(env.GITHUB_CLIENT_SECRET))
      ctx.addIssue({
        code: 'custom',
        path: ['GITHUB_CLIENT_ID'],
        message: 'set both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET, or neither',
      });
  });

export type ServerEnv = z.infer<typeof EnvSchema>;
type RawEnv = Record<string, string | undefined>;

function clean(raw: RawEnv): RawEnv {
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v === '' ? undefined : v]));
}

function appEnv(raw: RawEnv): z.infer<typeof AppEnv> {
  const explicit = AppEnv.safeParse(raw.APP_ENV);
  if (explicit.success) return explicit.data;
  return raw.NODE_ENV === 'production' ? 'production' : raw.NODE_ENV === 'test' ? 'test' : 'development';
}

function emailTransport(raw: RawEnv, app: z.infer<typeof AppEnv>): z.infer<typeof EmailTransport> {
  const explicit = EmailTransport.safeParse(raw.EMAIL_TRANSPORT);
  if (explicit.success) return explicit.data;
  return app === 'development' ? 'console' : 'none';
}

export function parseServerEnv(input: RawEnv): ServerEnv {
  const raw = clean(input);
  const app = appEnv(raw);
  const result = EnvSchema.safeParse({ ...raw, APP_ENV: app, EMAIL_TRANSPORT: emailTransport(raw, app) });
  if (!result.success) {
    const problems = result.error.issues
      .map((i) => `  ${i.path.join('.') || '(env)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid server environment:\n${problems}`);
  }
  return result.data;
}

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}

/** What the sign-in page offers. Read at build time, so it must not require the full environment. */
export function signInOptions(input: RawEnv = process.env): {
  github: boolean;
  email: boolean;
  emailPrintedToConsole: boolean;
} {
  const raw = clean(input);
  const transport = emailTransport(raw, appEnv(raw));
  return {
    github: Boolean(raw.GITHUB_CLIENT_ID && raw.GITHUB_CLIENT_SECRET),
    email: transport !== 'none',
    emailPrintedToConsole: transport === 'console',
  };
}
