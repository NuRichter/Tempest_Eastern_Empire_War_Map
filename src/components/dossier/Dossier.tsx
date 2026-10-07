'use client';

import type { ReactNode } from 'react';

import { useSimulation } from '@/simulation/store';
import { BattleDossier, CharacterDossier, EventDossier, ForceDossier, MovementDossier, NationDossier, TerritoryDossier, TheatreDossier } from '@/components/dossier/records';

/** Routes the current selection to its dossier. */
export function Dossier() {
  const selection = useSimulation((s) => s.selection);
  switch (selection.kind) {
    case 'force':
      return <ForceDossier id={selection.id} />;
    case 'event':
      return <EventDossier id={selection.id} />;
    case 'battle':
      return <BattleDossier id={selection.id} />;
    case 'character':
      return <CharacterDossier id={selection.id} />;
    case 'territory':
      return <TerritoryDossier id={selection.id} />;
    case 'nation':
      return <NationDossier id={selection.id} />;
    case 'theatre':
      return <TheatreDossier id={selection.id} />;
    case 'movement':
      return <MovementDossier id={selection.id} />;
    default:
      return null;
  }
}

/** Dossier masthead: what kind of record, its name, and how it is known. */
export function Masthead({ kind, title, sub, aside, children }: { kind: string; title: string; sub?: ReactNode; aside?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex gap-3 px-3 pb-3 pt-3">
      <div className="min-w-0 flex-1">
        <p className="eyebrow">{kind}</p>
        <h2 className="mt-1 font-display text-xl font-semibold leading-tight text-fg">{title}</h2>
        {sub ? <div className="mt-1 text-xs text-fg-2">{sub}</div> : null}
        {children ? <div className="mt-2 flex flex-wrap gap-1.5">{children}</div> : null}
      </div>
      {aside}
    </header>
  );
}
