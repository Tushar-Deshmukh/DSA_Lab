// Builds the public documents for MongoDB from content/, and writes only what changed (plan 6.8).
// A test checks that no answer, reserved problem, gated exercise or Module 12 pattern can reach a document.
import crypto from 'node:crypto';
import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';
import type { ContentCollection, ContentModels, ContentRecord } from '../db/content-models';
import { CONTENT_COLLECTIONS } from '../db/content-models';
import type { ContentBundle } from './load';
import { parseMdx } from './mdx';
import { splitExercise } from './split';

export type SyncDocument = Omit<ContentRecord, 'contentVersion'>;

const hash = (value: unknown): string => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Prose of an MDX body, without code, without the units that stay locked, and with includes resolved. */
function searchableText(body: string, bundle: ContentBundle, depth = 0): string {
  const tree: Root = parseMdx(body);
  const parts: string[] = [];
  visit(tree, (node) => {
    const type = node.type as string;
    if (type === 'mdxJsxFlowElement' || type === 'mdxJsxTextElement') {
      const jsx = node as unknown as { name: string; attributes: { name?: string; value?: unknown }[] };
      const attr = (name: string) => jsx.attributes.find((a) => a.name === name)?.value;
      // "After" units are locked until the attempt is finished (D-012), so search must not reveal them.
      if (jsx.name === 'Unit' && attr('phase') === 'after') return 'skip';
      if (jsx.name === 'Unit' || jsx.name === 'Callout') parts.push(String(attr('title') ?? ''));
      if (jsx.name === 'Include' && depth === 0) {
        const id = String(attr('id'));
        const doc = bundle.theory.get(id) ?? bundle.patterns.get(id) ?? bundle.handbook.get(id);
        if (doc) parts.push(searchableText(doc.body, bundle, depth + 1));
      }
      return undefined;
    }
    if (type === 'code') return 'skip';
    if (type === 'text') parts.push((node as unknown as { value: string }).value);
    return undefined;
  });
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/** Every document, by collection. Pure, so tests can inspect exactly what would be written. */
export function buildSyncDocuments(bundle: ContentBundle): Record<ContentCollection, SyncDocument[]> {
  const docs = Object.fromEntries(CONTENT_COLLECTIONS.map((c) => [c, [] as SyncDocument[]])) as Record<
    ContentCollection,
    SyncDocument[]
  >;

  for (const { module, lessons, checkpoint } of bundle.modules) {
    const fm = module.frontmatter;
    docs.modules.push({
      slug: fm.slug,
      title: fm.title,
      searchable: [fm.objectives, fm.shortOnTime, searchableText(module.body, bundle)].filter(Boolean).join(' '),
      data: {
        number: fm.number,
        ...(fm.objectives ? { objectives: fm.objectives } : {}),
        ...(fm.shortOnTime ? { shortOnTime: fm.shortOnTime } : {}),
        lessons: lessons.map((l) => l.frontmatter.slug),
        hasCheckpoint: Boolean(checkpoint),
      },
    });

    for (const page of [...lessons, ...(checkpoint ? [checkpoint] : [])]) {
      const slug = `${fm.slug}/${page.frontmatter.slug}`;
      const front = page.frontmatter as Record<string, unknown>;
      docs.lessons.push({
        slug,
        title: page.frontmatter.title,
        searchable: searchableText(page.body, bundle),
        data: {
          module: fm.slug,
          kind: page === checkpoint ? 'checkpoint' : 'lesson',
          ...(front.goal ? { goal: front.goal } : {}),
          ...(front.estimate ? { estimate: front.estimate } : {}),
        },
      });
      for (const exercise of page.exercises) {
        if (exercise.gatedBy) continue;
        const { public: publicPart } = splitExercise(exercise);
        docs.exercises_public.push({
          slug: `${slug}/${exercise.id}`,
          title: exercise.type === 'interview' ? exercise.title : exercise.tag,
          // The question only: hints and options would let a search find an exercise by its answer.
          searchable: exercise.q ?? '',
          data: publicPart,
        });
      }
    }
  }

  for (const doc of bundle.patterns.values()) {
    const fm = doc.frontmatter;
    docs.patterns.push({
      slug: fm.slug,
      title: fm.title,
      searchable: searchableText(doc.body, bundle),
      data: { number: fm.number, module: fm.module },
    });
  }

  for (const [id, doc] of bundle.handbook) {
    docs.handbook.push({
      slug: id.slice('handbook/'.length),
      title: doc.frontmatter.title,
      searchable: searchableText(doc.body, bundle),
      data: { section: doc.frontmatter.section },
    });
  }

  for (const p of bundle.bank) {
    if ('extension' in p) {
      docs.problems.push({
        slug: String(p.num),
        title: p.title,
        searchable: '',
        data: { num: p.num, url: p.url, difficulty: p.difficulty, extension: true, usedIn: p.usedIn },
      });
      continue;
    }
    const open = {
      num: p.num,
      url: p.url,
      difficulty: p.difficulty,
      tier: p.tier,
      role: p.role,
      module: p.module,
      lesson: p.lesson,
    };
    docs.problems.push(
      p.hiddenUntilAttempted
        ? { slug: String(p.num), title: p.title, searchable: '', data: { ...open, hiddenUntilAttempted: true } }
        : {
            slug: String(p.num),
            title: p.title,
            searchable: [p.pattern, p.why].join(' '),
            data: { ...open, pattern: p.pattern, prereq: p.prereq, why: p.why, hint: p.hint },
          },
    );
  }
  return docs;
}

export interface SyncResult {
  written: number;
  deleted: number;
  unchanged: number;
  version: string;
  counts: Record<string, number>;
}

/** Upserts what changed and deletes what no longer exists. Running it twice changes nothing. */
export async function syncContent(models: ContentModels, bundle: ContentBundle, now: Date): Promise<SyncResult> {
  const docs = buildSyncDocuments(bundle);
  const result: SyncResult = { written: 0, deleted: 0, unchanged: 0, version: '', counts: {} };
  const versions: Record<string, string> = {};

  for (const collection of CONTENT_COLLECTIONS) {
    const model = models.items[collection];
    const items = docs[collection];
    result.counts[collection] = items.length;
    const existing = new Map(
      (await model.find({}, { slug: 1, contentVersion: 1 }).lean()).map((d) => [d.slug, d.contentVersion]),
    );
    const ops = [];
    for (const item of items) {
      const contentVersion = hash(item);
      versions[`${collection}/${item.slug}`] = contentVersion;
      if (existing.get(item.slug) === contentVersion) {
        result.unchanged++;
        continue;
      }
      ops.push({
        updateOne: {
          filter: { slug: item.slug },
          update: { $set: { ...item, contentVersion } },
          upsert: true,
        },
      });
    }
    if (ops.length) {
      await model.bulkWrite(ops);
      result.written += ops.length;
    }
    const wanted = new Set(items.map((i) => i.slug));
    const gone = [...existing.keys()].filter((slug) => !wanted.has(slug));
    if (gone.length) {
      await model.deleteMany({ slug: { $in: gone } });
      result.deleted += gone.length;
    }
  }

  result.version = hash(versions);
  const meta = await models.meta.findById('current').lean();
  if (meta?.version !== result.version) {
    await models.meta.updateOne(
      { _id: 'current' },
      { $set: { version: result.version, syncedAt: now, counts: result.counts } },
      { upsert: true },
    );
  }
  return result;
}
