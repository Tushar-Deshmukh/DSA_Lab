'use client';

import Link from 'next/link';
import { useId, useMemo, useState } from 'react';

export interface GalleryItem {
  id: string;
  title: string;
  module: string;
  patterns: string[];
}

export interface GalleryModule {
  slug: string;
  number: number;
  title: string;
}

export interface GalleryPattern {
  slug: string;
  number: string;
  title: string;
}

interface Props {
  items: GalleryItem[];
  modules: GalleryModule[];
  patterns: GalleryPattern[];
}

const SELECT = 'w-full rounded-control border border-rule bg-sheet px-2 py-1.5 text-sm text-ink';

/** Every visualizer, filtered by module, by pattern and by words in the title, grouped by module. */
export function Gallery({ items, modules, patterns }: Props) {
  const uid = useId();
  const [module, setModule] = useState('');
  const [pattern, setPattern] = useState('');
  const [query, setQuery] = useState('');
  const patternTitle = useMemo(
    () => new Map(patterns.map((p) => [p.slug, `${p.number} ${p.title}`])),
    [patterns],
  );

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = items.filter(
    (it) =>
      (!module || it.module === module) &&
      (!pattern || it.patterns.includes(pattern)) &&
      words.every((w) => it.title.toLowerCase().includes(w) || it.id.includes(w)),
  );
  const groups = modules
    .map((m) => ({ ...m, items: shown.filter((it) => it.module === m.slug) }))
    .filter((g) => g.items.length);

  return (
    <>
      <form
        className="mt-5 grid gap-3 rounded-card border border-rule bg-sheet p-3 sm:grid-cols-3"
        role="search"
        aria-label="Filter visualizers"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-1 text-sm text-ink-2">
          <label htmlFor={`${uid}-module`}>Module</label>
          <select
            id={`${uid}-module`}
            className={SELECT}
            value={module}
            onChange={(e) => setModule(e.target.value)}
          >
            <option value="">All modules</option>
            {modules.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.number}. {m.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 text-sm text-ink-2">
          <label htmlFor={`${uid}-pattern`}>Pattern</label>
          <select
            id={`${uid}-pattern`}
            className={SELECT}
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
          >
            <option value="">All patterns</option>
            {patterns.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.number} {p.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 text-sm text-ink-2">
          <label htmlFor={`${uid}-query`}>Title contains</label>
          <input
            id={`${uid}-query`}
            className={SELECT}
            type="search"
            value={query}
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </form>

      <p role="status" className="mt-3 text-sm text-ink-2 tabular">
        {shown.length === items.length
          ? `${items.length} visualizers`
          : `${shown.length} of ${items.length} visualizers`}
      </p>

      {groups.map((g) => (
        <section key={g.slug} aria-labelledby={`${uid}-${g.slug}`} className="mt-6">
          <h2 id={`${uid}-${g.slug}`} className="text-lg font-semibold text-ink">
            {g.number === 0 ? 'Foundations' : `Module ${g.number}`}: {g.title}
          </h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((it) => (
              <li key={it.id} className="rounded-card border border-rule bg-sheet p-3">
                <Link href={`/visualizers/${it.id}`} className="font-medium">
                  {it.title}
                </Link>
                {it.patterns.length > 0 && (
                  <p className="mt-1 text-xs text-ink-3">
                    {it.patterns.map((p) => patternTitle.get(p) ?? p).join(' · ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!shown.length && <p className="mt-6 text-ink-2">No visualizer matches these filters.</p>}
    </>
  );
}
