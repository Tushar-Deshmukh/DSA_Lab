'use client';

import { useState, type ReactNode } from 'react';
import { pairsFor } from '@/lib/viz/compare';
import { EXPLORERS } from '@/lib/viz/explorer';
import { ComparePanel } from './compare-panel';
import { ExplorerPanel } from './explorer-panel';

/** A section that loads its content the first time it is opened. */
function Section({ title, children }: { title: string; children: () => ReactNode }) {
  const [opened, setOpened] = useState(false);
  return (
    <details
      className="rounded-card border border-rule bg-sheet px-3.5 py-2.5"
      onToggle={(e) => e.currentTarget.open && setOpened(true)}
    >
      <summary className="cursor-pointer font-semibold text-ink">{title}</summary>
      <div className="mt-3">{opened ? children() : null}</div>
    </details>
  );
}

/** Compare mode and the complexity explorer, where the visualizer has them. */
export function VizExtras({ id }: { id: string }) {
  const pairs = pairsFor(id);
  return (
    <>
      {pairs.map((pair) => (
        <Section key={pair.id} title={`Compare: ${pair.title}`}>
          {() => <ComparePanel pair={pair} />}
        </Section>
      ))}
      {EXPLORERS[id] && (
        <Section title="How the steps grow with n">{() => <ExplorerPanel id={id} />}</Section>
      )}
    </>
  );
}
