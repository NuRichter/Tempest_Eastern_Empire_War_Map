/**
 * Adaptive graphics quality.
 *
 * A fixed setting is either too heavy for an integrated GPU on a high-DPI
 * laptop or plainer than a strong machine deserves. The governor watches the
 * frame times the browser actually achieves and moves between three levels:
 *
 *   high    full device pixel ratio (up to 2), 4-sample edges, bloom in 3D
 *   medium  pixel ratio up to 1.5, 4-sample edges, bloom in 3D
 *   low     pixel ratio 1, 1-sample edges, no bloom
 *
 * Down when the median frame of the last 2 s stays above ~22 ms (under ~45
 * fps) for 2 s, up after 8 s with frames under ~13 ms. A level that just failed is not
 * retried for a minute, so it never oscillates. The reader can also pin a
 * level in the Layers panel (preference `graphics`).
 */
import { create } from 'zustand';

import { usePreferences } from '@/state/preferences';

export type QualityLevel = 0 | 1 | 2;
export const QUALITY_NAMES = ['low', 'medium', 'high'] as const;

export const useQuality = create<{ level: QualityLevel }>(() => ({ level: 2 }));

/** Rendering pixel ratio for a level, never above the device's own. */
export function pixelRatioFor(level: QualityLevel): number {
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  return Math.min(dpr, level === 2 ? 2 : level === 1 ? 1.5 : 1);
}

/** Edge samples for the held-ground shaders. */
export function samplesFor(level: QualityLevel): number {
  return level === 0 ? 1 : 4;
}

const PINNED: Record<string, QualityLevel> = { high: 2, medium: 1, low: 0 };

let running = false;

/** Starts the governor once per page. Cheap: one requestAnimationFrame callback. */
export function startQualityGovernor(): void {
  if (running || typeof window === 'undefined') return;
  running = true;
  // QA handle: the current level.
  (window as unknown as { __atlasQuality?: () => QualityLevel }).__atlasQuality = () => useQuality.getState().level;
  // Recent frame gaps with their time stamps (a slow device gives few, long ones).
  const gaps: { t: number; gap: number }[] = [];
  let last = performance.now();
  // Loading the data, tiles and shaders makes the first seconds slow on any machine: not judged.
  const judgeFrom = last + 6000;
  let badSince = 0;
  let goodSince = 0;
  const failedAt: Record<number, number> = {};

  (window as unknown as { __atlasQualityDebug?: () => unknown }).__atlasQualityDebug = () => ({
    samples: gaps.length,
    median: gaps.length ? gaps.map((g) => g.gap).sort((a, b) => a - b)[gaps.length >> 1] : null,
    warmupLeft: Math.max(0, judgeFrom - performance.now()),
    badFor: badSince ? performance.now() - badSince : 0,
  });
  const apply = (level: QualityLevel) => {
    if (useQuality.getState().level !== level) useQuality.setState({ level });
  };

  const tick = (now: number) => {
    requestAnimationFrame(tick);
    const gap = now - last;
    last = now;
    const pref = usePreferences.getState().graphics;
    if (pref !== 'auto') {
      apply(PINNED[pref] ?? 2);
      return;
    }
    // A hidden tab says nothing about rendering speed: start over when it returns.
    if (document.hidden) {
      gaps.length = 0;
      badSince = goodSince = 0;
      return;
    }
    // One very long gap (a dialog, a shader compile) is skipped, without erasing what was seen.
    if (now < judgeFrom || gap > 2000) return;
    gaps.push({ t: now, gap });
    // The last 2 s, but never fewer than 5 frames: at 1 fps a 2 s window would hold too few to judge.
    while (gaps.length > 5 && now - gaps[0].t > 2000) gaps.shift();
    if (gaps.length < 5) return;
    const sorted = gaps.map((g) => g.gap).sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    const level = useQuality.getState().level;
    if (median > 22) {
      goodSince = 0;
      badSince ||= now;
      if (level > 0 && now - badSince > 2000) {
        failedAt[level] = now;
        apply((level - 1) as QualityLevel);
        gaps.length = 0;
        badSince = 0;
      }
    } else if (median < 13) {
      badSince = 0;
      goodSince ||= now;
      const next = (level + 1) as QualityLevel;
      if (level < 2 && now - goodSince > 8000 && now - (failedAt[next] ?? -Infinity) > 60000) {
        apply(next);
        gaps.length = 0;
        goodSince = 0;
      }
    } else {
      badSince = goodSince = 0;
    }
  };
  requestAnimationFrame(tick);
}
