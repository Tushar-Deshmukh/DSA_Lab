// Zod schemas for the files in content/ (plan 6). Used at build time and by scripts only, so they use full Zod.
// Objects are strict, and text fields must be strings: an unquoted `key: value` inside YAML text parses as an object,
// a legacy pitfall these schemas catch.
import { z } from 'zod';

const text = z.string().min(1);
const textList = z.array(text);
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

// ---- exercises (the legacy schema, plan 6.4)

const exerciseBase = {
  id: z.string().regex(/^ex-\d{2,}$/),
  legacyId: text,
  /** The checkpoint or mock after which this exercise may be shown. It never ships before that. */
  gatedBy: slug.optional(),
  explain: text,
  hints: textList.min(1),
};

/** A wrong answer is a misunderstanding (concept) or a slip in the code (impl). */
const MistakeKindSchema = z.enum(['concept', 'impl']);

const OptionSchema = z.strictObject({
  t: text,
  ok: z.boolean().optional(),
  why: text.optional(),
  kind: MistakeKindSchema.optional(),
});

/** A null argument adapter passes that argument through unchanged. */
const adaptArg = z.union([text, z.null()]);
const AdaptSchema = z.strictObject({ args: z.array(adaptArg).optional(), ret: text.optional() });

const TestSchema = z.strictObject({
  args: z.array(z.unknown()).optional(),
  expect: z.unknown(),
  hidden: z.boolean().optional(),
  ops: z.array(z.array(z.unknown())).optional(),
});

const runnable = {
  fn: text,
  tests: z.array(TestSchema).min(1),
  compare: z.enum(['sorted', 'float', 'unordered']).optional(),
  adapt: AdaptSchema.optional(),
  checker: text.optional(),
};

export const ExerciseSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...exerciseBase,
    type: z.literal('mcq'),
    tag: text,
    q: text,
    code: text.optional(),
    multi: z.boolean().optional(),
    options: z.array(OptionSchema).min(2),
  }),
  z.strictObject({
    ...exerciseBase,
    type: z.literal('pattern'),
    tag: text,
    q: text,
    clues: text.optional(),
    options: z.array(OptionSchema).min(2),
  }),
  z.strictObject({
    ...exerciseBase,
    type: z.literal('complexity'),
    tag: text,
    q: text.optional(),
    code: text.optional(),
    fields: z
      .array(
        z.strictObject({
          label: text,
          answer: text,
          /** Absent means the standard list of complexities. */
          options: textList.min(2).optional(),
          why: z.record(z.string(), text).optional(),
        }),
      )
      .min(1),
  }),
  z.strictObject({
    ...exerciseBase,
    type: z.literal('bug'),
    tag: text,
    q: text,
    code: text,
    bug: z.array(z.number().int().min(0)).min(1),
    fine: z.record(z.string(), text),
    fix: text,
    kind: MistakeKindSchema,
  }),
  z.strictObject({
    ...exerciseBase,
    type: z.literal('predict'),
    tag: text,
    q: text,
    code: text,
    answer: z.string(),
    normalize: z.literal('exact').optional(),
    placeholder: text.optional(),
    traps: z.record(z.string(), text).optional(),
  }),
  z.strictObject({
    ...exerciseBase,
    ...runnable,
    type: z.literal('fill'),
    tag: text,
    q: text,
    template: text,
    blanks: z.array(z.strictObject({ accept: textList.min(1), w: z.number().optional() })).min(1),
  }),
  z.strictObject({
    ...exerciseBase,
    type: z.literal('trace'),
    tag: text,
    q: text,
    code: text.optional(),
    verify: text.optional(),
    rows: z
      .array(
        z.strictObject({
          prompt: text,
          answer: z.union([z.string(), z.array(z.string())]),
          why: text.optional(),
          w: z.number().optional(),
        }),
      )
      .min(1),
  }),
  z.strictObject({
    ...exerciseBase,
    ...runnable,
    type: z.literal('code'),
    tag: text,
    q: text,
    starter: z.string(),
    solution: text,
  }),
  z.strictObject({
    ...exerciseBase,
    ...runnable,
    type: z.literal('interview'),
    title: text,
    q: text,
    starter: z.string(),
    solution: text,
    model: z.strictObject({ clarify: text, brute: text, optimize: text, edges: text, complexity: text }),
  }),
]);
export type Exercise = z.infer<typeof ExerciseSchema>;

