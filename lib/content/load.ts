// Reads content/ from disk and checks every file against its schema. Build time and scripts only: this module uses
// node:fs and reads the reserved files, so nothing that reaches a page may import it.
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'js-yaml';
import type { z } from 'zod';
import {
  AllowlistSchema,
  BankFileSchema,
  CheckpointFrontmatterSchema,
  FoundationLessonFrontmatterSchema,
  GatedFileSchema,
  HandbookFrontmatterSchema,
  IdsLockSchema,
  LegacyIdMapSchema,
  LessonFrontmatterSchema,
  ModuleFrontmatterSchema,
  PageYamlSchema,
  PatternFrontmatterSchema,
  ReservedAssessmentsSchema,
  ReservedMocksSchema,
  TheoryFrontmatterSchema,
  TrackSchema,
  type Allowlist,
  type AnnotatedCode,
  type CheckpointFrontmatter,
  type Exercise,
  type GatedFile,
  type HandbookFrontmatter,
  type IdsLock,
  type LegacyIdMap,
  type LessonFrontmatter,
  type ModuleFrontmatter,
  type PatternFrontmatter,
  type ReservedAssessments,
  type ReservedMocks,
  type TheoryFrontmatter,
  type Track,
} from './schema';

export interface MdxDoc<F> {
  /** Path relative to content/, with forward slashes. */
  path: string;
  frontmatter: F;
  body: string;
}

export interface PageContent<F> extends MdxDoc<F> {
  exercises: Exercise[];
  annotated: AnnotatedCode[];
}

export type FoundationFrontmatter = z.infer<typeof FoundationLessonFrontmatterSchema>;

export interface LoadedModule {
  module: MdxDoc<ModuleFrontmatter>;
  lessons: PageContent<LessonFrontmatter | FoundationFrontmatter>[];
  checkpoint: PageContent<CheckpointFrontmatter> | null;
}

export interface ContentBundle {
  track: Track;
  modules: LoadedModule[];
  /** Keyed by include id: `theory/<module>/<slug>`. */
  theory: Map<string, MdxDoc<TheoryFrontmatter>>;
  /** Keyed by include id: `patterns/<slug>`. */
  patterns: Map<string, MdxDoc<PatternFrontmatter>>;
  /** Keyed by include id: `handbook/<section>/<slug>`; a section's lead page is `handbook/<section>`. */
  handbook: Map<string, MdxDoc<HandbookFrontmatter>>;
  bank: z.infer<typeof BankFileSchema>['problems'];
  reserved: { assessments: ReservedAssessments; mocks: ReservedMocks; gated: GatedFile };
  allowlists: { dates: Allowlist; reserved: Allowlist };
  idsLock: IdsLock;
  legacyIdMap: LegacyIdMap;
}

export class ContentLoadError extends Error {
  constructor(readonly problems: string[]) {
    super(`content/ has ${problems.length} problems:\n${problems.slice(0, 20).join('\n')}`);
  }
}

/** Splits `---` frontmatter from an MDX file. */
export function splitFrontmatter(source: string): { data: unknown; body: string } {
  const m = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error('missing frontmatter');
  return { data: load(m[1] as string), body: (m[2] as string).replace(/^\n+/, '') };
}

