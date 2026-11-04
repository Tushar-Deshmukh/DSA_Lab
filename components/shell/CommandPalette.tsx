'use client';

import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useLearnerState } from '@/lib/client/learner-state';
import { MORE_ITEMS, NAV_ITEMS } from './nav-items';

// Command palette (Ctrl/Cmd + K). Phase 1: navigation and settings commands. Search over the course content
// joins it in Phase 7.

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowShortcuts: () => void;
}

const itemClass =
  'flex cursor-pointer items-center rounded-control px-3 py-2 text-sm text-ink data-[selected=true]:bg-accent-soft';

export function CommandPalette({ open, onOpenChange, onShowShortcuts }: Props) {
  const router = useRouter();
  const { settings, setSetting, account, signOut } = useLearnerState();

  const run = (action: () => unknown) => {
    onOpenChange(false);
    void action();
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command palette"
      overlayClassName="fixed inset-0 z-40 bg-ink/30"
      contentClassName="fixed left-1/2 top-[12vh] z-50 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 rounded-card border border-rule bg-sheet shadow-card"
    >
      <Command.Input
        placeholder="Type a command or a page…"
        className="w-full border-b border-rule bg-transparent px-4 py-3 text-base text-ink outline-none placeholder:text-ink-3"
      />
      <Command.List className="max-h-[60vh] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-2 text-sm text-ink-2">Nothing matches.</Command.Empty>
        <Command.Group heading="Go to" className="text-xs text-ink-3">
          {[...NAV_ITEMS, ...MORE_ITEMS]
            .filter((item) => !(account && item.href === '/sign-in'))
            .map((item) => (
              <Command.Item
                key={item.href}
                value={`go ${item.label}`}
                onSelect={() => run(() => router.push(item.href))}
                className={itemClass}
              >
                {item.label}
              </Command.Item>
            ))}
        </Command.Group>
        <Command.Group heading="Settings" className="text-xs text-ink-3">
          {(['light', 'dark', 'system'] as const).map((theme) => (
            <Command.Item
              key={theme}
              value={`theme ${theme}`}
              onSelect={() => run(() => setSetting('theme', theme))}
              className={itemClass}
            >
              Theme: {theme === 'system' ? 'follow the system' : theme}
              {settings.theme === theme ? ' (current)' : ''}
            </Command.Item>
          ))}
          <Command.Item
            value="focus mode"
            onSelect={() => run(() => setSetting('focusMode', !settings.focusMode))}
            className={itemClass}
          >
            {settings.focusMode ? 'Leave focus mode' : 'Enter focus mode'}
          </Command.Item>
          <Command.Item
            value="keyboard shortcuts help"
            onSelect={() => run(onShowShortcuts)}
            className={itemClass}
          >
            Keyboard shortcuts
          </Command.Item>
          {account && (
            <Command.Item value="sign out" onSelect={() => run(() => signOut())} className={itemClass}>
              Sign out
            </Command.Item>
          )}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