export const AnnotatedCodeSchema = z.strictObject({
  id: z.string().regex(/^anno-\d{2,}$/),
  code: text,
  /** 1-based line numbers. */
  notes: z.record(z.string().regex(/^\d+$/), text),
  title: z.string(),
});
export type AnnotatedCode = z.infer<typeof AnnotatedCodeSchema>;

export const PageYamlSchema = z.strictObject({
  exercises: z.array(ExerciseSchema),
  annotated: z.array(AnnotatedCodeSchema),
});

// ---- frontmatter

const EstimateSchema = z.record(z.string(), z.number().int().positive());
const ScheduledProblemSchema = z.strictObject({ num: z.number().int().positive(), tier: z.enum(['C', 'S', 'O']) });
const ResolveSchema = z.strictObject({ problems: z.array(z.number().int().positive()).min(1) });
const MockFactsSchema = z.strictObject({ id: z.number().int(), slug, topics: text });

const scheduleFields = {
  topic: text,
  implement: z.string(),
  problemsText: z.string(),
  problems: z.array(ScheduledProblemSchema),
  doneWhen: z.string(),
  estimate: EstimateSchema,
  resolves: z.array(ResolveSchema).optional(),
};

export const LessonFrontmatterSchema = z.strictObject({
  slug,
  legacyId: text,
  title: text,
  goal: text,
  why: text,
  prereqs: textList,
  outcomes: textList,
  ready: textList,
  summary: textList,
  revision: text,
  warmup: z.strictObject({ problem: z.number().int().positive(), note: text.optional() }).optional(),
  ...scheduleFields,
  mock: MockFactsSchema.optional(),
});
export type LessonFrontmatter = z.infer<typeof LessonFrontmatterSchema>;

/** A Foundations lesson is assembled from existing handbook pages and has no schedule row (plan 5.5). */
export const FoundationLessonFrontmatterSchema = z.strictObject({
  slug,
  legacyId: text,
  title: text,
  legacyTitle: text,
});

export const CheckpointFrontmatterSchema = z.strictObject({
  slug: z.literal('checkpoint'),
  legacyId: text,
  title: text,
  kind: z.enum(['drill', 'assessment', 'mock']),
  gateId: slug.optional(),
  goal: text.optional(),
  ...scheduleFields,
  assessment: z
    .strictObject({
      id: text,
      slug,
      topics: text,
      cold: z.strictObject({
        text,
        problems: z.array(z.number().int().positive()),
        minutes: z.number().int().positive(),
      }),
      unseen: text,
      total: text,
      pass: text,
    })
    .optional(),
  mock: MockFactsSchema.optional(),
});
export type CheckpointFrontmatter = z.infer<typeof CheckpointFrontmatterSchema>;

export const ModuleFrontmatterSchema = z.strictObject({
  number: z.number().int().min(0),
  slug,
  title: text,
  legacyId: text.nullable(),
  objectives: text.optional(),
  shortOnTime: text.optional(),
  notes: textList.optional(),
  final: z.strictObject({ legacyId: text, topic: text, doneWhen: text }).optional(),
});
export type ModuleFrontmatter = z.infer<typeof ModuleFrontmatterSchema>;

const SourceSchema = z.strictObject({
  file: text,
  section: z.number().int().min(0),
  week: z.number().int().optional(),
  key: text.optional(),
  lines: z.tuple([z.number().int().positive(), z.number().int()]),
});

export const TheoryFrontmatterSchema = z.strictObject({ slug, title: text, module: slug, source: SourceSchema });
export type TheoryFrontmatter = z.infer<typeof TheoryFrontmatterSchema>;

export const PatternFrontmatterSchema = z.strictObject({
  slug,
  number: z.string().regex(/^\d+\.\d+$/),
  title: text,
  module: slug,
  source: SourceSchema,
});
export type PatternFrontmatter = z.infer<typeof PatternFrontmatterSchema>;