export function loadContent(root: string): ContentBundle {
  const problems: string[] = [];
  const toPosix = (p: string) => p.split(path.sep).join('/');
  const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');
  const listFiles = (rel: string, ext: string): string[] => {
    const dir = path.join(root, rel);
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir, { recursive: true, encoding: 'utf8' })
      .map(toPosix)
      .filter((f) => f.endsWith(ext))
      .sort()
      .map((f) => `${rel}/${f}`);
  };

  const parse = <S extends z.ZodType>(schema: S, value: unknown, rel: string): z.infer<S> | null => {
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    for (const issue of result.error.issues) problems.push(`${rel}: ${issue.path.join('.') || '(file)'}: ${issue.message}`);
    return null;
  };

  const yamlFile = <S extends z.ZodType>(schema: S, rel: string): z.infer<S> | null => {
    try {
      return parse(schema, load(read(rel)), rel);
    } catch (err) {
      problems.push(`${rel}: ${(err as Error).message.split('\n')[0]}`);
      return null;
    }
  };
  const jsonFile = <S extends z.ZodType>(schema: S, rel: string): z.infer<S> | null => {
    try {
      return parse(schema, JSON.parse(read(rel)), rel);
    } catch (err) {
      problems.push(`${rel}: ${(err as Error).message}`);
      return null;
    }
  };
  const mdxFile = <S extends z.ZodType>(schema: S, rel: string): MdxDoc<z.infer<S>> | null => {
    try {
      const { data, body } = splitFrontmatter(read(rel));
      const frontmatter = parse(schema, data, rel);
      return frontmatter === null ? null : { path: rel, frontmatter, body };
    } catch (err) {
      problems.push(`${rel}: ${(err as Error).message.split('\n')[0]}`);
      return null;
    }
  };

  const pageFile = <S extends z.ZodType>(schema: S, base: string): PageContent<z.infer<S>> | null => {
    const doc = mdxFile(schema, `${base}.mdx`);
    const data = yamlFile(PageYamlSchema, `${base}.yaml`);
    return doc && data ? { ...doc, exercises: data.exercises, annotated: data.annotated } : null;
  };

  const track = yamlFile(TrackSchema, 'track.yaml');
  const modules: LoadedModule[] = [];
  for (const entry of fs.readdirSync(path.join(root, 'modules')).sort()) {
    const dir = `modules/${entry}`;
    const moduleDoc = mdxFile(ModuleFrontmatterSchema, `${dir}/module.mdx`);
    if (!moduleDoc) continue;
    const foundations = moduleDoc.frontmatter.number === 0;
    const lessons: LoadedModule['lessons'] = [];
    for (const file of listFiles(`${dir}/lessons`, '.mdx')) {
      const page = foundations
        ? pageFile(FoundationLessonFrontmatterSchema, file.replace(/\.mdx$/, ''))
        : pageFile(LessonFrontmatterSchema, file.replace(/\.mdx$/, ''));
      if (page) lessons.push(page);
    }
    const checkpoint = fs.existsSync(path.join(root, `${dir}/checkpoint.mdx`))
      ? pageFile(CheckpointFrontmatterSchema, `${dir}/checkpoint`)
      : null;
    modules.push({ module: moduleDoc, lessons, checkpoint });
  }

  const docs = <F>(rel: string, schema: z.ZodType<F>, idOf: (file: string) => string): Map<string, MdxDoc<F>> => {
    const out = new Map<string, MdxDoc<F>>();
    for (const file of listFiles(rel, '.mdx')) {
      const doc = mdxFile(schema, file);
      if (doc) out.set(idOf(file), doc as MdxDoc<F>);
    }
    return out;
  };
  const withoutExt = (file: string) => file.replace(/\.mdx$/, '');
  const theory = docs('theory', TheoryFrontmatterSchema, withoutExt);
  const patterns = docs('patterns', PatternFrontmatterSchema, withoutExt);
  const handbook = docs('handbook', HandbookFrontmatterSchema, (f) => withoutExt(f).replace(/\/index$/, ''));

  const bank = yamlFile(BankFileSchema, 'problems/bank.yaml');
  const assessments = yamlFile(ReservedAssessmentsSchema, 'reserved/assessments.yaml');
  const mocks = yamlFile(ReservedMocksSchema, 'reserved/mocks.yaml');
  const gated = yamlFile(GatedFileSchema, 'reserved/gated.yaml');
  const dates = yamlFile(AllowlistSchema, 'allowlists/dates.yaml');
  const reservedList = yamlFile(AllowlistSchema, 'allowlists/reserved.yaml');
  const idsLock = jsonFile(IdsLockSchema, 'ids.lock.json');
  const legacyIdMap = jsonFile(LegacyIdMapSchema, 'legacy-id-map.json');

  if (!track || !bank || !assessments || !mocks || !gated || !dates || !reservedList || !idsLock || !legacyIdMap || problems.length) {
    throw new ContentLoadError(problems);
  }
  return {
    track,
    modules,
    theory,
    patterns,
    handbook,
    bank: bank.problems,
    reserved: { assessments, mocks, gated },
    allowlists: { dates, reserved: reservedList },
    idsLock,
    legacyIdMap,
  };
}
