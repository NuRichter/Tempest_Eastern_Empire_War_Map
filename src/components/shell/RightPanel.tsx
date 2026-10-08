'use client';

import { ArrowLeft, PanelRightClose, PanelRightOpen, X } from 'lucide-react';
import { useState } from 'react';

import { useT } from '@/i18n';
import { useSimulation } from '@/simulation/store';
import { usePreferences } from '@/state/preferences';
import { SituationPanel } from '@/components/shell/SituationPanel';
import { SituationChip } from '@/components/shell/SituationBar';
import { AboutPanel } from '@/components/shell/AboutPanel';
import { Dossier } from '@/components/dossier/Dossier';

type Tab = 'situation' | 'about';

/**
 * Right side: intelligence. With nothing selected it summarises the campaign
 * at this moment (or tells who made this, on the About tab); with a selection
 * it becomes that record's dossier. On narrow screens it is a bottom sheet.
 */
export function RightPanel() {
  const t = useT();
  const selection = useSimulation((s) => s.selection);
  const select = useSimulation((s) => s.select);
  const open = usePreferences((s) => s.panelOpen);
  const setPref = usePreferences((s) => s.set);
  const [tab, setTab] = useState<Tab>('situation');
  const hasSelection = selection.kind !== 'none';

  if (!open && !hasSelection) {
    return (
      <button type="button" data-tour="situation" onClick={() => setPref('panelOpen', true)} className="ctl absolute right-3 top-3 z-20 h-auto min-h-8 py-1" aria-label={t('Open the intelligence panel')}>
        <SituationChip />
        <PanelRightOpen size={15} strokeWidth={1.7} />
      </button>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'situation', label: t('Situation') },
    { id: 'about', label: t('About') },
  ];

  return (
    <aside
      data-tour="situation"
      aria-label={hasSelection ? t('Dossier') : t('Campaign intelligence')}
      className="absolute inset-x-0 bottom-0 z-20 flex max-h-[62%] flex-col rounded-t-[6px] border-t border-ink-500 bg-ink-850 shadow-panel sm:max-h-[58%] lg:inset-x-auto lg:bottom-0 lg:right-0 lg:top-0 lg:max-h-none lg:w-[24rem] lg:rounded-none lg:border-l lg:border-t-0"
    >
      <span className="mx-auto mt-1.5 block h-1 w-10 shrink-0 rounded-full bg-ink-400 lg:hidden" aria-hidden />
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-ink-500 px-2">
        {hasSelection ? (
          <button type="button" onClick={() => select({ kind: 'none' })} className="flex h-8 items-center gap-1.5 rounded-[3px] px-1.5 text-xs text-fg-3 hover:text-fg" aria-label={t('Back to the campaign summary')}>
            <ArrowLeft size={14} strokeWidth={1.8} /> {t('Situation')}
          </button>
        ) : (
          <div role="tablist" aria-label={t('Panel')} className="flex h-full items-stretch">
            {tabs.map((x) => (
              <button
                key={x.id}
                type="button"
                role="tab"
                aria-selected={tab === x.id}
                onClick={() => setTab(x.id)}
                className={`border-b-2 px-2.5 text-sm font-semibold tracking-wide ${tab === x.id ? 'border-accent text-fg' : 'border-transparent text-fg-3 hover:text-fg'}`}
              >
                {x.label}
              </button>
            ))}
          </div>
        )}
        <span className="ml-auto" />
        {hasSelection ? (
          <button type="button" onClick={() => select({ kind: 'none' })} className="grid h-8 w-8 place-items-center text-fg-3 hover:text-fg" aria-label={t('Close dossier (Esc)')}>
            <X size={15} strokeWidth={1.7} />
          </button>
        ) : (
          <button type="button" onClick={() => setPref('panelOpen', false)} className="grid h-8 w-8 place-items-center text-fg-3 hover:text-fg" aria-label={t('Hide the intelligence panel')}>
            <PanelRightClose size={15} strokeWidth={1.7} />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{hasSelection ? <Dossier /> : tab === 'about' ? <AboutPanel /> : <SituationPanel />}</div>
    </aside>
  );
}
