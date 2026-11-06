import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  EMPTY_SETTINGS_DOC,
  SETTINGS_KEYS,
  effectiveSettings,
  hasChangedSettings,
  mergeSettings,
  parseSettingValue,
  setSetting,
  type SettingsDoc,
  type SettingsKey,
  type SettingsValues,
} from '@/lib/domain/settings';

// Small seeded generator so the property checks are repeatable.
function prng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

const CHOICES: { [K in SettingsKey]: SettingsValues[K][] } = {
  theme: ['system', 'light', 'dark'],
  reducedMotion: ['system', 'reduce', 'full'],
  focusMode: [false, true],
  defaultSessionMinutes: [15, 30, 60, 90],
  editorFontSize: [12, 15, 18, 24],
  depthProfile: ['standard', 'foundations', 'accelerated'],
  // One fixed verdict, so random placement results merge deterministically.
  placementResult: [
    undefined,
    { scoreA: 11, scoreB: 4, rule: 'A ≥ 10 and B ≥ 4 → accelerated', profile: 'accelerated', takenAt: 1000 },
  ],
};

function randomDoc(rand: () => number): SettingsDoc {
  let doc = EMPTY_SETTINGS_DOC;
  for (const key of SETTINGS_KEYS) {
    if (rand() < 0.4) continue;
    const options = CHOICES[key];
    const value = options[Math.floor(rand() * options.length)]!;
    // Few distinct times, so exact ties are common.
    doc = setSetting(doc, key, value as never, 1000 + Math.floor(rand() * 3));
  }
  return doc;
}

describe('settings documents', () => {
  it('fall back to the defaults for fields never changed', () => {
    expect(effectiveSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    const doc = setSetting(EMPTY_SETTINGS_DOC, 'theme', 'dark', 10);
    expect(effectiveSettings(doc)).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' });
    expect(hasChangedSettings(EMPTY_SETTINGS_DOC)).toBe(false);
    expect(hasChangedSettings(doc)).toBe(true);
  });

  it('keep the later change and ignore an earlier one', () => {
    const later = setSetting(EMPTY_SETTINGS_DOC, 'theme', 'dark', 20);
    const stale = setSetting(later, 'theme', 'light', 10);
    expect(stale).toBe(later);
    expect(setSetting(later, 'theme', 'light', 30).values.theme).toBe('light');
  });

  it('settle an exact tie by value, whatever the order', () => {
    const a = setSetting(setSetting(EMPTY_SETTINGS_DOC, 'theme', 'dark', 5), 'theme', 'light', 5);
    const b = setSetting(setSetting(EMPTY_SETTINGS_DOC, 'theme', 'light', 5), 'theme', 'dark', 5);
    expect(a).toEqual(b);
  });

  it('accept the placement verdict and merge it like any other field', () => {
    const takenAt = 1001;
    const verdict = {
      scoreA: 11,
      scoreB: 4,
      rule: 'A ≥ 10 and B ≥ 4 → accelerated',
      profile: 'accelerated' as const,
      takenAt,
    };
    expect(parseSettingValue('placementResult', verdict)).toEqual(verdict);
    // An invalid shape is refused, so an op can never carry a malformed verdict.
    expect(parseSettingValue('placementResult', { ...verdict, scoreA: 13 })).toBeUndefined();
    const doc = setSetting(EMPTY_SETTINGS_DOC, 'placementResult', verdict, takenAt);
    expect(doc.values.placementResult).toEqual(verdict);
    // A later takenAt (set once, then re-taken) wins; clearing is not a set op.
    const retaken = setSetting(
      doc,
      'placementResult',
      { ...verdict, profile: 'standard' as const, takenAt: 2000 },
      2000,
    );
    expect(retaken.values.placementResult?.profile).toBe('standard');
    expect(setSetting(doc, 'placementResult', undefined, 5000)).toBe(doc);
  });

  it('reject values outside the schema', () => {
    expect(parseSettingValue('theme', 'blue')).toBeUndefined();
    expect(parseSettingValue('editorFontSize', 30)).toBeUndefined();
    expect(parseSettingValue('editorFontSize', 15.5)).toBeUndefined();
    expect(parseSettingValue('defaultSessionMinutes', 45)).toBeUndefined();
    expect(parseSettingValue('focusMode', 'yes')).toBeUndefined();
    expect(parseSettingValue('editorFontSize', 15)).toBe(15);
    expect(parseSettingValue('defaultSessionMinutes', 90)).toBe(90);
  });

  it('merge commutatively, associatively and idempotently (500 random cases)', () => {
    const rand = prng(42);
    for (let i = 0; i < 500; i++) {
      const [a, b, c] = [randomDoc(rand), randomDoc(rand), randomDoc(rand)];
      expect(mergeSettings(a, b)).toEqual(mergeSettings(b, a));
      expect(mergeSettings(mergeSettings(a, b), c)).toEqual(mergeSettings(a, mergeSettings(b, c)));
      expect(mergeSettings(a, a)).toEqual(a);
    }
  });
});
