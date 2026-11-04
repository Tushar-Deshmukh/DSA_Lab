import 'server-only';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import nodemailer, { type Transporter } from 'nodemailer';
import { serverEnv } from '@/lib/env';

// Outgoing email. smtp: a real mailbox (Mailpit locally, a provider in production). file: one JSON file per
// message, read by the end-to-end tests. console: development only, prints the message to the terminal.
// The environment check forbids file and console in production (lib/env.ts).

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

let transporter: Transporter | undefined;

export async function sendEmail(message: EmailMessage): Promise<void> {
  const env = serverEnv();
  switch (env.EMAIL_TRANSPORT) {
    case 'smtp': {
      transporter ??= nodemailer.createTransport(env.SMTP_URL);
      await transporter.sendMail({ from: env.EMAIL_FROM, ...message });
      return;
    }
    case 'file': {
      const dir = env.EMAIL_DIR!;
      await fs.mkdir(dir, { recursive: true });
      const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`;
      await fs.writeFile(
        path.join(dir, name),
        JSON.stringify({ ...message, sentAt: new Date().toISOString() }),
      );
      return;
    }
    case 'console': {
      console.info(`\n[email] to ${message.to}: ${message.subject}\n${message.text}\n`);
      return;
    }
    case 'none':
      throw new Error('Email is switched off (EMAIL_TRANSPORT=none)');
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export async function sendMagicLinkEmail(to: string, url: string): Promise<void> {
  const text = [
    'Open this link to sign in to DSA Pattern Lab:',
    '',
    url,
    '',
    'The link works once and expires in 5 minutes. If you did not ask for it, you can ignore this email.',
  ].join('\n');
  const html = `<p>Open this link to sign in to DSA Pattern Lab:</p><p><a href="${escapeHtml(url)}">Sign in</a></p><p>The link works once and expires in 5 minutes. If you did not ask for it, you can ignore this email.</p>`;
  await sendEmail({ to, subject: 'Your sign-in link for DSA Pattern Lab', text, html });
}
