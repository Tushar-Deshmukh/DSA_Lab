import 'server-only';
import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { getDatabase } from '@/lib/db/connection';
import { serverEnv } from '@/lib/env';
import { sendMagicLinkEmail } from './email';

// Better Auth (decision D-002) on the shared MongoDB client. Collections keep the brief's names. Guests are not
// accounts: their progress stays in the browser until they sign in.

async function createAuth() {
  const env = serverEnv();
  const { client, db } = await getDatabase();
  const github =
    env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? { github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET } }
      : {};
  return betterAuth({
    appName: 'DSA Pattern Lab',
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: mongodbAdapter(db, { client }),
    user: { modelName: 'users' },
    session: { modelName: 'sessions' },
    account: { modelName: 'accounts' },
    verification: { modelName: 'verification_tokens' },
    emailAndPassword: { enabled: false },
    socialProviders: github,
    // Better Auth turns its origin and callback-URL checks off when NODE_ENV=test; keep them on everywhere so
    // the tests exercise the same protection production has.
    advanced: { disableOriginCheck: false },
    rateLimit: {
      enabled: env.AUTH_RATE_LIMIT === 'on',
      window: 60,
      max: 30,
      storage: 'database',
      modelName: 'auth_rate_limits',
    },
    plugins:
      env.EMAIL_TRANSPORT === 'none'
        ? []
        : [
            magicLink({
              expiresIn: 300,
              // A leaked database copy must not contain usable sign-in links.
              storeToken: 'hashed',
              sendMagicLink: async ({ email, url }) => {
                await sendMagicLinkEmail(email, url);
              },
            }),
          ],
  });
}

export type Auth = Awaited<ReturnType<typeof createAuth>>;

const g = globalThis as typeof globalThis & { __dplAuth?: Promise<Auth> };

export function getAuth(): Promise<Auth> {
  g.__dplAuth ??= createAuth().catch((err: unknown) => {
    g.__dplAuth = undefined;
    throw err;
  });
  return g.__dplAuth;
}

export interface SessionUser {
  id: string;
  email: string;
}

export async function getSessionUser(headers: Headers): Promise<SessionUser | null> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers });
  return session ? { id: session.user.id, email: session.user.email } : null;
}
