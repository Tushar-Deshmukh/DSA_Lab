import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { VizEmbed } from '@/components/viz/viz-embed';
import { VizExtras } from '@/components/viz/viz-extras';
import { publicCourse, vizPlacements } from '@/lib/content/public';
import { VIZ_CATALOG } from '@/lib/viz/registry';

interface Params {
  params: Promise<{ id: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return VIZ_CATALOG.map((e) => ({ id: e.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const entry = VIZ_CATALOG.find((e) => e.id === id);
  return { title: entry?.title ?? 'Visualizer', description: 'Step through it on your own input.' };
}

/** A visualizer on its own page: a playground whose input and step live in the address, so it can be shared. */
export default async function Page({ params }: Params) {
  const { id } = await params;
  const entry = VIZ_CATALOG.find((e) => e.id === id);
  if (!entry) notFound();
  const course = publicCourse();
  const home = course.modules.find((m) => m.slug === entry.module);
  const placed = vizPlacements(course).get(id);
  const patterns = course.patterns.filter((p) => placed?.patterns.includes(p.slug));
  const lessons = (placed?.placements ?? []).flatMap((p) => {
    const m = course.modules.find((x) => x.slug === p.module);
    if (!m) return [];
    const where = m.number === 0 ? 'Foundations' : `Module ${m.number}`;
    return [p.lesson ? `${where}: ${p.lesson.title}` : `${where} overview`];
  });

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap gap-1.5 text-sm text-ink-3">
          <li>
            <Link href="/visualizers">Visualizers</Link>
          </li>
          {home && (
            <>
              <li aria-hidden="true">/</li>
              <li>{home.number === 0 ? 'Foundations' : `Module ${home.number}: ${home.title}`}</li>
            </>
          )}
        </ol>
      </nav>
      <VizEmbed id={id} title={entry.title} syncHash headingLevel={1} />
      <VizExtras id={id} />
      {(patterns.length > 0 || lessons.length > 0) && (
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          {patterns.length > 0 && (
            <>
              <dt className="font-semibold text-ink-2">{patterns.length === 1 ? 'Pattern' : 'Patterns'}</dt>
              <dd className="text-ink">{patterns.map((p) => `${p.number} ${p.title}`).join(' · ')}</dd>
            </>
          )}
          {lessons.length > 0 && (
            <>
              <dt className="font-semibold text-ink-2">In the course</dt>
              <dd className="text-ink">{lessons.join(' · ')}</dd>
            </>
          )}
        </dl>
      )}
      <p className="text-sm text-ink-3">
        Keys: ← and → step, space plays and pauses, Home and End jump to the first and last step. Click a line
        number to stop there when playing.
      </p>
    </div>
  );
}
