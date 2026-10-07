'use client';

import { ArrowLeft, PanelRightClose, PanelRightOpen, X } from 'lucide-react';

import { useSimulation } from '@/simulation/store';
import { usePreferences } from '@/state/preferences';
import { SituationPanel } from '@/components/shell/SituationPanel';
import { Dossier } from '@/components/dossier/Dossier';

/**
 * Right side: intelligence. With nothing selected it summarises the campaign
 * at this moment; with a selection it becomes that record's dossier. On narrow
 * screens it is a bottom sheet.
 */
export function RightPanel() {
  const selection = useSimulation((s) => s.selection);
  const select = useSimulation((s) => s.select);
  const open = usePreferences((s) => s.panelOpen);
  const setPref = usePreferences((s) => s.set);
  const hasSelection = selection.kind !== 'none';

  if (!open && !hasSelection) {
    return (
      <button type="button" onClick={() => setPref('panelOpen', true)} className="ctl absolute right-3 top-3 z-20" aria-label="Open the intelligence panel">
        <PanelRightOpen size={15} strokeWidth={1.7} />
        <span className="hidden sm:inline">Intelligence</span>
      </button>
    );
  }

  return (
    <aside
      aria-label={hasSelection ? 'Dossier' : 'Campaign intelligence'}
      className="absolute inset-x-0 bottom-0 z-20 flex max-h-[58%] flex-col border-t border-ink-500 bg-ink-850/[0.97] shadow-panel lg:inset-x-auto lg:bottom-0 lg:right-0 lg:top-0 lg:max-h-none lg:w-[24rem] lg:border-l lg:border-t-0"
    >
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-ink-500 px-2">
        {hasSelection ? (
          <button type="button" onClick={() => select({ kind: 'none' })} className="flex h-8 items-center gap-1.5 rounded-[3px] px-1.5 text-xs text-fg-3 hover:text-fg" aria-label="Back to the campaign summary">
            <ArrowLeft size={14} strokeWidth={1.8} /> Situation
          </button>
        ) : (
          <h2 className="px-1.5 text-sm font-semibold tracking-wide text-fg">Situation</h2>
        )}
        <span className="ml-auto" />
        {hasSelection ? (
          <button type="button" onClick={() => select({ kind: 'none' })} className="grid h-8 w-8 place-items-center text-fg-3 hover:text-fg" aria-label="Close dossier (Esc)">
            <X size={15} strokeWidth={1.7} />
          </button>
        ) : (
          <button type="button" onClick={() => setPref('panelOpen', false)} className="grid h-8 w-8 place-items-center text-fg-3 hover:text-fg" aria-label="Hide the intelligence panel">
            <PanelRightClose size={15} strokeWidth={1.7} />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{hasSelection ? <Dossier /> : <SituationPanel />}</div>
    </aside>
  );
}
