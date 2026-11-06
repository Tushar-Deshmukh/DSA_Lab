'use client';
import { useEffect, useState } from 'react';
import type { Snapshot } from '@/lib/domain/ops';
import { useLearnerState } from './learner-state';

// The client half of the gates (D-027, D-020): each gate's rule is a public file written for the device to
// evaluate, and the gated content itself only arrives from /api/gates/{gateId} once the device's own documents
// say the gate is open. Guests work the same way — the content is not a secret from the learner, only from the
// page payload.

export interface GateRule {
  kind: 'checkpoint' | 'mock' | 'placement' | 'exercises';
  /** kind checkpoint: `module/checkpoint` in the snapshot's checkpoints part. */
  checkpoint?: string;
  mock?: string;
  /** kind exercises: the copies of the drill; one fully solved copy opens the gate. */
  copies?: string[][];
}

export type GateRules = Record<string, GateRule>;

export interface GateContent {
  texts: Record<string, string>;
  exercises: Record<string, { type: string; public: Record<string, unknown> }>;
}

const RULES_URL = '/data/gate-rules.json';

let rules: GateRules | null = null;
let rulesRequest: Promise<GateRules> | null = null;

function loadGateRules(): Promise<GateRules> {
  if (rules) return Promise.resolve(rules);
  rulesRequest ??= (async () => {
    try {
      const res = await fetch(RULES_URL);
      rules = res.ok ? ((await res.json()) as GateRules) : {};
    } catch {
      rules = {};
    }
    return rules;
  })();
  return rulesRequest;
}

/** True when the device's own documents say the gate has opened. */
export function gateOpen(rule: GateRule, snapshot: Snapshot): boolean {
  switch (rule.kind) {
    case 'checkpoint':
      return Boolean(rule.checkpoint && snapshot.checkpoints[rule.checkpoint]?.finishedAt);
    case 'mock':
      return Boolean(rule.mock && snapshot.mocks[rule.mock]?.finishedAt);
    case 'placement':
      return Boolean(snapshot.settings.values.placementResult);
    case 'exercises':
      return (rule.copies ?? []).some((copy) => copy.every((slug) => snapshot.exercises[slug]?.solved));
  }
}

const contentCache = new Map<string, GateContent>();

function fetchGate(gateId: string): Promise<GateContent | null> {
  const hit = contentCache.get(gateId);
  if (hit) return Promise.resolve(hit);
  return fetch(`/api/gates/${gateId}`)
    .then(async (res) => {
      if (!res.ok) return null;
      const body = (await res.json()) as {
        texts: Record<string, string>;
        exercises: GateContent['exercises'];
      };
      const content: GateContent = { texts: body.texts ?? {}, exercises: body.exercises ?? {} };
      contentCache.set(gateId, content);
      return content;
    })
    .catch(() => null);
}

export interface GateState {
  rule: GateRule | null;
  open: boolean;
  content: GateContent | null;
  loading: boolean;
  /** The one-off fetch failed (offline or rate-limited); call `retry` after the learner tries again. */
  failed: boolean;
  retry: () => void;
}

/** The state of one gate: its public rule, whether it is open, and the content once fetched. */
export function useGate(gateId: string | null | undefined): GateState {
  const { snapshot, ready } = useLearnerState();
  const [loadedRules, setLoadedRules] = useState<GateRules>({});
  const [content, setContent] = useState<GateContent | null>(
    gateId ? (contentCache.get(gateId) ?? null) : null,
  );
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const rule = (gateId && loadedRules[gateId]) || null;
  const open = ready && rule !== null && gateOpen(rule, snapshot);
  // Working is just the state where the content should exist, is allowed to load and has not yet failed: the
  // effect below is the only fetcher, so no state has to name the loading phase.
  const loading = Boolean(gateId && open && !content && !failed);

  useEffect(() => {
    let live = true;
    void loadGateRules().then((loaded) => {
      if (live) setLoadedRules(loaded);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!gateId || !open || content || failed) return;
    let live = true;
    void fetchGate(gateId).then((loaded) => {
      if (!live) return;
      if (loaded) setContent(loaded);
      else setFailed(true);
    });
    return () => {
      live = false;
    };
  }, [gateId, open, content, failed, attempt]);

  return {
    rule,
    open,
    content: content ?? (gateId ? (contentCache.get(gateId) ?? null) : null),
    loading,
    failed,
    retry: () => {
      if (gateId && contentCache.has(gateId)) contentCache.delete(gateId);
      setContent(null);
      setFailed(false);
      setAttempt((n) => n + 1);
    },
  };
}

/** The gate's name in the learner's words, from its id (`assessment-1` → "Assessment 1"). */
export function gateLabel(gateId: string): string {
  const m = gateId.match(/^(assessment|mock)-(\d+)$/);
  if (m) return `${m[1] === 'assessment' ? 'Assessment' : 'Mock'} ${m[2]}`;
  if (gateId === 'placement') return 'the placement check';
  return gateId.replace(/-/g, ' ');
}
