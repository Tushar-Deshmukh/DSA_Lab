// `npm run content:check` (plan 6.7). Runs before every build; any problem fails it.
import path from 'node:path';
import { ContentLoadError, loadContent } from '../lib/content/load';
import { validateContent } from '../lib/content/validate';
import { VIZ_CATALOG, VIZ_LOADERS } from '../lib/viz/registry';
import { testInputs } from '../lib/viz/test-inputs';
import { vizTexts, type VizText } from '../lib/viz/text';
import type { AnyViz } from '../lib/viz/types';
import { CONTENT_DIR } from './import/paths';

/** The visualizers a page may embed: the ported ones (tests/viz/parity.test.ts proves they are the legacy 129). */
export const knownVisualizers = (): Set<string> => new Set(VIZ_CATALOG.map((e) => e.id));

/** What every visualizer shows in words, on the default, its presets and its 300 random test inputs. */
export async function visualizerTexts(): Promise<VizText[]> {
  const out: VizText[] = [];
  for (const { id } of VIZ_CATALOG) {
    const viz = await (VIZ_LOADERS[id] as () => Promise<AnyViz>)();
    out.push(...vizTexts(viz, testInputs(viz)));
  }
  return out;
}

async function main(): Promise<void> {
  let problems: string[];
  try {
    problems = validateContent(loadContent(CONTENT_DIR), knownVisualizers(), await visualizerTexts());
  } catch (err) {
    if (!(err instanceof ContentLoadError)) throw err;
    problems = err.problems;
  }
  if (problems.length) {
    for (const p of problems) console.error(p);
    console.error(`\ncontent:check found ${problems.length} problems.`);
    process.exit(1);
  }
  console.log('content:check passed.');
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith(path.join('scripts', 'validate-content.ts')))
  void main();
