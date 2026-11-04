import mongoose, { type Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadContent, type ContentBundle } from '@/lib/content/load';
import { buildSyncDocuments, syncContent } from '@/lib/content/sync';
import { CONTENT_COLLECTIONS, registerContentModels, type ContentModels } from '@/lib/db/content-models';
import { CONTENT_DIR } from '@/scripts/import/paths';

// content:sync against a real MongoDB. Plan 6.8: running it twice changes nothing, vanished items are deleted, and no
// answer, reserved problem, gated exercise or Module 12 pattern can reach a collection.

let server: MongoMemoryServer;
let conn: Connection;
let models: ContentModels;
let bundle: ContentBundle;

beforeAll(async () => {
  server = await MongoMemoryServer.create();
  conn = await mongoose.createConnection(server.getUri('dpl-content')).asPromise();
  models = registerContentModels(conn);
  await Promise.all(CONTENT_COLLECTIONS.map((c) => models.items[c].createIndexes()));
  bundle = loadContent(CONTENT_DIR);
});

afterAll(async () => {
  await conn?.close();
  await server?.stop();
});

const dumpAll = async () =>
  Object.fromEntries(
    await Promise.all(
      CONTENT_COLLECTIONS.map(async (c) => [c, await models.items[c].find().sort({ slug: 1 }).lean()]),
    ),
  ) as Record<string, unknown>;

describe('syncContent', () => {
  it('writes every public item the first time', async () => {
    const result = await syncContent(models, bundle, new Date(1000));
    expect(result.written).toBe(
      result.counts.modules! +
        result.counts.lessons! +
        result.counts.patterns! +
        result.counts.exercises_public! +
        result.counts.problems! +
        result.counts.handbook!,
    );
    expect(result.counts).toEqual({
      modules: 13,
      lessons: 75, // 63 lessons + 12 checkpoints
      patterns: 47,
      exercises_public: 421 - 29, // gated exercises stay out
      problems: 179, // 173 + 6 extension entries
      handbook: 75,
    });
    expect(await models.items.lessons.countDocuments()).toBe(75);
    const meta = await models.meta.findById('current').lean();
    expect(meta?.syncedAt).toEqual(new Date(1000));
    expect(meta?.version).toBe(result.version);
  });

  it('changes nothing the second time', async () => {
    const before = await dumpAll();
    const result = await syncContent(models, bundle, new Date(2000));
    expect(result).toMatchObject({ written: 0, deleted: 0 });
    expect(await dumpAll()).toEqual(before);
    const meta = await models.meta.findById('current').lean();
    expect(meta?.syncedAt).toEqual(new Date(1000));
  });

  it('updates only what changed, with a new content version', async () => {
    const changed = structuredClone(bundle);
    const doc = changed.patterns.get('patterns/sliding-window');
    if (!doc) throw new Error('fixture pattern is missing');
    doc.body += '\n\nA new sentence about windows.\n';
    const before = await models.items.patterns.findOne({ slug: 'sliding-window' }).lean();
    const result = await syncContent(models, changed, new Date(3000));
    // The pattern, and the one lesson whose search text includes it. Nothing else.
    expect(result).toMatchObject({ written: 2, deleted: 0 });
    const after = await models.items.patterns.findOne({ slug: 'sliding-window' }).lean();
    expect(after?.contentVersion).not.toBe(before?.contentVersion);
    expect(after?.searchable).toContain('A new sentence about windows.');
    expect((await models.meta.findById('current').lean())?.syncedAt).toEqual(new Date(3000));
  });

  it('deletes items that no longer exist', async () => {
    const changed = structuredClone(bundle);
    changed.patterns.delete('patterns/sliding-window');
    const result = await syncContent(models, changed, new Date(4000));
    expect(result.deleted).toBe(1);
    expect(await models.items.patterns.findOne({ slug: 'sliding-window' })).toBeNull();
    const restored = await syncContent(models, bundle, new Date(5000));
    expect(restored.written).toBe(2);
  });

  it('finds lessons and handbook pages through the text index', async () => {
    const hits = await models.items.handbook.find({ $text: { $search: 'hint ladder' } }).lean();
    expect(hits.map((h) => h.slug)).toContain('revision-and-mistakes/hint-ladder');
    const lessons = await models.items.lessons.find({ $text: { $search: 'Kadane' } }).lean();
    expect(lessons.map((h) => h.slug)).toContain('two-pointers-windows-prefix-sums/partitioning-and-kadane');
  });
});

