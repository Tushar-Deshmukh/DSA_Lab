import { Schema, type Connection, type Model } from 'mongoose';

// Read-optimised copies of content/, written by `npm run content:sync` (plan 6.8). `data` holds only what may be public:
// never answers, reserved problems, gated exercises or the patterns of Module 12 problems. `searchable` feeds the text
// index that search uses, so it obeys the same rule.

export interface ContentRecord {
  slug: string;
  title: string;
  searchable: string;
  contentVersion: string;
  data: Record<string, unknown>;
}

export interface ContentMetaRecord {
  _id: string;
  version: string;
  syncedAt: Date;
  counts: Record<string, number>;
}

const contentSchema = (collection: string) =>
  new Schema<ContentRecord>(
    {
      slug: { type: String, required: true, unique: true },
      title: { type: String, required: true },
      searchable: { type: String, default: '' },
      contentVersion: { type: String, required: true },
      data: { type: Schema.Types.Mixed, default: () => ({}) },
    },
    { collection, versionKey: false, minimize: false },
  ).index({ title: 'text', searchable: 'text' });

const contentMetaSchema = new Schema<ContentMetaRecord>(
  {
    _id: { type: String, required: true },
    version: { type: String, required: true },
    syncedAt: { type: Date, required: true },
    counts: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { collection: 'content_meta', versionKey: false },
);

export const CONTENT_COLLECTIONS = [
  'modules',
  'lessons',
  'patterns',
  'exercises_public',
  'problems',
  'handbook',
] as const;
export type ContentCollection = (typeof CONTENT_COLLECTIONS)[number];

export interface ContentModels {
  items: Record<ContentCollection, Model<ContentRecord>>;
  meta: Model<ContentMetaRecord>;
}

export function registerContentModels(conn: Connection): ContentModels {
  const model = (name: ContentCollection): Model<ContentRecord> =>
    (conn.models[name] as Model<ContentRecord> | undefined) ??
    conn.model<ContentRecord>(name, contentSchema(name));
  return {
    items: {
      modules: model('modules'),
      lessons: model('lessons'),
      patterns: model('patterns'),
      exercises_public: model('exercises_public'),
      problems: model('problems'),
      handbook: model('handbook'),
    },
    meta:
      (conn.models.content_meta as Model<ContentMetaRecord> | undefined) ??
      conn.model<ContentMetaRecord>('content_meta', contentMetaSchema),
  };
}
