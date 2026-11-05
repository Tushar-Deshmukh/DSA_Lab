'use client';

import { useEffect, useState } from 'react';
import { decodeVizHash } from '@/lib/viz/hash';
import { VIZ_LOADERS } from '@/lib/viz/registry';
import type { AnyViz } from '@/lib/viz/types';
import { Player } from './player';

interface Props {
  id: string;
  title?: string;
  input?: Record<string, unknown>;
  /** The playground: read the input and step from the address, and keep them there. */
  syncHash?: boolean;
  headingLevel?: 1 | 2 | 3;
}

interface Loaded {
  viz: AnyViz;
  input?: Record<string, unknown>;
  step: number;
}

/**
 * A visualizer by id. Its code is a chunk of its own, fetched when the component mounts, so a page carries only the
 * visualizers it shows. A shared link is read at the same moment, so the player starts on the linked step.
 */
export function VizEmbed({ id, title, input, syncHash = false, headingLevel }: Props) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);

  const load = VIZ_LOADERS[id];

  useEffect(() => {
    let live = true;
    if (!load) return;
    load().then(
      (viz) => {
        if (!live) return;
        const link = syncHash ? decodeVizHash(window.location.hash) : null;
        const fromLink = link?.id === id ? link : null;
        setLoaded({
          viz,
          input: fromLink?.input ? { ...input, ...fromLink.input } : input,
          step: (fromLink?.step ?? 1) - 1,
        });
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [id, load, input, syncHash]);

  if (!load || failed) {
    return (
      <p role="alert" className="rounded-card border border-st-error bg-st-error-soft p-3 text-sm text-ink">
        Missing visualizer: {id}
      </p>
    );
  }
  // After a move to another visualizer, the old one stays loaded until the new chunk arrives; it is never shown.
  if (!loaded || loaded.viz.id !== id) {
    // The same heading as the player, so the page has its outline before the chunk arrives.
    const Heading = (['h1', 'h2', 'h3'] as const)[(headingLevel ?? 3) - 1] ?? 'h3';
    return (
      <section
        className="rounded-card border border-rule bg-sheet px-3.5 py-2.5 shadow-card"
        aria-busy="true"
      >
        <Heading className="text-[15px] font-semibold text-ink">
          <span className="block text-[11px] font-bold tracking-[0.08em] text-accent uppercase">
            Visualizer
          </span>
          {title ?? id}
        </Heading>
        <p className="mt-1 text-sm text-ink-3">Loading…</p>
      </section>
    );
  }
  // Keyed by id: the player sets its state up from its first props, so another visualizer needs a new player.
  return (
    <Player
      key={loaded.viz.id}
      viz={loaded.viz}
      input={loaded.input}
      initialStep={loaded.step}
      title={title}
      syncHash={syncHash}
      headingLevel={headingLevel}
    />
  );
}
