import Link from 'next/link';

// Placeholder for sections that later phases build. It says what is missing instead of pretending.

interface Props {
  title: string;
  phase: number;
  what: string;
}

export function ComingSoon({ title, phase, what }: Props) {
  return (
    <section className="max-w-prose">
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-3 text-ink-2">
        Not built yet. {what} arrives in Phase {phase} of the build plan.
      </p>
      <p className="mt-4">
        <Link href="/" className="text-sm">
          Back to the home page
        </Link>
      </p>
    </section>
  );
}
