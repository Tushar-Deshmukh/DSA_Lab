'use client';

import { Dialog } from './Dialog';

const SHORTCUTS: [keys: string, action: string][] = [
  ['Ctrl K  /  ⌘ K', 'Open the command palette'],
  ['?', 'Show these shortcuts'],
  ['F', 'Turn focus mode on or off'],
  ['Esc', 'Close a dialog or menu'],
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Keyboard shortcuts">
      <table className="w-full text-sm">
        <caption className="sr-only">Keyboard shortcuts</caption>
        <tbody>
          {SHORTCUTS.map(([keys, action]) => (
            <tr key={keys} className="border-b border-rule-2 last:border-0">
              <th scope="row" className="py-2 pr-4 text-left font-code font-normal whitespace-nowrap">
                {keys}
              </th>
              <td className="py-2 text-ink-2">{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-sm text-ink-2">
        Lessons add their own keys (next and previous unit) when they arrive.
      </p>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-control bg-accent px-3 py-1.5 text-sm text-accent-ink"
        >
          Close
        </button>
      </div>
    </Dialog>
  );
}
