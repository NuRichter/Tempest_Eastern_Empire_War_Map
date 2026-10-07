'use client';

import { usePreferences, WAR_LAYERS, type Scale } from '@/state/preferences';
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
  return (
    <div>
      <Section title="Map">
        <div role="radiogroup" aria-label="Map style" className="grid grid-cols-2 gap-1.5">
          {(['base', 'myth'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={p.mapStyle === id}
              onClick={() => p.set('mapStyle', id)}
              className={`rounded-[3px] border px-2 py-1.5 text-left ${p.mapStyle === id ? 'border-accent/80 bg-accent/10' : 'border-ink-500 hover:border-ink-400'}`}
            >
              <span className="block text-sm text-fg">{id === 'base' ? 'Base Map' : 'Myth Map'}</span>
              <span className="block text-2xs text-fg-3">{id === 'base' ? 'Operational · default' : 'World & lore context'}</span>
            </button>
          ))}
        </div>
        <Segmented label="Base map tone" value={p.baseTone} onChange={(v) => p.set('baseTone', v)} options={[{ id: 'dark', label: 'War room' }, { id: 'original', label: 'Original' }]} />
        <Segmented label="Projection" value={p.globe ? 'globe' : 'flat'} onChange={(v) => p.set('globe', v === 'globe')} options={[{ id: 'flat', label: 'Flat' }, { id: 'globe', label: 'Globe' }]} />
      </Section>

      <Section title="War layers">
        <ul className="-mx-1.5">
          {WAR_LAYERS.map((l) => (
            <li key={l.id}>
              <Toggle checked={p.layers[l.id]} onChange={(on) => p.setLayer(l.id, on)} label={l.name} note={l.note} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Readability">
        <div className="-mx-1.5">
          <Slider label="Territory fill" value={p.territoryOpacity} min={0} max={1} step={0.05} onChange={(v) => p.set('territoryOpacity', v)} format={pct} />
          <Slider label="Border lines" value={p.borderOpacity} min={0} max={1} step={0.05} onChange={(v) => p.set('borderOpacity', v)} format={pct} />
          <Slider label="Movement routes" value={p.movementOpacity} min={0.1} max={1} step={0.05} onChange={(v) => p.set('movementOpacity', v)} format={pct} />
          <Slider label="Trail width" value={p.trailWidth} min={0.5} max={4} step={0.25} onChange={(v) => p.set('trailWidth', v)} format={(v) => `${v}px`} />
          <Segmented label="Label size" value={p.labelScale} onChange={(v) => p.set('labelScale', v)} options={SCALES} />
          <Segmented label="Force markers" value={p.markerScale} onChange={(v) => p.set('markerScale', v)} options={SCALES} />
          <Segmented label="Event markers" value={p.eventMarkerScale} onChange={(v) => p.set('eventMarkerScale', v)} options={SCALES} />
          <Segmented label="Panel density" value={p.density} onChange={(v) => p.set('density', v)} options={[{ id: 'compact', label: 'Compact' }, { id: 'comfortable', label: 'Comfort' }]} />
          <Segmented label="Motion" value={p.reducedMotion} onChange={(v) => p.set('reducedMotion', v)} options={[{ id: 'system', label: 'System' }, { id: 'reduce', label: 'Reduce' }, { id: 'full', label: 'Full' }]} />
        </div>
        <button type="button" onClick={p.reset} className="ctl mt-2 w-full">
          Reset display settings
        </button>
      </Section>
    </div>
  );
}
