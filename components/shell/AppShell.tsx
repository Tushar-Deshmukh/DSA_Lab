'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, type ReactNode } from 'react';
import { useLearnerState } from '@/lib/client/learner-state';
import { Header } from './Header';
import { MergePrompt } from './MergePrompt';
import { ShortcutsDialog } from './ShortcutsDialog';

// The palette (cmdk and its dialog) is about 20 KB gzip that most visits never use: it loads on first open, or
// once the browser is idle, instead of with every page.
const loadPalette = () => import('./CommandPalette');
const CommandPalette = dynamic(() => loadPalette().then((m) => m.CommandPalette), { ssr: false });

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { settings, setSetting, ready } = useLearnerState();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteUsed, setPaletteUsed] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    const warm = () => void loadPalette();
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(warm, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(warm, 3000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteUsed(true);
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || document.querySelector('dialog[open]'))
        return;
      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen(true);
      } else if (e.key === 'f' || e.key === 'F') {
        if (ready) void setSetting('focusMode', !settings.focusMode);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ready, settings.focusMode, setSetting]);

  return (
    <>
      <a href="#main" className="skip-link rounded-control bg-accent px-3 py-2 text-sm text-accent-ink">
        Skip to main content
      </a>
      <Header
        onOpenPalette={() => {
          setPaletteUsed(true);
          setPaletteOpen(true);
        }}
      />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 py-8 outline-none">
        {children}
      </main>
      {paletteUsed && (
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          onShowShortcuts={() => setShortcutsOpen(true)}
        />
      )}
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <MergePrompt />
    </>
  );
}
