'use client';

import { useId, type ReactNode } from 'react';
import { useLearnerState } from '@/lib/client/learner-state';
import type { SettingsKey, SettingsValues } from '@/lib/domain/settings';

interface Choice<V extends string> {
  value: V;
  label: string;
  hint?: string;
}

function RadioGroup<K extends SettingsKey, V extends SettingsValues[K] & string>({
  name,
  legend,
  choices,
  value,
  disabled,
  onChange,
}: {
  name: K;
  legend: string;
  choices: Choice<V>[];
  value: V;
  disabled: boolean;
  onChange: (value: V) => void;
}) {
  return (
    <fieldset className="mt-6" disabled={disabled}>
      <legend className="text-base font-semibold text-ink">{legend}</legend>
      <div className="mt-2 flex flex-col gap-2">
        {choices.map((c) => (
          <label key={c.value} className="flex items-start gap-2 text-sm text-ink">
            <input
              type="radio"
              name={name}
              value={c.value}
              checked={value === c.value}
              onChange={() => onChange(c.value)}
              className="mt-0.5 accent-accent"
            />
            <span>
              {c.label}
              {c.hint && <span className="block text-ink-2">{c.hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Field({
  label,
  hint,
  children,
  id,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  id: string;
}) {
  return (
    <div className="mt-6">
      <label htmlFor={id} className="block text-base font-semibold text-ink">
        {label}
      </label>
      {hint && <p className="text-sm text-ink-2">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function SettingsForm() {
  const { settings, setSetting, ready } = useLearnerState();
  const sessionId = useId();
  const fontId = useId();
  const focusId = useId();
  const disabled = !ready;

  return (
    <form onSubmit={(e) => e.preventDefault()} aria-busy={!ready}>
      <RadioGroup
        name="theme"
        legend="Theme"
        value={settings.theme}
        disabled={disabled}
        onChange={(v) => void setSetting('theme', v)}
        choices={[
          { value: 'system', label: 'Follow the system' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
      />
      <RadioGroup
        name="reducedMotion"
        legend="Motion"
        value={settings.reducedMotion}
        disabled={disabled}
        onChange={(v) => void setSetting('reducedMotion', v)}
        choices={[
          { value: 'system', label: 'Follow the system' },
          {
            value: 'reduce',
            label: 'Reduce motion',
            hint: 'Visualizers jump between steps instead of animating.',
          },
          { value: 'full', label: 'Full motion' },
        ]}
      />
      <div className="mt-6 flex items-center gap-2">
        <input
          id={focusId}
          type="checkbox"
          checked={settings.focusMode}
          disabled={disabled}
          onChange={(e) => void setSetting('focusMode', e.target.checked)}
          className="accent-accent"
        />
        <label htmlFor={focusId} className="text-sm text-ink">
          Focus mode: hide navigation (shortcut: F)
        </label>
      </div>
      <Field id={sessionId} label="Default session length" hint="What the session planner suggests first.">
        <select
          id={sessionId}
          value={settings.defaultSessionMinutes}
          disabled={disabled}
          onChange={(e) =>
            void setSetting(
              'defaultSessionMinutes',
              Number(e.target.value) as SettingsValues['defaultSessionMinutes'],
            )
          }
          className="rounded-control border border-rule bg-sheet px-2 py-1 text-ink"
        >
          {[15, 30, 60, 90].map((m) => (
            <option key={m} value={m}>
              {m} minutes
            </option>
          ))}
        </select>
      </Field>
      <Field id={fontId} label="Editor font size" hint="Used by the code editor.">
        <input
          id={fontId}
          type="number"
          min={12}
          max={24}
          step={1}
          value={settings.editorFontSize}
          disabled={disabled}
          onChange={(e) => {
            const n = Math.round(Number(e.target.value));
            if (n >= 12 && n <= 24) void setSetting('editorFontSize', n);
          }}
          className="tabular w-24 rounded-control border border-rule bg-sheet px-2 py-1 text-ink"
        />
      </Field>
      <RadioGroup
        name="depthProfile"
        legend="Depth profile"
        value={settings.depthProfile}
        disabled={disabled}
        onChange={(v) => void setSetting('depthProfile', v)}
        choices={[
          { value: 'standard', label: 'Standard', hint: 'The course as written.' },
          { value: 'foundations', label: 'Foundations', hint: 'Extra groundwork in the first modules.' },
          {
            value: 'accelerated',
            label: 'Accelerated',
            hint: 'Skims early theory; Stretch problems count as Core.',
          },
        ]}
      />
      <p className="mt-2 text-sm text-ink-2">The placement check can suggest a profile once it is built.</p>
    </form>
  );
}
