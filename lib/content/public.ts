import 'server-only';
// What pages read from content/ at build time (D-005): modules, lessons and patterns. It never opens content/reserved/
// or the problem files, so nothing reserved can reach a page through it. Pages are prerendered, so this runs during
// the build only; the `turbopackIgnore` marks keep the bundler from copying the whole project, content/reserved/
// included, into the server output for files no request ever reads.
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'js-yaml';
import { z } from 'zod';
import { inspectMdx } from './mdx';

const CONTENT_DIR = path.join(process.cwd(), 'content');

const Frontmatter = z.looseObject({ slug: z.string(), title: z.string() });
const ModuleFrontmatter = z.looseObject({ slug: z.string(), title: z.string(), number: z.number() });
const PatternFrontmatter = z.looseObject({
  slug: z.string(),
  title: z.string(),
  number: z.string(),
  module: z.string(),
});

function readMdx<S extends z.ZodType>(schema: S, file: string): { data: z.infer<S>; body: string } {
  const source = fs.readFileSync(/*turbopackIgnore: true*/ file, 'utf8');
  const m = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing frontmatter`);
  return { data: schema.parse(load(m[1] as string)), body: m[2] as string };
}

export interface PublicLesson {
  module: string;
  slug: string;
  title: string;
  /** Visualizers the page embeds, in order. */
  visualizers: string[];
  /** Patterns the page includes (`<Include id="patterns/…">`). */
  patterns: string[];
}

export interface PublicModule {
  slug: string;
  number: number;
  title: string;
  /** Visualizers the module overview embeds. */
  visualizers: string[];
  lessons: PublicLesson[];
}

export interface PublicPattern {
  slug: string;
  number: string;
  title: string;
  module: string;
}

export interface PublicCourse {
  modules: PublicModule[];
  patterns: PublicPattern[];
}

let cached: PublicCourse | null = null;

export function publicCourse(): PublicCourse {
  if (cached) return cached;
  const facts = (body: string) => {
    const { components } = inspectMdx(body);
    const ids = (name: string) => components.filter((c) => c.name === name).map((c) => String(c.props.id));
    return {
      visualizers: ids('Viz'),
      patterns: ids('Include')
        .filter((id) => id.startsWith('patterns/'))
        .map((id) => id.slice('patterns/'.length)),
    };
  };
  const modulesDir = path.join(CONTENT_DIR, 'modules');
  const modules = fs
    .readdirSync(modulesDir)
    .sort()
    .map((dir): PublicModule => {
      const overview = readMdx(ModuleFrontmatter, path.join(modulesDir, dir, 'module.mdx'));
      const lessonsDir = path.join(modulesDir, dir, 'lessons');
      const pages = [
        ...(fs.existsSync(/*turbopackIgnore: true*/ lessonsDir) ? fs.readdirSync(/*turbopackIgnore: true*/ lessonsDir).sort() : [])
          .filter((f) => f.endsWith('.mdx'))
          .map((f) => path.join(lessonsDir, f)),
        ...[path.join(modulesDir, dir, 'checkpoint.mdx')].filter((f) => fs.existsSync(/*turbopackIgnore: true*/ f)),
      ];
      return {
        slug: overview.data.slug,
        number: overview.data.number,
        title: overview.data.title,
        visualizers: facts(overview.body).visualizers,
        lessons: pages.map((file) => {
          const page = readMdx(Frontmatter, file);
          return { module: overview.data.slug, slug: page.data.slug, title: page.data.title, ...facts(page.body) };
        }),
      };
    });
  const patternsDir = path.join(CONTENT_DIR, 'patterns');
  const patterns = fs
    .readdirSync(patternsDir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => {
      const { data } = readMdx(PatternFrontmatter, path.join(patternsDir, f));
      return { slug: data.slug, number: data.number, title: data.title, module: data.module };
    })
    .sort((a, b) => a.number.localeCompare(b.number, 'en', { numeric: true }));
  cached = { modules, patterns };
  return cached;
}

export interface VizPlacement {
  module: string;
  /** Null for a module overview. */
  lesson: { slug: string; title: string } | null;
}

/** Where each visualizer appears, and the patterns taught on the pages that embed it. */
export function vizPlacements(course: PublicCourse): Map<string, { placements: VizPlacement[]; patterns: string[] }> {
  const out = new Map<string, { placements: VizPlacement[]; patterns: string[] }>();
  const add = (id: string, placement: VizPlacement, patterns: string[]) => {
    const entry = out.get(id) ?? { placements: [], patterns: [] };
    entry.placements.push(placement);
    for (const p of patterns) if (!entry.patterns.includes(p)) entry.patterns.push(p);
    out.set(id, entry);
  };
  for (const m of course.modules) {
    for (const id of m.visualizers) add(id, { module: m.slug, lesson: null }, []);
    for (const l of m.lessons) {
      for (const id of l.visualizers) add(id, { module: m.slug, lesson: { slug: l.slug, title: l.title } }, l.patterns);
    }
  }
  return out;
}