export const HandbookFrontmatterSchema = z.strictObject({
  slug: z.union([z.literal('index'), slug]),
  section: z.number().int().min(0),
  title: text,
  source: SourceSchema,
});
export type HandbookFrontmatter = z.infer<typeof HandbookFrontmatterSchema>;

// ---- other files

export const TrackSchema = z.strictObject({
  map: slug,
  modules: z.array(
    z.strictObject({
      number: z.number().int().min(0),
      slug,
      title: text,
      prerequisites: z.array(slug),
      lessons: z.array(slug),
    }),
  ),
});
export type Track = z.infer<typeof TrackSchema>;

const url = z.url();

const BankProblemSchema = z.strictObject({
  num: z.number().int().positive(),
  title: text,
  url,
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  tier: z.enum(['C', 'S', 'O']),
  role: z.enum(['Intro', 'Core', 'Transfer', 'Challenge']),
  module: slug,
  lesson: slug,
  /** Module 12: the pattern, prerequisite, reason and hint stay in the key part until the learner has attempted it. */
  hiddenUntilAttempted: z.literal(true).optional(),
  pattern: text,
  prereq: z.string(),
  why: text,
  hint: text,
});
const ExtensionProblemSchema = z.strictObject({
  num: z.number().int().positive(),
  title: text,
  url,
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  extension: z.literal(true),
  usedIn: text,
});
export const BankFileSchema = z.strictObject({ problems: z.array(z.union([BankProblemSchema, ExtensionProblemSchema])) });
export type BankProblem = z.infer<typeof BankProblemSchema>;
export type ExtensionProblem = z.infer<typeof ExtensionProblemSchema>;

export const ReservedAssessmentsSchema = z.strictObject({
  assessments: z.array(
    z.strictObject({
      id: text,
      slug,
      problems: z.array(
        z.strictObject({
          num: z.number().int().positive(),
          title: text,
          url,
          difficulty: z.enum(['Easy', 'Medium', 'Hard']),
          minutes: z.number().int().positive(),
        }),
      ),
    }),
  ),
});
export type ReservedAssessments = z.infer<typeof ReservedAssessmentsSchema>;

export const ReservedMocksSchema = z.strictObject({
  notes: textList,
  mocks: z.array(
    z.strictObject({
      id: z.number().int(),
      slug,
      topics: text,
      pool: z.array(z.strictObject({ num: z.number().int().positive(), title: text, url })),
    }),
  ),
});
export type ReservedMocks = z.infer<typeof ReservedMocksSchema>;

export const GatedFileSchema = z.strictObject({
  gated: z.array(
    z.strictObject({
      id: slug,
      by: slug,
      md: text,
      source: z.strictObject({ file: text, lines: z.tuple([z.number().int().positive(), z.number().int()]) }),
    }),
  ),
});
export type GatedFile = z.infer<typeof GatedFileSchema>;

export const AllowlistSchema = z.strictObject({
  entries: z.array(
    z.strictObject({
      match: text,
      reason: text,
      /** Limits the entry to items whose location starts with this text. */
      in: text.optional(),
    }),
  ),
});
export type Allowlist = z.infer<typeof AllowlistSchema>;

export const IdsLockSchema = z.strictObject({
  /** A released id that was renamed, and the id that replaces it. */
  aliases: z.record(z.string(), z.string()),
  ids: z.array(text),
});
export type IdsLock = z.infer<typeof IdsLockSchema>;

export const LegacyIdMapSchema = z.strictObject({
  modules: z.record(z.string(), z.string()),
  lessons: z.record(z.string(), z.string()),
  exercises: z.record(z.string(), z.string()),
  patterns: z.record(z.string(), z.string()),
  reflections: z.record(z.string(), z.string()),
  assessments: z.record(z.string(), z.string()),
  mocks: z.record(z.string(), z.string()),
  fragments: z.record(z.string(), z.string()),
  visualizers: z.record(z.string(), z.string()),
});
export type LegacyIdMap = z.infer<typeof LegacyIdMapSchema>;