describe('what reaches the database', () => {
  const allText = (bundleDocs: ReturnType<typeof buildSyncDocuments>) => JSON.stringify(bundleDocs);

  it('holds no reserved problem: titles, URLs and gated statements are absent', () => {
    const text = allText(buildSyncDocuments(bundle));
    const reserved = [
      ...bundle.reserved.assessments.assessments.flatMap((a) => a.problems),
      ...bundle.reserved.mocks.mocks.flatMap((m) => m.pool),
    ];
    expect(reserved).toHaveLength(31);
    for (const p of reserved) {
      if (p.title !== 'Triangle') expect(text, p.title).not.toContain(p.title);
      expect(text, p.url).not.toContain(p.url);
    }
    for (const g of bundle.reserved.gated.gated) expect(text, g.id).not.toContain(g.md);
  });

  it('holds no gated exercise', () => {
    const docs = buildSyncDocuments(bundle);
    const slugs = new Set(docs.exercises_public.map((d) => d.slug));
    let gated = 0;
    for (const m of bundle.modules) {
      for (const page of [...m.lessons, ...(m.checkpoint ? [m.checkpoint] : [])]) {
        for (const e of page.exercises) {
          const slug = `${m.module.frontmatter.slug}/${page.frontmatter.slug}/${e.id}`;
          expect(slugs.has(slug), slug).toBe(!e.gatedBy);
          if (e.gatedBy) gated++;
        }
      }
    }
    expect(gated).toBe(29);
  });

  it('holds no answer field in any exercise', () => {
    const forbidden = /"(ok|explain|clues|solution|model|accept|traps|fine|fix|bug|verify|why|answer)":/;
    for (const doc of buildSyncDocuments(bundle).exercises_public) {
      expect(JSON.stringify(doc.data), doc.slug).not.toMatch(forbidden);
    }
  });

  it('holds no explanation, solution or model answer as text anywhere', () => {
    const text = allText(buildSyncDocuments(bundle));
    for (const m of bundle.modules) {
      for (const page of [...m.lessons, ...(m.checkpoint ? [m.checkpoint] : [])]) {
        for (const e of page.exercises) {
          expect(text, e.legacyId).not.toContain(JSON.stringify(e.explain));
          if ('solution' in e) expect(text, e.legacyId).not.toContain(JSON.stringify(e.solution));
        }
      }
    }
  });

  it('holds no hidden test', () => {
    for (const doc of buildSyncDocuments(bundle).exercises_public) {
      const tests = (doc.data.tests ?? []) as { hidden?: boolean }[];
      for (const t of tests) expect(t.hidden, doc.slug).toBeFalsy();
    }
  });

  it('hides the pattern, hint, prerequisite and reason of every Module 12 problem, and only those', () => {
    const problems = buildSyncDocuments(bundle).problems;
    const hidden = bundle.bank.filter((p) => 'hiddenUntilAttempted' in p && p.hiddenUntilAttempted);
    expect(hidden.map((p) => p.num).sort((a, b) => a - b)).toEqual([287, 380, 438, 678, 853, 981]);
    for (const p of hidden) {
      const doc = problems.find((d) => d.slug === String(p.num));
      expect(doc?.searchable).toBe('');
      expect(Object.keys(doc?.data ?? {})).not.toEqual(expect.arrayContaining(['pattern']));
      for (const key of ['pattern', 'hint', 'prereq', 'why'])
        expect(doc?.data, `${p.num} ${key}`).not.toHaveProperty(key);
    }
    const open = problems.find((d) => d.slug === '1');
    expect(open?.data).toHaveProperty('pattern');
    expect(open?.data).toHaveProperty('hint');
  });

  it('keeps the text of locked "after" units out of search', () => {
    const lessons = buildSyncDocuments(bundle).lessons;
    const cp = lessons.find((d) => d.slug === 'two-pointers-windows-prefix-sums/checkpoint');
    expect(cp?.searchable).toContain('Assessment 1 covers Modules 1–2');
    const afterUnit = bundle.modules.find((m) => m.module.frontmatter.number === 2)?.checkpoint?.body ?? '';
    const prose = afterUnit
      .slice(afterUnit.indexOf('phase="after"'))
      .split('\n')
      .find((l) => l && !l.startsWith('<'));
    if (prose) expect(cp?.searchable).not.toContain(prose.slice(0, 40));
  });

  it('holds no date in anything it stores for search', () => {
    const text = allText(buildSyncDocuments(bundle));
    expect(text).not.toMatch(/\b\d{1,2} (Nov|Dec|Jan)\b|\bW\d+D\d+\b|\bSaturday\b/);
  });
});
