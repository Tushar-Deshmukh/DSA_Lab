import net from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sendMagicLinkEmail } from '@/lib/server/email';

// The SMTP transport (Mailpit locally, a provider in production) against a minimal SMTP server, so the real
// nodemailer path is tested without Docker.

interface Received {
  from: string;
  to: string[];
  data: string;
}

function smtpSink(): Promise<{ port: number; messages: Received[]; close: () => Promise<void> }> {
  const messages: Received[] = [];
  const server = net.createServer((socket) => {
    let buffer = '';
    let inData = false;
    let current: Received = { from: '', to: [], data: '' };
    const reply = (line: string) => socket.write(`${line}\r\n`);
    reply('220 sink ready');
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      for (;;) {
        if (inData) {
          const end = buffer.indexOf('\r\n.\r\n');
          if (end === -1) return;
          current.data = buffer.slice(0, end);
          buffer = buffer.slice(end + 5);
          inData = false;
          messages.push(current);
          current = { from: '', to: [], data: '' };
          reply('250 queued');
          continue;
        }
        const nl = buffer.indexOf('\r\n');
        if (nl === -1) return;
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 2);
        const verb = line.slice(0, 4).toUpperCase();
        if (verb === 'EHLO' || verb === 'HELO') reply('250 sink');
        else if (verb === 'MAIL') {
          current.from = line;
          reply('250 ok');
        } else if (verb === 'RCPT') {
          current.to.push(line);
          reply('250 ok');
        } else if (verb === 'DATA') {
          inData = true;
          reply('354 go ahead');
        } else if (verb === 'QUIT') {
          reply('221 bye');
          socket.end();
        } else reply('250 ok');
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as net.AddressInfo).port;
      resolve({ port, messages, close: () => new Promise((r) => server.close(() => r())) });
    });
  });
}

/** Undoes quoted-printable soft line breaks and escapes, enough to read a URL back out of the body. */
function decodeQuotedPrintable(s: string): string {
  return s
    .replace(/=\r\n/g, '')
    .replace(/=([0-9A-F]{2})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
}

let sink: Awaited<ReturnType<typeof smtpSink>>;

beforeAll(async () => {
  sink = await smtpSink();
  Object.assign(process.env, {
    MONGODB_URI: 'mongodb://unused.invalid/x',
    BETTER_AUTH_SECRET: 's'.repeat(32),
    BETTER_AUTH_URL: 'http://localhost:3000',
    APP_ENV: 'development',
    EMAIL_TRANSPORT: 'smtp',
    SMTP_URL: `smtp://127.0.0.1:${sink.port}`,
    EMAIL_FROM: 'DSA Pattern Lab <no-reply@example.test>',
  });
});

afterAll(async () => {
  await sink?.close();
});

describe('SMTP email', () => {
  it('delivers the magic link to the right address over SMTP', async () => {
    const link = 'http://localhost:3000/api/auth/magic-link/verify?token=abc123&callbackURL=%2F';
    await sendMagicLinkEmail('learner@example.test', link);
    expect(sink.messages).toHaveLength(1);
    const [message] = sink.messages;
    expect(message!.from).toContain('no-reply@example.test');
    expect(message!.to.join()).toContain('learner@example.test');
    expect(message!.data).toMatch(/^Subject: Your sign-in link for DSA Pattern Lab/m);
    expect(decodeQuotedPrintable(message!.data)).toContain(link);
  });
});
