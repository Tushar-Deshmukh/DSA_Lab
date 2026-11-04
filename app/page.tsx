import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="max-w-prose">
      <h1 className="font-body text-3xl font-semibold text-ink">DSA Pattern Lab</h1>
      <p className="reading mt-3 text-ink-2">
        Data structures and algorithms in JavaScript, at your own pace: theory, visualizers you can step
        through, exercises that explain mistakes, and review that brings back what you are about to forget.
      </p>
      <section
        aria-labelledby="continue"
        className="mt-8 rounded-card border border-rule bg-sheet p-5 shadow-card"
      >
        <h2 id="continue" className="text-lg font-semibold text-ink">
          Continue
        </h2>
        <p className="mt-2 text-sm text-ink-2">
          The course itself is still being built. Lessons arrive in the next phases; your settings and
          progress are already saved, on this device or in your account.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/settings">Settings</Link>
          <Link href="/sign-in">Sign in</Link>
        </div>
      </section>
    </div>
  );
}
