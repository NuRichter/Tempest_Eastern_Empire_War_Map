import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-ink-900 p-6">
      <div className="max-w-md border border-chart-rule/40 bg-ink-850 p-6">
        <h1 className="font-atlas text-lg text-chart-paper">No such page</h1>
        <p className="mt-3 font-ui text-sm leading-relaxed text-chart-faint">
          The campaign atlas lives at the root of this site.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block border border-chart-rule/50 px-3 py-1.5 font-ui text-sm text-chart-paper hover:border-brass"
        >
          Open the campaign atlas
        </Link>
      </div>
    </main>
  );
}
