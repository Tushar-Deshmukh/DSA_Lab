import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-prose">
      <h1 className="text-2xl font-semibold text-ink">Page not found</h1>
      <p className="mt-3 text-ink-2">There is no page at this address.</p>
      <p className="mt-4">
        <Link href="/">Go to the home page</Link>
      </p>
    </div>
  );
}
