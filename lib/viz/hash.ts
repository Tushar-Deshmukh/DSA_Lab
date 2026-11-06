// Shareable state (plan 7.3): the URL hash holds the visualizer id, its input as base64url JSON and the step. Steps
// are recomputed from the input, never stored, because they can hold Sets and Maps.
import '@/lib/domain/zod';
import * as z from 'zod/mini';

export interface VizHashState {
  id: string;
  input?: Record<string, unknown>;
  /** 1-based, as the counter shows it. */
  step?: number;
}

/** A link longer than this is not one the player wrote; reading it could only hand a huge input to `run()`. */
export const MAX_HASH_INPUT = 4096;

const InputSchema = z.record(z.string(), z.unknown());
const ID = /^[a-z0-9-]{1,64}$/;

export function toBase64Url(text: string): string {
  let bin = '';
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text: string): string {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  const bin = atob(b64);
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeVizHash(state: VizHashState): string {
  const params = new URLSearchParams({ viz: state.id });
  if (state.input) params.set('in', toBase64Url(JSON.stringify(state.input)));
  if (state.step) params.set('step', String(state.step));
  return params.toString();
}

/** Reads a hash written by `encodeVizHash`. Anything else, or any part that does not parse, is left out. */
export function decodeVizHash(hash: string): VizHashState | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const id = params.get('viz');
  if (!id || !ID.test(id)) return null;
  const state: VizHashState = { id };
  const encoded = params.get('in');
  if (encoded && encoded.length <= MAX_HASH_INPUT) {
    try {
      const parsed = InputSchema.safeParse(JSON.parse(fromBase64Url(encoded)));
      if (parsed.success) state.input = parsed.data;
    } catch {
      // A damaged link still opens the visualizer, on its default input.
    }
  }
  const step = params.get('step');
  if (step && /^[1-9]\d{0,3}$/.test(step)) state.step = Number(step);
  return state;
}
