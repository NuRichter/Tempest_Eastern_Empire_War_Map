'use client';

import { usePreferences, WAR_LAYERS, type Scale } from '@/state/preferences';
import { useT } from '@/i18n';
import { useTour } from '@/components/overlays/Tour';
import { Section, Segmented, Slider, Toggle } from '@/components/ui/primitives';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const SCALES: { id: Scale; label: string }[] = [
  { id: 'S', label: 'S' },
  { id: 'M', label: 'M' },
  { id: 'L', label: 'L' },
];

/** Map style, war layers and readability. Every choice persists on this device. */
export function LayersPanel() {
  const p = usePreferences();
  const t = useT();
  return (
    <div>
      <Section title={t('Map')}>
        <div role="radiogroup" aria-label={t('Map style')} className="grid grid-cols-2 gap-1.5">
          {(['base', 'myth'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={p.mapStyle === id}
              onClick={() => p.set('mapStyle', id)}
              className={`rounded-[3px] border px-2 py-1.5 text-left ${p.mapStyle === id ? 'border-accent/80 bg-accent/10' : 'border-ink-500 hover:border-ink-400'}`}
            >
              <span className="block text-sm text-fg">{id === 'base' ? t('Base Map') : t('Myth Map')}</span>
              <span className="block text-2xs text-fg-3">{id === 'base' ? t('Operational · default') : t('World & lore context')}</span>
            </button>
          ))}
        </div>
        <Segmented label={t('Look')} value={p.theme} onChange={(v) => p.setTheme(v)} options={[{ id: 'documentary', label: t('Documentary') }, { id: 'warroom', label: t('War room') }]} />
        <Segmented label={t('Projection')} value={p.globe ? 'globe' : 'flat'} onChange={(v) => p.set('globe', v === 'globe')} options={[{ id: 'flat', label: t('Flat') }, { id: 'globe', label: t('Globe') }]} />
        <Segmented label={t('Interface')} value={p.uiTheme} onChange={(v) => p.set('uiTheme', v)} options={[{ id: 'dark', label: t('Dark') }, { id: 'light', label: t('Light') }]} />
        <Segmented label={t('Front change')} value={p.transitionBelt} onChange={(v) => p.set('transitionBelt', v)} options={[{ id: 'gradient', label: t('Gradient') }, { id: 'pale', label: t('Pale band') }]} />
      </Section>

      <Section title={t('War layers')}>
        <ul className="-mx-1.5">
          {WAR_LAYERS.map((l) => (
            <li key={l.id}>
              <Toggle checked={p.layers[l.id]} onChange={(on) => p.setLayer(l.id, on)} label={t(l.name)} note={t(l.note)} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('Readability')}>
        <div className="-mx-1.5">
          <Slider label={t('Territory fill')} value={p.territoryOpacity} min={0} max={1} step={0.05} onChange={(v) => p.set('territoryOpacity', v)} format={pct} />
          <Slider label={t('Border lines')} value={p.borderOpacity} min={0} max={1} step={0.05} onChange={(v) => p.set('borderOpacity', v)} format={pct} />
          <Slider label={t('Movement routes')} value={p.movementOpacity} min={0.1} max={1} step={0.05} onChange={(v) => p.set('movementOpacity', v)} format={pct} />
          <Slider label={t('Trail width')} value={p.trailWidth} min={0.5} max={4} step={0.25} onChange={(v) => p.set('trailWidth', v)} format={(v) => `${v}px`} />
          <Segmented label={t('Label size')} value={p.labelScale} onChange={(v) => p.set('labelScale', v)} options={SCALES} />
          <Segmented label={t('Force markers')} value={p.markerScale} onChange={(v) => p.set('markerScale', v)} options={SCALES} />
          <Segmented label={t('Event markers')} value={p.eventMarkerScale} onChange={(v) => p.set('eventMarkerScale', v)} options={SCALES} />
          <Segmented label={t('Panel density')} value={p.density} onChange={(v) => p.set('density', v)} options={[{ id: 'compact', label: t('Compact') }, { id: 'comfortable', label: t('Comfort') }]} />
          <div className="mx-0">
            <Toggle checked={p.autoSlow} onChange={(v) => p.set('autoSlow', v)} label={t('Slow down at turning points')} note={t('Playback drops to 1× for a moment when it reaches a turning point, as documentaries do.')} />
            <Toggle checked={p.showMinimap} onChange={(v) => p.set('showMinimap', v)} label={t('Overview minimap')} />
            <Toggle checked={p.themeCursor} onChange={(v) => p.set('themeCursor', v)} label={t('Rimuru cursor')} note={t('A slime Rimuru pointer. The normal cursor returns if it cannot load.')} />
          </div>
          <Toggle checked={p.music} onChange={(v) => p.set('music', v)} label={t('Music')} note={t('A calm score while you explore, a film score in cinematic mode. Free-licensed fantasy music, not the official soundtrack.')} />
          {p.music ? <Slider label={t('Music volume')} value={p.musicVolume} min={0} max={1} step={0.05} onChange={(v) => p.set('musicVolume', v)} format={pct} /> : null}
          <Segmented label={t('Graphics quality')} value={p.graphics} onChange={(v) => p.set('graphics', v)} options={[{ id: 'auto', label: t('Automatic') }, { id: 'high', label: t('High') }, { id: 'medium', label: t('Medium') }, { id: 'low', label: t('Low') }]} />
          <Segmented label={t('Motion')} value={p.reducedMotion} onChange={(v) => p.set('reducedMotion', v)} options={[{ id: 'system', label: t('System') }, { id: 'reduce', label: t('Reduce') }, { id: 'full', label: t('Full') }]} />
        </div>
        <button type="button" onClick={() => useTour.getState().start()} className="ctl mt-2 w-full">
          {t('Replay the tour')}
        </button>
        <button type="button" onClick={p.reset} className="ctl mt-2 w-full">
          {t('Reset display settings')}
        </button>
      </Section>
    </div>
  );
}
