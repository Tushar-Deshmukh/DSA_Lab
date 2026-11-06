'use client';
import { md } from './renderers';
import { gateLabel, useGate } from '@/lib/client/gates';

// The `<Gated id>` text of a page (D-027): a quiet line while the gate is shut, the passage itself once the
// device says the gate is open. The text comes from the gate endpoint, never from the page payload.

const LOCK_TONE = 'text-ink-3';

export function GatedText({ id, gateId, inline = false }: { id: string; gateId?: string; inline?: boolean }) {
  const gate = useGate(gateId ?? null);
  const Wrapper = inline ? 'span' : 'div';

  if (!gateId) {
    return (
      <Wrapper role="alert" className={BOX}>
        Missing gate for the passage {id}.
      </Wrapper>
    );
  }

  if (!gate.open) {
    return (
      <Wrapper
        data-gated={id}
        data-open="false"
        className={`inline-flex items-center gap-2 text-sm ${LOCK_TONE}`}
      >
        <span aria-hidden="true">◇</span>
        Opens after {gateLabel(gateId)} is finished.
      </Wrapper>
    );
  }

  if (gate.content) {
    const text = gate.content.texts[id];
    if (text !== undefined) {
      return (
        <Wrapper data-gated={id} data-open="true" className={BOX}>
          {md(text)}
        </Wrapper>
      );
    }
    return (
      <Wrapper role="alert" className={BOX}>
        The passage {id} is not in this gate&apos;s content.
      </Wrapper>
    );
  }

  if (gate.failed) {
    return (
      <Wrapper data-gated={id} data-open="false" className={BOX}>
        Could not load the passage.{' '}
        <button type="button" className={LINK} onClick={gate.retry}>
          Retry
        </button>
      </Wrapper>
    );
  }

  return (
    <Wrapper data-gated={id} data-open="true" aria-busy="true" className={`${BOX} text-sm text-ink-3`}>
      Loading…
    </Wrapper>
  );
}

const BOX = 'rounded-card border border-rule bg-paper px-3 py-2.5 text-sm text-ink';
const LINK = 'underline underline-offset-2';
