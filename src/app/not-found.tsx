'use client';

import Link from 'next/link';

import { useT } from '@/i18n';

export default function NotFound() {
  const t = useT();
  return (
    <main className="grid min-h-dvh place-items-center bg-ink-900 p-6">
      <div className="max-w-md border border-chart-rule/40 bg-ink-850 p-6 text-center">
        <img src="/assets/theme/chibi/slime-alert.webp" alt="" width={120} height={110} className="mx-auto mb-3 h-[110px] w-auto" />
        <h1 className="font-atlas text-lg text-chart-paper">{t('No such page')}</h1>
        <p className="mt-3 font-ui text-sm leading-relaxed text-chart-faint">
          {t('The campaign atlas lives at the root of this site.')}
        </p>
        <Link
          href="/"
          className="mt-4 inline-block border border-chart-rule/50 px-3 py-1.5 font-ui text-sm text-chart-paper hover:border-brass"
        >
          {t('Open the campaign atlas')}
        </Link>
      </div>
    </main>
  );
}
