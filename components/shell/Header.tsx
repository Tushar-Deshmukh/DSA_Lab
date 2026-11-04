'use client';

import { Maximize2, Menu, Minimize2, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId, useState } from 'react';
import { useLearnerState } from '@/lib/client/learner-state';
import { AccountMenu } from './AccountMenu';
import { NAV_ITEMS } from './nav-items';
import { StatusChip } from './StatusChip';

interface Props {
  onOpenPalette: () => void;
}

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header({ onOpenPalette }: Props) {
  const pathname = usePathname();
  const { settings, setSetting, ready } = useLearnerState();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  const links = NAV_ITEMS.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setMenuOpen(false)}
      aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}
      className="rounded-control px-2 py-1 text-sm text-ink-2 no-underline hover:text-ink aria-[current=page]:bg-accent-soft aria-[current=page]:text-ink"
    >
      {item.label}
    </Link>
  ));

  return (
    <header className="border-b border-rule bg-sheet">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
        <Link href="/" className="mr-2 text-base font-semibold whitespace-nowrap text-ink no-underline">
          DSA Pattern Lab
        </Link>
        <nav aria-label="Main" className="focus-hide hidden items-center gap-1 lg:flex">
          {links}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenPalette}
            className="focus-hide inline-flex items-center gap-1.5 rounded-control border border-rule px-2 py-1 text-sm text-ink-2"
          >
            <Search aria-hidden size={15} />
            <span className="hidden sm:inline">Search</span>
            <span className="sr-only sm:not-sr-only sm:font-code sm:text-xs sm:text-ink-3">Ctrl K</span>
          </button>
          <span className="hidden sm:inline-flex">
            <StatusChip />
          </span>
          <button
            type="button"
            aria-pressed={settings.focusMode}
            disabled={!ready}
            onClick={() => void setSetting('focusMode', !settings.focusMode)}
            className="inline-flex items-center gap-1.5 rounded-control border border-rule px-2 py-1 text-sm text-ink-2"
          >
            {settings.focusMode ? <Minimize2 aria-hidden size={15} /> : <Maximize2 aria-hidden size={15} />}
            <span className="focus-only">Exit focus</span>
            <span className="sr-only focus-hide">Focus mode</span>
          </button>
          <span className="focus-hide">
            <AccountMenu />
          </span>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((o) => !o)}
            className="focus-hide inline-flex items-center rounded-control border border-rule p-1 text-ink-2 lg:hidden"
          >
            {menuOpen ? <X aria-hidden size={18} /> : <Menu aria-hidden size={18} />}
            <span className="sr-only">Menu</span>
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav id={menuId} aria-label="Main" className="focus-hide border-t border-rule px-4 py-2 lg:hidden">
          <div className="mb-2 sm:hidden">
            <StatusChip />
          </div>
          <div className="flex flex-col gap-1">{links}</div>
        </nav>
      )}
    </header>
  );
}
