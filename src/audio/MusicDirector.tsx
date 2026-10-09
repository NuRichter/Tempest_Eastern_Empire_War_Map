'use client';

import { useEffect } from 'react';

import { useSimulation } from '@/simulation/store';
import { usePreferences } from '@/state/preferences';
import { music, type Scene } from './music';

/** Long operations (the labyrinth raid runs for days) are not scored as battles. */
const BATTLE_MAX = 144;

/** Picks the music for what is on screen. Renders nothing. */
export function MusicDirector() {
  const on = usePreferences((s) => s.music);
  const volume = usePreferences((s) => s.musicVolume);
  const cinematic = useSimulation((s) => s.viewMode === 'cinematic');
  const inBattle = useSimulation((s) => {
    if (s.viewMode !== 'cinematic' || !s.data) return false;
    return s.data.battles.some((b) => b.endFrame - b.startFrame <= BATTLE_MAX && s.frame >= b.startFrame && s.frame <= b.endFrame);
  });
  const scene: Scene = cinematic ? (inBattle ? 'battle' : 'cinematic') : 'atlas';

  useEffect(() => {
    const unlock = () => music().unlock();
    const vis = () => music().visibility(document.hidden);
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      document.removeEventListener('visibilitychange', vis);
    };
  }, []);

  useEffect(() => music().setVolume(volume), [volume]);
  useEffect(() => music().setEnabled(on), [on]);
  useEffect(() => music().setScene(scene), [scene]);
  return null;
}
