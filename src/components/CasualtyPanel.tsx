'use client';

import { useMemo, useState } from 'react';

import { sourceGrade } from '@/lib/format';
import { useSimulation } from '@/simulation/store';
import { Empty, Field, Fields, Figure, Panel, SourceBadge } from '@/components/primitives';
import type { CasualtyRecord, Quantity } from '@/types/dataset';

type Scope = 'current' | 'campaign';

function sum(records: CasualtyRecord[], key: 'kia' | 'wia' | 'pow' | 'mia'): Quantity {
  const known = records.map((r) => r[key]).filter((q): q is number => typeof q === 'number');
  if (known.length === 0) return 'UNKNOWN';
  return known.reduce((a, b) => a + b, 0);
}

const SCOPE_NOTE: Record<string, string> = {
  EVENT_CASUALTY: 'A loss at one event. These are the rows that sum.',
  COMPONENT_CASUALTY: 'Part of a larger loss recorded elsewhere. Excluded from totals.',
  AGGREGATE_CASUALTY: 'A restatement of other rows. Excluded from totals.',
  CAMPAIGN_TOTAL: 'A summary figure from the source. Excluded from totals.',
  UNKNOWN: 'The corpus records no figure.',
};

/**
 * Casualties.
 *
 * Four categories, kept apart: event, component, aggregate and campaign total.
 * Only event rows are summed, because the other three restate losses already
 * counted. Unknown is shown as unknown throughout; it is never rendered as zero
 * and never filled with an estimate.
 */
export function CasualtyPanel() {
  const data = useSimulation((s) => s.data);
  const frame = useSimulation((s) => s.frame);
  const state = useSimulation((s) => s.state);
  const seek = useSimulation((s) => s.seek);
  const [scope, setScope] = useState<Scope>('current');
  const [showExcluded, setShowExcluded] = useState(false);

  const records = useMemo(() => {
    if (!data) return [];
    const all = data.casualties;
    const reached = scope === 'campaign' ? all : all.filter((r) => r.frame !== null && r.frame <= frame);
    return showExcluded ? reached : reached.filter((r) => r.countsTowardCampaignTotal);
  }, [data, frame, scope, showExcluded]);

  if (!data || !state) return null;

  const additive = records.filter((r) => r.countsTowardCampaignTotal);
  const empire = additive.filter((r) => r.faction === 'Eastern Empire');
  const tempest = additive.filter((r) => r.faction === 'Jura-Tempest Federation');

  return (
    <Panel
      title="Casualties"
      subtitle={scope === 'campaign' ? 'whole campaign' : 'to this frame'}
      action={
        <div className="flex gap-1">
          {(['current', 'campaign'] as Scope[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`px-1.5 py-px font-ui text-micro focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass ${
                scope === s ? 'border-b border-brass text-chart-paper' : 'text-chart-faint hover:text-chart-paper'
              }`}
            >
              {s === 'current' ? 'to now' : 'campaign'}
            </button>
          ))}
        </div>
      }
      dense
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="border-l-2 border-l-empire pl-2">
          <p className="font-ui text-micro text-chart-faint">Eastern Empire</p>
          <Fields>
            <Field label="Killed">
              <Figure value={sum(empire, 'kia')} />
            </Field>
            <Field label="Wounded">
              <Figure value={sum(empire, 'wia')} />
            </Field>
            <Field label="Prisoners">
              <Figure value={sum(empire, 'pow')} />
            </Field>
            <Field label="Missing">
              <Figure value={sum(empire, 'mia')} />
            </Field>
          </Fields>
        </div>
        <div className="border-l-2 border-l-tempest pl-2">
          <p className="font-ui text-micro text-chart-faint">Jura-Tempest Federation</p>
          <Fields>
            <Field label="Killed">
              <Figure value={sum(tempest, 'kia')} />
            </Field>
            <Field label="Wounded">
              <Figure value={sum(tempest, 'wia')} />
            </Field>
            <Field label="Prisoners">
              <Figure value={sum(tempest, 'pow')} />
            </Field>
            <Field label="Missing">
              <Figure value={sum(tempest, 'mia')} />
            </Field>
          </Fields>
        </div>
      </div>

      <div className="mt-2 border-t border-chart-rule/25 pt-2">
        <p className="font-ui text-micro leading-relaxed text-chart-faint">
          Cumulative state at this frame reads {String(state.casualties.empire.kia)} imperial killed and{' '}
          {String(state.casualties.tempest.kia)} Tempest killed. Wounded and missing are unknown for both
          sides throughout: the corpus never states them, and an unstated figure is not zero.
        </p>
      </div>

      <label className="mt-2 flex cursor-pointer items-center gap-2 px-1 py-1 hover:bg-ink-700/40">
        <input
          type="checkbox"
          checked={showExcluded}
          onChange={(e) => setShowExcluded(e.target.checked)}
          className="h-3 w-3 accent-brass"
        />
        <span className="font-ui text-micro text-chart-paper">
          Show rows excluded from totals ({data.campaignTotals.excludedRows.length})
        </span>
      </label>

      {records.length === 0 ? (
        <Empty>No casualty has been recorded at or before this frame.</Empty>
      ) : (
        <ul className="mt-1 max-h-56 space-y-px overflow-y-auto pr-1">
          {records.map((record) => (
            <li key={record.id}>
              <button
                type="button"
                onClick={() => record.frame !== null && seek(record.frame)}
                disabled={record.frame === null}
                className="w-full border-l-2 border-l-transparent px-2 py-1 text-left hover:border-l-chart-rule/60 hover:bg-ink-700/40 disabled:cursor-default focus-visible:outline focus-visible:outline-1 focus-visible:outline-brass"
                title={SCOPE_NOTE[record.scope] ?? record.scope}
              >
                <div className="flex items-baseline gap-2">
                  <span className="shrink-0 font-figure text-micro text-chart-faint">{record.id}</span>
                  <span className="flex-1 truncate font-ui text-tiny text-chart-paper">{record.formation}</span>
                  <span className="shrink-0 font-figure text-tiny">
                    <Figure value={record.kia} />
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span
                    className={`shrink-0 border px-1 font-figure text-micro ${
                      record.countsTowardCampaignTotal
                        ? 'border-chart-rule/50 text-chart-faint'
                        : 'border-unknown/60 text-chart-faint/70 line-through'
                    }`}
                  >
                    {record.scope.replace('_CASUALTY', '').replace('_', ' ').toLowerCase()}
                  </span>
                  <SourceBadge grade={sourceGrade(record.basis)} note={record.derivation} />
                  <span className="truncate font-ui text-micro text-chart-faint">{record.battle || record.location}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 border-t border-chart-rule/25 pt-2 font-ui text-micro leading-relaxed text-chart-faint">
        {data.campaignTotals.note}
      </p>
    </Panel>
  );
}
