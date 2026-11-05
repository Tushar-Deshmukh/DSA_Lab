import type { Metadata } from 'next';
import { publicCourse, vizPlacements } from '@/lib/content/public';
import { VIZ_CATALOG } from '@/lib/viz/registry';
import { Gallery } from './gallery';

export const metadata: Metadata = {
  title: 'Visualizers',
  description: 'Every algorithm in the course, step by step, on your own input.',
};

export default function Page() {
  const course = publicCourse();
  const placed = vizPlacements(course);
  const items = VIZ_CATALOG.map((e) => ({
    id: e.id,
    title: e.title,
    module: e.module,
    patterns: placed.get(e.id)?.patterns ?? [],
  }));
  const used = new Set(items.flatMap((it) => it.patterns));
  return (
    <section>
      <h1 className="text-2xl font-semibold text-ink">Visualizers</h1>
      <p className="mt-2 max-w-prose text-ink-2">
        Every algorithm in the course, one step at a time. Each one runs on your own input, and each step says
        what happened and why.
      </p>
      <Gallery
        items={items}
        modules={course.modules.map(({ slug, number, title }) => ({ slug, number, title }))}
        patterns={course.patterns
          .filter((p) => used.has(p.slug))
          .map(({ slug, number, title }) => ({ slug, number, title }))}
      />
    </section>
  );
}
