'use client';

import { useEffect, useState } from 'react';

import { useT } from '@/i18n';
import { prefersReducedMotion } from '@/state/preferences';
import type { Quantity } from '@/types/dataset';

const GROUP = new Intl.NumberFormat('en-GB');

/**
 * A counter that rolls to its new value, as the reference documentaries'
 * casualty and strength counters do. It always settles on the exact recorded
 * number; unknown stays the word "unknown", never a rolling zero.
 */
export function RollingNumber({ value, className }: { value: Quantity; className?: string }) {
  // The number on screen while rolling. Unknown and reduced motion are decided at render.
  const [display, setDisplay] = useState<number>(typeof value === 'number' ? value : 0);
  const reduce = prefersReducedMotion();
  const t = useT();

  useEffect(() => {
    if (typeof value !== 'number' || reduce || display === value) return;
    const from = display;
    const t0 = performance.now();
    const dur = 600;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setDisplay(Math.round(from + (value - from) * e));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate only when the target changes
  }, [value, reduce]);

  const shown = typeof value !== 'number' ? null : reduce ? value : display;
  if (shown === null) return <span className={`italic text-fg-3 ${className ?? ''}`}>{t('unknown')}</span>;
  return <span className={`figure tabular-nums ${className ?? ''}`}>{GROUP.format(shown)}</span>;
}
