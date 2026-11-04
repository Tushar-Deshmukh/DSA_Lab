import { describe, expect, it } from 'vitest';
import { parseServerEnv, signInOptions } from '@/lib/env';

const BASE = {
  MONGODB_URI: 'mongodb://localhost:27017/x',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3000',
};

describe('server environment', () => {
  it('chooses safe email defaults per environment', () => {
    expect(parseServerEnv({ ...BASE, NODE_ENV: 'development' }).EMAIL_TRANSPORT).toBe('console');
    expect(parseServerEnv({ ...BASE, NODE_ENV: 'production' }).EMAIL_TRANSPORT).toBe('none');
    expect(parseServerEnv({ ...BASE, NODE_ENV: 'test' }).EMAIL_TRANSPORT).toBe('none');
  });

  it('never prints or saves sign-in links in production', () => {
    expect(() => parseServerEnv({ ...BASE, NODE_ENV: 'production', EMAIL_TRANSPORT: 'console' })).toThrow(
      /EMAIL_TRANSPORT/,
    );
    expect(() =>
      parseServerEnv({ ...BASE, NODE_ENV: 'production', EMAIL_TRANSPORT: 'file', EMAIL_DIR: '/tmp' }),
    ).toThrow(/EMAIL_TRANSPORT/);
    // APP_ENV=test lets the end-to-end server (a production build) write emails to files.
    expect(
      parseServerEnv({
        ...BASE,
        NODE_ENV: 'production',
        APP_ENV: 'test',
        EMAIL_TRANSPORT: 'file',
        EMAIL_DIR: '/tmp',
      }).EMAIL_TRANSPORT,
    ).toBe('file');
  });

  it('requires the settings each transport needs', () => {
    expect(() => parseServerEnv({ ...BASE, EMAIL_TRANSPORT: 'smtp' })).toThrow(/SMTP_URL/);
    expect(() => parseServerEnv({ ...BASE, EMAIL_TRANSPORT: 'file' })).toThrow(/EMAIL_DIR/);
    expect(
      parseServerEnv({ ...BASE, EMAIL_TRANSPORT: 'smtp', SMTP_URL: 'smtp://localhost:1025' }).SMTP_URL,
    ).toBe('smtp://localhost:1025');
  });

  it('wants both GitHub values or neither, and treats empty strings as unset', () => {
    expect(() => parseServerEnv({ ...BASE, GITHUB_CLIENT_ID: 'id' })).toThrow(/GITHUB/);
    expect(
      parseServerEnv({ ...BASE, GITHUB_CLIENT_ID: '', GITHUB_CLIENT_SECRET: '' }).GITHUB_CLIENT_ID,
    ).toBeUndefined();
  });

  it('keeps sign-in rate limits on in production', () => {
    expect(parseServerEnv({ ...BASE }).AUTH_RATE_LIMIT).toBe('on');
    expect(() => parseServerEnv({ ...BASE, NODE_ENV: 'production', AUTH_RATE_LIMIT: 'off' })).toThrow(
      /AUTH_RATE_LIMIT/,
    );
    expect(parseServerEnv({ ...BASE, APP_ENV: 'test', AUTH_RATE_LIMIT: 'off' }).AUTH_RATE_LIMIT).toBe('off');
  });

  it('rejects a short secret, a bad URL and a missing database', () => {
    expect(() => parseServerEnv({ ...BASE, BETTER_AUTH_SECRET: 'short' })).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => parseServerEnv({ ...BASE, BETTER_AUTH_URL: 'not a url' })).toThrow(/BETTER_AUTH_URL/);
    expect(() => parseServerEnv({ ...BASE, MONGODB_URI: '' })).toThrow(/MONGODB_URI/);
  });

  it('tells the sign-in page what to offer without needing secrets', () => {
    expect(signInOptions({ NODE_ENV: 'production' })).toEqual({
      github: false,
      email: false,
      emailPrintedToConsole: false,
    });
    expect(signInOptions({ NODE_ENV: 'development' })).toEqual({
      github: false,
      email: true,
      emailPrintedToConsole: true,
    });
    expect(
      signInOptions({ GITHUB_CLIENT_ID: 'id', GITHUB_CLIENT_SECRET: 's', EMAIL_TRANSPORT: 'smtp' }),
    ).toEqual({
      github: true,
      email: true,
      emailPrintedToConsole: false,
    });
  });
});
