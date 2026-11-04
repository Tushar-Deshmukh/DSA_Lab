import type { Metadata } from 'next';
import Link from 'next/link';
import { SettingsForm } from './SettingsForm';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <div className="max-w-prose">
      <h1 className="text-2xl font-semibold text-ink">Settings</h1>
      <p className="mt-2 text-sm text-ink-2">
        Changes save as you make them. The status in the header says where they are saved.
      </p>
      <SettingsForm />
      <p className="mt-8 text-sm">
        <Link href="/settings/data">Your data: export, import and erase</Link>
      </p>
    </div>
  );
}
