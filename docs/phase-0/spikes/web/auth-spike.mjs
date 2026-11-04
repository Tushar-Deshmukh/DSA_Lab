// Spike: Better Auth + Mongoose on one connection, collections named as in the brief, magic link round trip, GitHub redirect, transactions.
import fs from 'node:fs';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { MongoClient as DirectClient } from 'mongodb';
import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { mongodbAdapter } from '@better-auth/mongo-adapter';

const uri = fs.readFileSync(process.argv[2], 'utf8').trim();
const R = {};
await mongoose.connect(uri);
const client = mongoose.connection.getClient();
const db = mongoose.connection.db;
R.sameDriverClass = client instanceof DirectClient;
R.driverVersion = JSON.parse(fs.readFileSync('node_modules/mongodb/package.json', 'utf8')).version;
R.nestedDriverUnderMongoose = fs.existsSync('node_modules/mongoose/node_modules/mongodb');
R.nestedDriverUnderAdapter = fs.existsSync('node_modules/@better-auth/mongo-adapter/node_modules/mongodb');

const sent = [];
const auth = betterAuth({
  baseURL: 'http://localhost:3000',
  secret: crypto.randomBytes(32).toString('hex'),
  database: mongodbAdapter(db, { client }),
  user: { modelName: 'users' },
  session: { modelName: 'sessions' },
  account: { modelName: 'accounts' },
  verification: { modelName: 'verification_tokens' },
  socialProviders: { github: { clientId: 'spike-client-id', clientSecret: 'spike-client-secret' } },
  rateLimit: { enabled: false },
  plugins: [magicLink({ sendMagicLink: async ({ email, url, token }) => { sent.push({ email, url, token }); } })],
});
const req = (path, init = {}) => new Request('http://localhost:3000/api/auth' + path, { ...init, headers: { 'content-type': 'application/json', origin: 'http://localhost:3000', ...(init.headers || {}) } });

const t0 = await auth.handler(req('/sign-in/magic-link', { method: 'POST', body: JSON.stringify({ email: 'learner@example.test', callbackURL: '/' }) }));
R.magicLinkRequest = { status: t0.status, emailsCaptured: sent.length, urlHost: sent[0] && new URL(sent[0].url).host };
const v = await auth.handler(new Request(sent[0].url, { headers: { origin: 'http://localhost:3000' }, redirect: 'manual' }));
const setCookie = v.headers.get('set-cookie') || '';
R.magicLinkVerify = { status: v.status, location: v.headers.get('location'), cookieFlags: { httpOnly: /httponly/i.test(setCookie), sameSiteLax: /samesite=lax/i.test(setCookie), secure: /secure/i.test(setCookie) } };
const cookie = setCookie.split(/,(?=\s*[^;]+=)/).map((c) => c.split(';')[0].trim()).join('; ');
const s = await auth.api.getSession({ headers: new Headers({ cookie }) });
R.session = s ? { email: s.user.email, userIdType: typeof s.user.id, userIdLooksLikeObjectId: /^[0-9a-f]{24}$/.test(s.user.id) } : null;
const again = await auth.handler(new Request(sent[0].url, { headers: { origin: 'http://localhost:3000' }, redirect: 'manual' }));
R.tokenReuse = { status: again.status, location: again.headers.get('location') };

const names = (await db.listCollections().toArray()).map((c) => c.name).sort();
R.collections = names;
const u = await db.collection('users').findOne({ email: 'learner@example.test' });
R.userDocKeys = u && Object.keys(u).sort();
R.userIdBsonType = u && u._id.constructor.name;
const sess = await db.collection('sessions').findOne({});
R.sessionDocKeys = sess && Object.keys(sess).sort();
R.sessionUserIdType = sess && sess.userId && sess.userId.constructor.name;

const social = await auth.handler(req('/sign-in/social', { method: 'POST', body: JSON.stringify({ provider: 'github', callbackURL: '/' }) }));
const socialBody = await social.json().catch(() => null);
R.githubStart = { status: social.status, redirectsToGithub: !!(socialBody && socialBody.url && new URL(socialBody.url).host === 'github.com') };

// A Mongoose model on the same connection, keyed by the auth user id, written in a transaction with the native client.
const Settings = mongoose.model('settings', new mongoose.Schema({ userId: { type: String, required: true, unique: true }, theme: String }, { collection: 'settings' }));
await Settings.init();
await mongoose.connection.transaction(async (session) => {
  await Settings.create([{ userId: s.user.id, theme: 'dark' }], { session });
  await db.collection('users').updateOne({ _id: u._id }, { $set: { spikeTouched: true } }, { session });
});
R.transactionCommitted = (await Settings.countDocuments({ userId: s.user.id })) === 1 && (await db.collection('users').findOne({ _id: u._id })).spikeTouched === true;
try { await mongoose.connection.transaction(async (session) => { await Settings.create([{ userId: 'rollback-check', theme: 'x' }], { session }); throw new Error('abort'); }); } catch {}
R.transactionRolledBack = (await Settings.countDocuments({ userId: 'rollback-check' })) === 0;
const serverInfo = await db.admin().serverInfo();
R.mongoServerVersion = serverInfo.version;
console.log(JSON.stringify(R, null, 1));
await mongoose.disconnect();
process.exit(0);
