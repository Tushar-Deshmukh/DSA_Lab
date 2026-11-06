// Shared control styles for the exercise components, matching the visualizer player's controls.

export const BTN =
  'rounded-control border border-rule bg-sheet px-2.5 py-1 text-sm text-ink hover:border-ink-3 disabled:cursor-not-allowed disabled:opacity-50';
export const PRIMARY =
  'rounded-control border border-accent bg-accent px-2.5 py-1 text-sm text-accent-ink disabled:cursor-not-allowed disabled:opacity-50';
export const GHOST = BTN;
/** Vertical rhythm inside a card: the exercise frame and feedback boxes. */
export const STACK = 'space-y-3';
export const STACK_SM = 'space-y-2';
/** One feedback line inside a box. */
export const LINE = 'text-sm text-ink';
export const CODEBOX =
  'overflow-x-auto rounded-control bg-code-bg px-3 py-2.5 font-code text-[13px] leading-6 text-code-ink';
