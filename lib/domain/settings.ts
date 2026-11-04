import './zod';
import * as z from 'zod/mini';

// Learner settings (brief 5.13). A settings document stores only the fields the learner changed, each with the
// time of the change, so two devices merge field by field: the later change wins, and an exact tie goes to the
// larger value. That makes the merge independent of the order in which changes arrive.

export const SettingsValuesSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']),
  reducedMotion: z.enum(['system', 'reduce', 'full']),
  focusMode: z.boolean(),
  defaultSessionMinutes: z.union([z.literal(15), z.literal(30), z.literal(60), z.literal(90)]),
  editorFontSize: z.int().check(z.minimum(12), z.maximum(24)),
  depthProfile: z.enum(['standard', 'foundations', 'accelerated']),
});

export type SettingsValues = z.infer<typeof SettingsValuesSchema>;
export type SettingsKey = keyof SettingsValues;

export const SETTINGS_KEYS = Object.keys(SettingsValuesSchema.shape) as [SettingsKey, ...SettingsKey[]];

export const DEFAULT_SETTINGS: SettingsValues = {
  theme: 'system',
  reducedMotion: 'system',
  focusMode: false,
  defaultSessionMinutes: 30,
  editorFontSize: 15,
  depthProfile: 'standard',
};

export const SettingsDocSchema = z.object({
  values: z.partial(SettingsValuesSchema),
  at: z.partialRecord(z.enum(SETTINGS_KEYS), z.int().check(z.nonnegative())),
});

export type SettingsDoc = z.infer<typeof SettingsDocSchema>;

export const EMPTY_SETTINGS_DOC: SettingsDoc = { values: {}, at: {} };

export function effectiveSettings(doc: SettingsDoc | undefined): SettingsValues {
  return { ...DEFAULT_SETTINGS, ...doc?.values };
}

export function parseSettingValue<K extends SettingsKey>(
  key: K,
  value: unknown,
): SettingsValues[K] | undefined {
  const result = SettingsValuesSchema.shape[key].safeParse(value);
  return result.success ? (result.data as SettingsValues[K]) : undefined;
}

function compareValues(a: unknown, b: unknown): number {
  const x = JSON.stringify(a);
  const y = JSON.stringify(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Records one change. Returns the same document when an equal or later change is already there. */
export function setSetting<K extends SettingsKey>(
  doc: SettingsDoc,
  key: K,
  value: SettingsValues[K],
  at: number,
): SettingsDoc {
  const prevAt = doc.at[key];
  if (prevAt !== undefined) {
    if (at < prevAt) return doc;
    if (at === prevAt && compareValues(value, doc.values[key]) <= 0) return doc;
  }
  return { values: { ...doc.values, [key]: value }, at: { ...doc.at, [key]: at } };
}

/** Field-by-field merge. Commutative, associative and idempotent. */
export function mergeSettings(a: SettingsDoc, b: SettingsDoc): SettingsDoc {
  let out = a;
  for (const key of SETTINGS_KEYS) {
    const at = b.at[key];
    const value = b.values[key];
    if (at !== undefined && value !== undefined) out = setSetting(out, key, value, at);
  }
  return out;
}

export function hasChangedSettings(doc: SettingsDoc | undefined): boolean {
  return !!doc && Object.keys(doc.at).length > 0;
}
