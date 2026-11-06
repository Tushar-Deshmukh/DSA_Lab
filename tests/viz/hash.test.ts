// Shareable state: what the player writes into the URL hash reads back the same, and anything else opens safely.
import { describe, expect, it } from 'vitest';
import { decodeVizHash, encodeVizHash, fromBase64Url, MAX_HASH_INPUT, toBase64Url } from '@/lib/viz/hash';

describe('the visualizer hash', () => {
  it('round-trips the id, the input and the step', () => {
    const state = { id: 'two-sum-sorted', input: { nums: [1, 3, 4, 6], target: 7 }, step: 4 };
    const hash = encodeVizHash(state);
    expect(hash).toMatch(/^viz=two-sum-sorted&in=[A-Za-z0-9_-]+&step=4$/);
    expect(decodeVizHash(`#${hash}`)).toEqual(state);
  });

  it('keeps text that is not ASCII', () => {
    const input = { s: 'naïve → ∞', words: ['é', '日本'] };
    expect(JSON.parse(fromBase64Url(toBase64Url(JSON.stringify(input))))).toEqual(input);
    expect(decodeVizHash(encodeVizHash({ id: 'x', input }))?.input).toEqual(input);
  });

  it('ignores hashes it did not write', () => {
    expect(decodeVizHash('')).toBeNull();
    expect(decodeVizHash('#unit-3')).toBeNull();
    expect(decodeVizHash('#viz=<script>')).toBeNull();
    expect(decodeVizHash('#viz=' + 'a'.repeat(65))).toBeNull();
  });

  it('drops a damaged, oversized or non-object input and a bad step, but keeps the id', () => {
    expect(decodeVizHash('#viz=kadane&in=%%%')).toEqual({ id: 'kadane' });
    expect(decodeVizHash(`#viz=kadane&in=${toBase64Url('[1,2]')}`)).toEqual({ id: 'kadane' });
    expect(decodeVizHash(`#viz=kadane&in=${toBase64Url('null')}`)).toEqual({ id: 'kadane' });
    const huge = toBase64Url(JSON.stringify({ nums: Array.from({ length: 3000 }, (_, i) => i) }));
    expect(huge.length).toBeGreaterThan(MAX_HASH_INPUT);
    expect(decodeVizHash(`#viz=kadane&in=${huge}`)).toEqual({ id: 'kadane' });
    for (const step of ['0', '-1', '2.5', 'x', '100000']) {
      expect(decodeVizHash(`#viz=kadane&step=${step}`)).toEqual({ id: 'kadane' });
    }
  });
});
