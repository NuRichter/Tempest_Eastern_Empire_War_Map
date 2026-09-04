'use client';

import { LAYERS, useSimulation } from '@/simulation/store';
import { Panel } from '@/components/primitives';

/** Map layers. Each toggles one rendering concern and nothing else. */
export function LayerPanel() {
  const layers = useSimulation((s) => s.layers);
  const toggleLayer = useSimulation((s) => s.toggleLayer);
  const showParents = useSimulation((s) => s.showParentFormations);
  const setShowParents = useSimulation((s) => s.setShowParentFormations);

  return (
    <Panel title="Map layers" defaultOpen dense>
      <ul className="space-y-px">
        {LAYERS.map((layer) => (
          <li key={layer.id}>
            <label
              className="flex cursor-pointer items-start gap-2 px-1 py-1 hover:bg-ink-700/40"
              title={layer.note}
            >
              <input
                type="checkbox"
                checked={layers[layer.id]}
                onChange={() => toggleLayer(layer.id)}
                className="mt-0.5 h-3 w-3 shrink-0 accent-brass"
              />
              <span className="min-w-0">
                <span className="block font-ui text-tiny text-chart-paper">{layer.name}</span>
                <span className="block font-ui text-micro leading-snug text-chart-faint">{layer.note}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-2 border-t border-chart-rule/25 pt-2">
        <label className="flex cursor-pointer items-start gap-2 px-1 py-1 hover:bg-ink-700/40">
          <input
            type="checkbox"
            checked={showParents}
            onChange={(e) => setShowParents(e.target.checked)}
            className="mt-0.5 h-3 w-3 shrink-0 accent-brass"
          />
          <span className="min-w-0">
            <span className="block font-ui text-tiny text-chart-paper">Show parent formations</span>
            <span className="block font-ui text-micro leading-snug text-chart-faint">
              Off by default. A parent and its subordinate formations describe the same soldiers, so
              drawing both puts the same men on the map twice.
            </span>
          </span>
        </label>
      </div>
    </Panel>
  );
}
