'use client';

import { useEffect, useRef, useState } from 'react';

import { prefersReducedMotion } from '@/state/preferences';
import type { Quantity } from '@/types/dataset';

const GROUP = new Intl.NumberFormat('en-GB');

/**
 * A counter that rolls to its new value, as the reference documentaries'
 * casualty and strength counters do. It always settles on the exact recorded
 * number; unknown stays the word "unknown", never a rolling zero.
 */
export function RollingNumber({ value, className }: { value: Quantity; className?: string }) {
  const [shown, setShown] = useState<number | null>(typeof value === 'number' ? value : null);
  const from = useRef<number>(typeof value === 'number' ? value : 0);
  const raf = useRef(0);

  useEffect(() => {
    if (typeof value !== 'number') {
      setShown(null);
      return;
    }
    const start = shown ?? value;
    from.current = start;
    if (prefersReducedMotion() || start === value) {
      setShown(value);
      return;
    }
    const t0 = performance.now();
    const dur = 600;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(from.current + (value - from.current) * e));
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate only when the target changes
  }, [value]);

  if (shown === null) return <span className={`italic text-fg-3 ${className ?? ''}`}>unknown</span>;
  return <span className={`figure tabular-nums ${className ?? ''}`}>{GROUP.format(shown)}</span>;
}
