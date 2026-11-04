import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AppShell } from '@/components/shell/AppShell';
import { APPEARANCE_INIT_SCRIPT } from '@/lib/client/appearance';
import { LearnerStateProvider } from '@/lib/client/learner-state';
import { fontVariables } from '@/lib/fonts';

export const metadata: Metadata = {
  title: { default: 'DSA Pattern Lab', template: '%s · DSA Pattern Lab' },
  description:
    'Learn data structures and algorithms in JavaScript at your own pace: patterns, visualizers, exercises and spaced review.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f6f2' },
    { media: '(prefers-color-scheme: dark)', color: '#12171c' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <LearnerStateProvider>
          <AppShell>{children}</AppShell>
        </LearnerStateProvider>
      </body>
    </html>
  );
}
